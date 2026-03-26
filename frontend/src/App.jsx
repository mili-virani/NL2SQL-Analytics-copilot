import { useState, useRef, useEffect } from "react";
import ResultChart from "./components/ResultChart";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8001";

const SCHEMA_COLORS = {
  sales: { bg: "#1a3a5c", accent: "#4a9eff", badge: "#0d2d4a" },
  inventory: { bg: "#1a3d2e", accent: "#4adb8a", badge: "#0d2d20" },
  customer: { bg: "#3d1a3a", accent: "#db4adb", badge: "#2d0d2a" },
  support: { bg: "#3d2e1a", accent: "#db9a4a", badge: "#2d200d" },
};

const SUGGESTIONS = [
  "Which issue types are most common?",
  "What are the top 5 selling products this month?",
  "Show me customers with the highest lifetime value",
  "What is the current inventory level for each category?",
];

function SchemaTag({ schema }) {
  const colors = SCHEMA_COLORS[schema] || {
    bg: "#1a1a2e",
    accent: "#7f77dd",
    badge: "#12122a",
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 10px",
        borderRadius: 99,
        background: colors.badge,
        border: `1px solid ${colors.accent}33`,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.08em",
        color: colors.accent,
        textTransform: "uppercase",
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: colors.accent,
          boxShadow: `0 0 6px ${colors.accent}`,
          display: "inline-block",
        }}
      />
      {schema}
    </span>
  );
}

function StatusBadge({ success, repaired }) {
  if (repaired)
    return (
      <span
        style={{
          padding: "2px 10px",
          borderRadius: 99,
          background: "#2d200d",
          border: "1px solid #db9a4a33",
          color: "#db9a4a",
          fontSize: 11,
          fontWeight: 600,
          fontFamily: "monospace",
          letterSpacing: "0.06em",
        }}
      >
        ⚡ REPAIRED
      </span>
    );
  if (success)
    return (
      <span
        style={{
          padding: "2px 10px",
          borderRadius: 99,
          background: "#0d2d20",
          border: "1px solid #4adb8a33",
          color: "#4adb8a",
          fontSize: 11,
          fontWeight: 600,
          fontFamily: "monospace",
          letterSpacing: "0.06em",
        }}
      >
        ✓ SUCCESS
      </span>
    );
  return (
    <span
      style={{
        padding: "2px 10px",
        borderRadius: 99,
        background: "#2d0d0d",
        border: "1px solid #e24b4a33",
        color: "#e24b4a",
        fontSize: 11,
        fontWeight: 600,
        fontFamily: "monospace",
        letterSpacing: "0.06em",
      }}
    >
      ✗ FAILED
    </span>
  );
}

function ResultsTable({ results }) {
  if (!results || results.length === 0)
    return (
      <p style={{ color: "#888", fontSize: 13, margin: 0 }}>
        No results returned.
      </p>
    );
  const columns = Object.keys(results[0]);
  return (
    <div style={{ overflowX: "auto", borderRadius: 8 }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col}
                style={{
                  padding: "8px 14px",
                  textAlign: "left",
                  fontWeight: 600,
                  color: "#a0a8c0",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  borderBottom: "1px solid #2a2d3a",
                  background: "#0e1017",
                  whiteSpace: "nowrap",
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((row, i) => (
            <tr
              key={i}
              style={{
                background: i % 2 === 0 ? "#12151f" : "#0e1017",
              }}
            >
              {columns.map((col) => (
                <td
                  key={col}
                  style={{
                    padding: "7px 14px",
                    color: "#c8d0e8",
                    borderBottom: "1px solid #1e2230",
                  }}
                >
                  {String(row[col] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OriginalSQLCollapsible({ sql, error }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: "1px solid #3a1010", borderRadius: 10, overflow: "hidden" }}>
      <button onClick={() => setOpen(v => !v)} style={{
        width: "100%", padding: "10px 14px", background: "#120808",
        border: "none", display: "flex", alignItems: "center",
        justifyContent: "space-between", cursor: "pointer",
        color: "#e24b4a", fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: "0.06em", fontWeight: 600,
      }}>
        <span>✗ ORIGINAL SQL (failed)</span>
        <span style={{ fontSize: 10, color: "#4a2a2a" }}>{open ? "▲ collapse" : "▼ expand"}</span>
      </button>
      {open && (
        <div style={{ padding: 12, background: "#0a0404", borderTop: "1px solid #2a1010" }}>
          {error && (
            <div style={{
              marginBottom: 10, padding: "8px 12px",
              background: "#1a0808", border: "1px solid #3a1010",
              borderRadius: 7, fontSize: 12, color: "#e24b4a",
              fontFamily: "monospace", lineHeight: 1.5,
            }}>
              <span style={{ fontWeight: 600, letterSpacing: "0.06em" }}>ERROR: </span>{error}
            </div>
          )}
          <SQLBlock sql={sql} />
        </div>
      )}
    </div>
  );
}

function SQLBlock({ sql }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const keywords =
    /\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|JOIN|LEFT|RIGHT|INNER|ON|AS|COUNT|SUM|AVG|MAX|MIN|HAVING|LIMIT|DISTINCT|AND|OR|NOT|IN|IS|NULL|DESC|ASC|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|WITH|UNION|INTERSECT|EXCEPT|CASE|WHEN|THEN|ELSE|END|BY)\b/g;
  const highlighted = sql
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(keywords, '<span style="color:#7f77dd;font-weight:600">$1</span>')
    .replace(
      /(\w+\.\w+)/g,
      '<span style="color:#4a9eff">$1</span>'
    )
    .replace(
      /(--[^\n]*)/g,
      '<span style="color:#4a5a6a;font-style:italic">$1</span>'
    );

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={handleCopy}
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          background: copied ? "#0d2d20" : "#1e2230",
          border: `1px solid ${copied ? "#4adb8a44" : "#2a2d3a"}`,
          color: copied ? "#4adb8a" : "#888",
          borderRadius: 6,
          padding: "3px 10px",
          fontSize: 11,
          cursor: "pointer",
          fontFamily: "monospace",
          letterSpacing: "0.05em",
          zIndex: 1,
        }}
      >
        {copied ? "✓ copied" : "copy"}
      </button>
      <pre
        style={{
          margin: 0,
          padding: "16px 14px",
          background: "#080b12",
          borderRadius: 8,
          border: "1px solid #1e2230",
          overflowX: "auto",
          fontSize: 13,
          lineHeight: 1.7,
          color: "#c8d0e8",
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
        }}
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    </div>
  );
}

function AuditTrail({ audit }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        border: "1px solid #1e2230",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          padding: "12px 16px",
          background: "#0e1017",
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          color: "#a0a8c0",
          fontSize: 13,
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: "0.04em",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#7f77dd", fontSize: 12 }}>▣</span>
          AUDIT TRAIL
        </span>
        <span style={{ fontSize: 10, color: "#4a5a7a" }}>
          {open ? "▲ collapse" : "▼ expand"}
        </span>
      </button>
      {open && (
        <div
          style={{
            padding: 16,
            background: "#080b12",
            borderTop: "1px solid #1e2230",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {[
            { label: "Initial SQL", value: audit.initial_sql, type: "sql", highlight: true },
            { label: "Initial Error", value: audit.initial_error || "none", type: "text", highlight: !!audit.initial_error },
            { label: "Initial Validation", value: audit.initial_validation, type: "json", highlight: false },
            { label: "Repair Attempted", value: String(audit.repair_attempted), type: "text", highlight: false },
            audit.repaired_sql &&
            { label: "Repaired SQL", value: audit.repaired_sql, type: "sql", highlight: true },
            audit.repaired_validation &&
            { label: "Repaired Validation", value: audit.repaired_validation, type: "json", highlight: false },
            { label: "Execution Outcome", value: audit.execution_outcome, type: "text", highlight: true },
          ]
            .filter(Boolean)
            .map(({ label, value, type, highlight }) => (
              <div key={label}>
                <p
                  style={{
                    margin: "0 0 6px",
                    fontSize: 10,
                    color: highlight ? "#db9a4a" : "#4a5a7a",  // ← highlight used here
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    fontFamily: "monospace",
                    fontWeight: 600,
                  }}
                >
                  {label}
                </p>
                {type === "sql" ? (
                  <SQLBlock sql={value} />
                ) : type === "json" ? (
                  <pre
                    style={{
                      margin: 0,
                      padding: 12,
                      background: "#0a0d16",
                      borderRadius: 8,
                      border: "1px solid #1a1e2a",
                      fontSize: 12,
                      color: "#a0c8a0",
                      fontFamily: "monospace",
                      lineHeight: 1.6,
                      overflowX: "auto",
                    }}
                  >
                    {JSON.stringify(value, null, 2)}
                  </pre>
                ) : (
                  <span
                    style={{
                      display: "inline-block",
                      padding: "3px 10px",
                      background: "#0e1017",
                      border: "1px solid #1e2230",
                      borderRadius: 6,
                      fontSize: 12,
                      color:
                        value === "success"
                          ? "#4adb8a"
                          : value === "none"
                            ? "#4a5a7a"
                            : "#c8d0e8",
                      fontFamily: "monospace",
                    }}
                  >
                    {value}
                  </span>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function RepairSummaryStrip() {
  const steps = [
    { icon: "✗", label: "Original SQL failed", color: "#e24b4a", bg: "#1a0808", border: "#3a1010" },
    { icon: "⚡", label: "Repair applied", color: "#db9a4a", bg: "#1a1008", border: "#3a2a10" },
    { icon: "✓", label: "Execution succeeded", color: "#4adb8a", bg: "#081a10", border: "#103a20" },
  ];
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
      {steps.map((s, i) => (
        <span key={i} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "5px 12px", borderRadius: 8,
          background: s.bg, border: `1px solid ${s.border}`,
          fontSize: 11, fontWeight: 600, color: s.color,
          fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.06em",
        }}>
          <span>{s.icon}</span> {s.label}
          {i < 2 && <span style={{ color: "#2a3040", marginLeft: 4 }}>→</span>}
        </span>
      ))}
    </div>
  );
}

function MessageBubble({ msg }) {
  const [activeTab, setActiveTab] = useState("results");
  if (msg.role === "user") {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            maxWidth: "70%",
            padding: "12px 18px",
            background: "linear-gradient(135deg, #1a2050, #2a1a50)",
            borderRadius: "18px 18px 4px 18px",
            border: "1px solid #3a3570",
            color: "#d8d0f0",
            fontSize: 15,
            lineHeight: 1.5,
            fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
          }}
        >
          {msg.content}
        </div>
      </div>
    );
  }

  if (msg.loading) {
    return (
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 24,
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: "linear-gradient(135deg, #1a1a3e, #2a1a50)",
            border: "1px solid #3a3570",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          ◈
        </div>
        <div
          style={{
            padding: "16px 20px",
            background: "#0e1017",
            borderRadius: "4px 18px 18px 18px",
            border: "1px solid #1e2230",
            display: "flex",
            gap: 6,
            alignItems: "center",
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#7f77dd",
                animation: `pulse 1.2s ${i * 0.2}s ease-in-out infinite`,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  const { data } = msg;
  const tabs = [
    { id: "results", label: `Results (${(data.results || []).length})` },
    { id: "chart", label: "Chart" },
    { id: "sql", label: "SQL" },
    { id: "audit", label: "Audit Trail" },
  ];

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        marginBottom: 28,
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: "linear-gradient(135deg, #1a1a3e, #2a1a50)",
          border: "1px solid #3a3570",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          color: "#9f97ef",
          flexShrink: 0,
        }}
      >
        ◈
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Meta bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <SchemaTag schema={data.selected_schema} />
          <StatusBadge success={data.execution_success} repaired={data.repaired} />
        </div>
        {data.repaired && <RepairSummaryStrip />}

        {/* Explanation */}
        <div
          style={{
            padding: "14px 18px",
            background: "#0e1017",
            border: "1px solid #1e2230",
            borderRadius: 12,
            marginBottom: 12,
            color: "#c8d0e8",
            fontSize: 14,
            lineHeight: 1.7,
            fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
          }}
        >
          {data.repaired && (
            <span style={{
              display: "inline-block", marginBottom: 6,
              fontSize: 12, color: "#db9a4a", fontFamily: "monospace",
              fontWeight: 600, letterSpacing: "0.04em",
            }}>
              ⚡ Original SQL failed — auto-repaired before execution.{" "}
            </span>
          )}
          {data.explanation}
        </div>

        {/* Tabs */}
        <div
          style={{
            background: "#080b12",
            border: "1px solid #1e2230",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid #1e2230",
              background: "#0a0d16",
            }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "10px 16px",
                  background: "none",
                  border: "none",
                  borderBottom:
                    activeTab === tab.id
                      ? "2px solid #7f77dd"
                      : "2px solid transparent",
                  color:
                    activeTab === tab.id ? "#c8d0e8" : "#4a5a7a",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "monospace",
                  letterSpacing: "0.05em",
                  transition: "color 0.15s",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div style={{ padding: 14 }}>
            {activeTab === "results" && (
              <ResultsTable results={data.results} />
            )}
            {activeTab === "chart" && (
              <ResultChart results={data.results} />
            )}
            {activeTab === "sql" && (
              data.repaired ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <p style={{
                      margin: "0 0 6px",
                      fontSize: 10,
                      color: "#e24b4a",
                      fontFamily: "monospace",
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}>
                      ✗ Original SQL (failed)
                    </p>
                    <SQLBlock sql={data.audit_trail?.initial_sql || data.generated_sql} />
                  </div>
                  <div>
                    <p style={{
                      margin: "0 0 6px",
                      fontSize: 10,
                      color: "#4adb8a",
                      fontFamily: "monospace",
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}>
                      ✓ Repaired SQL (executed)
                    </p>
                    <SQLBlock sql={data.repaired_sql} />
                  </div>
                </div>
              ) : (
                <SQLBlock sql={data.generated_sql} />
              )
            )}
            {activeTab === "audit" && (
              <AuditTrail audit={data.audit_trail} />
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendQuery = async (question) => {
    if (!question.trim() || loading) return;
    setError(null);
    const userMsg = { role: "user", content: question, id: Date.now() };
    const loadingMsg = { role: "assistant", loading: true, id: Date.now() + 1 };
    setMessages((m) => [...m, userMsg, loadingMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/nl2sql/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      setMessages((m) => [
        ...m.filter((msg) => !msg.loading),
        { role: "assistant", data, id: Date.now() + 2 },
      ]);
    } catch (err) {
      setMessages((m) => m.filter((msg) => !msg.loading));
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runRepairDemo = async () => {
    if (loading) return;
    setError(null);
    const demoLabel = "⚡ Repair Demo: Which products are currently low in stock?";
    const userMsg = { role: "user", content: demoLabel, id: Date.now() };
    const loadingMsg = { role: "assistant", loading: true, id: Date.now() + 1 };
    setMessages((m) => [...m, userMsg, loadingMsg]);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/nl2sql/test-repair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: "Which products are currently low in stock?",
          schema_name: "inventory",
          bad_sql:
            "SELECT product_name FROM products JOIN stock ON products.product_id = stock.product_id WHERE stock.quantity_available < stock.reorder_level;",
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      setMessages((m) => [
        ...m.filter((msg) => !msg.loading),
        { role: "assistant", data, id: Date.now() + 2 },
      ]);
    } catch (err) {
      setMessages((m) => m.filter((msg) => !msg.loading));
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendQuery(input);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #060810; }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #080b12; }
        ::-webkit-scrollbar-thumb { background: #1e2230; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #2a2d3a; }
      `}</style>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          background: "#060810",
          fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
          color: "#c8d0e8",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 24px",
            background: "#080b12",
            borderBottom: "1px solid #1a1d2a",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: "linear-gradient(135deg, #1a1a3e, #2a1060)",
                border: "1px solid #3a2a80",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#9f97ef",
                fontSize: 18,
              }}
            >
              ◈
            </div>
            <div>
              <p
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: "#d0c8f0",
                  letterSpacing: "-0.01em",
                }}
              >
                 NL2SQL Analytics Copilot
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: "#aea9a9",
                  letterSpacing: "0.08em",
                  fontFamily: "monospace",
                }}
              >
                ENTERPRISE · MULTI-AGENT
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {["sales", "inventory", "customer", "support"].map((s) => (
              <SchemaTag key={s} schema={s} />
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
          <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 0" }}>
            {isEmpty && (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 0 40px",
                  animation: "fadeSlideUp 0.5s ease",
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    margin: "0 auto 24px",
                    borderRadius: 18,
                    background: "linear-gradient(135deg, #12122e, #220e40)",
                    border: "1px solid #3a2a70",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 28,
                    color: "#9f97ef",
                  }}
                >
                  ◈
                </div>
                <h1
                  style={{
                    fontSize: 28,
                    fontWeight: 600,
                    color: "#d0c8f0",
                    marginBottom: 8,
                    letterSpacing: "-0.02em",
                  }}
                >
                  Ask anything about your data
                </h1>
                <p
                  style={{
                    fontSize: 16,
                    color: "#4a5a7a",
                    marginBottom: 36,
                    lineHeight: 1.6,
                  }}
                >
                  Natural language → SQL → Insights. Powered by multi-agent
                  pipeline.
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: 10,
                    maxWidth: 600,
                    margin: "0 auto",
                  }}
                >
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendQuery(s)}
                      style={{
                        padding: "12px 16px",
                        background: "#0a0d16",
                        border: "1px solid #1e2230",
                        borderRadius: 10,
                        color: "#8090b0",
                        fontSize: 14,
                        cursor: "pointer",
                        textAlign: "left",
                        lineHeight: 1.4,
                        transition: "all 0.15s",
                        fontFamily: "inherit",
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = "#0e1117";
                        e.target.style.borderColor = "#2a2d40";
                        e.target.style.color = "#c0c8e0";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = "#0a0d16";
                        e.target.style.borderColor = "#1e2230";
                        e.target.style.color = "#8090b0";
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{ animation: "fadeSlideUp 0.3s ease" }}
              >
                <MessageBubble msg={msg} />
              </div>
            ))}

            {error && (
              <div
                style={{
                  padding: "12px 16px",
                  background: "#1a0808",
                  border: "1px solid #3a1010",
                  borderRadius: 10,
                  color: "#e24b4a",
                  fontSize: 13,
                  marginBottom: 20,
                  fontFamily: "monospace",
                  animation: "fadeSlideUp 0.3s ease",
                }}
              >
                ✗ {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input bar */}
        <div
          style={{
            padding: "16px 24px 20px",
            background: "#080b12",
            borderTop: "1px solid #1a1d2a",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              maxWidth: 860,
              margin: "0 auto",
              display: "flex",
              gap: 10,
              alignItems: "flex-end",
            }}
          >
            {/* ADD THIS BUTTON */}
            <button
              onClick={runRepairDemo}
              disabled={loading}
              title="Run a controlled repair demo using a known-bad SQL query"
              style={{
                height: 44,
                padding: "0 14px",
                borderRadius: 12,
                background: "#0d2010",
                border: "1px solid #1a4a2a",
                color: loading ? "#2a4a3a" : "#4adb8a",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.06em",
                whiteSpace: "nowrap",
                flexShrink: 0,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.background = "#102a18";
                  e.target.style.borderColor = "#2a6a3a";
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "#0d2010";
                e.target.style.borderColor = "#1a4a2a";
              }}
            >
              ⚡ REPAIR DEMO
            </button>
            <div
              style={{
                flex: 1,
                background: "#0a0d16",
                border: "1px solid #1e2230",
                borderRadius: 14,
                padding: "2px 6px 2px 16px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                transition: "border-color 0.15s",
              }}
              onFocus={() => { }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask a business question…"
                rows={1}
                style={{
                  flex: 1,
                  background: "none",
                  border: "none",
                  outline: "none",
                  color: "#c8d0e8",
                  fontSize: 14,
                  fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
                  resize: "none",
                  lineHeight: 1.6,
                  padding: "10px 0",
                  maxHeight: 120,
                  overflowY: "auto",
                }}
                onInput={(e) => {
                  e.target.style.height = "auto";
                  e.target.style.height =
                    Math.min(e.target.scrollHeight, 120) + "px";
                }}
              />
            </div>
            <button
              onClick={() => sendQuery(input)}
              disabled={loading || !input.trim()}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background:
                  loading || !input.trim()
                    ? "#1a1d2a"
                    : "linear-gradient(135deg, #3a2a80, #5a3ab0)",
                border: "1px solid",
                borderColor:
                  loading || !input.trim() ? "#1e2230" : "#5a40c0",
                color:
                  loading || !input.trim() ? "#3a4060" : "#d0c8f0",
                cursor:
                  loading || !input.trim() ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                flexShrink: 0,
                transition: "all 0.15s",
              }}
            >
              {loading ? (
                <div
                  style={{
                    width: 16,
                    height: 16,
                    border: "2px solid #3a4060",
                    borderTopColor: "#7f77dd",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
              ) : (
                "↑"
              )}
            </button>
          </div>
          <p
            style={{
              textAlign: "center",
              marginTop: 10,
              fontSize: 13,
              color: "#6a7a9a",
              fontFamily: "monospace",
              letterSpacing: "0.05em",
            }}
          >
            Connected to analytics backend · Shift+Enter for newline
          </p>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}