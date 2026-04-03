import React, { useState } from 'react';
import ChatItem from './ChatItem';

export default function ChatList({ conversations, projects, currentConversationId, onSelect, onUpdate, onDeleteClick, onShareClick }) {
  const [openMenuId, setOpenMenuId] = useState(null);

  if ((!conversations || conversations.length === 0) && (!projects || projects.length === 0)) return null;

  const pinned = conversations.filter(c => c.is_pinned && !c.is_archived);
  const archived = conversations.filter(c => c.is_archived);
  // normal chats are ones not pinned, not archived, and not in any project
  const normal = conversations.filter(c => !c.is_pinned && !c.is_archived && !c.project_id);
  const projectChats = conversations.filter(c => !c.is_archived && c.project_id);

  const SectionHeader = ({ title }) => (
    <div style={{ fontSize: 11, fontWeight: 600, color: '#6a7a9a', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '12px 14px 4px', userSelect: 'none' }}>
      {title}
    </div>
  );

  const renderList = (list) => list.map(c => (
    <ChatItem 
      key={c.conversation_id}
      chat={c}
      projects={projects}
      isActive={currentConversationId === c.conversation_id}
      onSelect={onSelect}
      isMenuOpen={openMenuId === c.conversation_id}
      onMenuToggle={() => setOpenMenuId(openMenuId === c.conversation_id ? null : c.conversation_id)}
      onMenuClose={() => setOpenMenuId(null)}
      onUpdate={onUpdate}
      onDeleteClick={onDeleteClick}
      onShareClick={onShareClick}
    />
  ));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {projects && projects.length > 0 && projects.map(p => {
        const pChats = projectChats.filter(c => c.project_id === p.project_id);
        if (pChats.length === 0) return null;
        return (
          <div key={`proj-${p.project_id}`}>
            <SectionHeader title={p.name} />
            {renderList(pChats)}
          </div>
        )
      })}
      
      {pinned.length > 0 && (
        <div style={{ marginBottom: 4 }}>
          <SectionHeader title="Pinned" />
          {renderList(pinned)}
        </div>
      )}

      {normal.length > 0 && (
        <div style={{ marginBottom: 4 }}>
          <SectionHeader title="Chats" />
          {renderList(normal)}
        </div>
      )}

      {archived.length > 0 && (
        <div>
          <SectionHeader title="Archived" />
          {renderList(archived)}
        </div>
      )}
    </div>
  );
}
