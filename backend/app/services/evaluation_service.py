"""
Evaluation Service for StockSentinel AI.

Evaluates detector precision@20 per store-day and recall against hidden ground truth labels.
In strict accordance with the official PDF:
- Precision@20 = TP_in_top20 / min(20, returned_findings)
- Recall = TP_in_top20 / total_ground_truth_positives_for_store_day
Hidden labels are completely isolated from detector features.
"""

from app.db.models import Finding, GroundTruthLabel
from app.schemas.evaluation import EvaluationResponse, StoreEvaluationMetric


class EvaluationService:
    """Computes benchmark metrics against hidden ground truth labels."""

    @staticmethod
    def evaluate_findings(
        findings: list[Finding],
        ground_truth: list[GroundTruthLabel],
        evaluation_date: str,
        store_names_map: dict[str, str] | None = None,
    ) -> EvaluationResponse:
        """
        Evaluate ranked top-20 findings against hidden ground-truth labels.
        """
        if not ground_truth:
            return EvaluationResponse(
                available=False,
                evaluation_date=evaluation_date,
                message="Ground-truth labels unavailable for this evaluation date. Add hidden labels to evaluate.",
                mean_precision_at_20=None,
                overall_recall=None,
            )

        # Index ground-truth positive labels by (store_id, sku_id)
        gt_positives_by_store: dict[str, set[str]] = {}
        for label in ground_truth:
            if label.is_phantom_stockout:
                gt_positives_by_store.setdefault(label.store_id, set()).add(label.sku_id)

        # Group top-20 findings by store
        findings_by_store: dict[str, list[Finding]] = {}
        for f in findings:
            if f.rank <= 20:  # Respect operational budget
                findings_by_store.setdefault(f.store_id, []).append(f)

        all_stores = sorted(set([l.store_id for l in ground_truth] + list(findings_by_store.keys())))
        if not all_stores:
            return EvaluationResponse(
                available=False,
                evaluation_date=evaluation_date,
                message="No store data available to evaluate.",
                mean_precision_at_20=None,
                overall_recall=None,
            )

        per_store_metrics: list[StoreEvaluationMetric] = []
        total_true_positives = 0
        total_findings_evaluated = 0
        total_gt_positives = 0
        store_precisions: list[float] = []

        for store_id in all_stores:
            store_findings = findings_by_store.get(store_id, [])
            store_gt_positives = gt_positives_by_store.get(store_id, set())

            # Count true positives in top-20
            tps = 0
            for finding in store_findings:
                if finding.sku_id in store_gt_positives:
                    tps += 1

            returned_count = len(store_findings)
            gt_count = len(store_gt_positives)

            # Precision@20 denominator:
            # If 0 returned: if 0 GT, precision = 1.0 (correctly identified no anomalies), else 0.0
            if returned_count > 0:
                p20 = round((tps / returned_count) * 100.0, 1)
            else:
                p20 = 100.0 if gt_count == 0 else 0.0

            # Recall denominator
            if gt_count > 0:
                rec = round((tps / gt_count) * 100.0, 1)
            else:
                rec = 100.0 if returned_count == 0 else 100.0

            store_precisions.append(p20)
            total_true_positives += tps
            total_findings_evaluated += returned_count
            total_gt_positives += gt_count

            store_name = store_names_map.get(store_id, store_id) if store_names_map else store_id

            per_store_metrics.append(
                StoreEvaluationMetric(
                    store_id=store_id,
                    store_name=store_name,
                    top20_findings_count=returned_count,
                    true_positives_in_top20=tps,
                    precision_at_20=p20,
                    total_hidden_positives=gt_count,
                    recall_at_20=rec,
                )
            )

        mean_p20 = round(sum(store_precisions) / len(store_precisions), 1) if store_precisions else 0.0
        overall_recall = round((total_true_positives / total_gt_positives) * 100.0, 1) if total_gt_positives > 0 else 100.0

        return EvaluationResponse(
            available=True,
            evaluation_date=evaluation_date,
            message="Evaluation against ground-truth labels completed successfully.",
            dataset_scope="Top-20 verification results per store-day against ~3% hidden ground-truth labels",
            mean_precision_at_20=mean_p20,
            overall_recall=overall_recall,
            total_stores_evaluated=len(all_stores),
            total_findings_evaluated=total_findings_evaluated,
            total_true_positives=total_true_positives,
            total_ground_truth_positives=total_gt_positives,
            per_store_metrics=per_store_metrics,
        )
