import React from 'react';
import { MoreHorizontal } from 'lucide-react';
import ContextMenu from './ContextMenu';

export default function ChatItem({ chat, isActive, onSelect, isMenuOpen, onMenuToggle, onMenuClose }) {
  const handleMenuClick = (e) => {
    e.stopPropagation(); // prevent selecting the chat when just clicking the menu trigger
    onMenuToggle();
  };

  return (
    <div className={`chat-item ${isActive ? 'active' : ''}`} onClick={() => onSelect(chat.conversation_id)} title={chat.title}>
      <span className="chat-item-title">{chat.title}</span>
      <button 
        className={`chat-item-options-btn ${isMenuOpen ? 'open' : ''}`}
        onClick={handleMenuClick}
      >
        <MoreHorizontal size={18} />
      </button>
      {isMenuOpen && <ContextMenu onClose={onMenuClose} />}
    </div>
  );
}
