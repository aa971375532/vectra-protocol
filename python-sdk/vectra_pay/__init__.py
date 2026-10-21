# python-sdk/vectra_pay/__init__.py
"""
Vectra Pay Python SDK
The official Python client for Vectra ($VCTR) Decentralized AI Payments & HTTP 402 Middleware.
"""

from .client import VectraClient
from .middleware import VectraHTTP402Middleware

__version__ = "1.0.0"
__all__ = ["VectraClient", "VectraHTTP402Middleware"]
