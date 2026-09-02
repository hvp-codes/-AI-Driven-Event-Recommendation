import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FALLBACK_GOALS, FALLBACK_SKILLS } from '../utils/careerMeta';

const SUGGESTED_INTERESTS = ['tech', 'music', 'business', 'art', 'sports', 'food', 'ai', 'networking'];

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', location: '' });
  const [interests, setInterests] = useState([]);
  const [careerGoal, setCareerGoal] = useState('');
  const [skills, setSkills] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const toggleInterest = (interest) => {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const toggleSkill = (skill) => {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({
        ...form,
        interests,
        careerGoal,
        skills: skills.map((name) => ({ name, level: 'beginner' })),
      });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Create your account</h2>
        {error && <p className="error-text">{error}</p>}
        <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
        <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
        <input placeholder="Location (optional)" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />

        <p className="field-label">Pick a few interests (helps recommendations from day one)</p>
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

        <p className="field-label">🎯 What's your career goal? (optional — unlocks your Career Roadmap)</p>
        <select className="career-select" value={careerGoal} onChange={(e) => setCareerGoal(e.target.value)}>
          <option value="">Not sure yet</option>
          {FALLBACK_GOALS.map((g) => (
            <option key={g.key} value={g.key}>{g.label}</option>
          ))}
        </select>

        {careerGoal && (
          <>
            <p className="field-label">Skills you already have</p>
            <div className="interest-grid">
              {FALLBACK_SKILLS.map((skill) => (
                <button
                  type="button"
                  key={skill}
                  className={`interest-chip ${skills.includes(skill) ? 'active' : ''}`}
                  onClick={() => toggleSkill(skill)}
                >
                  {skill}
                </button>
              ))}
            </div>
          </>
        )}

        <button type="submit" disabled={loading}>{loading ? 'Creating account…' : 'Register'}</button>
        <p>Already have an account? <Link to="/login">Login</Link></p>
      </form>
    </div>
  );
}
