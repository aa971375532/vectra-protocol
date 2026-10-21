// scripts/create-vectra-token.js
// 基于 Solana Token-2022 部署 Vectra ($VCTR) 并配置转账费分流扩展

const { setGlobalDispatcher, ProxyAgent } = require('undici');
try {
  setGlobalDispatcher(new ProxyAgent('http://127.0.0.1:7897'));
} catch (e) {}

const {
  Connection,
  Keypair,
  clusterApiUrl,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} = require('@solana/web3.js');
const {
  ExtensionType,
  createInitializeMintInstruction,
  getMintLen,
  TOKEN_2022_PROGRAM_ID,
  createInitializeTransferFeeConfigInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
} = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');

// 纯 HTTP 轮询确认交易，彻底避免 WebSocket 在代理环境下的连接超时
async function sendAndConfirmViaHttp(connection, transaction, signers) {
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = signers[0].publicKey;
  transaction.sign(...signers);

  const rawTx = transaction.serialize();
  const signature = await connection.sendRawTransaction(rawTx, {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });

  console.log(`   📡 交易已广播，链上凭证: ${signature}`);
  console.log(`   ⏳ 正在等待 Solana 节点确认出块...`);

  const startTime = Date.now();
  while (Date.now() - startTime < 30000) {
    const status = await connection.getSignatureStatus(signature);
    const confirmation = status?.value?.confirmationStatus;
    if (confirmation === 'confirmed' || confirmation === 'finalized') {
      if (status.value.err) {
        throw new Error(`交易执行出错: ${JSON.stringify(status.value.err)}`);
      }
      return signature;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return signature;
}

async function main() {
  console.log('======================================================================');
  console.log('🚀 开始在 Solana Devnet 测试网上正式铸造 Vectra ($VCTR) 创世代币...');
  console.log('======================================================================');

  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

  const keyFilePath = path.join(__dirname, '..', 'config', 'keys.json');
  if (!fs.existsSync(keyFilePath)) {
    console.error('❌ 未找到密钥文件，请先运行: npm run setup:keys');
    process.exit(1);
  }

  const keys = JSON.parse(fs.readFileSync(keyFilePath, 'utf-8'));
  const founder = Keypair.fromSecretKey(Uint8Array.from(keys.founderSecretKey));
  const treasuryPublicKey = Keypair.fromSecretKey(
    Uint8Array.from(keys.treasurySecretKey)
  ).publicKey;

  console.log('👤 创始人个人地址 (Founder):', founder.publicKey.toBase58());
  console.log('🏦 协议金库地址 (Treasury):', treasuryPublicKey.toBase58());

  const balance = await connection.getBalance(founder.publicKey);
  console.log(`💰 当前 SOL 余额: ${balance / LAMPORTS_PER_SOL} SOL`);

  if (balance < 0.05 * LAMPORTS_PER_SOL) {
    console.error('❌ 余额不足，请前往 https://faucet.solana.com/ 先领水');
    process.exit(1);
  }

  // 1. 生成 Vectra 代币 Mint 地址
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;
  const decimals = 9;

  // 手续费配置: 20 基点 = 0.2% (其中 0.1% 销毁，0.1% 归金库)
  const feeBasisPoints = 20;
  const maxFee = BigInt(1000 * 10 ** decimals);

  console.log('\n⚙️ 1/2 正在配置 Token-2022 结构与 0.2% 双轨制手续费扩展...');
  console.log('🪙 新生 Vectra Mint 地址:', mint.toBase58());

  const extensions = [ExtensionType.TransferFeeConfig];
  const mintLen = getMintLen(extensions);
  const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

  const initTx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: founder.publicKey,
      newAccountPubkey: mint,
      space: mintLen,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    createInitializeTransferFeeConfigInstruction(
      mint,
      founder.publicKey,
      treasuryPublicKey,
      feeBasisPoints,
      maxFee,
      TOKEN_2022_PROGRAM_ID
    ),
    createInitializeMintInstruction(
      mint,
      decimals,
      founder.publicKey,
      founder.publicKey,
      TOKEN_2022_PROGRAM_ID
    )
  );

  await sendAndConfirmViaHttp(connection, initTx, [founder, mintKeypair]);
  console.log('🎉 Vectra ($VCTR) 代币合约在 Solana 部署成功！');

  // 2. 为创始人创建代币账户并铸造 10 亿枚 Vectra
  console.log('\n⚙️ 2/2 正在为创始人创建代币接收账户并铸造创世 1,000,000,000 $VCTR...');
  const founderAta = getAssociatedTokenAddressSync(
    mint,
    founder.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  const initialSupply = BigInt(1000000000) * BigInt(10 ** decimals);

  const mintTx = new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(
      founder.publicKey,
      founderAta,
      founder.publicKey,
      mint,
      TOKEN_2022_PROGRAM_ID
    ),
    createMintToInstruction(
      mint,
      founderAta,
      founder.publicKey,
      initialSupply,
      [],
      TOKEN_2022_PROGRAM_ID
    )
  );

  await sendAndConfirmViaHttp(connection, mintTx, [founder]);
  console.log('======================================================================');
  console.log('🎊 恭喜！10 亿枚 Vectra ($VCTR) 创世代币已全部注入创始人钱包！');
  console.log('======================================================================');
  console.log('🪙 代币 Mint 地址:', mint.toBase58());
  console.log('📦 创始人代币账户 (ATA):', founderAta.toBase58());
  console.log(
    '🔍 Solana 浏览器查看 Mint: https://explorer.solana.com/address/' +
      mint.toBase58() +
      '?cluster=devnet'
  );
  console.log(
    '🔍 Solana 浏览器查看创始人资产: https://explorer.solana.com/address/' +
      founder.publicKey.toBase58() +
      '?cluster=devnet'
  );
  console.log('======================================================================\n');

  // 保存部署配置供前端和服务端使用
  const deploymentInfo = {
    network: 'devnet',
    programId: TOKEN_2022_PROGRAM_ID.toBase58(),
    vectraMintAddress: mint.toBase58(),
    decimals,
    feeBasisPoints,
    founderAta: founderAta.toBase58(),
    treasuryPublicKey: treasuryPublicKey.toBase58(),
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(__dirname, '..', 'config', 'deployment.json'),
    JSON.stringify(deploymentInfo, null, 2),
    'utf-8'
  );
}

main().catch((err) => {
  console.error('❌ 执行失败:', err);
});
