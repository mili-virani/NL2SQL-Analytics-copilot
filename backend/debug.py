import json
import requests

res = requests.post("http://127.0.0.1:8001/chat/query", json={"question": "hello"})
print(res.status_code)
print(res.text)
