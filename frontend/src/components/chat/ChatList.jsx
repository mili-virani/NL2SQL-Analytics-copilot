import React, { useState } from 'react';
import ChatItem from './ChatItem';

export default function ChatList({ conversations, currentConversationId, onSelect }) {
  const [openMenuId, setOpenMenuId] = useState(null);

  if (!conversations || conversations.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {conversations.map(c => (
        <ChatItem 
          key={c.conversation_id}
          chat={c}
          isActive={currentConversationId === c.conversation_id}
          onSelect={onSelect}
          isMenuOpen={openMenuId === c.conversation_id}
          onMenuToggle={() => setOpenMenuId(openMenuId === c.conversation_id ? null : c.conversation_id)}
          onMenuClose={() => setOpenMenuId(null)}
        />
      ))}
    </div>
  );
}
