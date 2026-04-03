🧠 Enterprise Multi-Agent NL2SQL Analytics Copilot

An intelligent, self-healing analytics system that converts natural language queries into accurate SQL, executes them on real databases, and returns results, explanations, charts, and full audit traceability.

🚀 Not just NL → SQL — this is a production-style, multi-agent analytics copilot designed for reliability, transparency, and real-world use.

✨ Key Highlights
🧠 Multi-Agent Pipeline — intent → schema routing → SQL generation → validation → repair → execution
🗂️ Schema-Aware Routing — dynamically selects domains (sales, inventory, customer, support)
📚 Metadata-Grounded SQL — uses live schema (tables, columns, relationships)
🔧 Self-Healing SQL Engine — auto-repairs failed queries using LLM + DB error feedback
✅ Secure Validation Layer — prevents unsafe queries (DROP, DELETE, etc.)
📊 Auto Visualization — generates charts (bar, line, pie) from results
🔍 Audit Trail — full transparency across query lifecycle
💬 Explainability Layer — business-friendly insights
🏗️ Architecture Overview
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
Final Output:
Results + Explanation + Charts + Audit Trail
⚙️ Tech Stack

Backend: FastAPI, PostgreSQL (Neon), SQLAlchemy, Gemini API
Frontend: React (Vite), Recharts

🔑 Core Features
🔧 Self-Healing SQL Repair (Key Feature)
Captures database errors
Uses LLM + metadata to fix queries
Automatically retries execution
🔍 Audit Trail

Tracks full lifecycle:

{
  "initial_sql": "...",
  "initial_error": "...",
  "repair_attempted": true,
  "repaired_sql": "...",
  "execution_outcome": "success"
}
📊 Smart Visualization
Auto-detects chartable results
Avoids misleading charts
💬 Explainable Results
Converts query output into business insights
Handles edge cases (empty / partial data)
🎨 Frontend
Chat-based interface
Tabs: Results | Chart | SQL | Audit Trail
SQL highlighting + repair indicators
🧪 Testing
End-to-end query testing
Multi-schema validation
Negative & edge-case testing
Repair flow testing
☁️ Deployment
Backend: Render
Database: Neon (PostgreSQL)
Frontend: Vercel-ready
🎯 Why This Project Stands Out
✅ Self-healing query system (rare)
✅ Explainable + auditable AI
✅ Multi-schema enterprise design
✅ Full-stack + LLM integration
🚀 Future Work
RBAC
Query caching
Fine-tuned LLM
Export (PDF/CSV)
