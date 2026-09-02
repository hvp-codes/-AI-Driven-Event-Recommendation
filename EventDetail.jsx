import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import EventCard from '../components/EventCard';
import { categoryMeta } from '../utils/categoryMeta';

export default function EventDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [event, setEvent] = useState(null);
  const [liked, setLiked] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [similar, setSimilar] = useState([]);

  const [skillsGained, setSkillsGained] = useState([]);
  const [feedbackSent, setFeedbackSent] = useState(false);

  const fetchEvent = useCallback(() => {
    api.get(`/events/${id}`).then((res) => setEvent(res.data.event));
  }, [id]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  useEffect(() => {
    if (!event) return;
    api.get('/events', { params: { category: event.category, upcoming: 'true' } })
      .then((res) => setSimilar(res.data.events.filter((e) => e._id !== event._id).slice(0, 3)))
      .catch(() => {});
  }, [event]);

  const interact = async (type) => {
    if (!user) {
      showToast('Log in to interact with events', 'error');
      return;
    }
    await api.post('/interactions', { eventId: id, type });
    if (type === 'like') { setLiked(true); showToast('Liked!', 'success'); }
    if (type === 'register') { setRegistered(true); showToast('Registered — see it on your Profile', 'success'); }
    fetchEvent();
  };

  const toggleSkillGained = (skill) => {
    setSkillsGained((prev) => (prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]));
  };

  const submitSkillFeedback = async () => {
    if (skillsGained.length === 0) return;
    await api.post('/interactions/skills-gained', { skillsGained });
    setFeedbackSent(true);
    showToast('Thanks — your skill profile has been updated', 'success');
  };

  if (!event) return <div className="page"><div className="skeleton" style={{ height: 320, borderRadius: 20 }} /></div>;

  const meta = categoryMeta(event.category);
  const dateStr = new Date(event.date).toLocaleString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
  const deadlineStr = event.registrationDeadline
    ? new Date(event.registrationDeadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null;

  return (
    <div className="page">
      <div className="event-detail">
        <div className="event-detail-hero" style={{ background: meta.gradient }}>
          <span className="category-badge" style={{ background: 'rgba(255,255,255,0.22)', color: '#fff' }}>{event.category}</span>
          <h1 style={{ color: '#fff', margin: '10px 0 0' }}>{event.title}</h1>
        </div>
        <div className="event-detail-body">
          <p className="event-meta">📅 {dateStr}</p>
          <p className="event-meta">📍 {event.location}{event.venue ? ` · ${event.venue}` : ''}</p>
          {deadlineStr && <p className="event-meta">⏳ Registration closes {deadlineStr}</p>}
          {event.difficulty && <p className="event-meta">📊 Difficulty: {event.difficulty}</p>}
          <p className={`price ${event.price > 0 ? '' : 'free'}`}>{event.price > 0 ? `₹${event.price}` : 'Free'}</p>
          <p>{event.description}</p>
          {event.tags?.length > 0 && (
            <div className="tag-row">
              {event.tags.map((t) => <span key={t} className="tag-pill">{t}</span>)}
            </div>
          )}
          {event.requiredSkills?.length > 0 && (
            <div className="tag-row">
              {event.requiredSkills.map((s) => <span key={s} className="tag-pill skill-tag">🧠 {s}</span>)}
            </div>
          )}
          <div className="stats-row">
            <span>👁️ {event.stats?.views || 0} views</span>
            <span>❤️ {event.stats?.likes || 0} likes</span>
            <span>🎟️ {event.stats?.registrations || 0} registered</span>
          </div>
          <div className="action-row">
            <button className={liked ? 'liked' : 'secondary'} onClick={() => interact('like')}>
              {liked ? '❤️ Liked' : '🤍 Like'}
            </button>
            <button className={registered ? 'saved-state' : ''} onClick={() => interact('register')} disabled={registered}>
              {registered ? '✓ Registered' : 'Register'}
            </button>
          </div>

          {registered && event.requiredSkills?.length > 0 && !feedbackSent && (
            <div className="skill-feedback-box">
              <h4>⭐ What did you learn?</h4>
              <p className="hint">Tell us which skills you picked up so your Career Roadmap stays accurate.</p>
              <div className="interest-grid">
                {event.requiredSkills.map((skill) => (
                  <button
                    type="button"
                    key={skill}
                    className={`interest-chip ${skillsGained.includes(skill) ? 'active' : ''}`}
                    onClick={() => toggleSkillGained(skill)}
                  >
                    {skill}
                  </button>
                ))}
              </div>
              <button className="btn-primary" style={{ marginTop: 12 }} onClick={submitSkillFeedback} disabled={skillsGained.length === 0}>
                Save to my skills
              </button>
            </div>
          )}
          {feedbackSent && <p className="hint">🧠 Skills updated — your recommendations have adapted.</p>}
        </div>
      </div>

      {similar.length > 0 && (
        <>
          <div className="section-row" style={{ marginTop: 36 }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>More in {event.category}</h2>
          </div>
          <div className="event-grid">
            {similar.map((ev) => <EventCard key={ev._id} event={ev} />)}
          </div>
        </>
      )}
    </div>
  );
}
