import React, { useState, useEffect } from "react";
import { Database } from "lucide-react";

export default function WakeupScreen({ elapsed, isReady }) {
  const [show, setShow] = useState(false);
  
  // Fake progress bar calculation
  // Progress approaches 90% over 40 seconds. When ready, transitions to 100%.
  const progress = isReady ? 100 : Math.min((elapsed / 40) * 90, 90);

  useEffect(() => {
    // Only show the UI after 2 seconds to avoid flash on warm starts
    if (elapsed >= 2) {
      setShow(true);
    }
  }, [elapsed]);

  if (!show && !isReady) {
    // Return empty black screen during the 2 sec grace period
    return (
      <div style={{ height: "100vh", width: "100vw", background: "#060810", display: "flex" }}></div>
    );
  }

  return (
    <div style={{
      height: "100vh",
      width: "100vw",
      background: "#060810",
      color: "#c8d0e8",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter', sans-serif",
      opacity: isReady ? 0 : 1,
      transition: "opacity 0.5s ease"
    }}>
      <div style={{
        animation: "pulseWakeup 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        marginBottom: 24,
        background: "linear-gradient(135deg, #1a1a3e, #2a1a50)",
        padding: 24,
        borderRadius: "50%",
        border: "1px solid #3a3570",
        boxShadow: "0 0 40px rgba(127, 119, 221, 0.2)"
      }}>
        <Database size={48} color="#9f97ef" />
      </div>
      
      <h1 style={{ fontSize: 24, fontWeight: 600, color: "#d0c8f0", marginBottom: 12 }}>Starting up the server...</h1>
      <p style={{ fontSize: 15, color: "#8fa1c7", marginBottom: 40, textAlign: "center", maxWidth: 400, lineHeight: 1.5 }}>
        This may take up to 30 seconds on first load. Hang tight!
      </p>

      {/* Progress Bar Container */}
      <div style={{ width: 300, background: "#0a0d16", height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 16, border: "1px solid #1e2230" }}>
        <div style={{
          height: "100%",
          background: "linear-gradient(90deg, #4a9eff, #7f77dd)",
          width: `${progress}%`,
          transition: "width 1s linear",
          borderRadius: 4
        }}></div>
      </div>
      
      <div style={{ fontSize: 13, color: "#a0a8c0", fontFamily: "monospace", letterSpacing: "0.05em", marginBottom: 40 }}>
        Elapsed: {elapsed}s
      </div>

      <p style={{ fontSize: 13, color: "#4a5a7a" }}>
        Free tier server is waking up ☕
      </p>
      
      <style>{`
        @keyframes pulseWakeup {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: .7; transform: scale(0.95); }
        }
      `}</style>
    </div>
  );
}
