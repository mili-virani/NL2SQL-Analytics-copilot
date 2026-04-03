import React, { useEffect, useRef, useState } from "react";
import { Share2, Edit2, FolderInput, Pin, Archive, Trash2, ChevronRight, Check } from "lucide-react";

export default function ContextMenu({ chat, projects, onClose, onRename, onDelete, onShare, onUpdate }) {
  const menuRef = useRef(null);
  const [isUp, setIsUp] = useState(false);
  const [showProjects, setShowProjects] = useState(false);

  useEffect(() => {
    if (menuRef.current) {
        const rect = menuRef.current.getBoundingClientRect();
        // If bottom of menu goes below viewport, show it upwards
        if (rect.bottom > window.innerHeight - 20) {
            setIsUp(true);
        }
    }
    
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  if (showProjects) {
    return (
      <div ref={menuRef} className={`context-menu ${isUp ? 'up' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "6px 12px", fontSize: 11, color: "#8fa1c7", fontWeight: 600, borderBottom: "1px solid #4d4d4f", marginBottom: 4 }}>
          Move to Project
        </div>
        <button className="context-menu-item" onClick={() => { onUpdate(chat.conversation_id, { project_id: null }); onClose(); }}>
           None {chat.project_id === null && <Check size={14} style={{marginLeft: 'auto'}}/>}
        </button>
        {projects && projects.map(p => (
           <button key={p.project_id} className="context-menu-item" onClick={() => { onUpdate(chat.conversation_id, { project_id: p.project_id }); onClose(); }}>
             {p.name} {chat.project_id === p.project_id && <Check size={14} style={{marginLeft: 'auto'}}/>}
           </button>
        ))}
      </div>
    );
  }

  return (
    <div ref={menuRef} className={`context-menu ${isUp ? 'up' : ''}`} onClick={(e) => e.stopPropagation()}>
      <button className="context-menu-item" onClick={() => { onShare(); onClose(); }}>
        <Share2 size={16} /> Share
      </button>
      <button className="context-menu-item" onClick={onRename}>
        <Edit2 size={16} /> Rename
      </button>
      
      {projects && projects.length > 0 && (
          <button className="context-menu-item nested" onClick={() => setShowProjects(true)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><FolderInput size={16} /> Move to project</span>
            <ChevronRight size={14} />
          </button>
      )}

      <button className="context-menu-item" onClick={() => { onUpdate(chat.conversation_id, { is_pinned: !chat.is_pinned }); onClose(); }}>
        <Pin size={16} /> {chat.is_pinned ? "Unpin chat" : "Pin chat"}
      </button>
      <button className="context-menu-item" onClick={() => { onUpdate(chat.conversation_id, { is_archived: !chat.is_archived }); onClose(); }}>
        <Archive size={16} /> {chat.is_archived ? "Unarchive" : "Archive"}
      </button>
      
      <div className="context-menu-divider" />
      
      <button className="context-menu-item danger" onClick={() => { onDelete(); onClose(); }}>
        <Trash2 size={16} /> Delete
      </button>
    </div>
  );
}
