def choose_schema(question: str) -> str:
    q = question.lower()

    sales_keywords = [
        "revenue", "sales", "order", "orders", "monthly revenue",
        "top selling", "sold", "purchase", "purchases"
    ]

    inventory_keywords = [
        "stock", "inventory", "restock", "reorder", "low stock",
        "quantity", "expensive", "price", "prices"
    ]

    customer_keywords = [
        "customer", "customers", "city", "state", "address",
        "repeat customer", "joined", "recently joined"
    ]

    support_keywords = [
        "ticket", "tickets", "complaint", "complaints", "issue",
        "issues", "support", "resolved", "closed", "open"
    ]

    scores = {
        "sales": sum(1 for word in sales_keywords if word in q),
        "inventory": sum(1 for word in inventory_keywords if word in q),
        "customer": sum(1 for word in customer_keywords if word in q),
        "support": sum(1 for word in support_keywords if word in q),
    }

    best_schema = max(scores, key=scores.get)

    if scores[best_schema] == 0:
        return "sales"

    return best_schema