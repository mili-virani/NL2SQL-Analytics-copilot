## 🧠 Enterprise Multi-Agent NL2SQL Analytics Copilot

An intelligent, self-healing analytics system that converts natural language queries into **accurate SQL**, executes them on real databases, and returns **results, explanations, charts, and full audit traceability**.

🚀 Not just NL → SQL — this is a **production-style, multi-agent analytics copilot**.

---

## ✨ Key Highlights

- 🧠 Multi-Agent Pipeline  
  → intent → schema routing → SQL generation → validation → repair → execution  

- 🗂️ Schema-Aware Routing  
  → supports multiple domains (sales, inventory, customer, support)  

- 📚 Metadata-Grounded SQL  
  → uses tables, columns, relationships for accurate queries  

- 🔧 Self-Healing SQL Engine  
  → auto-repairs failed queries using LLM + DB error feedback  

- ✅ Secure Validation  
  → prevents unsafe queries (DROP, DELETE, etc.)  

- 📊 Auto Visualization  
  → generates charts (bar, line, pie)  

- 🔍 Audit Trail  
  → tracks full query lifecycle  

- 💬 Explainability  
  → converts results into business insights  

---

## 🏗️ Architecture

```text
User Query
   ↓
Schema Router
   ↓
Metadata Retrieval
   ↓
LLM (Gemini) → SQL Generation
   ↓
SQL Validator
   ↓
Execution (PostgreSQL)
   ↓
[Failure → Repair Agent → Retry]
   ↓
Results + Explanation + Charts + Audit Trail
```

---

## ⚙️ Tech Stack

**Backend:** FastAPI, PostgreSQL (Neon), SQLAlchemy, Gemini API  
**Frontend:** React (Vite), Recharts  

---

## 🔑 Core Features

### 🔧 Self-Healing SQL Repair
- Captures DB errors  
- Uses LLM + metadata to fix queries  
- Retries execution automatically  

---

### 🔍 Audit Trail

```json
{
  "initial_sql": "...",
  "initial_error": "...",
  "repair_attempted": true,
  "repaired_sql": "...",
  "execution_outcome": "success"
}
```

---

### 📊 Smart Visualization
- Auto-detects chartable results  
- Avoids misleading charts  

---

### 💬 Explainable Results
- Converts outputs into insights  
- Handles empty / partial data  

---

## 🎨 Frontend

- Chat-based interface  
- Tabs: Results | Chart | SQL | Audit Trail  
- SQL highlighting + repair indicators  

---

## 🧪 Testing

- End-to-end testing  
- Multi-schema validation  
- Negative & edge-case testing  
- Repair flow testing  

---

## ☁️ Deployment

- Backend: Render  
- Database: Neon (PostgreSQL)  
- Frontend: Vercel-ready  

---

## 🎯 Why This Project Stands Out

- ✅ Self-healing query system  
- ✅ Explainable + auditable AI  
- ✅ Multi-schema architecture  
- ✅ Full-stack + LLM integration  

---

## 🚀 Future Work

- RBAC  
- Query caching  
- Fine-tuned LLM  
- Export (PDF/CSV)  
