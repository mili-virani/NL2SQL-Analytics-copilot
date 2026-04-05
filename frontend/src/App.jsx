import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ResultChart from "./components/ResultChart";
import ChatList from "./components/chat/ChatList";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
  const colors = SCHEMA_COLORS[schema] || { bg: "#1a1a2e", accent: "#7f77dd", badge: "#12122a" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 10px", borderRadius: 99,
      background: colors.badge, border: `1px solid ${colors.accent}33`, fontSize: 11, fontWeight: 600,
      letterSpacing: "0.08em", color: colors.accent, textTransform: "uppercase", fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: colors.accent, boxShadow: `0 0 6px ${colors.accent}`, display: "inline-block" }} />
      {schema}
    </span>
  );
}

function ResultsTable({ results }) {
  if (!results || !Array.isArray(results) || results.length === 0) return <p style={{ color: "#888", fontSize: 13, margin: 0 }}>No results returned.</p>;
  const columns = Object.keys(results[0]);
  return (
    <div style={{ overflowX: "auto", borderRadius: 8 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "'JetBrains Mono', monospace" }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col} style={{ padding: "8px 14px", textAlign: "left", fontWeight: 600, color: "#a0a8c0", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: "1px solid #2a2d3a", background: "#0e1017", whiteSpace: "nowrap" }}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "#12151f" : "#0e1017" }}>
              {columns.map((col) => (
                <td key={col} style={{ padding: "7px 14px", color: "#c8d0e8", borderBottom: "1px solid #1e2230" }}>{String(row[col] ?? "")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AssistantTextReply({ data }) {
  const suggestions = data.suggestions || [];
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 28, alignItems: "flex-start" }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg, #1a1a3e, #2a1a50)", border: "1px solid #3a3570", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#9f97ef", flexShrink: 0 }}>◈</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="markdown-response" style={{ padding: "18px 22px", background: "#11131a", border: "1px solid #2a2d3d", borderRadius: "8px 24px 24px 24px", boxShadow: "0 2px 10px rgba(0,0,0,0.15)" }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {data.assistant_message || data.explanation || ""}
          </ReactMarkdown>
        </div>
        {suggestions.length > 0 && (
          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {suggestions.map((item) => (
              <span key={item} style={{ padding: "7px 12px", borderRadius: 999, background: "#0a0d16", border: "1px solid #1e2230", color: "#8fa1c7", fontSize: 12, fontFamily: "monospace" }}>{item}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ msg }) {
  const [activeTab, setActiveTab] = useState("results");
  if (msg.role === "user") {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
        <div style={{ maxWidth: "70%", padding: "12px 18px", background: "linear-gradient(135deg, #1a2050, #2a1a50)", borderRadius: "18px 18px 4px 18px", border: "1px solid #3a3570", color: "#d8d0f0", fontSize: 15, lineHeight: 1.5, fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
          {msg.content}
        </div>
      </div>
    );
  }

  if (msg.loading) {
    return (
      <div style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "flex-start" }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg, #1a1a3e, #2a1a50)", border: "1px solid #3a3570", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>◈</div>
        <div style={{ padding: "16px 20px", background: "#0e1017", borderRadius: "4px 18px 18px 18px", border: "1px solid #1e2230", display: "flex", gap: 6, alignItems: "center" }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#7f77dd", animation: `pulse 1.2s ${i * 0.2}s ease-in-out infinite` }} />
          ))}
        </div>
      </div>
    );
  }

  const { data } = msg;

  // Use AssistantTextReply if it's explicitly marked or if results is just a string (e.g. error msg)
  const isTextOnlyReply = 
      (data?.response_type && data.response_type !== "analytic_query") ||
      (typeof data?.results === 'string');

  if (isTextOnlyReply) {
    // Pack the string results so AssistantTextReply can display it
    const textData = {
        assistant_message: typeof data.results === 'string' ? data.results : data.assistant_message,
        explanation: data.explanation
    };
    return <AssistantTextReply data={textData} />;
  }

  const tabs = [
    { id: "results", label: `Results (${(data.results || []).length})` },
    { id: "chart", label: "Chart" }
  ];

  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 28, alignItems: "flex-start" }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg, #1a1a3e, #2a1a50)", border: "1px solid #3a3570", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#9f97ef", flexShrink: 0 }}>◈</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {data.selected_schema && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <SchemaTag schema={data.selected_schema} />
          </div>
        )}
        <div className="markdown-response" style={{ padding: "18px 22px", background: "#11131a", border: "1px solid #2a2d3d", borderRadius: "8px 24px 24px 24px", marginBottom: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.15)" }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {data.explanation || ""}
          </ReactMarkdown>
        </div>
        
        {(Array.isArray(data.results) && data.results.length > 0) && (
            <div style={{ background: "#080b12", border: "1px solid #1e2230", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "flex", borderBottom: "1px solid #1e2230", background: "#0a0d16" }}>
                {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{ padding: "10px 16px", background: "none", border: "none", borderBottom: activeTab === tab.id ? "2px solid #7f77dd" : "2px solid transparent", color: activeTab === tab.id ? "#c8d0e8" : "#4a5a7a", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "monospace", letterSpacing: "0.05em", transition: "color 0.15s" }}
                >
                    {tab.label}
                </button>
                ))}
            </div>
            <div style={{ padding: 14 }}>
                {activeTab === "results" && <ResultsTable results={data.results} />}
                {activeTab === "chart" && <ResultChart results={data.results} />}
            </div>
            </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [shareModal, setShareModal] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (token) {
      if (user?.role === "guest") {
        setConversations([]);
        setProjects([]);
        newChat();
      } else {
        fetchConversations();
        fetchProjects();
      }
    } else {
      setConversations([]);
      setProjects([]);
    }
  }, [token, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const res = await fetch(`${API_BASE}/chat/conversations`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) setConversations(await res.json());
    } catch (err) { console.error("Failed to load conversations"); }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/chat/projects`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) setProjects(await res.json());
    } catch (err) { console.error("Failed to load projects"); }
  };

  const handleUpdateConversation = async (id, data) => {
    // Optimistic update
    setConversations(prev => prev.map(c => c.conversation_id === id ? { ...c, ...data } : c));
    try {
      await fetch(`${API_BASE}/chat/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(data)
      });
    } catch (e) {
      console.error("Failed to update chat");
      fetchConversations(); // revert on failure
    }
  };

  const handleDeleteConversation = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await fetch(`${API_BASE}/chat/conversations/${deleteConfirm}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setConversations(prev => prev.filter(c => c.conversation_id !== deleteConfirm));
        if (currentConversationId === deleteConfirm) newChat();
      }
    } catch (e) { console.error("Failed to delete chat"); }
    finally { setDeleteConfirm(null); }
  };

  const loadConversation = async (id) => {
    if (loading) return;
    try {
      setLoading(true);
      setCurrentConversationId(id);
      const res = await fetch(`${API_BASE}/chat/conversations/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const mapped = [];
        data.messages.forEach(m => {
          if (m.role === 'user') {
            mapped.push({ role: 'user', content: m.content, id: m.message_id });
          } else {
            mapped.push({ role: 'assistant', data: m.response_json, id: m.message_id });
          }
        });
        setMessages(mapped);
      }
    } catch (e) { console.error("Failed to load history"); }
    finally { setLoading(false); }
  };

  const newChat = () => {
    setCurrentConversationId(null);
    setMessages([]);
  };

  const sendQuery = async (question) => {
    if (!question.trim() || loading) return;
    const userMsg = { role: "user", content: question, id: Date.now() };
    const loadingMsg = { role: "assistant", loading: true, id: Date.now() + 1 };
    setMessages((m) => [...m, userMsg, loadingMsg]);
    setInput("");
    setLoading(true);

    try {
      let convId = currentConversationId;
      if (!convId && token && user?.role !== "guest") {
        // Create conversation
        const res = await fetch(`${API_BASE}/chat/conversations`, {
            method: "POST", 
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ title: "New Chat" })
        });
        if (res.ok) {
            const data = await res.json();
            convId = data.conversation_id;
            setCurrentConversationId(convId);
        }
      }

      const reqBody = { question };
      if (convId) reqBody.conversation_id = convId;

      const res = await fetch(`${API_BASE}/chat/query`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token && { "Authorization": `Bearer ${token}` })
        },
        body: JSON.stringify(reqBody),
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      setMessages((m) => [
        ...m.filter((msg) => !msg.loading),
        { role: "assistant", data, id: Date.now() + 2 },
      ]);
      
      if (token) fetchConversations(); // refresh list to show newly titled chat

    } catch (err) {
      setMessages((m) => m.filter((msg) => !msg.loading));
      setMessages(m => [...m, { 
          role: "assistant", 
          data: { explanation: "System Error: The orchestrator encountered an unexpected error processing your request." }, 
          id: Date.now() + 2 
      }]);
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
    <div style={{ display: "flex", height: "100vh", background: "#060810", color: "#c8d0e8", fontFamily: "'Inter', sans-serif" }}>
      {/* ── SIDEBAR ── */}
      <div style={{ width: 260, background: "#0e1017", borderRight: "1px solid #1e2230", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "24px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #4adb8a, #4a9eff)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "bold", fontSize: 16 }}>◈</div>
            <h1 style={{ margin: 0, fontSize: 16, color: "#fff", letterSpacing: "0.02em" }}>Copilot</h1>
          </div>
          <button onClick={newChat} style={{ width: "100%", padding: "10px 14px", background: "linear-gradient(135deg, #3a2a80, #5a3ab0)", color: "#fff", border: "1px solid #5a40c0", borderRadius: 8, textAlign: "left", cursor: "pointer", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <span>+</span> New Chat
          </button>
          
          {user?.role !== "guest" && (
            <input 
              type="text" value={sidebarSearch} onChange={e => setSidebarSearch(e.target.value)}
              placeholder="Search chats..."
              style={{ width: "100%", padding: "8px 12px", borderRadius: 6, background: "#0b0c13", border: "1px solid #1e2230", color: "#8fa1c7", fontSize: 13, outline: "none", marginBottom: 12 }}
            />
          )}
        </div>
        
        <div style={{ flex: 1, overflowY: "auto", padding: "0 10px", display: "flex", flexDirection: "column", gap: 16 }}>
            {user?.role === "guest" ? (
              <div style={{ padding: "24px 10px", textAlign: "center", color: "#6a7a9a", fontSize: 13, lineHeight: 1.5 }}>
                <p style={{ marginBottom: "12px", color: "#a0a8c0", fontWeight: 600 }}>Guest Session</p>
                <p>Sign in to save your conversation history and access advanced features.</p>
              </div>
            ) : (
              <ChatList 
                conversations={conversations.filter(c => c.title?.toLowerCase().includes(sidebarSearch.toLowerCase()))}
                projects={projects}
                currentConversationId={currentConversationId}
                onSelect={loadConversation}
                onUpdate={handleUpdateConversation}
                onDeleteClick={setDeleteConfirm}
                onShareClick={setShareModal}
              />
            )}
        </div>

        <div style={{ padding: "16px 20px", borderTop: "1px solid #1e2230" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#12151f', padding: '8px 12px', borderRadius: 8, border: '1px solid #1e2230', marginBottom: 8}}>
               <div style={{width:24,height:24,borderRadius:'50%',background:'#3d4b6c',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'#fff'}}>{(user?.name||"G").substring(0,1)}</div>
               <div style={{overflow:'hidden'}}>
                 <p style={{margin:0,fontSize:12,color:'#fff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{user?.name||"Guest"}</p>
                 <p style={{margin:0,fontSize:10,color:'#8fa1c7'}}>{user?.role||""}</p>
               </div>
            </div>
            {(user?.role === "admin" || user?.role === "super_admin") && (
              <button onClick={() => navigate("/admin")} style={{ width: "100%", padding: "10px 14px", background: "transparent", color: "#8fa1c7", border: "none", borderRadius: 8, textAlign: "left", cursor: "pointer", fontSize: 13, fontWeight: 500, display:'flex', alignItems: 'center', gap: 6 }}>⚙️ Admin Dashboard</button>
            )}
            {user && user.role !== "guest" ? (
              <button onClick={() => { logout(); navigate("/login"); }} style={{ width: "100%", padding: "10px 14px", background: "#1a1008", border: "1px solid #3a1010", color: "#e24b4a", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13, textAlign: 'left' }}>Sign Out</button>
            ) : (
              <button onClick={() => { logout(); navigate("/login"); }} style={{ width: "100%", padding: "10px 14px", background: "#0e1810", border: "1px solid #102a15", color: "#4adb8a", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13, textAlign: 'left' }}>Sign Up / Log In</button>
            )}
          </div>
        </div>
      </div>

      {/* ── MAIN PANE ── */}
      <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", borderLeft: "1px solid #1e2230" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;600&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        @keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.1); } }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar-track { background: #080b12; }
        ::-webkit-scrollbar-thumb { background: #1e2230; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #2a2d3a; }
      `}</style>

        {/* Header */}
        <div style={{ padding: "14px 24px", background: "#080b12", borderBottom: "1px solid #1a1d2a", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div>
              <p style={{ fontSize: 18, fontWeight: 600, color: "#d0c8f0", letterSpacing: "-0.01em" }}>NL2SQL Analytics Copilot</p>
              <p style={{ fontSize: 12, color: "#aea9a9", letterSpacing: "0.08em", fontFamily: "monospace" }}>ENTERPRISE · SECURE WORKSPACE</p>
            </div>
          </div>
        </div>

        {/* Chat area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
          <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 0", textAlign: "left" }}>
            {isEmpty && (
              <div style={{ textAlign: "center", padding: "60px 0 40px", animation: "fadeSlideUp 0.5s ease" }}>
                <div style={{ width: 64, height: 64, margin: "0 auto 24px", borderRadius: 18, background: "linear-gradient(135deg, #12122e, #220e40)", border: "1px solid #3a2a70", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#9f97ef" }}>◈</div>
                <h1 style={{ fontSize: 28, fontWeight: 600, color: "#d0c8f0", marginBottom: 8, letterSpacing: "-0.02em" }}>Ask anything about your data</h1>
                <p style={{ fontSize: 16, color: "#4a5a7a", marginBottom: 36, lineHeight: 1.6 }}>Natural language → Protected SQL → Insights.</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, maxWidth: 600, margin: "0 auto" }}>
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => sendQuery(s)}
                      style={{ padding: "12px 16px", background: "#0a0d16", border: "1px solid #1e2230", borderRadius: 10, color: "#8090b0", fontSize: 14, cursor: "pointer", textAlign: "left", lineHeight: 1.4, transition: "all 0.15s", fontFamily: "inherit" }}
                      onMouseEnter={(e) => { e.target.style.background = "#0e1117"; e.target.style.borderColor = "#2a2d40"; e.target.style.color = "#c0c8e0"; }}
                      onMouseLeave={(e) => { e.target.style.background = "#0a0d16"; e.target.style.borderColor = "#1e2230"; e.target.style.color = "#8090b0"; }}
                    >{s}</button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} style={{ animation: "fadeSlideUp 0.3s ease" }}>
                <MessageBubble msg={msg} />
              </div>
            ))}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input bar */}
        <div style={{ padding: "16px 24px 20px", background: "#080b12", borderTop: "1px solid #1a1d2a", flexShrink: 0 }}>
          <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", gap: 10, alignItems: "flex-end" }}>
            <div style={{ flex: 1, background: "#0a0d16", border: "1px solid #1e2230", borderRadius: 14, padding: "2px 6px 2px 16px", display: "flex", alignItems: "center", gap: 8, transition: "border-color 0.15s" }}>
              <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey}
                placeholder="Message Copilot…" rows={1}
                style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#c8d0e8", fontSize: 14, fontFamily: "'DM Sans', 'Segoe UI', sans-serif", resize: "none", lineHeight: 1.6, padding: "10px 0", maxHeight: 120, overflowY: "auto" }}
                onInput={(e) => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
              />
            </div>
            <button
              onClick={() => sendQuery(input)} disabled={loading || !input.trim()}
              style={{ width: 44, height: 44, borderRadius: 12, background: loading || !input.trim() ? "#1a1d2a" : "linear-gradient(135deg, #3a2a80, #5a3ab0)", border: "1px solid", borderColor: loading || !input.trim() ? "#1e2230" : "#5a40c0", color: loading || !input.trim() ? "#3a4060" : "#d0c8f0", cursor: loading || !input.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, transition: "all 0.15s" }}
            >
              {loading ? <div style={{ width: 16, height: 16, border: "2px solid #3a4060", borderTopColor: "#7f77dd", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /> : "↑"}
            </button>
          </div>
          <p style={{ textAlign: "center", marginTop: 10, fontSize: 13, color: "#6a7a9a", fontFamily: "monospace", letterSpacing: "0.05em" }}>
            Results automatically filtered by access level · Shift+Enter for newline
          </p>
        </div>
      </div>
      {/* Modals */}
      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setDeleteConfirm(null)}>
          <div style={{ background: "#16171d", padding: "24px", borderRadius: "12px", border: "1px solid #2e303a", width: 400, fontFamily: "var(--sans)" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 12px", color: "#f3f4f6", fontSize: 18 }}>Delete Chat?</h3>
            <p style={{ margin: "0 0 24px", color: "#9ca3af", fontSize: 14 }}>This action cannot be undone. Are you sure you want to permanently delete this chat?</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ padding: "8px 16px", borderRadius: "6px", background: "transparent", border: "1px solid #2e303a", color: "#f3f4f6", cursor: "pointer", fontSize: 14 }}>Cancel</button>
              <button onClick={handleDeleteConversation} style={{ padding: "8px 16px", borderRadius: "6px", background: "#ef4444", border: "none", color: "#fff", cursor: "pointer", fontSize: 14 }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {shareModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShareModal(null)}>
          <div style={{ background: "#16171d", padding: "24px", borderRadius: "12px", border: "1px solid #2e303a", width: 400, fontFamily: "var(--sans)" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 12px", color: "#f3f4f6", fontSize: 18 }}>Share Chat</h3>
            <p style={{ margin: "0 0 16px", color: "#9ca3af", fontSize: 14 }}>Anyone with this link will be able to view this chat.</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              <input type="text" readOnly value={`https://app.nl2sql.local/share/${shareModal}`} style={{ flex: 1, padding: "8px 12px", borderRadius: "6px", background: "#1f2028", border: "1px solid #2e303a", color: "#f3f4f6", outline: "none", fontSize: 14 }} />
              <button onClick={(e) => { navigator.clipboard.writeText(`https://app.nl2sql.local/share/${shareModal}`); e.target.textContent = "Copied!"; setTimeout(() => { if (e.target) e.target.textContent = "Copy"; }, 2000); }} style={{ padding: "8px 16px", borderRadius: "6px", background: "linear-gradient(135deg, #3a2a80, #5a3ab0)", border: "none", color: "#fff", cursor: "pointer", whiteSpace: "nowrap", fontSize: 14 }}>Copy</button>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setShareModal(null)} style={{ padding: "8px 16px", borderRadius: "6px", background: "transparent", border: "1px solid #2e303a", color: "#f3f4f6", cursor: "pointer", fontSize: 14 }}>Done</button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}