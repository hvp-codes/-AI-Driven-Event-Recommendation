import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useToast } from '../context/ToastContext';

export default function CreateEvent() {
  const [form, setForm] = useState({
    title: '', description: '', category: '', tags: '', location: '',
    venue: '', date: '', price: 0, capacity: 50,
    requiredSkills: '', difficulty: 'beginner', registrationDeadline: '',
  });
  const [idea, setIdea] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleGenerate = async () => {
    if (!idea.trim()) return;
    setGenerating(true);
    try {
      const res = await api.post('/events/ai-assist', { idea });
      const { draft } = res.data;
      setForm((f) => ({
        ...f,
        title: f.title || draft.suggestedTitle,
        description: draft.description,
        category: draft.category,
        tags: draft.tags.join(', '),
        requiredSkills: draft.requiredSkills?.join(', ') || f.requiredSkills,
      }));
      showToast('Draft generated — review and adjust below');
    } catch {
      showToast('Could not generate a draft', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        ...form,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        requiredSkills: form.requiredSkills.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
        price: Number(form.price),
        capacity: Number(form.capacity),
        registrationDeadline: form.registrationDeadline || undefined,
      };
      const res = await api.post('/events', payload);
      showToast('Event created!');
      navigate(`/events/${res.data.event._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create event');
    }
  };

  return (
    <div className="page">
      <h1>Host a New Event</h1>
      <p className="subtitle">Describe it once, let AI draft the rest, then fine-tune the details.</p>

      <div className="host-layout">
        <div>
          <div className="ai-assist-box">
            <h3>✨ Generate with AI Assistant</h3>
            <p>Briefly describe your event concept. AI will draft a description, category, tags, and the skills it teaches — you stay in control before publishing.</p>
            <div className="ai-assist-row">
              <textarea
                placeholder='"A design thinking session for creative professionals…"'
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
              />
              <button className="ai-btn" type="button" onClick={handleGenerate} disabled={generating}>
                {generating ? 'Generating…' : 'Generate'}
              </button>
            </div>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} style={{ maxWidth: 'none' }}>
            {error && <p className="error-text">{error}</p>}
            <input placeholder="Title" value={form.title} onChange={handleChange('title')} required />
            <textarea placeholder="Description" value={form.description} onChange={handleChange('description')} required />
            <div className="form-grid">
              <input placeholder="Category (e.g. tech, music)" value={form.category} onChange={handleChange('category')} required />
              <input placeholder="Tags (comma separated)" value={form.tags} onChange={handleChange('tags')} />
              <input placeholder="Location" value={form.location} onChange={handleChange('location')} required />
              <input placeholder="Venue (optional)" value={form.venue} onChange={handleChange('venue')} />
              <input type="datetime-local" value={form.date} onChange={handleChange('date')} required />
              <input type="number" placeholder="Capacity" value={form.capacity} onChange={handleChange('capacity')} min="0" />
              <input type="number" placeholder="Price" value={form.price} onChange={handleChange('price')} min="0" />
              <select value={form.difficulty} onChange={handleChange('difficulty')}>
                <option value="beginner">Beginner friendly</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
              <input
                placeholder="Skills this event builds (comma separated, e.g. python, machine learning)"
                value={form.requiredSkills}
                onChange={handleChange('requiredSkills')}
                className="form-grid-full"
              />
              <div className="form-grid-full">
                <label className="field-label">Registration deadline (optional — powers "Don't Miss This")</label>
                <input type="datetime-local" value={form.registrationDeadline} onChange={handleChange('registrationDeadline')} />
              </div>
            </div>
            <button type="submit">Create Event</button>
          </form>
        </div>

        <div className="tips-card">
          <h3>Hosting tips</h3>
          <ul>
            <li>Write descriptive titles to increase click-through rates.</li>
            <li>Use tags so the AI matchmaker indexes your event accurately.</li>
            <li>List the skills your event builds so it surfaces in the Career Roadmap and Skill Gap Analyzer.</li>
            <li>Ensure locations are complete for accurate regional recommendations.</li>
            <li>Free events tend to fill capacity fastest — set it realistically.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
