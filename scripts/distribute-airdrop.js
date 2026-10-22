// scripts/distribute-airdrop.js
// Vectra ($VCTR) 创世空投自动化批量分发脚本
// 读取来自官网申请登记的白名单队列，自动化向符合条件的 Solana 钱包分发 $VCTR

const fs = require('fs');
const path = require('path');
const {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} = require('@solana/web3.js');
const {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  getAccount,
} = require('@solana/spl-token');

async function main() {
  console.log('====================================================');
  console.log('🎁 Vectra Protocol ($VCTR) 创世空投批量分发控制台');
  console.log('====================================================\n');

  const claimsPath = path.join(__dirname, '..', 'config', 'airdrop-claims.json');
  if (!fs.existsSync(claimsPath)) {
    console.log('ℹ️ 目前暂无已登记的空投申请记录 (config/airdrop-claims.json 不存在)。');
    return;
  }

  const claims = JSON.parse(fs.readFileSync(claimsPath, 'utf-8'));
  console.log(`📋 共读取到 ${claims.length} 条已核验的空投申请记录：`);
  claims.forEach((c, idx) => {
    console.log(`  [${idx + 1}] 钱包: ${c.wallet} | X: ${c.twitter} | 额度: ${c.amount} $VCTR | 状态: ${c.status || 'queued'}`);
  });

  const queuedClaims = claims.filter((c) => !c.txId || c.status === 'queued');
  console.log(`\n⏳ 待发放数量: ${queuedClaims.length} 个地址`);

  if (queuedClaims.length === 0) {
    console.log('✅ 所有申请均已完成链上分发！');
    return;
  }

  const keysPath = path.join(__dirname, '..', 'config', 'keys.json');
  const deployPath = path.join(__dirname, '..', 'config', 'deployment.mainnet.json');
  if (!fs.existsSync(keysPath) || !fs.existsSync(deployPath)) {
    console.error('❌ 未找到 keys.json 或 deployment.mainnet.json 配置');
    return;
  }

  const keys = JSON.parse(fs.readFileSync(keysPath, 'utf-8'));
  const deploy = JSON.parse(fs.readFileSync(deployPath, 'utf-8'));

  const founder = Keypair.fromSecretKey(new Uint8Array(keys.founderSecretKey));
  const mintPubkey = new PublicKey(deploy.vectraMintAddress);
  const founderAta = new PublicKey(deploy.founderAta);
  const decimals = deploy.decimals || 9;

  const rpcUrl = process.env.SOLANA_MAINNET_RPC || 'https://api.mainnet-beta.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');

  console.log(`\n- 创始人钱包: ${founder.publicKey.toBase58()}`);
  console.log(`- $VCTR Mint 地址: ${mintPubkey.toBase58()}`);

  let balance = 0;
  try {
    balance = (await connection.getBalance(founder.publicKey)) / 1e9;
  } catch (_) {
    console.log('⚠️ 无法直接连接公网 RPC 查询余额（可能需要代理）。');
  }

  console.log(`- 创始人钱包当前 SOL 余额: ${balance} SOL`);

  const EST_GAS_PER_TX = 0.0022; // 0.002 SOL ATA rent + fee
  const totalGasNeeded = queuedClaims.length * EST_GAS_PER_TX;

  console.log(`- 预计批量发放需要 Gas 总额: 约 ${totalGasNeeded.toFixed(4)} SOL`);

  if (balance < 0.005) {
    console.log('\n⚠️ 当前创始人钱包 SOL 余额不足以直接支付全网链上分发 Gas。');
    console.log('💡 所有申请记录已安全保存在 config/airdrop-claims.json 中。');
    console.log(`后续只需向创始人地址 [${founder.publicKey.toBase58()}] 充值小额 SOL，再次运行此脚本即可一键完成全量链上空投分发！\n`);
    return;
  }

  console.log('\n🚀 开始执行批量链上转账...');
  // 逐个或批量分发
  for (const claim of queuedClaims) {
    try {
      const recipient = new PublicKey(claim.wallet);
      const recipientAta = getAssociatedTokenAddressSync(mintPubkey, recipient, false, TOKEN_2022_PROGRAM_ID);
      
      const tx = new Transaction();
      // 检查接收者 ATA 是否存在
      let ataExists = true;
      try {
        await getAccount(connection, recipientAta, 'confirmed', TOKEN_2022_PROGRAM_ID);
      } catch {
        ataExists = false;
      }

      if (!ataExists) {
        tx.add(
          createAssociatedTokenAccountInstruction(
            founder.publicKey,
            recipientAta,
            recipient,
            mintPubkey,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }

      const amountRaw = BigInt(claim.amount) * BigInt(10 ** decimals);
      tx.add(
        createTransferCheckedInstruction(
          founderAta,
          mintPubkey,
          recipientAta,
          founder.publicKey,
          amountRaw,
          decimals,
          [],
          TOKEN_2022_PROGRAM_ID
        )
      );

      const sig = await sendAndConfirmTransaction(connection, tx, [founder]);
      console.log(`✅ 已向 ${claim.wallet} 发放 ${claim.amount} $VCTR | Tx: ${sig}`);
      claim.status = 'sent';
      claim.txId = sig;
      claim.sentAt = new Date().toISOString();
      fs.writeFileSync(claimsPath, JSON.stringify(claims, null, 2));
    } catch (err) {
      console.error(`❌ 发送至 ${claim.wallet} 失败:`, err.message);
    }
  }

  console.log('\n🎉 空投批处理完毕！最新状态已更新至 airdrop-claims.json');
}

main().catch(console.error);
