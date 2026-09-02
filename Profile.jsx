import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { categoryBadgeStyle } from '../utils/categoryMeta';
import { FALLBACK_GOALS, FALLBACK_SKILLS, nextSkillLevel, skillLevelPct } from '../utils/careerMeta';
import EmptyState from '../components/EmptyState';

const SUGGESTED_INTERESTS = ['tech', 'music', 'business', 'art', 'sports', 'food', 'ai', 'networking'];

export default function Profile() {
  const { user, setUser } = useAuth();
  const { showToast } = useToast();
  const [interests, setInterests] = useState(user?.interests || []);
  const [location, setLocation] = useState(user?.location || '');
  const [careerGoal, setCareerGoal] = useState(user?.careerGoal || '');
  const [skills, setSkills] = useState(user?.skills || []);
  const [tab, setTab] = useState('tickets');

  const [tickets, setTickets] = useState([]);
  const [saved, setSaved] = useState([]);
  const [hostedCount, setHostedCount] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [dashboard, setDashboard] = useState(null);
  const [roadmap, setRoadmap] = useState(null);
  const [careerLoading, setCareerLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get('/interactions'),
      api.get('/events/mine'),
      api.get('/recommendations', { params: { limit: 50 } }),
    ]).then(([interRes, eventsRes, recoRes]) => {
      const all = interRes.data.interactions.filter((i) => i.event);
      setTickets(all.filter((i) => i.type === 'register'));
      setSaved(all.filter((i) => i.type === 'save'));
      setHostedCount(eventsRes.data.events.length);
      setMatchCount(recoRes.data.count);
    }).finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setCareerLoading(true);
    Promise.all([api.get('/career/dashboard'), api.get('/career/roadmap')])
      .then(([dashRes, roadRes]) => {
        setDashboard(dashRes.data);
        setRoadmap(roadRes.data);
      })
      .catch(() => {})
      .finally(() => setCareerLoading(false));
  }, [user, user?.careerGoal]);

  const toggleInterest = (interest) => {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const cycleSkill = (skillName) => {
    setSkills((prev) => {
      const existing = prev.find((s) => s.name === skillName);
      if (!existing) return [...prev, { name: skillName, level: 'beginner' }];
      const level = nextSkillLevel(existing.level);
      if (level === 'none') return prev.filter((s) => s.name !== skillName);
      return prev.map((s) => (s.name === skillName ? { ...s, level } : s));
    });
  };

  const handleSave = async () => {
    const res = await api.put('/auth/me/interests', { interests, location, careerGoal, skills });
    setUser(res.data.user);
    showToast('Profile updated', 'success');
  };

  if (!user) return <div className="page"><EmptyLogin /></div>;

  const initial = user.name?.trim()?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className="page">
      <div className="profile-header">
        <div className="avatar-lg">{initial}</div>
        <div>
          <h1>{user.name}</h1>
          <p className="muted-email">{user.email}</p>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat-card"><div className="stat-num">{tickets.length}</div><div className="stat-label">Attending</div></div>
        <div className="stat-card"><div className="stat-num">{hostedCount}</div><div className="stat-label">Hosted</div></div>
        <div className="stat-card"><div className="stat-num">{matchCount}</div><div className="stat-label">AI Matches</div></div>
      </div>

      <div className="tab-row">
        <button className={`tab-btn ${tab === 'tickets' ? 'active' : ''}`} onClick={() => setTab('tickets')}>My Registered Tickets</button>
        <button className={`tab-btn ${tab === 'saved' ? 'active' : ''}`} onClick={() => setTab('saved')}>Saved</button>
        <button className={`tab-btn ${tab === 'career' ? 'active' : ''}`} onClick={() => setTab('career')}>Career Progress</button>
        <button className={`tab-btn ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>Settings</button>
      </div>

      {tab === 'tickets' && (
        <div className="tickets-card">
          {loading ? <p className="hint">Loading…</p> : tickets.length === 0 ? (
            <p className="hint">No tickets yet — register for an event to see it here.</p>
          ) : tickets.map((t) => <TicketRow key={t._id} interaction={t} actionLabel="View Ticket" />)}
        </div>
      )}

      {tab === 'saved' && (
        <div className="tickets-card">
          {loading ? <p className="hint">Loading…</p> : saved.length === 0 ? (
            <p className="hint">Nothing saved yet — tap the star on any event card to bookmark it.</p>
          ) : saved.map((t) => <TicketRow key={t._id} interaction={t} actionLabel="View Event" />)}
        </div>
      )}

      {tab === 'career' && (
        <CareerTab careerLoading={careerLoading} dashboard={dashboard} roadmap={roadmap} onSetGoal={() => setTab('settings')} />
      )}

      {tab === 'settings' && (
        <div className="settings-card">
          <label className="field-label">Location</label>
          <input value={location} onChange={(e) => setLocation(e.target.value)} style={{ width: '100%', maxWidth: 320, marginTop: 6, padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: 8 }} />

          <p className="field-label" style={{ marginTop: 18 }}>Interests (drives your recommendations)</p>
          <div className="interest-grid">
            {SUGGESTED_INTERESTS.map((interest) => (
              <button
                type="button"
                key={interest}
                className={`interest-chip ${interests.includes(interest) ? 'active' : ''}`}
                onClick={() => toggleInterest(interest)}
              >
                {interest}
              </button>
            ))}
          </div>

          <p className="field-label" style={{ marginTop: 18 }}>🎯 Career goal (unlocks your Career Roadmap + Skill Gap Analyzer)</p>
          <select className="career-select" value={careerGoal} onChange={(e) => setCareerGoal(e.target.value)}>
            <option value="">Not set</option>
            {FALLBACK_GOALS.map((g) => (
              <option key={g.key} value={g.key}>{g.label}</option>
            ))}
          </select>

          {careerGoal && (
            <>
              <p className="field-label" style={{ marginTop: 18 }}>Your skills — tap to cycle: none → beginner → intermediate → advanced</p>
              <div className="interest-grid">
                {FALLBACK_SKILLS.map((skill) => {
                  const entry = skills.find((s) => s.name === skill);
                  const level = entry?.level || 'none';
                  return (
                    <button
                      type="button"
                      key={skill}
                      className={`interest-chip skill-chip level-${level}`}
                      onClick={() => cycleSkill(skill)}
                    >
                      {skill}{level !== 'none' && <span className="skill-chip-level"> · {level}</span>}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <button className="btn-primary" style={{ marginTop: 18 }} onClick={handleSave}>Save Changes</button>
        </div>
      )}
    </div>
  );
}

function CareerTab({ careerLoading, dashboard, roadmap, onSetGoal }) {
  if (careerLoading) return <p className="hint">Loading…</p>;

  if (!dashboard?.hasGoal) {
    return (
      <div className="career-empty-card">
        <EmptyState icon="🎯" title="No career goal set yet" subtitle="Set a career goal in Settings to unlock your Skill Gap Analyzer and Career Roadmap." />
        <button className="btn-primary" onClick={onSetGoal}>Set my career goal</button>
      </div>
    );
  }

  return (
    <div className="career-dashboard">
      <div className="career-progress-card">
        <div className="career-progress-header">
          <span className="reco-hero-eyebrow">Career Goal</span>
          <h2>{dashboard.careerGoal}</h2>
        </div>
        <div className="career-readiness-bar-track">
          <div className="career-readiness-bar-fill" style={{ width: `${dashboard.careerReadiness}%` }} />
        </div>
        <p className="hint">Career readiness: {dashboard.careerReadiness}%</p>

        <div className="career-stat-row">
          <div><strong>{dashboard.skillsDeveloped}</strong><span>Skills developed</span></div>
          <div><strong>{dashboard.eventsAttended}</strong><span>Events attended</span></div>
        </div>

        {dashboard.skills?.length > 0 && (
          <div className="skill-bars">
            {dashboard.skills.filter((s) => s.level !== 'none').map((s) => (
              <div className="skill-bar-row" key={s.name}>
                <span className="skill-bar-label">{s.name}</span>
                <div className="opportunity-bar-track">
                  <div className="opportunity-bar-fill" style={{ width: `${skillLevelPct(s.level)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {dashboard.nextAction && (
          <div className="next-action-box">
            <span>Next recommended action</span>
            <p>Build your <strong>{dashboard.nextAction.skill}</strong> skill at{' '}
              <Link to={`/events/${dashboard.nextAction.event._id}`}>{dashboard.nextAction.event.title}</Link>
            </p>
          </div>
        )}
      </div>

      {roadmap?.roadmap?.length > 0 && (
        <div className="roadmap-card">
          <h3>🪜 Your Career Journey</h3>
          <div className="roadmap-steps">
            <div className="roadmap-step roadmap-goal-marker">
              <span className="roadmap-step-badge">🎯</span>
              <span>{roadmap.label}</span>
            </div>
            {roadmap.roadmap.map((step) => (
              <div className="roadmap-step" key={step.event._id}>
                <span className={`roadmap-step-badge label-${step.label.toLowerCase()}`}>{step.label}</span>
                <div>
                  <Link to={`/events/${step.event._id}`} className="roadmap-step-title">{step.event.title}</Link>
                  <p className="roadmap-step-skill">builds: {step.skill}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TicketRow({ interaction, actionLabel }) {
  const { event } = interaction;
  const dateStr = new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return (
    <div className="ticket-row">
      <div className="ticket-info">
        <span className="category-badge" style={{ ...categoryBadgeStyle(event.category), marginBottom: 6, display: 'inline-block' }}>{event.category}</span>
        <h4>{event.title}</h4>
        <p>{dateStr} · {event.location}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span className="ticket-price">{event.price > 0 ? `₹${event.price}` : 'Free'}</span>
        <Link to={`/events/${event._id}`} className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block', padding: '9px 16px', fontSize: '0.85rem' }}>{actionLabel}</Link>
      </div>
    </div>
  );
}

function EmptyLogin() {
  return (
    <div className="empty-state">
      <div className="empty-icon">🔒</div>
      <h3>Please log in</h3>
      <p>Log in to view your profile, tickets, and recommendations.</p>
    </div>
  );
}
