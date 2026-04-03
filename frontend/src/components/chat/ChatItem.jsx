import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal } from 'lucide-react';
import ContextMenu from './ContextMenu';

export default function ChatItem({ chat, projects, isActive, onSelect, isMenuOpen, onMenuToggle, onMenuClose, onUpdate, onDeleteClick, onShareClick }) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(chat.title);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      // Select all text when starting rename, or put cursor at end
      inputRef.current.setSelectionRange(0, inputRef.current.value.length);
    }
  }, [isRenaming]);

  const handleMenuClick = (e) => {
    e.stopPropagation(); // prevent selecting the chat when just clicking the menu trigger
    onMenuToggle();
  };

  const startRename = () => {
    setRenameValue(chat.title);
    setIsRenaming(true);
    onMenuClose();
  };

  const submitRename = () => {
    if (isRenaming) {
      setIsRenaming(false);
      const newTitle = renameValue.trim();
      if (newTitle && newTitle !== chat.title) {
        onUpdate(chat.conversation_id, { title: newTitle });
      } else {
        setRenameValue(chat.title);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      submitRename();
    } else if (e.key === 'Escape') {
      setIsRenaming(false);
      setRenameValue(chat.title);
    }
  };

  return (
    <div className={`chat-item ${isActive ? 'active' : ''}`} onClick={() => !isRenaming && onSelect(chat.conversation_id)} title={chat.title}>
      {isRenaming ? (
        <input
          ref={inputRef}
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onBlur={submitRename}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          className="chat-item-rename-input"
          style={{ flex: 1, minWidth: 0, background: '#12151f', border: '1px solid #7f77dd', color: '#fff', borderRadius: 4, padding: '2px 6px', fontSize: 13, outline: 'none' }}
        />
      ) : (
        <span className="chat-item-title">{chat.title}</span>
      )}
      
      {!isRenaming && (
        <button 
          className={`chat-item-options-btn ${isMenuOpen ? 'open' : ''}`}
          onClick={handleMenuClick}
        >
          <MoreHorizontal size={18} />
        </button>
      )}

      {isMenuOpen && (
        <ContextMenu 
          chat={chat}
          projects={projects}
          onClose={onMenuClose} 
          onRename={startRename}
          onDelete={() => onDeleteClick(chat.conversation_id)}
          onShare={() => onShareClick(chat.conversation_id)}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
}
