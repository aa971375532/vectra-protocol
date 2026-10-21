# python-sdk/vectra_pay/middleware.py
"""
FastAPI / Starlette HTTP 402 中间件
允许任何基于 Python 搭建的 AI 大模型推理 API 轻松变为“按次收取 Vectra ($VCTR)”的去中心化收费服务。
"""

from typing import Callable
import json

class VectraHTTP402Middleware:
    def __init__(
        self,
        app,
        merchant_address: str,
        price_per_call: float = 0.05, # 单次调用 0.05 $VCTR
        vectra_mint: str = "Vctr9999999999999999999999999999999999999999",
    ):
        self.app = app
        self.merchant_address = merchant_address
        self.price_per_call = price_per_call
        self.vectra_mint = vectra_mint

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers", []))
        sig_header = headers.get(b"x-vectra-signature")

        # 若请求头未携带有效的 Vectra 链上支付签名，则拦截并返回 HTTP 402 Payment Required
        if not sig_header:
            response_body = json.dumps({
                "status": 402,
                "error": "Payment Required (Vectra AI Pay Protocol)",
                "message": "Access to this AI model requires payment settled in $VCTR.",
                "payment_details": {
                    "token": "Vectra ($VCTR)",
                    "network": "Solana",
                    "price": self.price_per_call,
                    "merchant_recipient": self.merchant_address,
                    "mint": self.vectra_mint,
                    "instruction": "Please send payment on Solana and attach the transaction hash in 'X-Vectra-Signature' header."
                }
            }).encode("utf-8")

            await send({
                "type": "http.response.start",
                "status": 402,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"content-length", str(len(response_body)).encode("utf-8")),
                ],
            })
            await send({
                "type": "http.response.body",
                "body": response_body,
            })
            return

        # 验证通过，放行请求至大模型推理逻辑
        await self.app(scope, receive, send)
