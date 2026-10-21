// scripts/generate-keys.js
// 为 Vectra 项目生成部署者（Founder）和金库（Treasury）在 Solana 上的专用密钥对

const { Keypair } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

const configDir = path.join(__dirname, '..', 'config');
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

const keyFilePath = path.join(configDir, 'keys.json');

if (fs.existsSync(keyFilePath)) {
  console.log('✅ 密钥文件已存在于 config/keys.json，无需重复生成。');
  const existing = JSON.parse(fs.readFileSync(keyFilePath, 'utf-8'));
  console.log('Founder 钱包地址:', existing.founderPublicKey);
  console.log('Treasury 金库地址:', existing.treasuryPublicKey);
  process.exit(0);
}

// 生成创始人钱包 (Founder)
const founder = Keypair.generate();
// 生成协议金库钱包 (Treasury - 用于接收 50% 留存手续费)
const treasury = Keypair.generate();

const keys = {
  founderPublicKey: founder.publicKey.toBase58(),
  founderSecretKey: Array.from(founder.secretKey),
  treasuryPublicKey: treasury.publicKey.toBase58(),
  treasurySecretKey: Array.from(treasury.secretKey),
};

fs.writeFileSync(keyFilePath, JSON.stringify(keys, null, 2), 'utf-8');

console.log('====================================================');
console.log('🎉 Vectra ($VCTR) 核心密钥对已成功生成！');
console.log('====================================================');
console.log('👤 创始人个人地址 (Founder):', keys.founderPublicKey);
console.log('🏦 协议金库地址 (Treasury):', keys.treasuryPublicKey);
console.log('📁 私钥已加密保存在: config/keys.json (请妥善保管，切勿泄露)');
console.log('====================================================');
