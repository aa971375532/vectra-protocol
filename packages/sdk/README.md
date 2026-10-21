# @vectra/pay-sdk

Official JavaScript/TypeScript SDK for **Vectra ($VCTR)** decentralized AI platform subscriptions and Machine-to-Machine (M2M) micro-settlements on Solana.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Solana](https://img.shields.io/badge/Solana-Token--2022-purple.svg)](https://solana.com)

---

## 📦 Installation

```bash
npm install @vectra/pay-sdk @solana/web3.js @solana/spl-token
# or
yarn add @vectra/pay-sdk @solana/web3.js @solana/spl-token
# or
pnpm add @vectra/pay-sdk @solana/web3.js @solana/spl-token
```

---

## ⚡ Quickstart

### 1. Initialize Client

```javascript
import { VectraClient } from '@vectra/pay-sdk';

const client = new VectraClient({
  network: 'devnet', // 'devnet' or 'mainnet-beta'
  merchantAddress: 'DDngT11XyxqbYi38nNv1sDNxw1K4er1WHQb7EyAQhcgg', // Your Solana Merchant Wallet
  vectraMintAddress: '8aGGfyBvgeiq9WbyZRbgYSKkXhnYymNVh7oMw2ju4t14', // Vectra Mint Address
  feeBasisPoints: 20, // 0.20% dual-track fee (0.10% burn + 0.10% treasury)
});
```

### 2. Calculate Real-Time Fees

```javascript
const feeInfo = client.calculateFees(20.0);
console.log(feeInfo);
/*
Output:
{
  grossAmount: 20,
  totalFee: 0.04,
  burnAmount: 0.02,
  treasuryAmount: 0.02,
  netMerchantAmount: 19.96,
  ratePercentage: '0.20%'
}
*/
```

### 3. Build & Sign Solana Token-2022 Transaction

```javascript
// Connect wallet (e.g. Phantom)
const payerPublicKey = window.solana.publicKey;

// Build the SPL Token-2022 transfer transaction
const transaction = await client.buildPaymentTransaction(payerPublicKey, 20.0);

// Sign & send via connected wallet
const { signature } = await window.solana.signAndSendTransaction(transaction);
console.log('Transaction broadcasted:', signature);

// Verify on-chain confirmation
const isConfirmed = await client.verifyPayment(signature);
if (isConfirmed) {
  console.log('🎉 Subscription unlocked for user!');
}
```

---

## 🛡️ License

MIT License © 2026 Vectra Protocol Foundation.
