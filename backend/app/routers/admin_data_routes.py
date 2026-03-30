"""
admin_data_routes.py
─────────────────────────────────────────────────────────────────────────────
Add this file to your FastAPI backend, then include the router in main.py:

    from admin_data_routes import router as data_router
    app.include_router(data_router)

These routes expose CRUD endpoints for all 7 tables so the Admin Dashboard
can read and write data directly.

Assumptions:
  - You already have: db dependency (SQLAlchemy Session), get_current_user,
    require_role("admin") dependency, and your ORM models.
  - Adjust model imports and schema names to match your project structure.
─────────────────────────────────────────────────────────────────────────────
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import math

# ── adjust these imports to match your project ────────────────────────────────
from app.dependencies import get_db, get_current_user, require_role

router = APIRouter(prefix="/admin/data", tags=["Admin Data Feed"])

# Shared admin guard — all routes below require admin or super_admin
AdminDep = Depends(require_role(["admin", "super_admin"]))


# ═══════════════════════════════════════════════════════════════════════════════
# Pydantic request models
# ═══════════════════════════════════════════════════════════════════════════════

class CustomerIn(BaseModel):
    first_name: str
    last_name:  str
    email:      str
    phone:      Optional[str] = None

class AddressIn(BaseModel):
    customer_id:  int
    city:         str
    state:        str
    country:      str
    postal_code:  Optional[str] = None

class ProductIn(BaseModel):
    product_name: str
    category:     str
    price:        float

class StockIn(BaseModel):
    product_id:          int
    quantity_available:  int
    reorder_level:       int

class OrderIn(BaseModel):
    customer_id:   int
    order_status:  str = "pending"
    total_amount:  float

class OrderItemIn(BaseModel):
    order_id:   int
    product_id: int
    quantity:   int
    unit_price: float

class TicketIn(BaseModel):
    customer_id: int
    product_id:  int
    issue_type:  str
    status:      str = "open"


# ═══════════════════════════════════════════════════════════════════════════════
# customer.customers
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/customers", dependencies=[AdminDep])
def list_customers(page: int = 1, limit: int = 20, db: Session = Depends(get_db)):
    offset = (page - 1) * limit
    total = db.execute(text("SELECT COUNT(*) FROM customer.customers")).scalar()
    rows = db.execute(text("""
        SELECT customer_id, first_name, last_name, email, phone,
               created_at::text
        FROM customer.customers
        ORDER BY customer_id DESC
        LIMIT :limit OFFSET :offset
    """), {"limit": limit, "offset": offset}).mappings().all()
    return {
        "data": [dict(r) for r in rows],
        "total": total,
        "page": page,
        "pages": math.ceil(total / limit) if limit > 0 else 1
    }


@router.post("/customers", dependencies=[AdminDep], status_code=201)
def create_customer(body: CustomerIn, db: Session = Depends(get_db)):
    try:
        row = db.execute(text("""
            INSERT INTO customer.customers (first_name, last_name, email, phone)
            VALUES (:first_name, :last_name, :email, :phone)
            RETURNING customer_id
        """), body.dict()).mappings().first()
        db.commit()
        return {"customer_id": row["customer_id"], "message": "Customer created"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/customers/{customer_id}", dependencies=[AdminDep])
def update_customers(customer_id: int, body: CustomerIn, db: Session = Depends(get_db)):
    try:
        db.execute(text("""
            UPDATE customer.customers
            SET first_name=:first_name, last_name=:last_name, email=:email, phone=:phone
            WHERE customer_id = :id
        """), {**body.dict(), "id": customer_id})
        db.commit()
        return {"message": "Updated"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/customers/{customer_id}", dependencies=[AdminDep])
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    db.execute(text("DELETE FROM customer.customers WHERE customer_id = :id"), {"id": customer_id})
    db.commit()
    return {"message": "Deleted"}


# ═══════════════════════════════════════════════════════════════════════════════
# customer.addresses
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/addresses", dependencies=[AdminDep])
def list_addresses(page: int = 1, limit: int = 20, db: Session = Depends(get_db)):
    offset = (page - 1) * limit
    total = db.execute(text("SELECT COUNT(*) FROM customer.addresses")).scalar()
    rows = db.execute(text("""
        SELECT address_id, customer_id, city, state, country, postal_code
        FROM customer.addresses
        ORDER BY address_id DESC
        LIMIT :limit OFFSET :offset
    """), {"limit": limit, "offset": offset}).mappings().all()
    return {
        "data": [dict(r) for r in rows],
        "total": total,
        "page": page,
        "pages": math.ceil(total / limit) if limit > 0 else 1
    }


@router.post("/addresses", dependencies=[AdminDep], status_code=201)
def create_address(body: AddressIn, db: Session = Depends(get_db)):
    try:
        row = db.execute(text("""
            INSERT INTO customer.addresses (customer_id, city, state, country, postal_code)
            VALUES (:customer_id, :city, :state, :country, :postal_code)
            RETURNING address_id
        """), body.dict()).mappings().first()
        db.commit()
        return {"address_id": row["address_id"], "message": "Address created"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/addresses/{address_id}", dependencies=[AdminDep])
def update_addresses(address_id: int, body: AddressIn, db: Session = Depends(get_db)):
    try:
        db.execute(text("""
            UPDATE customer.addresses
            SET customer_id=:customer_id, city=:city, state=:state, country=:country, postal_code=:postal_code
            WHERE address_id = :id
        """), {**body.dict(), "id": address_id})
        db.commit()
        return {"message": "Updated"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/addresses/{address_id}", dependencies=[AdminDep])
def delete_address(address_id: int, db: Session = Depends(get_db)):
    db.execute(text("DELETE FROM customer.addresses WHERE address_id = :id"), {"id": address_id})
    db.commit()
    return {"message": "Deleted"}


# ═══════════════════════════════════════════════════════════════════════════════
# inventory.products
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/products", dependencies=[AdminDep])
def list_products(page: int = 1, limit: int = 20, db: Session = Depends(get_db)):
    offset = (page - 1) * limit
    total = db.execute(text("SELECT COUNT(*) FROM inventory.products")).scalar()
    rows = db.execute(text("""
        SELECT product_id, product_name, category, price::text, created_at::text
        FROM inventory.products
        ORDER BY product_id DESC
        LIMIT :limit OFFSET :offset
    """), {"limit": limit, "offset": offset}).mappings().all()
    return {
        "data": [dict(r) for r in rows],
        "total": total,
        "page": page,
        "pages": math.ceil(total / limit) if limit > 0 else 1
    }


@router.post("/products", dependencies=[AdminDep], status_code=201)
def create_product(body: ProductIn, db: Session = Depends(get_db)):
    try:
        row = db.execute(text("""
            INSERT INTO inventory.products (product_name, category, price)
            VALUES (:product_name, :category, :price)
            RETURNING product_id
        """), body.dict()).mappings().first()
        db.commit()
        return {"product_id": row["product_id"], "message": "Product created"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/products/{product_id}", dependencies=[AdminDep])
def update_products(product_id: int, body: ProductIn, db: Session = Depends(get_db)):
    try:
        db.execute(text("""
            UPDATE inventory.products
            SET product_name=:product_name, category=:category, price=:price
            WHERE product_id = :id
        """), {**body.dict(), "id": product_id})
        db.commit()
        return {"message": "Updated"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/products/{product_id}", dependencies=[AdminDep])
def delete_product(product_id: int, db: Session = Depends(get_db)):
    db.execute(text("DELETE FROM inventory.products WHERE product_id = :id"), {"id": product_id})
    db.commit()
    return {"message": "Deleted"}


# ═══════════════════════════════════════════════════════════════════════════════
# inventory.stock
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/stock", dependencies=[AdminDep])
def list_stock(page: int = 1, limit: int = 20, db: Session = Depends(get_db)):
    offset = (page - 1) * limit
    total = db.execute(text("SELECT COUNT(*) FROM inventory.stock")).scalar()
    rows = db.execute(text("""
        SELECT stock_id, product_id, quantity_available, reorder_level, last_updated::text
        FROM inventory.stock
        ORDER BY stock_id DESC
        LIMIT :limit OFFSET :offset
    """), {"limit": limit, "offset": offset}).mappings().all()
    return {
        "data": [dict(r) for r in rows],
        "total": total,
        "page": page,
        "pages": math.ceil(total / limit) if limit > 0 else 1
    }


@router.post("/stock", dependencies=[AdminDep], status_code=201)
def create_stock(body: StockIn, db: Session = Depends(get_db)):
    try:
        row = db.execute(text("""
            INSERT INTO inventory.stock (product_id, quantity_available, reorder_level)
            VALUES (:product_id, :quantity_available, :reorder_level)
            RETURNING stock_id
        """), body.dict()).mappings().first()
        db.commit()
        return {"stock_id": row["stock_id"], "message": "Stock entry created"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/stock/{stock_id}", dependencies=[AdminDep])
def update_stock(stock_id: int, body: StockIn, db: Session = Depends(get_db)):
    try:
        db.execute(text("""
            UPDATE inventory.stock
            SET product_id=:product_id, quantity_available=:quantity_available, reorder_level=:reorder_level
            WHERE stock_id = :id
        """), {**body.dict(), "id": stock_id})
        db.commit()
        return {"message": "Updated"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/stock/{stock_id}", dependencies=[AdminDep])
def delete_stock(stock_id: int, db: Session = Depends(get_db)):
    db.execute(text("DELETE FROM inventory.stock WHERE stock_id = :id"), {"id": stock_id})
    db.commit()
    return {"message": "Deleted"}


# ═══════════════════════════════════════════════════════════════════════════════
# sales.orders
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/orders", dependencies=[AdminDep])
def list_orders(page: int = 1, limit: int = 20, db: Session = Depends(get_db)):
    offset = (page - 1) * limit
    total = db.execute(text("SELECT COUNT(*) FROM sales.orders")).scalar()
    rows = db.execute(text("""
        SELECT order_id, customer_id, order_date::text, order_status, total_amount::text
        FROM sales.orders
        ORDER BY order_id DESC
        LIMIT :limit OFFSET :offset
    """), {"limit": limit, "offset": offset}).mappings().all()
    return {
        "data": [dict(r) for r in rows],
        "total": total,
        "page": page,
        "pages": math.ceil(total / limit) if limit > 0 else 1
    }


@router.post("/orders", dependencies=[AdminDep], status_code=201)
def create_order(body: OrderIn, db: Session = Depends(get_db)):
    try:
        row = db.execute(text("""
            INSERT INTO sales.orders (customer_id, order_status, total_amount)
            VALUES (:customer_id, :order_status, :total_amount)
            RETURNING order_id
        """), body.dict()).mappings().first()
        db.commit()
        return {"order_id": row["order_id"], "message": "Order created"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/orders/{order_id}", dependencies=[AdminDep])
def update_orders(order_id: int, body: OrderIn, db: Session = Depends(get_db)):
    try:
        db.execute(text("""
            UPDATE sales.orders
            SET customer_id=:customer_id, order_status=:order_status, total_amount=:total_amount
            WHERE order_id = :id
        """), {**body.dict(), "id": order_id})
        db.commit()
        return {"message": "Updated"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/orders/{order_id}", dependencies=[AdminDep])
def delete_order(order_id: int, db: Session = Depends(get_db)):
    db.execute(text("DELETE FROM sales.orders WHERE order_id = :id"), {"id": order_id})
    db.commit()
    return {"message": "Deleted"}


# ═══════════════════════════════════════════════════════════════════════════════
# sales.order_items
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/order-items", dependencies=[AdminDep])
def list_order_items(page: int = 1, limit: int = 20, db: Session = Depends(get_db)):
    offset = (page - 1) * limit
    total = db.execute(text("SELECT COUNT(*) FROM sales.order_items")).scalar()
    rows = db.execute(text("""
        SELECT order_item_id, order_id, product_id, quantity, unit_price::text
        FROM sales.order_items
        ORDER BY order_item_id DESC
        LIMIT :limit OFFSET :offset
    """), {"limit": limit, "offset": offset}).mappings().all()
    return {
        "data": [dict(r) for r in rows],
        "total": total,
        "page": page,
        "pages": math.ceil(total / limit) if limit > 0 else 1
    }


@router.post("/order-items", dependencies=[AdminDep], status_code=201)
def create_order_item(body: OrderItemIn, db: Session = Depends(get_db)):
    try:
        row = db.execute(text("""
            INSERT INTO sales.order_items (order_id, product_id, quantity, unit_price)
            VALUES (:order_id, :product_id, :quantity, :unit_price)
            RETURNING order_item_id
        """), body.dict()).mappings().first()
        db.commit()
        return {"order_item_id": row["order_item_id"], "message": "Order item created"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/order-items/{order_item_id}", dependencies=[AdminDep])
def update_order_items(order_item_id: int, body: OrderItemIn, db: Session = Depends(get_db)):
    try:
        db.execute(text("""
            UPDATE sales.order_items
            SET order_id=:order_id, product_id=:product_id, quantity=:quantity, unit_price=:unit_price
            WHERE order_item_id = :id
        """), {**body.dict(), "id": order_item_id})
        db.commit()
        return {"message": "Updated"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/order-items/{order_item_id}", dependencies=[AdminDep])
def delete_order_item(order_item_id: int, db: Session = Depends(get_db)):
    db.execute(text("DELETE FROM sales.order_items WHERE order_item_id = :id"), {"id": order_item_id})
    db.commit()
    return {"message": "Deleted"}


# ═══════════════════════════════════════════════════════════════════════════════
# support.tickets
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/tickets", dependencies=[AdminDep])
def list_tickets(page: int = 1, limit: int = 20, db: Session = Depends(get_db)):
    offset = (page - 1) * limit
    total = db.execute(text("SELECT COUNT(*) FROM support.tickets")).scalar()
    rows = db.execute(text("""
        SELECT ticket_id, customer_id, product_id, issue_type, status, created_at::text
        FROM support.tickets
        ORDER BY ticket_id DESC
        LIMIT :limit OFFSET :offset
    """), {"limit": limit, "offset": offset}).mappings().all()
    return {
        "data": [dict(r) for r in rows],
        "total": total,
        "page": page,
        "pages": math.ceil(total / limit) if limit > 0 else 1
    }


@router.post("/tickets", dependencies=[AdminDep], status_code=201)
def create_ticket(body: TicketIn, db: Session = Depends(get_db)):
    try:
        row = db.execute(text("""
            INSERT INTO support.tickets (customer_id, product_id, issue_type, status)
            VALUES (:customer_id, :product_id, :issue_type, :status)
            RETURNING ticket_id
        """), body.dict()).mappings().first()
        db.commit()
        return {"ticket_id": row["ticket_id"], "message": "Ticket created"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/tickets/{ticket_id}", dependencies=[AdminDep])
def update_tickets(ticket_id: int, body: TicketIn, db: Session = Depends(get_db)):
    try:
        db.execute(text("""
            UPDATE support.tickets
            SET customer_id=:customer_id, product_id=:product_id, issue_type=:issue_type, status=:status
            WHERE ticket_id = :id
        """), {**body.dict(), "id": ticket_id})
        db.commit()
        return {"message": "Updated"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/tickets/{ticket_id}", dependencies=[AdminDep])
def delete_ticket(ticket_id: int, db: Session = Depends(get_db)):
    db.execute(text("DELETE FROM support.tickets WHERE ticket_id = :id"), {"id": ticket_id})
    db.commit()
    return {"message": "Deleted"}