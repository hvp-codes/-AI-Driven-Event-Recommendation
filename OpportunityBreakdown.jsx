import React from 'react';

const ROWS = [
  { key: 'career', label: 'Career Goal' },
  { key: 'skillGap', label: 'Skill Gap' },
  { key: 'interests', label: 'Interests' },
  { key: 'pastActivity', label: 'Similar Students' },
  { key: 'popularity', label: 'Popularity' },
];

// Renders the "Why this event?" sub-score bars from a recommendation's
// `opportunity.breakdown` object (see backend/utils/recommender.js).
// Rows whose value is 0 for every candidate on the page (e.g. `career`
// when the user hasn't set a goal) still render at 0% - honest, and a
// nudge toward setting a career goal in Profile.
export default function OpportunityBreakdown({ opportunity }) {
  if (!opportunity) return null;
  const { total, breakdown } = opportunity;

  return (
    <div className="opportunity-breakdown">
      <div className="opportunity-total">
        <span>Opportunity Score</span>
        <strong>{total}/100</strong>
      </div>
      {ROWS.map((row) => (
        <div className="opportunity-row" key={row.key}>
          <span className="opportunity-row-label">{row.label}</span>
          <div className="opportunity-bar-track">
            <div className="opportunity-bar-fill" style={{ width: `${breakdown[row.key] || 0}%` }} />
          </div>
          <span className="opportunity-row-pct">{breakdown[row.key] || 0}%</span>
        </div>
      ))}
    </div>
  );
}
