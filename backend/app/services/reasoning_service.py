"""
OmniRoute AI Reasoning Service.

Provides deep qualitative root-cause reasoning and associate dispatch action plans
by querying an OmniRoute gateway (e.g. gpt-oss-120b via Groq) with zero-crash fallback.
"""

import os
import json
import logging
from typing import Any
import httpx
from app.db.models import Finding, Store, SKU

logger = logging.getLogger("stocksentinel.reasoning")


class OmniRouteReasoningService:
    """Connects to OmniRoute /v1/chat/completions with deterministic fallback."""

    def __init__(self):
        self.api_base = os.getenv("OMNIROUTE_API_BASE", "http://127.0.0.1:20128/v1").rstrip("/")
        self.api_key = os.getenv("OMNIROUTE_API_KEY", "")
        self.model = os.getenv("OMNIROUTE_MODEL", "gpt-oss-120b")
        self.enabled = os.getenv("OMNIROUTE_ENABLED", "true").lower() in ("true", "1", "yes")

    async def generate_action_plan(
        self,
        finding: Finding,
        store: Store | None = None,
        sku: SKU | None = None,
        time_series: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        """
        Generates an intelligent root cause diagnosis and 3-step physical verification
        checklist using gpt-oss-120b via OmniRoute. Falls back cleanly on failure.
        """
        sku_name = sku.name if sku else finding.sku_id
        store_name = store.name if store else finding.store_id
        shelf_bay = sku.shelf_bay if (sku and sku.shelf_bay) else "General Bay"
        category = sku.category if sku else "Retail General"
        unit_price = sku.price if (sku and sku.price) else 100.0

        if not self.enabled or not self.api_key:
            return self._build_fallback(finding, sku_name, store_name, shelf_bay, unit_price)

        prompt = (
            f"You are StockSentinel AI's senior retail inventory reasoning engine. "
            f"An anomaly candidate has been flagged for phantom stock-out:\n"
            f"- Store: {store_name}\n"
            f"- SKU: {sku_name} (Category: {category}, Shelf Bay: {shelf_bay}, Unit Price: ₹{unit_price:.2f})\n"
            f"- ERP Recorded On-Hand Stock: {finding.recorded_stock} units\n"
            f"- Consecutive Zero-Sales Days: {finding.consecutive_zero_days} days\n"
            f"- Baseline Daily Velocity: ~{finding.historical_daily_velocity:.1f} units/day\n"
            f"- Anomaly Severity: {finding.severity} (Confidence: {finding.confidence_score}%)\n\n"
            f"Provide a concise JSON analysis with exactly these keys:\n"
            f"1. 'root_cause_diagnosis': 1-2 sentences identifying the most probable root cause "
            f"(e.g., planogram misplacement, barcode occlusion, unrecorded shrinkage, or customer service return bin).\n"
            f"2. 'confidence_rationale': 1 sentence explaining why the Poisson zero-sales signal indicates physical absence.\n"
            f"3. 'associate_checklist': Exactly 3 ordered, short, practical steps for store associate to verify.\n"
            f"4. 'shrinkage_risk_level': One of 'CRITICAL', 'HIGH', or 'MODERATE'.\n"
            f"5. 'estimated_recovery_action': Brief one-line recommendation (e.g. 'Audit bay 4-B and trigger emergency cycle count').\n"
            f"Output strictly valid JSON with no markdown formatting."
        )

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }

        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert retail operations and phantom inventory analyst. Reply ONLY in raw JSON.",
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
            "max_tokens": 350,
        }

        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.post(
                    f"{self.api_base}/chat/completions",
                    headers=headers,
                    json=payload,
                )

                if res.status_code == 200:
                    resp_json = res.json()
                    content = resp_json.get("choices", [{}])[0].get("message", {}).get("content", "")
                    clean_content = content.strip()
                    if clean_content.startswith("```json"):
                        clean_content = clean_content[7:]
                    if clean_content.startswith("```"):
                        clean_content = clean_content[3:]
                    if clean_content.endswith("```"):
                        clean_content = clean_content[:-3]
                    parsed = json.loads(clean_content.strip())

                    return {
                        "finding_id": finding.finding_id,
                        "source": "omniroute_live",
                        "model": self.model,
                        "root_cause_diagnosis": parsed.get("root_cause_diagnosis", ""),
                        "confidence_rationale": parsed.get("confidence_rationale", ""),
                        "associate_checklist": parsed.get("associate_checklist", []),
                        "shrinkage_risk_level": parsed.get("shrinkage_risk_level", finding.severity),
                        "estimated_recovery_action": parsed.get("estimated_recovery_action", ""),
                    }
                else:
                    logger.warning(f"OmniRoute returned HTTP {res.status_code}: {res.text}")
        except Exception as e:
            logger.warning(f"OmniRoute reasoning call failed ({e}); falling back to deterministic plan.")

        return self._build_fallback(finding, sku_name, store_name, shelf_bay, unit_price)

    def _build_fallback(
        self,
        finding: Finding,
        sku_name: str,
        store_name: str,
        shelf_bay: str,
        unit_price: float,
    ) -> dict[str, Any]:
        """High-grade deterministic fallback if OmniRoute is offline or unconfigured."""
        if finding.consecutive_zero_days >= 7:
            diagnosis = f"Severe phantom inventory contradiction. High likelihood of unrecorded shrinkage or wrong bay shelving ({shelf_bay})."
            checklist = [
                f"Physically inspect {shelf_bay} and adjacent top/bottom risers for hidden or misplaced units.",
                "Check customer service return holding bin and rear transit carts for un-restocked units.",
                "Perform manual barcode scan test at register to verify SKU upc barcode readability.",
            ]
            action = f"Initiate immediate cycle count adjustment for {sku_name} to restore ordering triggers."
        else:
            diagnosis = f"Transient stock-sales anomaly: Ledger reports +{finding.recorded_stock} units, but register velocity has collapsed over {finding.consecutive_zero_days} days."
            checklist = [
                f"Verify front-facing shelf presence at {shelf_bay} and ensure planogram label is visible.",
                "Inspect barcode sticker on shelf tag for damage, fading, or scan obstruction.",
                "Confirm rear overstock stockroom bin has not retained incoming receiving shipment.",
            ]
            action = f"Verify shelf bay {shelf_bay}; restock from backroom or flag as false positive."

        return {
            "finding_id": finding.finding_id,
            "source": "deterministic_fallback",
            "model": "rule_based_fallback",
            "root_cause_diagnosis": diagnosis,
            "confidence_rationale": f"Poisson test indicates {finding.confidence_score}% certainty that zero register transactions over {finding.consecutive_zero_days} days represents physical absence.",
            "associate_checklist": checklist,
            "shrinkage_risk_level": finding.severity,
            "estimated_recovery_action": action,
        }
