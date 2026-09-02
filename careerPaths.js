/**
 * Career-goal reference data.
 *
 * This is the single source of truth the Career Copilot features build
 * on: the Skill Gap Analyzer, the Career Roadmap, the Opportunity Score's
 * "career" + "skillGap" sub-scores, and the AI Copilot's free-text
 * parsing all read from here. Keeping it in one small file means adding
 * a new career track (or tuning a skill list) never requires touching
 * the scoring logic itself.
 *
 * `coreSkills` - the skills someone on this path is expected to build.
 *   Order matters loosely: earlier entries are treated as foundational
 *   (used to decide "NOW" vs "LATER" in the roadmap when several skills
 *   are missing).
 * `tags` / `categories` - vocabulary used to judge how relevant an
 *   *event* is to this goal, matched against the event's category/tags.
 */

const CAREER_GOALS = {
  'ai-ml-engineer': {
    label: 'AI / ML Engineer',
    coreSkills: ['python', 'machine learning', 'deep learning', 'data science', 'tensorflow', 'cloud'],
    categories: ['tech'],
    tags: ['ai', 'machine learning', 'ml', 'deep learning', 'data science', 'python', 'hackathon', 'cloud', 'data'],
  },
  'software-developer': {
    label: 'Software Developer',
    coreSkills: ['programming', 'javascript', 'git', 'apis', 'testing', 'cloud'],
    categories: ['tech'],
    tags: ['coding', 'developer', 'dev', 'software', 'programming', 'web3', 'devops', 'hackathon'],
  },
  'data-scientist': {
    label: 'Data Scientist',
    coreSkills: ['python', 'statistics', 'data science', 'machine learning', 'sql', 'data visualization'],
    categories: ['tech'],
    tags: ['data', 'data science', 'statistics', 'ai', 'machine learning', 'analytics'],
  },
  'cybersecurity-engineer': {
    label: 'Cybersecurity Engineer',
    coreSkills: ['networking', 'linux', 'security fundamentals', 'ethical hacking', 'cloud'],
    categories: ['tech'],
    tags: ['cybersecurity', 'security', 'networking', 'cloud', 'devops'],
  },
  'ux-ui-designer': {
    label: 'UI/UX Designer',
    coreSkills: ['ux research', 'wireframing', 'prototyping', 'visual design', 'figma'],
    categories: ['art', 'tech'],
    tags: ['ux', 'ui', 'design', 'creative', 'photography'],
  },
  entrepreneur: {
    label: 'Entrepreneur',
    coreSkills: ['pitching', 'market research', 'finance basics', 'networking', 'leadership'],
    categories: ['business'],
    tags: ['startup', 'pitch', 'networking', 'investor', 'entrepreneur', 'finance', 'marketing'],
  },
  researcher: {
    label: 'Researcher',
    coreSkills: ['research methods', 'academic writing', 'statistics', 'presentation skills'],
    categories: ['tech', 'business'],
    tags: ['research', 'data', 'data science', 'ai'],
  },
};

// Skills the app knows how to recognize - from user self-tagging, event
// tagging, free-text parsing (AI Copilot), and the AI event-draft
// generator. Kept flat (not per-goal) since several goals share skills.
const KNOWN_SKILLS = Array.from(
  new Set(Object.values(CAREER_GOALS).flatMap((g) => g.coreSkills))
).sort();

function careerGoalOptions() {
  return Object.entries(CAREER_GOALS).map(([key, cfg]) => ({ key, label: cfg.label }));
}

function getGoalConfig(goalKey) {
  return CAREER_GOALS[goalKey] || null;
}

module.exports = { CAREER_GOALS, KNOWN_SKILLS, careerGoalOptions, getGoalConfig };
