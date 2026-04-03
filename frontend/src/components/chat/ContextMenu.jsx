import React, { useEffect, useRef, useState } from "react";
import { Share2, Edit2, FolderInput, Pin, Archive, Trash2, ChevronRight } from "lucide-react";

export default function ContextMenu({ onClose, onDelete }) {
  const menuRef = useRef(null);
  const [isUp, setIsUp] = useState(false);

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

  return (
    <div ref={menuRef} className={`context-menu ${isUp ? 'up' : ''}`} onClick={(e) => e.stopPropagation()}>
      <button className="context-menu-item" onClick={() => { console.log('Share clicked'); onClose(); }}>
        <Share2 size={16} /> Share
      </button>
      <button className="context-menu-item" onClick={() => { console.log('Rename clicked'); onClose(); }}>
        <Edit2 size={16} /> Rename
      </button>
      <button className="context-menu-item nested" onClick={() => { console.log('Move to project clicked'); onClose(); }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><FolderInput size={16} /> Move to project</span>
        <ChevronRight size={14} />
      </button>
      <button className="context-menu-item" onClick={() => { console.log('Pin chat clicked'); onClose(); }}>
        <Pin size={16} /> Pin chat
      </button>
      <button className="context-menu-item" onClick={() => { console.log('Archive clicked'); onClose(); }}>
        <Archive size={16} /> Archive
      </button>
      
      <div className="context-menu-divider" />
      
      <button className="context-menu-item danger" onClick={() => { console.log('Delete clicked'); if (onDelete) onDelete(); onClose(); }}>
        <Trash2 size={16} /> Delete
      </button>
    </div>
  );
}
