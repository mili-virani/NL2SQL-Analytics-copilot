import os
import json
import hashlib
from redis import Redis
from functools import wraps
from typing import Callable, Any

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
try:
    redis_client = Redis.from_url(REDIS_URL, decode_responses=True)
except Exception:
    redis_client = None

def generate_cache_key(prefix: str, *args, **kwargs) -> str:
    key_str = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True)
    key_hash = hashlib.md5(key_str.encode()).hexdigest()
    return f"{prefix}:{key_hash}"

def cached(ttl: int = 21600):  # default 6 hours
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if not redis_client:
                return func(*args, **kwargs)
                
            cache_key = generate_cache_key(func.__name__, *args, **kwargs)
            cached_val = redis_client.get(cache_key)
            if cached_val:
                result = json.loads(cached_val)
                result["cache_hit"] = True 
                return result
                
            result = func(*args, **kwargs)
            
            # Remove pydantic models or complex objects before caching if necessary
            # For this simple implementation, we assume result is serializable dict
            try:
                redis_client.setex(cache_key, ttl, json.dumps(result))
                result["cache_hit"] = False
            except Exception as e:
                pass # fail silently if unable to cache
            return result
        return wrapper
    return decorator
