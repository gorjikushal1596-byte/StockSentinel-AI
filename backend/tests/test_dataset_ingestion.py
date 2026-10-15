import os
import json
import pytest
from io import BytesIO
from fastapi.testclient import TestClient
import pyarrow as pa
import pyarrow.parquet as pq
import openpyxl

from backend.app.main import app
from backend.app.db.database import SessionLocal, init_db
from backend.app.db.models import Dataset, DailyRecord, Store, SKU

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    init_db()
    db = SessionLocal()
    yield db
    db.close()


def test_dataset_upload_csv_and_profile():
    """
    Test uploading a standard CSV dataset with realistic retail columns.
    Verify semantic column mapping heuristic and profiling.
    """
    csv_content = (
        "store_code,product_id,date,sold_quantity,stock_on_hand,category,price\n"
        "STORE_101,SKU_9001,2026-10-01,5,20,Electronics,999.00\n"
        "STORE_101,SKU_9001,2026-10-02,0,20,Electronics,999.00\n"
        "STORE_101,SKU_9001,2026-10-03,0,20,Electronics,999.00\n"
        "STORE_101,SKU_9001,2026-10-04,0,20,Electronics,999.00\n"
    ).encode("utf-8")

    files = [("files", ("retail_sales.csv", BytesIO(csv_content), "text/csv"))]
    res = client.post("/api/datasets/upload", files=files, data={"name": "Test CSV Dataset"})
    assert res.status_code == 200, res.text
    data = res.json()
    # Check upload response
    assert "dataset_id" in data
    ds_id = data["dataset_id"]
    assert data["row_count"] == 4
    assert data["column_count"] == 7

    # Fetch statistical profile
    prof_res = client.get(f"/api/datasets/{ds_id}/profile")
    assert prof_res.status_code == 200
    profile = prof_res.json()
    assert profile["row_count"] == 4
    assert profile["column_count"] == 7

    # Check that heuristic identified store_id and sku_id with confidence
    col_dict = {c["name"]: c for c in profile["columns"]}
    assert col_dict["store_code"]["inferred_target_field"] == "store_id"
    assert col_dict["product_id"]["inferred_target_field"] == "sku_id"
    assert col_dict["sold_quantity"]["inferred_target_field"] == "sales"
    assert col_dict["stock_on_hand"]["inferred_target_field"] == "on_hand_stock"


def test_dataset_upload_parquet_and_validate():
    """
    Test uploading a Parquet file, running validation, and executing import.
    """
    # Create pyarrow table
    data = {
        "store_id": ["S1", "S1", "S1", "S1"],
        "sku_id": ["P1", "P1", "P1", "P1"],
        "date": ["2026-10-10", "2026-10-11", "2026-10-12", "2026-10-13"],
        "sales": [4, 0, 0, 0],
        "on_hand_stock": [10, 10, 10, 10],
    }
    table = pa.Table.from_pydict(data)
    sink = BytesIO()
    pq.write_table(table, sink)
    sink.seek(0)

    files = [("files", ("inventory.parquet", sink, "application/octet-stream"))]
    res = client.post("/api/datasets/upload", files=files, data={"name": "Parquet Test"})
    assert res.status_code == 200
    ds_id = res.json()["dataset_id"]

    # Validate
    val_res = client.post(f"/api/datasets/{ds_id}/validate?duplicate_policy=keep_first")
    assert val_res.status_code == 200, val_res.text
    vdata = val_res.json()
    assert vdata["is_valid"] is True
    assert vdata["can_import"] is True
    assert vdata["error_count"] == 0

    # Import
    imp_res = client.post(f"/api/datasets/{ds_id}/import?duplicate_policy=keep_first")
    assert imp_res.status_code == 200, imp_res.text
    idata = imp_res.json()
    assert idata["status"] == "imported"
    assert idata["records_imported"] == 4
    assert idata["stores_imported"] >= 1
    assert idata["skus_imported"] >= 1


def test_dataset_upload_excel_xlsx():
    """
    Test uploading an Excel (.xlsx) workbook.
    """
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "SalesData"
    ws.append(["store_id", "sku_id", "date", "sales", "on_hand_stock"])
    ws.append(["Store #99", "SKU-9901", "2026-09-01", 10, 50])
    ws.append(["Store #99", "SKU-9901", "2026-09-02", 0, 50])

    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)

    files = [("files", ("excel_data.xlsx", buf, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))]
    res = client.post("/api/datasets/upload", files=files, data={"name": "Excel Dataset"})
    assert res.status_code == 200
    ds_id = res.json()["dataset_id"]

    # Validate
    val_res = client.post(f"/api/datasets/{ds_id}/validate?duplicate_policy=keep_first")
    assert val_res.status_code == 200
    vdata = val_res.json()
    assert vdata["is_valid"] is True
    assert vdata["can_import"] is True


def test_dataset_validation_rejects_negative_stock_and_bad_dates():
    """
    Verify quality validation flags negative stock and malformed dates.
    """
    bad_csv = (
        "store_id,sku_id,date,sales,on_hand_stock\n"
        "S1,P1,not-a-date,5,10\n"
        "S1,P2,2026-10-01,-2,10\n"
        "S1,P3,2026-10-01,3,-5\n"
    ).encode("utf-8")

    files = [("files", ("invalid_records.csv", BytesIO(bad_csv), "text/csv"))]
    res = client.post("/api/datasets/upload", files=files)
    assert res.status_code == 200
    ds_id = res.json()["dataset_id"]

    val_res = client.post(f"/api/datasets/{ds_id}/validate")
    assert val_res.status_code == 200
    vdata = val_res.json()
    assert vdata["is_valid"] is False  # Malformed date causes validation failure
    assert vdata["error_count"] >= 1   # Row 1 invalid date is error
    assert vdata["warning_count"] >= 2 # Negative sales and stock are warnings
    assert len(vdata["issues"]) >= 3


