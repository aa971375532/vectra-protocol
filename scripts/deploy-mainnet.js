// scripts/deploy-mainnet.js
// Vectra ($VCTR) Solana Mainnet-Beta 官方主网部署脚本
// 使用 SPL Token-2022 部署包含 0.20% 双轨制手续费扩展的原生代币

const path = require('path');
const fs = require('fs');
const {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  SystemProgram,
} = require('@solana/web3.js');
const {
  TOKEN_2022_PROGRAM_ID,
  ExtensionType,
  createInitializeMintInstruction,
  createInitializeTransferFeeConfigInstruction,
  getMintLen,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  AuthorityType,
} = require('@solana/spl-token');
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
  console.log('================================================================');
  console.log('🚀 准备部署 Vectra ($VCTR) 到 Solana Mainnet-Beta 生产主网');
  console.log('================================================================\n');

  const keysPath = path.join(__dirname, '..', 'config', 'keys.json');
  if (!fs.existsSync(keysPath)) {
    console.error('❌ 未找到 config/keys.json 密钥凭据文件！');
    process.exit(1);
  }

  const keys = JSON.parse(fs.readFileSync(keysPath, 'utf-8'));
  const founder = Keypair.fromSecretKey(new Uint8Array(keys.founderSecretKey));
  const treasuryPubkey = new PublicKey(keys.treasuryPublicKey);

  const rpcUrl = process.env.SOLANA_MAINNET_RPC || 'https://api.mainnet-beta.solana.com';
  console.log(`- 部署者公钥: ${founder.publicKey.toBase58()}`);
  console.log(`- 协议金库公钥: ${treasuryPubkey.toBase58()}`);
  console.log(`- RPC 节点: ${rpcUrl}`);

  // 检查主网 SOL 余额
  const balanceRes = await solanaRpc(rpcUrl, 'getBalance', [founder.publicKey.toBase58()]);
  const solBalance = (balanceRes?.value || 0) / 1e9;
  console.log(`- 部署者当前主网 SOL 余额: ${solBalance} SOL`);

  const ESTIMATED_SOL = 0.03;
  if (solBalance < ESTIMATED_SOL) {
    console.warn(`\n⚠️ 部署者钱包主网 SOL 余额不足 (${solBalance} SOL < 建议值 ${ESTIMATED_SOL} SOL)。`);
    console.log(`请向以下地址充值至少 0.05 SOL 作为主网租金与手续费后重试：`);
    console.log(`👉 ${founder.publicKey.toBase58()}`);
    console.log('\n提示: 当前处于安全预检模式，未执行链上扣款。充值完毕后执行 `npm run deploy:mainnet` 即可。');
    process.exit(0);
  }

  console.log('\n[1/4] 生成全新 Mainnet 代币 Mint 密钥对...');
  const mintKeypair = Keypair.generate();
  const decimals = 9;
  const feeBasisPoints = 20; // 0.20%
  const maxFee = BigInt(5_000_000 * 10 ** decimals);

  const extensions = [ExtensionType.TransferFeeConfig];
  const mintLen = getMintLen(extensions);
  const rentRes = await solanaRpc(rpcUrl, 'getMinimumBalanceForRentExemption', [mintLen]);
  const lamports = rentRes;

  console.log('\n[2/4] 构建并广播初始化 Mint 与 0.20% 手续费配置交易...');
  const tx1 = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: founder.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: mintLen,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    createInitializeTransferFeeConfigInstruction(
      mintKeypair.publicKey,
      treasuryPubkey, // 费率管理权限 -> 协议金库
      treasuryPubkey, // 提取暂扣费权限 -> 协议金库
      feeBasisPoints,
      maxFee,
      TOKEN_2022_PROGRAM_ID
    ),
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      decimals,
      founder.publicKey, // 初始铸币权限 (铸造完即销毁)
      null,              // 冻结权限永久置空 (100% Rug-proof)
      TOKEN_2022_PROGRAM_ID
    )
  );

  const hashRes1 = await solanaRpc(rpcUrl, 'getLatestBlockhash', [{ commitment: 'confirmed' }]);
  tx1.recentBlockhash = hashRes1.value.blockhash;
  tx1.feePayer = founder.publicKey;
  tx1.sign(founder, mintKeypair);

  const sig1 = await solanaRpc(rpcUrl, 'sendTransaction', [
    tx1.serialize().toString('base64'),
    { encoding: 'base64' },
  ]);
  console.log(`  ✅ Mint 创建完成! Tx: ${sig1}`);

  console.log('\n[3/4] 创建创始人金库 ATA 并一次性铸造 10 亿枚硬顶总量...');
  const founderAta = getAssociatedTokenAddressSync(
    mintKeypair.publicKey,
    founder.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  const TOTAL_SUPPLY_RAW = BigInt(1_000_000_000) * BigInt(10 ** decimals);

  const tx2 = new Transaction().add(
    createAssociatedTokenAccountInstruction(
      founder.publicKey,
      founderAta,
      founder.publicKey,
      mintKeypair.publicKey,
      TOKEN_2022_PROGRAM_ID
    ),
    createMintToInstruction(
      mintKeypair.publicKey,
      founderAta,
      founder.publicKey,
      TOTAL_SUPPLY_RAW,
      [],
      TOKEN_2022_PROGRAM_ID
    ),
    // 永久放弃铸币权 (Hard Cap 锁死，不可超发)
    createSetAuthorityInstruction(
      mintKeypair.publicKey,
      founder.publicKey,
      AuthorityType.MintTokens,
      null,
      [],
      TOKEN_2022_PROGRAM_ID
    )
  );

  const hashRes2 = await solanaRpc(rpcUrl, 'getLatestBlockhash', [{ commitment: 'confirmed' }]);
  tx2.recentBlockhash = hashRes2.value.blockhash;
  tx2.feePayer = founder.publicKey;
  tx2.sign(founder);

  const sig2 = await solanaRpc(rpcUrl, 'sendTransaction', [
    tx2.serialize().toString('base64'),
    { encoding: 'base64' },
  ]);
  console.log(`  ✅ 1,000,000,000 $VCTR 铸造完毕且铸币权已永久销毁! Tx: ${sig2}`);

  const mainnetDeployInfo = {
    network: 'mainnet-beta',
    programId: TOKEN_2022_PROGRAM_ID.toBase58(),
    vectraMintAddress: mintKeypair.publicKey.toBase58(),
    decimals,
    feeBasisPoints,
    founderAta: founderAta.toBase58(),
    treasuryPublicKey: treasuryPubkey.toBase58(),
    mintAuthorityRevoked: true,
    freezeAuthorityRevoked: true,
    deployedAt: new Date().toISOString(),
  };

  const outPath = path.join(__dirname, '..', 'config', 'deployment.mainnet.json');
  fs.writeFileSync(outPath, JSON.stringify(mainnetDeployInfo, null, 2));

  console.log('\n================================================================');
  console.log('🎉 Vectra ($VCTR) 主网部署圆满完成！');
  console.log(`- Mint 地址: ${mainnetDeployInfo.vectraMintAddress}`);
  console.log(`- 创始人金库: ${mainnetDeployInfo.founderAta}`);
  console.log(`- 配置文件已保存至: ${outPath}`);
  console.log(`- Solana Explorer: https://explorer.solana.com/address/${mainnetDeployInfo.vectraMintAddress}`);
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('\n❌ 主网部署失败:', err.message);
  process.exit(1);
});
