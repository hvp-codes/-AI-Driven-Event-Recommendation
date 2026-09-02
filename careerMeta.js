// Static fallback so pickers render instantly before /api/career/goals
// resolves (and still work if that call fails). Keep in sync with
// backend/utils/careerPaths.js.
export const FALLBACK_GOALS = [
  { key: 'ai-ml-engineer', label: 'AI / ML Engineer' },
  { key: 'software-developer', label: 'Software Developer' },
  { key: 'data-scientist', label: 'Data Scientist' },
  { key: 'cybersecurity-engineer', label: 'Cybersecurity Engineer' },
  { key: 'ux-ui-designer', label: 'UI/UX Designer' },
  { key: 'entrepreneur', label: 'Entrepreneur' },
  { key: 'researcher', label: 'Researcher' },
];

export const FALLBACK_SKILLS = [
  'python', 'javascript', 'machine learning', 'deep learning', 'data science',
  'tensorflow', 'cloud', 'git', 'apis', 'testing', 'statistics', 'sql',
  'data visualization', 'networking', 'linux', 'security fundamentals',
  'ethical hacking', 'ux research', 'wireframing', 'prototyping',
  'visual design', 'figma', 'pitching', 'market research', 'finance basics',
  'leadership', 'research methods', 'academic writing', 'presentation skills',
];

export const SKILL_LEVELS = ['none', 'beginner', 'intermediate', 'advanced'];

export function nextSkillLevel(level) {
  const idx = SKILL_LEVELS.indexOf(level);
  return SKILL_LEVELS[(idx + 1) % SKILL_LEVELS.length];
}

export function skillLevelPct(level) {
  return { none: 0, beginner: 33, intermediate: 66, advanced: 100 }[level] ?? 0;
}
