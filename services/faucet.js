// services/faucet.js
// Vectra ($VCTR) Solana Devnet 官方测试币水龙头服务

const path = require('path');
const fs = require('fs');
const { Keypair, PublicKey, Transaction } = require('@solana/web3.js');
const {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedWithFeeInstruction,
  TOKEN_2022_PROGRAM_ID,
} = require('@solana/spl-token');
const { fetch, ProxyAgent } = require('undici');

// 速率限制记录表: 地址/IP -> 上次领取毫秒时间戳
const claimRecords = new Map();
const COOLDOWN_MS = 10 * 60 * 1000; // 10 分钟冷却时间
const FAUCET_AMOUNT_VCTR = 500; // 默认每次发放 500 $VCTR

function getProxyDispatcher() {
  const proxyUrl = process.env.HTTP_PROXY || process.env.http_proxy || 'http://127.0.0.1:7897';
  try {
    return new ProxyAgent(proxyUrl);
  } catch (err) {
    return undefined;
  }
}

async function solanaRpc(method, params) {
  const rpcUrl = process.env.SOLANA_DEVNET_RPC || 'https://api.devnet.solana.com';
  const dispatcher = getProxyDispatcher();

  const body = JSON.stringify({
    jsonrpc: '2.0',
    id: Date.now(),
    method,
    params,
  });

  let response;
  try {
    response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      dispatcher,
    });
  } catch (netErr) {
    // 若代理不可用，尝试直连
    response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  }

  const json = await response.json();
  if (json.error) {
    throw new Error(`Solana RPC Error: ${json.error.message || JSON.stringify(json.error)}`);
  }
  return json.result;
}

/**
 * 处理水龙头领取请求
 * @param {string} recipientAddress - 领取代币的 Solana 公钥地址
 * @param {string} [clientIp='127.0.0.1'] - 客户端 IP 用于防刷
 * @param {number} [amount=500] - 领取代币数量
 */
async function requestDevnetFaucet(recipientAddress, clientIp = '127.0.0.1', amount = FAUCET_AMOUNT_VCTR) {
  // 1. 验证目标公钥合法性
  let recipientPubkey;
  try {
    recipientPubkey = new PublicKey(recipientAddress);
  } catch (e) {
    throw new Error('无效的 Solana 钱包公钥地址');
  }

  // 2. 检查频率限制 (按地址和 IP)
  const now = Date.now();
  const addressKey = `addr:${recipientAddress}`;
  const ipKey = `ip:${clientIp}`;

  const lastAddressClaim = claimRecords.get(addressKey) || 0;
  const lastIpClaim = claimRecords.get(ipKey) || 0;

  if (now - lastAddressClaim < COOLDOWN_MS) {
    const remainingSeconds = Math.ceil((COOLDOWN_MS - (now - lastAddressClaim)) / 1000);
    throw new Error(`该钱包地址领水冷却中，请在 ${remainingSeconds} 秒后再试`);
  }
  if (clientIp !== '127.0.0.1' && (now - lastIpClaim < COOLDOWN_MS)) {
    const remainingSeconds = Math.ceil((COOLDOWN_MS - (now - lastIpClaim)) / 1000);
    throw new Error(`当前 IP 领水冷却中，请在 ${remainingSeconds} 秒后再试`);
  }

  // 3. 读取部署配置与密钥
  const keysPath = path.join(__dirname, '..', 'config', 'keys.json');
  const deployPath = path.join(__dirname, '..', 'config', 'deployment.json');

  if (!fs.existsSync(keysPath) || !fs.existsSync(deployPath)) {
    throw new Error('未检测到水龙头服务端配置文件 (keys.json / deployment.json)');
  }

  const keys = JSON.parse(fs.readFileSync(keysPath, 'utf-8'));
  const deploy = JSON.parse(fs.readFileSync(deployPath, 'utf-8'));

  const founder = Keypair.fromSecretKey(new Uint8Array(keys.founderSecretKey));
  const mint = new PublicKey(deploy.vectraMintAddress);
  const founderAta = new PublicKey(deploy.founderAta);
  const decimals = deploy.decimals || 9;
  const feeBps = BigInt(deploy.feeBasisPoints || 20); // 20 bps = 0.20%

  // 4. 计算目标 ATA
  const recipientAta = getAssociatedTokenAddressSync(
    mint,
    recipientPubkey,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  const tx = new Transaction();

  // 检查目标 ATA 是否已上链创建，未创建则由水龙头代付租金创建
  const ataInfo = await solanaRpc('getAccountInfo', [recipientAta.toBase58(), { encoding: 'jsonParsed' }]);
  let ataCreated = false;
  if (!ataInfo || !ataInfo.value) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        founder.publicKey,
        recipientAta,
        recipientPubkey,
        mint,
        TOKEN_2022_PROGRAM_ID
      )
    );
    ataCreated = true;
  }

  // 5. 计算转账数量与 0.20% 链上磨损
  const rawAmount = BigInt(Math.round(amount * (10 ** decimals)));
  const feeAmount = (rawAmount * feeBps) / 10000n;
  const netAmount = rawAmount - feeAmount;

  tx.add(
    createTransferCheckedWithFeeInstruction(
      founderAta,
      mint,
      recipientAta,
      founder.publicKey,
      rawAmount,
      decimals,
      feeAmount,
      [],
      TOKEN_2022_PROGRAM_ID
    )
  );

  // 6. 获取最新 Blockhash 并由水龙头私钥签名
  const blockhashRes = await solanaRpc('getLatestBlockhash', [{ commitment: 'confirmed' }]);
  if (!blockhashRes || !blockhashRes.value) {
    throw new Error('获取 Solana Devnet 最新区块哈希失败');
  }

  tx.recentBlockhash = blockhashRes.value.blockhash;
  tx.feePayer = founder.publicKey;
  tx.sign(founder);

  // 7. 广播交易到 Solana Devnet
  const serialized = tx.serialize().toString('base64');
  const signature = await solanaRpc('sendTransaction', [serialized, { encoding: 'base64', skipPreflight: false }]);

  // 8. 记录冷却时间
  claimRecords.set(addressKey, now);
  claimRecords.set(ipKey, now);

  const grossUi = amount;
  const feeUi = Number(feeAmount) / (10 ** decimals);
  const netUi = Number(netAmount) / (10 ** decimals);

  return {
    success: true,
    signature,
    recipientAddress: recipientPubkey.toBase58(),
    recipientAta: recipientAta.toBase58(),
    grossAmount: grossUi,
    feeAmount: feeUi,
    netReceivedAmount: netUi,
    ataCreated,
    explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    message: `🎉 成功发放 ${grossUi} $VCTR！链上扣除 0.20% (${feeUi} $VCTR) 手续费，净到账 ${netUi} $VCTR。`,
  };
}

module.exports = {
  requestDevnetFaucet,
  FAUCET_AMOUNT_VCTR,
  COOLDOWN_MS,
};
