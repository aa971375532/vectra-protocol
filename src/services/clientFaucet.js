// src/services/clientFaucet.js
// Vectra Protocol ($VCTR) 链上直连水龙头分发引擎 (无服务器、零后端依赖、100% 链上直发)

import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedWithFeeInstruction,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';

const DEVNET_RPC = 'https://api.devnet.solana.com';

// 官方 Devnet 公开水龙头专属分发池私钥 (预充值 50,000 $VCTR 与 Gas 储备，仅用于测试网水龙头无感分发)
const DISPENSER_SECRET = new Uint8Array([
  198, 218, 141, 226, 97, 253, 90, 198, 200, 194, 237, 142, 240, 47, 224, 115,
  55, 130, 15, 159, 162, 100, 41, 22, 131, 233, 18, 100, 61, 48, 49, 97,
  213, 77, 226, 152, 222, 201, 45, 97, 46, 64, 148, 104, 124, 120, 14, 98,
  220, 67, 168, 96, 172, 133, 125, 137, 153, 78, 35, 62, 83, 234, 149, 146
]);

const VECTRA_MINT = new PublicKey('8aGGfyBvgeiq9WbyZRbgYSKkXhnYymNVh7oMw2ju4t14');
const DISPENSER_ATA = new PublicKey('66Up8mezfHAsgmshMyNZiw2y2FiKCgTRMBSkYzyFJhXL');

// 将 Uint8Array 转为 Base64 字符串 (浏览器原生支持)
function uint8ArrayToBase64(bytes) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

async function solanaRpc(method, params) {
  const response = await fetch(DEVNET_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    }),
  });
  const json = await response.json();
  if (json.error) {
    throw new Error(json.error.message || JSON.stringify(json.error));
  }
  return json.result;
}

export async function claimFaucetOnChain(recipientAddress, amount = 500) {
  let recipientPubkey;
  try {
    recipientPubkey = new PublicKey(recipientAddress);
  } catch (e) {
    throw new Error('无效的 Solana 钱包公钥地址');
  }

  // 严格 24 小时本地防刷冷却
  const storageKey = `vctr_faucet_cooldown_${recipientAddress}`;
  const lastClaim = localStorage.getItem(storageKey);
  const now = Date.now();
  const cooldownMs = 24 * 60 * 60 * 1000;
  if (lastClaim && (now - parseInt(lastClaim, 10) < cooldownMs)) {
    const remainingMs = cooldownMs - (now - parseInt(lastClaim, 10));
    const hours = Math.floor(remainingMs / (3600 * 1000));
    const minutes = Math.ceil((remainingMs % (3600 * 1000)) / 60000);
    throw new Error(`防刷限制：该钱包每 24 小时限领一次，当前仍在冷却中，请在 ${hours} 小时 ${minutes} 分钟后再试`);
  }

  const dispenser = Keypair.fromSecretKey(DISPENSER_SECRET);
  const recipientAta = getAssociatedTokenAddressSync(
    VECTRA_MINT,
    recipientPubkey,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  const tx = new Transaction();

  // 检查目标代币账户是否已创建，未创建则代付租金创建
  const ataInfo = await solanaRpc('getAccountInfo', [recipientAta.toBase58(), { encoding: 'jsonParsed' }]);
  let ataCreated = false;
  if (!ataInfo || !ataInfo.value) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        dispenser.publicKey,
        recipientAta,
        recipientPubkey,
        VECTRA_MINT,
        TOKEN_2022_PROGRAM_ID
      )
    );
    ataCreated = true;
  }

  // 计算转账与 0.20% 手续费
  const rawAmount = BigInt(Math.round(amount * 1000000000));
  const feeAmount = (rawAmount * 20n) / 10000n; // 20 bps = 1 VCTR
  const netAmount = rawAmount - feeAmount;

  tx.add(
    createTransferCheckedWithFeeInstruction(
      DISPENSER_ATA,
      VECTRA_MINT,
      recipientAta,
      dispenser.publicKey,
      rawAmount,
      9,
      feeAmount,
      [],
      TOKEN_2022_PROGRAM_ID
    )
  );

  const blockhashRes = await solanaRpc('getLatestBlockhash', [{ commitment: 'confirmed' }]);
  if (!blockhashRes || !blockhashRes.value) {
    throw new Error('获取 Solana Devnet 最新区块哈希失败，请检查网络');
  }

  tx.recentBlockhash = blockhashRes.value.blockhash;
  tx.feePayer = dispenser.publicKey;
  tx.sign(dispenser);

  const serialized = tx.serialize();
  const serializedBase64 = uint8ArrayToBase64(serialized);

  const signature = await solanaRpc('sendTransaction', [serializedBase64, { encoding: 'base64', skipPreflight: false }]);

  // 记录冷却时间
  localStorage.setItem(storageKey, now.toString());

  const feeUi = Number(feeAmount) / 1e9;
  const netUi = Number(netAmount) / 1e9;

  return {
    success: true,
    signature,
    grossAmount: amount,
    feeAmount: feeUi,
    netReceivedAmount: netUi,
    ataCreated,
    cooldownHours: 24,
    explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    message: `🎉 成功发放 ${amount} $VCTR！链上扣除 0.20% (${feeUi} $VCTR) 手续费，净到账 ${netUi} $VCTR (冷却时间: 24 小时)。`,
  };
}
