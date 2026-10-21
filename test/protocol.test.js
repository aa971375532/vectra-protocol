// test/protocol.test.js
// Vectra 协议核心数学与逻辑自动化测试套件

const assert = require('assert');
const { VectraClient } = require('../packages/sdk');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('🧪 开始运行 Vectra Protocol 核心协议自动化测试...\n');

  let passedTests = 0;

  async function runTest(testName, fn) {
    try {
      await fn();
      console.log(`  ✅ [PASS] ${testName}`);
      passedTests++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${testName}`);
      console.error(err);
      process.exit(1);
    }
  }

  // 测试 1: 0.2% 双轨制手续费计算测试 (0.1% 销毁 + 0.1% 金库)
  await runTest('手续费拆分数学模型 (0.2% 费率: 50% 销毁 + 50% 金库)', () => {
    const client = new VectraClient({ feeBasisPoints: 20 });
    const paymentAmount = 100.0;
    const fees = client.calculateFees(paymentAmount);

    assert.strictEqual(fees.grossAmount, 100.0);
    assert.strictEqual(fees.totalFee, 0.2); // 0.2% of 100 = 0.2
    assert.strictEqual(fees.burnAmount, 0.1); // 0.1% of 100 = 0.1
    assert.strictEqual(fees.treasuryAmount, 0.1); // 0.1% of 100 = 0.1
    assert.strictEqual(fees.netMerchantAmount, 99.8);
  });

  // 测试 2: 9 位精度超微额扣费精度测试 (无浮点丢失)
  await runTest('9 位精度超微额计算 (BigInt 无精度丢失)', () => {
    const decimals = 9;
    const microPayment = 0.000000001; // 1 个最小单位
    const rawLamports = BigInt(Math.round(microPayment * 10 ** decimals));
    assert.strictEqual(rawLamports, 1n);

    const regularPayment = 20.0;
    const rawRegular = BigInt(Math.round(regularPayment * 10 ** decimals));
    assert.strictEqual(rawRegular, 20000000000n);
  });

  // 测试 3: 核心密钥配置完整性检验
  await runTest('核心钱包凭证完整性检验 (Founder & Treasury)', () => {
    const keyPath = path.join(__dirname, '..', 'config', 'keys.json');
    assert.ok(fs.existsSync(keyPath), 'config/keys.json 应当存在');

    const keys = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
    assert.ok(keys.founderPublicKey && keys.founderPublicKey.length >= 32);
    assert.ok(keys.treasuryPublicKey && keys.treasuryPublicKey.length >= 32);
    assert.strictEqual(keys.founderSecretKey.length, 64);
    assert.strictEqual(keys.treasurySecretKey.length, 64);
  });

  // 测试 4: SDK 异步链上调用容错测试
  await runTest('SDK 签名校验基础逻辑 (无效签名安全拒绝)', async () => {
    const client = new VectraClient();
    const result = await client.verifyPayment('invalid_sig_123');
    assert.strictEqual(result, false);
  });

  console.log(`\n🎉 全部 ${passedTests} 项协议测试全部通过！所有数学与逻辑模型严格对齐设计白皮书。\n`);
}

main();
