// scripts/view-keys.js
// 查看创始人与协议金库的地址，并生成 Phantom 钱包可直接导入的 Base58 私钥

const fs = require('fs');
const path = require('path');
const bs58 = require('bs58');

const keyFilePath = path.join(__dirname, '..', 'config', 'keys.json');

if (!fs.existsSync(keyFilePath)) {
  console.error('❌ 未找到 config/keys.json 文件！');
  process.exit(1);
}

const keys = JSON.parse(fs.readFileSync(keyFilePath, 'utf-8'));

const founderBase58Key = bs58.encode(Uint8Array.from(keys.founderSecretKey));
const treasuryBase58Key = bs58.encode(Uint8Array.from(keys.treasurySecretKey));

console.log('======================================================================');
console.log('💎 Vectra ($VCTR) 官方核心账户与链上查看方式');
console.log('======================================================================\n');

console.log('👤 【1. 创始人个人钱包 (Founder)】');
console.log('   • 公开地址 (Public Key):');
console.log(`     ${keys.founderPublicKey}`);
console.log('   • Solana 官方区块链浏览器查看:');
console.log(`     https://explorer.solana.com/address/${keys.founderPublicKey}?cluster=devnet`);
console.log('   • Phantom 钱包导入用私钥 (Base58):');
console.log(`     ${founderBase58Key}\n`);

console.log('🏦 【2. 协议金库钱包 (Treasury - 接收 50% 留存收益)】');
console.log('   • 公开地址 (Public Key):');
console.log(`     ${keys.treasuryPublicKey}`);
console.log('   • Solana 官方区块链浏览器查看:');
console.log(`     https://explorer.solana.com/address/${keys.treasuryPublicKey}?cluster=devnet`);
console.log('   • Phantom 钱包导入用私钥 (Base58):');
console.log(`     ${treasuryBase58Key}\n`);

console.log('======================================================================');
console.log('⚠️ 安全提醒：私钥代表最高控制权，仅供您个人在受信任的环境下保管，切勿泄露给他人！');
console.log('======================================================================');
