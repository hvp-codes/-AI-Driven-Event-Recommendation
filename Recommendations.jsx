import React, { useCallback, useEffect, useState } from 'react';
import api from '../api/api';
import EventCard from '../components/EventCard';
import SkeletonGrid from '../components/SkeletonGrid';
import EmptyState from '../components/EmptyState';

export default function Recommendations() {
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [urgent, setUrgent] = useState([]);
  const [urgentLoading, setUrgentLoading] = useState(true);

  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [copilotAnswer, setCopilotAnswer] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api
      .get('/recommendations')
      .then((res) => setRecs(res.data.recommendations))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load recommendations'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setUrgentLoading(true);
    api.get('/recommendations/urgent')
      .then((res) => setUrgent(res.data.recommendations))
      .catch(() => {})
      .finally(() => setUrgentLoading(false));
  }, []);

  const askCopilot = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    setAsking(true);
    setCopilotAnswer(null);
    try {
      const res = await api.post('/career/copilot', { question });
      setCopilotAnswer(res.data);
    } catch {
      setCopilotAnswer({ answer: "I couldn't answer that just now — try again in a moment.", top: null, runnersUp: [] });
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="page">
      <div className="reco-hero">
        <div>
          <span className="reco-hero-eyebrow">Smart Match</span>
          <h1>Personalized Recommendations</h1>
          <p>We've blended your interests, career goal, skill gaps, what similar users enjoyed, and what's trending to curate these picks for you.</p>
        </div>
        <div className="reco-hero-icon">✦</div>
      </div>

      {!urgentLoading && urgent.length > 0 && (
        <div className="urgent-section">
          <div className="section-row">
            <h2 style={{ margin: 0, fontSize: '1.05rem' }}>⚡ Don't Miss This</h2>
          </div>
          <div className="event-grid">
            {urgent.map((r) => (
              <EventCard key={r.event._id} event={r.event} score={r.score} reasons={r.reasons} opportunity={r.opportunity} badges={r.badges} />
            ))}
          </div>
        </div>
      )}

      <div className="copilot-box">
        <h3>🤖 AI Event Copilot</h3>
        <p>Ask what you should attend next, in plain English.</p>
        <form className="ai-assist-row" onSubmit={askCopilot}>
          <textarea
            placeholder='"I know Python and want to become an ML engineer — what should I attend?"'
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button className="ai-btn" type="submit" disabled={asking}>{asking ? 'Thinking…' : 'Ask'}</button>
        </form>

        {copilotAnswer && (
          <div className="copilot-answer">
            <p className="copilot-story">{copilotAnswer.answer}</p>
            {copilotAnswer.top && (
              <div className="event-grid">
                <EventCard
                  event={copilotAnswer.top.event}
                  score={copilotAnswer.top.score}
                  reasons={copilotAnswer.top.reasons}
                  opportunity={copilotAnswer.top.opportunity}
                />
                {copilotAnswer.runnersUp.map((r) => (
                  <EventCard key={r.event._id} event={r.event} score={r.score} reasons={r.reasons} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="section-row">
        <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Highly Relevant to You</h2>
        <button className="refresh-link" onClick={load} disabled={loading}>↻ Refresh matches</button>
      </div>

      {error && <p className="error-text">{error}</p>}
      {loading ? (
        <SkeletonGrid />
      ) : recs.length === 0 ? (
        <EmptyState icon="🎯" title="No recommendations yet" subtitle="Like or register for a few events and we'll start finding your matches." />
      ) : (
        <div className="event-grid">
          {recs.map((r) => (
            <EventCard key={r.event._id} event={r.event} score={r.score} reasons={r.reasons} opportunity={r.opportunity} badges={r.badges} />
          ))}
        </div>
      )}
    </div>
  );
}
