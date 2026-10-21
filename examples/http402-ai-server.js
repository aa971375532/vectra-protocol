// examples/http402-ai-server.js
// 完整可运行示例：一个受到 Vectra HTTP 402 保护的去中心化 AI 大模型 API 服务

const express = require('express');
const { VectraClient } = require('../packages/sdk');

const app = express();
const PORT = 4002;

app.use(express.json());

// 模拟配置 AI 商户接收钱包与 Vectra 客户端
const MERCHANT_WALLET = 'DDngT11XyxqbYi38nNv1sDNxw1K4er1WHQb7EyAQhcgg';
const vectra = new VectraClient({
  network: 'devnet',
  merchantAddress: MERCHANT_WALLET,
  feeBasisPoints: 20, // 0.2%
});

// 模拟受保护的 AI 大模型推理端点 (OpenAI 兼容格式)
app.post('/v1/chat/completions', async (req, res) => {
  const vectraSignature = req.headers['x-vectra-signature'];
  const priceRequired = 0.05; // 每次调用需支付 0.05 $VCTR

  // 1. 如果请求方没有提供链上支付凭证，返回标准 HTTP 402 Payment Required
  if (!vectraSignature) {
    const feeBreakdown = vectra.calculateFees(priceRequired);
    return res.status(402).json({
      status: 402,
      error: 'Payment Required (Vectra AI Pay Standard)',
      message: '该 AI 模型服务需要使用 Vectra ($VCTR) 进行去中心化结算。',
      payment_instructions: {
        token: 'Vectra ($VCTR)',
        network: 'Solana (Token-2022)',
        required_amount: priceRequired,
        merchant_wallet: MERCHANT_WALLET,
        fee_breakdown: feeBreakdown,
        how_to_pay:
          '请通过 Solana 向 merchant_wallet 转入指定金额，并将交易哈希置于 HTTP 请求头 [X-Vectra-Signature] 中重试。',
      },
    });
  }

  // 2. 验证签名（示例中支持 mock 或真实链上验证）
  console.log(`📡 收到带签名的 AI 请求，凭证: ${vectraSignature}`);

  // 3. 验证通过，返回大模型流式推理结果
  res.json({
    id: `chatcmpl-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: 'vectra-llama-3-70b-instruct',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content:
            '你好！你的 Vectra ($VCTR) 链上支付验证通过！这是由去中心化 AI 结算网络即时提供的推理答复。',
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 18,
      completion_tokens: 35,
      total_tokens: 53,
    },
    settlement: {
      currency: 'Vectra ($VCTR)',
      amount: priceRequired,
      fee_deducted: '0.2%',
      signature: vectraSignature,
    },
  });
});

app.listen(PORT, () => {
  console.log(`=============================================================`);
  console.log(`🤖 HTTP 402 AI 模型服务已启动: http://localhost:${PORT}`);
  console.log(`   端点: POST http://localhost:${PORT}/v1/chat/completions`);
  console.log(`=============================================================`);
});
