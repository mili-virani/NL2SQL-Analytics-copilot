import os
import json
import hashlib
from redis import Redis
from functools import wraps
from typing import Callable

REDIS_URL = os.getenv("REDIS_URL")
redis_client = None

if REDIS_URL:
    try:
        redis_client = Redis.from_url(REDIS_URL, decode_responses=True)
        redis_client.ping()
    except Exception:
        redis_client = None

def generate_cache_key(prefix: str, *args, **kwargs) -> str:
    key_str = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True)
    key_hash = hashlib.md5(key_str.encode()).hexdigest()
    return f"{prefix}:{key_hash}"

def cached(ttl: int = 21600):
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if redis_client is None:
                return func(*args, **kwargs)

            cache_key = generate_cache_key(func.__name__, *args, **kwargs)

            try:
                cached_val = redis_client.get(cache_key)
                if cached_val:
                    result = json.loads(cached_val)
                    result["cache_hit"] = True
                    return result
            except Exception:
                return func(*args, **kwargs)

            result = func(*args, **kwargs)

            try:
                redis_client.setex(cache_key, ttl, json.dumps(result))
                result["cache_hit"] = False
            except Exception:
                pass

            return result
        return wrapper
    return decorator