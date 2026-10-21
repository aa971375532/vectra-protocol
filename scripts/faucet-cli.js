#!/usr/bin/env node
// scripts/faucet-cli.js
// 命令行水龙头工具: 为指定 Solana 钱包领取 Vectra ($VCTR) 测试币

const { requestDevnetFaucet } = require('../services/faucet');

async function main() {
  const targetAddress = process.argv[2];
  if (!targetAddress) {
    console.log('使用说明:');
    console.log('  node scripts/faucet-cli.js <Solana钱包公钥地址> [数量]');
    console.log('  npm run faucet <Solana钱包公钥地址>');
    process.exit(1);
  }

  const amount = process.argv[3] ? parseFloat(process.argv[3]) : 500;
  console.log(`\n🚰 正在向 ${targetAddress} 发送 ${amount} $VCTR 测试币...`);

  try {
    const result = await requestDevnetFaucet(targetAddress, '127.0.0.1', amount);
    console.log('\n======================================================');
    console.log('✅ 发放成功！');
    console.log(`- 目标地址: ${result.recipientAddress}`);
    console.log(`- 代币账户(ATA): ${result.recipientAta} ${result.ataCreated ? '(新创建)' : '(已存在)'}`);
    console.log(`- 发放总额: ${result.grossAmount} $VCTR`);
    console.log(`- 链上磨损(0.20%): ${result.feeAmount} $VCTR`);
    console.log(`- 实际到账: ${result.netReceivedAmount} $VCTR`);
    console.log(`- 交易签名: ${result.signature}`);
    console.log(`- 链上浏览器: ${result.explorerUrl}`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ 领水失败:', err.message);
    process.exit(1);
  }
}

main();
