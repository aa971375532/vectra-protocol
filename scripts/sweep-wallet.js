// scripts/sweep-wallet.js
// 将备用钱包中的所有微量 SOL（含 890,880 lamports 基础租金）全部清空归集到部署钱包
const bs58 = require('bs58');
const { Connection, Keypair, PublicKey, Transaction, SystemProgram } = require('@solana/web3.js');
const { fetch, ProxyAgent } = require('undici');

function getProxyDispatcher() {
  const proxyUrl = process.env.HTTP_PROXY || process.env.http_proxy || 'http://127.0.0.1:7897';
  try {
    return new ProxyAgent(proxyUrl);
  } catch (e) {
    return undefined;
  }
}

async function solanaRpc(rpcUrl, method, params) {
  const dispatcher = getProxyDispatcher();
  const body = JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params });
  let res;
  try {
    res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      dispatcher,
    });
  } catch (err) {
    res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  }
  const json = await res.json();
  if (json.error) throw new Error(JSON.stringify(json.error));
  return json.result;
}

async function main() {
  const privKeyInput = process.argv[2];
  if (!privKeyInput) {
    console.log('使用说明: node scripts/sweep-wallet.js <备用钱包私钥Base58>');
    process.exit(1);
  }

  let senderKeypair;
  try {
    const decoded = bs58.decode(privKeyInput.trim());
    senderKeypair = Keypair.fromSecretKey(decoded);
  } catch (e) {
    console.error('❌ 私钥格式解析错误，请确保是 Phantom 导出的 Base58 私钥字符串。');
    process.exit(1);
  }

  const targetPubkey = new PublicKey('CvKbQM81DgZpYufBJ8Z1mVxZRVAWqX6dEAPjKyy56CTg');
  const rpcUrl = 'https://api.mainnet-beta.solana.com';

  console.log(`- 备用钱包地址: ${senderKeypair.publicKey.toBase58()}`);
  console.log(`- 目标收款钱包: ${targetPubkey.toBase58()}`);

  const balRes = await solanaRpc(rpcUrl, 'getBalance', [senderKeypair.publicKey.toBase58()]);
  const balance = balRes?.value || 0;
  console.log(`- 备用钱包当前余额: ${balance} lamports (${balance / 1e9} SOL)`);

  if (balance <= 5000) {
    console.error('❌ 余额不足支付手续费 (5000 lamports)');
    process.exit(1);
  }

  const fee = 5000;
  const sweepAmount = balance - fee; // 全部清空，账户归零销户

  console.log(`- 准备归集提取金额: ${sweepAmount} lamports (${sweepAmount / 1e9} SOL)`);

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: senderKeypair.publicKey,
      toPubkey: targetPubkey,
      lamports: sweepAmount,
    })
  );

  const hashRes = await solanaRpc(rpcUrl, 'getLatestBlockhash', [{ commitment: 'confirmed' }]);
  tx.recentBlockhash = hashRes.value.blockhash;
  tx.feePayer = senderKeypair.publicKey;
  tx.sign(senderKeypair);

  console.log('🚀 广播归集交易到 Solana 主网...');
  const sig = await solanaRpc(rpcUrl, 'sendTransaction', [
    tx.serialize().toString('base64'),
    { encoding: 'base64' },
  ]);

  console.log(`✅ 成功归集！Tx Signature: ${sig}`);
  console.log(`请检查部署主钱包余额，随后即可直接运行 node scripts/deploy-mainnet.js 一键部署！`);
}

main().catch((err) => {
  console.error('❌ 归集执行失败:', err.message);
  process.exit(1);
});
