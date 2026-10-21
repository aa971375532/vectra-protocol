// packages/sdk/index.js
// Vectra Pay JavaScript/TypeScript 官方客户端 SDK
// 供 AI 平台与商户在其官网收银台或服务端极速接入 $VCTR 支付

const {
  Connection,
  PublicKey,
  Transaction,
  clusterApiUrl,
} = require('@solana/web3.js');
const {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createTransferCheckedWithFeeInstruction,
} = require('@solana/spl-token');

class VectraClient {
  /**
   * 初始化 Vectra SDK 客户端
   * @param {Object} options
   * @param {string} options.network - 'devnet' 或 'mainnet-beta'
   * @param {string} options.merchantAddress - 接收款项的商户 Solana 钱包公钥
   * @param {string} options.vectraMintAddress - Vectra 代币 Mint 地址
   * @param {number} [options.feeBasisPoints=20] - 0.2% 商户转账费
   */
  constructor(options = {}) {
    this.network = options.network || 'devnet';
    this.connection = new Connection(clusterApiUrl(this.network), 'confirmed');
    this.merchantAddress = options.merchantAddress
      ? new PublicKey(options.merchantAddress)
      : null;
    this.vectraMint = options.vectraMintAddress
      ? new PublicKey(options.vectraMintAddress)
      : null;
    this.decimals = 9;
    this.feeBasisPoints = options.feeBasisPoints || 20; // 0.2%
  }

  /**
   * 计算指定金额的手续费与拆解
   * @param {number} amountVctr - 支付的 VCTR 数量
   * @returns {Object} 费用拆解
   */
  calculateFees(amountVctr) {
    const totalFee = amountVctr * (this.feeBasisPoints / 10000);
    const burnAmount = totalFee * 0.5;
    const treasuryAmount = totalFee * 0.5;
    const netMerchantAmount = amountVctr - totalFee;

    return {
      grossAmount: amountVctr,
      totalFee,
      burnAmount,
      treasuryAmount,
      netMerchantAmount,
      ratePercentage: (this.feeBasisPoints / 100).toFixed(2) + '%',
    };
  }

  /**
   * 构建 Solana Token-2022 支付交易
   * @param {PublicKey} payerPublicKey - 付款用户钱包公钥
   * @param {number} amountVctr - 支付数量
   */
  async buildPaymentTransaction(payerPublicKey, amountVctr) {
    if (!this.merchantAddress || !this.vectraMint) {
      throw new Error('未配置 merchantAddress 或 vectraMintAddress');
    }

    const payerAta = getAssociatedTokenAddressSync(
      this.vectraMint,
      payerPublicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    const merchantAta = getAssociatedTokenAddressSync(
      this.vectraMint,
      this.merchantAddress,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    const rawAmount = BigInt(Math.round(amountVctr * 10 ** this.decimals));
    const feeAmount = (rawAmount * BigInt(this.feeBasisPoints)) / BigInt(10000);

    const tx = new Transaction().add(
      createTransferCheckedWithFeeInstruction(
        payerAta,
        this.vectraMint,
        merchantAta,
        payerPublicKey,
        rawAmount,
        this.decimals,
        feeAmount,
        [],
        TOKEN_2022_PROGRAM_ID
      )
    );

    const { blockhash } = await this.connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = payerPublicKey;

    return tx;
  }

  /**
   * 验证一笔已完成的链上支付
   * @param {string} signature - Solana 交易哈希
   * @returns {Promise<boolean>}
   */
  async verifyPayment(signature) {
    try {
      const tx = await this.connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });
      return tx !== null && tx.meta?.err === null;
    } catch (err) {
      console.error('验证支付失败:', err);
      return false;
    }
  }
}

module.exports = { VectraClient };
