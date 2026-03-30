import math
def get_pagination_dict(total: int, page: int, limit: int, rows: list):
    return {
        "data": rows,
        "total": total,
        "page": page,
        "pages": math.ceil(total / limit) if limit > 0 else 1
    }
print(get_pagination_dict(105, 2, 20, []))
