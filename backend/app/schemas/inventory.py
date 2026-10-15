"""Pydantic schemas for inventory, stores, and SKUs."""

from pydantic import BaseModel, Field, ConfigDict


class StoreBase(BaseModel):
    store_id: str
    name: str
    store_name: str | None = None
    city_tier: str = "Tier-1"
    format: str = "Supermarket"
    size_sqft: int = 45000
    active_skus: int = 0


class StoreResponse(StoreBase):
    model_config = ConfigDict(from_attributes=True)

    def model_post_init(self, __context):
        if not self.store_name:
            self.store_name = self.name


class SKUBase(BaseModel):
    sku_id: str
    name: str
    category: str
    price: float = Field(..., gt=0)
    cost: float | None = None
    shelf_bay: str = "Aisle 1-A"
    status: str = "active"


class SKUResponse(SKUBase):
    model_config = ConfigDict(from_attributes=True)


class DailyRecordInput(BaseModel):
    store_id: str
    sku_id: str
    date: str  # YYYY-MM-DD
    sales: int = Field(..., ge=0)
    on_hand_stock: int = Field(..., ge=0)
    is_promotion: bool = False
    is_holiday: bool = False


class DailyRecordResponse(DailyRecordInput):
    id: int
    model_config = ConfigDict(from_attributes=True)


class TimeSeriesPoint(BaseModel):
    date: str
    sales: int
    stock: int
    is_promotion: bool = False
