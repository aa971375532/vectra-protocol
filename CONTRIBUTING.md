# Contributing to Vectra Protocol

Thank you for your interest in contributing to Vectra ($VCTR)! We welcome developers, researchers, and AI builders from around the world to build the native financial layer for artificial intelligence.

---

## 🛠️ Codebase Structure

- `packages/sdk/`: Official JavaScript/TypeScript SDK (`@vectra/pay-sdk`).
- `python-sdk/`: Official Python SDK and HTTP 402 middleware (`vectra-pay`).
- `scripts/`: Solana Token-2022 deployment, fee management, and keypair tooling.
- `examples/`: Runnable integration examples (HTTP 402 AI servers, client checkout embeds).
- `test/`: Automated test suite for protocol math and tokenomics.

---

## 🧪 Running Tests

Ensure all automated tests pass before submitting a Pull Request:
```bash
npm test
```

---

## 📜 Pull Request Guidelines

1. Fork the repository and create your branch from `main`.
2. Follow existing code style (ESLint / Prettier).
3. Ensure all tests in `test/` pass without errors.
4. Update documentation or whitepaper references if modifying protocol parameters.
