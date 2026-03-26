from sqlalchemy import text
from app.database import engine

def fetch_sample_data():
    queries = {
        "customers": "SELECT * FROM customer.customers LIMIT 5;",
        "products": "SELECT * FROM inventory.products LIMIT 5;",
        "orders": "SELECT * FROM sales.orders LIMIT 5;",
        "tickets": "SELECT * FROM support.tickets LIMIT 5;"
    }

    results = {}

    with engine.connect() as connection:
        for name, query in queries.items():
            result = connection.execute(text(query))
            results[name] = [dict(row._mapping) for row in result]

    return results