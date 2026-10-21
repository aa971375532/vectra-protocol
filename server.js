// server.js
// Vectra AI Pay 通用支付门户与 API 结算服务

const express = require('express');
const path = require('path');
const fs = require('fs');
const { requestDevnetFaucet, FAUCET_AMOUNT_VCTR, COOLDOWN_MS, COOLDOWN_HOURS } = require('./services/faucet');

const app = express();
const PORT = process.env.PORT || 3000;

// 跨域支持 (允许来自 GitHub Pages 或本地前端的 API 请求)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.static(path.join(__dirname, 'public')));

// 静态托管白皮书文档供前端直接查看
app.get('/VECTRA_WHITEPAPER.md', (req, res) => {
  res.sendFile(path.join(__dirname, 'VECTRA_WHITEPAPER.md'));
});
app.get('/VECTRA_WHITEPAPER_CN.md', (req, res) => {
  res.sendFile(path.join(__dirname, 'VECTRA_WHITEPAPER_CN.md'));
});
app.get('/VECTRA_WHITEPAPER_EN.md', (req, res) => {
  res.sendFile(path.join(__dirname, 'VECTRA_WHITEPAPER_EN.md'));
});
app.get('/PITCH_DECK.md', (req, res) => {
  res.sendFile(path.join(__dirname, 'PITCH_DECK.md'));
});

// 读取部署配置
function getDeploymentInfo() {
  const deployPath = path.join(__dirname, 'config', 'deployment.json');
  if (fs.existsSync(deployPath)) {
    return JSON.parse(fs.readFileSync(deployPath, 'utf-8'));
  }
  return {
    network: 'devnet',
    vectraMintAddress: 'Vctr9999999999999999999999999999999999999999',
    decimals: 9,
    feeBasisPoints: 20,
    deployedAt: 'Preview Mode',
  };
}

// 模拟或真实链上数据统计
let stats = {
  totalBurned: 3250.5,
  totalTreasury: 3250.5,
  totalOrders: 1284,
  supportedPlatforms: 8,
};

// 获取协议状态接口
app.get('/api/protocol-info', (req, res) => {
  const deployment = getDeploymentInfo();
  res.json({
    status: 'online',
    protocol: 'Vectra AI Pay Protocol v1.0',
    deployment,
    stats,
  });
});

// 处理用户用 Vectra 支付 AI 平台订阅与 API 额度的请求
app.post('/api/pay', (req, res) => {
  const { serviceId, serviceName, priceVctr, userWallet } = req.body;

  if (!serviceId || !priceVctr) {
    return res.status(400).json({ error: '缺少支付参数' });
  }

  // 0.2% 极低磨损费率拆分: 0.1% 销毁, 0.1% 金库留存
  const fee = priceVctr * 0.002;
  const burnAmount = fee * 0.5;
  const treasuryAmount = fee * 0.5;

  // 更新链上统计数据
  stats.totalBurned += burnAmount;
  stats.totalTreasury += treasuryAmount;
  stats.totalOrders += 1;

  // 模拟生成 Solana 交易哈希与 AI 平台官方兑换/API 凭证
  const mockTxHash = Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  const mockRedeemKey = `VCTR-${serviceId.toUpperCase()}-${Math.random()
    .toString(36)
    .substring(2, 10)
    .toUpperCase()}`;

  res.json({
    success: true,
    txHash: mockTxHash,
    serviceName,
    priceVctr,
    feeBreakdown: {
      totalFee: fee,
      burned: burnAmount,
      treasuryRetained: treasuryAmount,
    },
    redeemKey: mockRedeemKey,
    solanaExplorerUrl: `https://explorer.solana.com/tx/${mockTxHash}?cluster=devnet`,
    message: `🎉 支付成功！已使用 Vectra 成功兑换 ${serviceName}`,
  });
});

// 水龙头状态与配置查询接口
app.get('/api/faucet/info', (req, res) => {
  const deployment = getDeploymentInfo();
  res.json({
    status: 'online',
    network: deployment.network || 'devnet',
    mint: deployment.vectraMintAddress,
    faucetAmount: FAUCET_AMOUNT_VCTR,
    cooldownHours: COOLDOWN_HOURS,
    cooldownMinutes: Math.round(COOLDOWN_MS / 60000),
  });
});

// Devnet 水龙头领水接口
app.post('/api/faucet', async (req, res) => {
  const { recipientAddress, amount } = req.body;
  if (!recipientAddress) {
    return res.status(400).json({ error: '请提供接收测试币的 Solana 钱包地址' });
  }

  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  try {
    const result = await requestDevnetFaucet(recipientAddress, clientIp, amount ? parseFloat(amount) : FAUCET_AMOUNT_VCTR);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || '水龙头发放失败' });
  }
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🌟 Vectra AI Pay 门户已启动: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
