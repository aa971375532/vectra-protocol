# python-sdk/vectra_pay/client.py
from typing import Dict, Any, Optional

class VectraClient:
    """
    Python 客户端，用于 AI 开发者与 AI 智能体 (Agent) 进行 Vectra ($VCTR) 结算
    """
    def __init__(
        self,
        network: str = "devnet",
        merchant_address: Optional[str] = None,
        vectra_mint_address: Optional[str] = None,
        fee_basis_points: int = 20, # 0.2%
    ):
        self.network = network
        self.merchant_address = merchant_address
        self.vectra_mint_address = vectra_mint_address
        self.fee_basis_points = fee_basis_points
        self.decimals = 9

    def calculate_fees(self, amount_vctr: float) -> Dict[str, Any]:
        """
        计算 0.2% 双轨制手续费拆解 (0.1% 销毁 + 0.1% 金库)
        """
        total_fee = amount_vctr * (self.fee_basis_points / 10000.0)
        burn_amount = total_fee * 0.5
        treasury_amount = total_fee * 0.5
        net_merchant_amount = amount_vctr - total_fee

        return {
            "gross_amount": amount_vctr,
            "total_fee": total_fee,
            "burn_amount": burn_amount,
            "treasury_amount": treasury_amount,
            "net_merchant_amount": net_merchant_amount,
            "rate_percentage": f"{self.fee_basis_points / 100.0:.2f}%"
        }

    def verify_payment_signature(self, signature: str) -> bool:
        """
        验证 Solana 链上交易凭证
        在生产中可调用 Solana RPC JSON-RPC getTransaction 接口
        """
        if not signature or len(signature) < 32:
            return False
        return True
