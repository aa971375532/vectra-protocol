# Vectra ($VCTR) Solana Mainnet-Beta 主网上线与流动性池搭建全流程指南

本指南面向 Vectra Protocol 团队与社区核心开发者，详细列出将 `$VCTR` 从 Devnet 测试网平滑迁移至 **Solana Mainnet-Beta 生产主网**并完成 **Raydium CPMM 流动性池**与 **Jupiter 交易聚合器**收录的标准化 SOP。

---

## 一、主网部署前置准备

### 1. 燃料费预算
在 Solana 上基于 SPL Token-2022 部署代币非常廉价：
- 创建 Token-2022 Mint 账户及 TransferFee 扩展租金：约 `0.0035 SOL`
- 创建创始人金库 ATA 账户租金：约 `0.0021 SOL`
- 链上交易手续费（多笔）：约 `0.0005 SOL`
- **建议充值**：向创始人部署者钱包充值 `0.05 SOL`（按当前币价约 $5-$10 USD），即可完全覆盖部署全部开销。

部署者主网地址：
```
CvKbQM81DgZpYufBJ8Z1mVxZRVAWqX6dEAPjKyy56CTg
```

---

## 二、执行主网一键部署

项目已集成安全预检脚本：

```bash
npm run deploy:mainnet
```

该脚本将自动执行以下 4 步原子操作：
1. **检测主网 SOL 余额**：余额低于 0.03 SOL 自动安全退出，杜绝半途失败。
2. **初始化 Token-2022 Mint 账户**：
   - 精度：`9`
   - 手续费率：`20 bps` (0.20%)
   - 单笔费用上限：`5,000,000 $VCTR`
   - 费率管理员权限与暂扣提币权限 -> 绑定至协议研发金库 (`DDngT11XyxqbYi38nNv1sDNxw1K4er1WHQb7EyAQhcgg`)。
3. **一次性铸造硬顶代币**：
   - 向创始人金库一次性铸造 `1,000,000,000 $VCTR` (10 亿枚)。
4. **永久销毁铸币权 (Revoke Mint Authority) 与冻结权 (Freeze Authority 置空)**：
   - 链上永久无法增发任何一枚新币，确保绝对硬顶！
   - 无法冻结任何用户或合约资产，满足顶级 DEX 上线合规要求。
5. **生成主网配置档案**：自动写入 `config/deployment.mainnet.json`。

---

## 三、品牌元数据 (Metadata) 与 IPFS 上链

项目已生成标准格式的代币元数据描述文件：[`metadata/vectra.json`](file:///c:/Users/Administrator/Desktop/新建文件夹/metadata/vectra.json)。

### 1. 元数据参数结构
```json
{
  "name": "Vectra",
  "symbol": "VCTR",
  "description": "Universal Native Settlement Protocol & Payment Pass for Major AI Platforms and Autonomous AI Agent M2M Micropayments on Solana.",
  "image": "https://raw.githubusercontent.com/aa971375532/vectra-protocol/main/public/logo.svg",
  "external_url": "https://aa971375532.github.io/vectra-protocol/"
}
```

### 2. 上传至去中心化存储 (Arweave / IPFS)
- 可通过 [Akord](https://akord.com/) 或 [Pinata](https://pinata.cloud/) 免费将 `public/logo.svg` 与 `metadata/vectra.json` 永久保存在 Arweave 或 IPFS 上。

---

## 四、Raydium 流动性池 (DEX) 搭建指南

> [!IMPORTANT]
> **关键技术要点**：
> Solana 传统的 **Raydium AMM v4** 不支持 SPL Token-2022 的转账手续费扩展（会报 `Invalid Program` 错误）。
> 请务必选择 **Raydium CPMM (Constant Product Market Maker)** 或 **Orca Whirlpools**，它们原生 100% 完美支持 Token-2022 TransferFeeConfig！

### 1. 创建 Raydium CPMM 流动性池操作步骤
1. 打开 Raydium 官方流动性创建入口：[https://raydium.io/liquidity/create/](https://raydium.io/liquidity/create/)。
2. 连接部署者 Phantom 钱包。
3. 选择池类型：**Standard CPMM Pool**。
4. 选择代币对：
   - **Base Token**：粘贴部署出的 `$VCTR` 主网 Mint 地址。
   - **Quote Token**：`SOL` 或 `USDC`。
5. 设置费率档位 (Fee Tier)：推荐选择标准 **0.25%**。
6. 输入初始注入流动性数量（例如注入 100,000,000 $VCTR + 5 SOL）。
7. 点击 **Create Pool & Deposit** 确认上链。

### 2. 锁定或销毁流动性 (Rug-Proof 信任背书)
- 创建池后获得的 LP 代币可前往 [Streamflow](https://app.streamflow.finance/) 锁定，或直接发送至 Solana 黑洞地址（`11111111111111111111111111111111`）永久销毁。
- 此举将在各大 DEX 探测器上获得 **100% 安全评级 (Green Checkmark)**。

---

## 五、主流聚合器与行情工具收录

### 1. 提交至 Jupiter (`jup.ag`) 验证代币列表
1. Fork 官方仓库：[https://github.com/jup-ag/token-list](https://github.com/jup-ag/token-list)
2. 在 `tokens/` 目录下添加 `VCTR.json`，填写 Mint 地址、官网与徽标。
3. 提交 Pull Request，通过后 Jupiter 交易终端将原生识别 `$VCTR`，用户输入代码即可一键兑换。

### 2. DEXScreener 与 Birdeye 行情认领
- 流动性池创建后，访问 `https://dexscreener.com/solana/<VCTR_MINT_ADDRESS>`。
- 点击 **Update Token Info**，上传 Logo、官网 `https://aa971375532.github.io/vectra-protocol/`、GitHub 与白皮书链接，即可点亮官方认证蓝标。

---

## 六、协议金库多签升级 (Squads Protocol)

为确保项目长治久安，建议将金库权限从单一私钥升级为 **Squads 多签方案**：
1. 访问 [Squads](https://squads.so/) 创建 2/3 或 3/5 机构级多签保险库。
2. 将 `DDngT11XyxqbYi38nNv1sDNxw1K4er1WHQb7EyAQhcgg` 的管理提币权限转交多签金库，消除任何单点故障风险。
