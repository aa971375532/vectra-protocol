# Vectra Protocol ($VCTR)

**The Decentralized Universal Payment Currency & Settlement Protocol for Global AI Platforms & Autonomous Agents**

[![Solana](https://img.shields.io/badge/Blockchain-Solana-9945FF?logo=solana)](https://solana.com)
[![Token-2022](https://img.shields.io/badge/Standard-SPL%20Token--2022-14F195)](https://spl.solana.com/token-2022)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Tests](https://img.shields.io/badge/Tests-Passing-brightgreen.svg)](./test/)

---

## 🌟 核心价值主张 (Core Value Proposition)

- **AI 智能体原生 (Agent Native)**：为无银行卡、无身份 KYC 的自主 AI 智能体提供机器原生加密资产结算。
- **0 拒付全球免外卡 (Zero-Decline Global Access)**：突破非美区用户信用卡风控拒付壁垒，实现全球毫秒级结算。
- **0.2% 双轨制低磨损 (0.2% Low-Friction Model)**：
  - 普通转账 / DEX 做市：**0.00% 绝对免税**，保护二级市场极致流动性。
  - AI 平台商户结算：提取极低 **0.20% 网络费（0.10% 永久销毁 + 0.10% 协议金库）**。
- **原生 Gas 代付体验 (Fee Payer)**：终端用户钱包 0 SOL 即可支付，体验比肩 Web2。

---

## 📂 项目工程架构 (Repository Structure)

```
c:/Users/Administrator/Desktop/新建文件夹/
├── VECTRA_WHITEPAPER_CN.md   # 🇨🇳 官方中文技术白皮书 (完整版)
├── VECTRA_WHITEPAPER_EN.md   # 🇺🇸 Official English Technical Whitepaper
├── PITCH_DECK.md             # 📊 10 页投资与合作伙伴路演幻灯片 (Pitch Deck)
├── wallet.txt                # 🔑 创始人个人钱包与金库私钥档案 (本地私密保管)
│
├── packages/
│   └── sdk/                  # 💻 官方 JavaScript/TypeScript SDK (@vectra/pay-sdk)
├── python-sdk/               # 🐍 官方 Python SDK & HTTP 402 中间件 (vectra-pay)
├── examples/
│   └── http402-ai-server.js  # 🤖 完整运行的 HTTP 402 AI 模型微支付服务端示例
├── scripts/
│   ├── generate-keys.js      # 创世密钥对生成脚本
│   ├── view-keys.js          # 查看 Base58 私钥与链上链接
│   └── create-vectra-token.js# Solana Token-2022 部署脚本 (带 0.2% 费率扩展)
├── test/
│   └── protocol.test.js      # 🧪 协议核心数学与代币经济学自动化测试套件
├── public/
│   └── index.html            # 🌐 Vectra 官方交互门户与收银台接入预览前端
├── server.js                 # ⚡ 官方本地服务与 API 路由
└── config/                   # 📁 本地密钥与链上部署配置文件
```

---

## 🚀 极速上手指令 (Quick Start)

### 1. 运行核心协议自动化测试
```bash
npm test
```
*自动验证 0.2% 手续费数学模型、9 位微计费精度与密钥配置。*

### 2. 启动官方交互门户
```bash
npm start
```
打开浏览器访问：**http://localhost:3000**

### 3. 查看创始人与协议金库钱包私钥
```bash
npm run view:keys
```

### 4. 启动 HTTP 402 AI 模型微支付服务示例
```bash
node examples/http402-ai-server.js
```

---

## 📜 许可证与贡献
- 遵循 [MIT 开源许可证](./LICENSE)。
- 欢迎阅读 [贡献指南 (CONTRIBUTING.md)](./CONTRIBUTING.md) 与 [安全漏洞披露政策 (SECURITY.md)](./SECURITY.md)。
