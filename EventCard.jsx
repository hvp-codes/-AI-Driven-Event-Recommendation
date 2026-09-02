import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { categoryMeta, categoryBadgeStyle, daysUntil } from '../utils/categoryMeta';
import OpportunityBreakdown from './OpportunityBreakdown';

export default function EventCard({ event, score, reasons, opportunity, badges, initiallySaved = false }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [saved, setSaved] = useState(initiallySaved);
  const [saving, setSaving] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const meta = categoryMeta(event.category);

  const dateStr = new Date(event.date).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const toggleSave = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      showToast('Log in to save events', 'error');
      return;
    }
    setSaving(true);
    try {
      if (saved) {
        await api.delete(`/interactions/${event._id}/save`);
        setSaved(false);
        showToast('Removed from saved');
      } else {
        await api.post('/interactions', { eventId: event._id, type: 'save' });
        setSaved(true);
        showToast('Saved for later');
      }
    } catch {
      showToast('Something went wrong', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleWhy = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowWhy((s) => !s);
  };

  return (
    <Link to={`/events/${event._id}`} className="event-card">
      <button
        className={`save-btn ${saved ? 'saved' : ''}`}
        onClick={toggleSave}
        disabled={saving}
        aria-label={saved ? 'Remove from saved' : 'Save event'}
        title={saved ? 'Saved' : 'Save for later'}
      >
        {saved ? '★' : '☆'}
      </button>
      <div className="event-card-media" style={{ background: meta.gradient }}>
        <span className="event-card-media-label">{meta.emoji} {event.category}</span>
      </div>
      <div className="event-card-body">
        <div className="event-card-header">
          <span className="category-badge" style={categoryBadgeStyle(event.category)}>{event.category}</span>
          {typeof score === 'number' && <span className="score-badge">{Math.round(score * 100)}% match</span>}
        </div>
        {badges?.length > 0 && (
          <div className="badge-row">
            {badges.map((b) => (
              <span key={b.label} className={`opp-badge ${b.label === 'Closing Soon' ? 'urgent' : ''}`}>
                {b.icon} {b.label}
              </span>
            ))}
          </div>
        )}
        <h3>{event.title}</h3>
        <p className="event-meta">📅 {dateStr} · {event.location}</p>
        <p className="event-meta countdown-badge">{daysUntil(event.date)}</p>
        <p className="event-desc">{event.description}</p>
        {event.tags?.length > 0 && (
          <div className="tag-row">
            {event.tags.slice(0, 4).map((t) => (
              <span key={t} className="tag-pill">{t}</span>
            ))}
          </div>
        )}
        {reasons?.length > 0 && (
          <p className="reasons">{reasons.join(' · ')}</p>
        )}
        {opportunity && (
          <>
            <button className="why-btn" onClick={toggleWhy}>
              {showWhy ? '▲ Hide breakdown' : '▼ Why this event?'}
            </button>
            {showWhy && <OpportunityBreakdown opportunity={opportunity} />}
          </>
        )}
        <p className={`price ${event.price > 0 ? '' : 'free'}`}>
          {event.price > 0 ? `₹${event.price}` : 'Free'}
        </p>
      </div>
    </Link>
  );
}
