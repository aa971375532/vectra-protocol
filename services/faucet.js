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

// 增强型防刷机制: 24 小时严格冷却 + 本地持久化存储
const COOLDOWN_HOURS = parseInt(process.env.FAUCET_COOLDOWN_HOURS || '24', 10);
const COOLDOWN_MS = COOLDOWN_HOURS * 60 * 60 * 1000; // 默认 24 小时冷却时间 (86,400,000 ms)
const FAUCET_AMOUNT_VCTR = 500; // 默认每次发放 500 $VCTR

const CLAIMS_FILE = path.join(__dirname, '..', 'config', 'faucet-claims.json');

// 从本地文件加载领水持久化记录
function loadClaims() {
  try {
    if (fs.existsSync(CLAIMS_FILE)) {
      const data = JSON.parse(fs.readFileSync(CLAIMS_FILE, 'utf-8'));
      return new Map(Object.entries(data));
    }
  } catch (err) {
    console.warn('⚠️ 读取历史领水记录失败，将初始化新记录表:', err.message);
  }
  return new Map();
}

// 保存领水记录到本地文件 (防止服务重启后冷却失效)
function saveClaims(records) {
  try {
    const obj = Object.fromEntries(records);
    fs.writeFileSync(CLAIMS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (err) {
    console.warn('⚠️ 领水持久化写入失败:', err.message);
  }
}

const claimRecords = loadClaims();

// 格式化人性化倒计时显示
function formatRemainingTime(remainingMs) {
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours} 小时 ${minutes} 分钟`;
  }
  if (minutes > 0) {
    return `${minutes} 分钟 ${seconds} 秒`;
  }
  return `${seconds} 秒`;
}

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

  // 2. 严格频率限制 (按地址和 IP 限制 24 小时)
  const now = Date.now();
  const addressKey = `addr:${recipientAddress}`;
  const ipKey = `ip:${clientIp}`;

  const isLocalhost = !clientIp || clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1' || clientIp === 'localhost';

  const lastAddressClaim = claimRecords.get(addressKey) || 0;
  const lastIpClaim = claimRecords.get(ipKey) || 0;

  if (now - lastAddressClaim < COOLDOWN_MS) {
    const remainingMs = COOLDOWN_MS - (now - lastAddressClaim);
    throw new Error(`防刷限制：该钱包每 ${COOLDOWN_HOURS} 小时限领一次，当前仍在冷却中，请在 ${formatRemainingTime(remainingMs)} 后再试`);
  }
  if (!isLocalhost && (now - lastIpClaim < COOLDOWN_MS)) {
    const remainingMs = COOLDOWN_MS - (now - lastIpClaim);
    throw new Error(`防刷限制：当前 IP 每 ${COOLDOWN_HOURS} 小时限领一次，当前仍在冷却中，请在 ${formatRemainingTime(remainingMs)} 后再试`);
  }

  // 3. 读取部署配置与密钥
  const keysPath = path.join(__dirname, '..', 'config', 'keys.json');
  const deployPath = path.join(__dirname, '..', 'config', 'deployment.json');

  let keys;
  if (process.env.FOUNDER_SECRET_KEY) {
    try {
      const rawSecret = typeof process.env.FOUNDER_SECRET_KEY === 'string'
        ? JSON.parse(process.env.FOUNDER_SECRET_KEY)
        : process.env.FOUNDER_SECRET_KEY;
      keys = {
        founderSecretKey: rawSecret,
        founderPublicKey: process.env.FOUNDER_PUBLIC_KEY || 'CvKbQM81DgZpYufBJ8Z1mVxZRVAWqX6dEAPjKyy56CTg',
      };
    } catch (e) {
      throw new Error('FOUNDER_SECRET_KEY 环境变量解析失败: ' + e.message);
    }
  } else if (fs.existsSync(keysPath)) {
    keys = JSON.parse(fs.readFileSync(keysPath, 'utf-8'));
  } else {
    throw new Error('未检测到水龙头服务端密钥配置 (请在云端配置 FOUNDER_SECRET_KEY 环境变量或提供 keys.json)');
  }

  let deploy;
  if (process.env.DEPLOYMENT_JSON) {
    try {
      deploy = JSON.parse(process.env.DEPLOYMENT_JSON);
    } catch (e) {
      deploy = {
        vectraMintAddress: '8aGGfyBvgeiq9WbyZRbgYSKkXhnYymNVh7oMw2ju4t14',
        founderAta: 'Bqe1g4C1ZQiwjmu6JjUBU3AZCcddQrYq6Lnr6mPgP3r',
        decimals: 9,
        feeBasisPoints: 20,
      };
    }
  } else if (fs.existsSync(deployPath)) {
    deploy = JSON.parse(fs.readFileSync(deployPath, 'utf-8'));
  } else {
    deploy = {
      vectraMintAddress: '8aGGfyBvgeiq9WbyZRbgYSKkXhnYymNVh7oMw2ju4t14',
      founderAta: 'Bqe1g4C1ZQiwjmu6JjUBU3AZCcddQrYq6Lnr6mPgP3r',
      decimals: 9,
      feeBasisPoints: 20,
    };
  }

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

  // 8. 记录冷却时间并持久化到本地文件
  claimRecords.set(addressKey, now);
  if (!isLocalhost) {
    claimRecords.set(ipKey, now);
  }
  saveClaims(claimRecords);

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
    cooldownHours: COOLDOWN_HOURS,
    explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    message: `🎉 成功发放 ${grossUi} $VCTR！链上扣除 0.20% (${feeUi} $VCTR) 手续费，净到账 ${netUi} $VCTR (冷却时间: 24 小时)。`,
  };
}

module.exports = {
  requestDevnetFaucet,
  FAUCET_AMOUNT_VCTR,
  COOLDOWN_MS,
  COOLDOWN_HOURS,
};
