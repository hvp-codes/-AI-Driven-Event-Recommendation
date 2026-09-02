import React from 'react';

export default function EmptyState({ icon = '🔍', title, subtitle }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
}
