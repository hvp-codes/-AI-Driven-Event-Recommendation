import React, { useEffect, useState } from 'react';
import api from '../api/api';
import EventCard from '../components/EventCard';
import SkeletonGrid from '../components/SkeletonGrid';
import EmptyState from '../components/EmptyState';

const CATEGORIES = ['', 'tech', 'music', 'business', 'art', 'sports', 'food'];

export default function Home() {
  const [events, setEvents] = useState([]);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);

  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [interpreted, setInterpreted] = useState(null);

  const fetchEvents = async (cat = category) => {
    setLoading(true);
    setInterpreted(null);
    try {
      const params = { upcoming: 'true' };
      if (cat) params.category = cat;
      const res = await api.get('/events', { params });
      setEvents(res.data.events);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents(category);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const handleCategoryClick = (c) => {
    setAiQuery('');
    setCategory(c);
  };

  const handleAiSearch = async (e) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setCategory('');
    try {
      const res = await api.post('/events/ai-search', { query: aiQuery });
      setEvents(res.data.events);
      setInterpreted(res.data.interpreted);
    } catch {
      setInterpreted(null);
    } finally {
      setAiLoading(false);
    }
  };

  const interpretedSummary = () => {
    if (!interpreted) return null;
    const parts = [];
    if (interpreted.category) parts.push(`category: ${interpreted.category}`);
    if (interpreted.location) parts.push(`near ${interpreted.location}`);
    if (interpreted.maxPrice !== undefined) parts.push(interpreted.maxPrice === 0 ? 'free only' : `under ₹${interpreted.maxPrice}`);
    if (interpreted.withinDays) parts.push(`within ${interpreted.withinDays} days`);
    if (parts.length === 0) return null;
    return `Understood as: ${parts.join(' · ')}`;
  };

  return (
    <div className="page">
      <h1>Discover Events</h1>
      <p className="subtitle">Browse what's coming up, or ask the AI agent in plain English.</p>

      <form className="ai-search-bar" onSubmit={handleAiSearch}>
        <span className="ai-icon">✨</span>
        <input
          placeholder='Ask AI: "Find me tech conferences in New York next month under $100"'
          value={aiQuery}
          onChange={(e) => setAiQuery(e.target.value)}
        />
        <button className="ai-btn" type="submit" disabled={aiLoading}>
          {aiLoading ? 'Thinking…' : '✨ AI Agent'}
        </button>
      </form>
      {interpretedSummary() && <p className="ai-interpreted">{interpretedSummary()}</p>}

      <div className="filter-row">
        {CATEGORIES.map((c) => (
          <button
            key={c || 'all'}
            className={`filter-pill ${category === c && !interpreted ? 'active' : ''}`}
            onClick={() => handleCategoryClick(c)}
          >
            {c ? c[0].toUpperCase() + c.slice(1) : 'All Events'}
          </button>
        ))}
      </div>

      {loading || aiLoading ? (
        <SkeletonGrid />
      ) : events.length === 0 ? (
        <EmptyState icon="🗓️" title="No events found" subtitle="Try a different category, or rephrase your AI search." />
      ) : (
        <div className="event-grid">
          {events.map((ev) => (
            <EventCard key={ev._id} event={ev} />
          ))}
        </div>
      )}
    </div>
  );
}
