# vectra-pay

Official Python SDK & Decentralized HTTP 402 Middleware for **Vectra ($VCTR)** AI payment rails on Solana.

[![PyPI version](https://img.shields.io/pypi/v/vectra-pay.svg)](https://pypi.org/project/vectra-pay/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

---

## 📦 Installation

```bash
pip install vectra-pay
```

---

## 🚀 FastAPI HTTP 402 AI Paywall Integration

Protect your LLM inference endpoints or AI agents with zero lines of database setup. Clients pay via Solana micro-transactions:

```python
from fastapi import FastAPI
from vectra_pay import VectraHTTP402Middleware

app = FastAPI(title="AI Agent Inference Service")

# Mount Vectra Decentralized HTTP 402 Middleware
app.add_middleware(
    VectraHTTP402Middleware,
    merchant_address="DDngT11XyxqbYi38nNv1sDNxw1K4er1WHQb7EyAQhcgg",
    price_per_call=0.05,  # 0.05 $VCTR per model inference
    protected_paths=["/api/v1/generate", "/api/v1/chat"]
)

@app.post("/api/v1/generate")
async def generate_completion(prompt: str):
    # This endpoint is automatically protected by Vectra HTTP 402 Paywall!
    return {
        "status": "success",
        "response": f"AI model output for: {prompt}"
    }
```

---

## 🐍 Client-Side Usage

```python
from vectra_pay import VectraClient

client = VectraClient(
    network="devnet",
    merchant_address="DDngT11XyxqbYi38nNv1sDNxw1K4er1WHQb7EyAQhcgg"
)

# Calculate fee breakdown (0.20% dual-track fee)
fees = client.calculate_fees(20.0)
print(fees)
# {'gross': 20.0, 'fee': 0.04, 'burn': 0.02, 'treasury': 0.02, 'net': 19.96}
```

---

## 🛡️ License

MIT License © 2026 Vectra Protocol Foundation.
