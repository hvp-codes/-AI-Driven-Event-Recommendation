/**
 * Lightweight "AI assist" helpers.
 *
 * There's no external LLM wired in here (no API key / network dependency),
 * so these are transparent, deterministic heuristics: keyword dictionaries
 * + simple regex parsing. They're intentionally easy to explain in a demo
 * and easy to later swap for a real LLM call without touching the routes
 * or the frontend contract.
 */

// Vocabulary the parser understands. Keep in sync with seed categories.
const CATEGORY_KEYWORDS = {
  tech: ['tech', 'technology', 'coding', 'code', 'developer', 'dev', 'software', 'ai', 'artificial intelligence', 'hackathon', 'startup tech', 'cloud', 'devops', 'data', 'programming', 'web3', 'robotics'],
  music: ['music', 'concert', 'gig', 'band', 'live music', 'acoustic', 'dj', 'festival music', 'jazz', 'classical'],
  business: ['business', 'startup', 'pitch', 'networking', 'investor', 'entrepreneur', 'finance', 'marketing', 'career'],
  art: ['art', 'design', 'exhibition', 'gallery', 'painting', 'sculpture', 'ux', 'ui', 'creative', 'photography'],
  sports: ['sports', 'run', 'marathon', 'fitness', 'yoga', 'cricket', 'football', 'gym', 'race'],
  food: ['food', 'culinary', 'tasting', 'street food', 'cooking', 'chef', 'restaurant', 'wine', 'coffee'],
};

const CITY_HINTS = ['coimbatore', 'chennai', 'bengaluru', 'bangalore', 'mumbai', 'delhi', 'hyderabad', 'pune', 'new york', 'san francisco', 'austin', 'london'];

const { CAREER_GOALS, KNOWN_SKILLS } = require('./careerPaths');

// Free-text hints -> career goal key, for the AI Copilot ("I want to
// become an ML engineer" / "I'm aiming for a UX role" etc). Kept
// separate from CAREER_GOALS' own `label` so a few more casual phrasings
// can be recognized without cluttering the canonical label.
const GOAL_HINTS = {
  'ai-ml-engineer': ['ai engineer', 'ml engineer', 'machine learning engineer', 'ai/ml', 'ai ml'],
  'software-developer': ['software developer', 'software engineer', 'web developer', 'app developer'],
  'data-scientist': ['data scientist', 'data science'],
  'cybersecurity-engineer': ['cybersecurity', 'security engineer', 'ethical hacker'],
  'ux-ui-designer': ['ux designer', 'ui designer', 'ux/ui', 'product designer'],
  entrepreneur: ['entrepreneur', 'founder', 'start my own', 'startup founder'],
  researcher: ['researcher', 'research career', 'academia'],
};

function guessCategory(text) {
  const lower = text.toLowerCase();
  let best = { category: null, hits: 0 };
  for (const [category, words] of Object.entries(CATEGORY_KEYWORDS)) {
    const hits = words.filter((w) => lower.includes(w)).length;
    if (hits > best.hits) best = { category, hits };
  }
  return best.category;
}

function guessTags(text, category) {
  const lower = text.toLowerCase();
  const tags = new Set();
  if (category) {
    CATEGORY_KEYWORDS[category].forEach((w) => {
      if (lower.includes(w)) tags.add(w.split(' ')[0]);
    });
  }
  // Pull out simple noun-ish tokens (4+ letter words, de-duplicated, capped).
  lower
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 5 && !STOPWORDS.has(w))
    .slice(0, 10)
    .forEach((w) => tags.add(w));
  return Array.from(tags).slice(0, 6);
}

const STOPWORDS = new Set(['about', 'their', 'there', 'which', 'where', 'would', 'could', 'should', 'people', 'session', 'event', 'events']);

/**
 * Turn a short free-text idea into a polished draft: category, tags, and
 * an expanded description. Used by the "Generate with AI" box on the
 * Host Event page.
 */
/** Which known skills (from careerPaths.KNOWN_SKILLS) does this text mention? */
function guessSkills(text) {
  const lower = text.toLowerCase();
  return KNOWN_SKILLS.filter((skill) => lower.includes(skill));
}

function generateEventDraft(idea) {
  const category = guessCategory(idea) || 'business';
  const tags = guessTags(idea, category);
  const requiredSkills = guessSkills(idea);
  const trimmed = idea.trim().replace(/\s+/g, ' ');
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  const closer = capitalized.endsWith('.') ? '' : '.';
  const description =
    `${capitalized}${closer} Expect hands-on activities, time to connect with fellow attendees, ` +
    `and practical takeaways you can use right away. Whether you're new to ${category} or ` +
    `already deep in it, this session is built to be worth your evening.`;
  const suggestedTitle = capitalized.split('.')[0].slice(0, 60);
  return { category, tags, requiredSkills, description, suggestedTitle };
}

/**
 * Parses a free-text Career Copilot question ("I'm a second-year CSE
 * student, I know Python, I want to become an ML engineer...") into a
 * best-guess career goal + any skills mentioned. Same deterministic,
 * keyword-based approach as the rest of this file - no external LLM call.
 */
function extractCareerContext(text) {
  const lower = text.toLowerCase();
  let goal = null;
  for (const [key, hints] of Object.entries(GOAL_HINTS)) {
    if (hints.some((h) => lower.includes(h))) {
      goal = key;
      break;
    }
  }
  if (!goal) {
    // Fall back to matching against each goal's own label.
    goal = Object.entries(CAREER_GOALS).find(([, cfg]) => lower.includes(cfg.label.toLowerCase()))?.[0] || null;
  }
  const skills = guessSkills(lower);
  return { goal, skills };
}

/**
 * Parse a natural-language search ask ("tech conferences in New York next
 * month under $100") into structured filters the existing /api/events
 * list endpoint already understands.
 */
function parseSearchQuery(query) {
  const lower = query.toLowerCase();
  const filters = {};

  const category = guessCategory(lower);
  if (category) filters.category = category;

  const city = CITY_HINTS.find((c) => lower.includes(c));
  if (city) filters.location = city;

  const priceMatch = lower.match(/under\s*\$?\s*(\d+)/) || lower.match(/below\s*\$?\s*(\d+)/) || lower.match(/less than\s*\$?\s*(\d+)/);
  if (priceMatch) filters.maxPrice = Number(priceMatch[1]);

  if (/\bfree\b/.test(lower)) filters.maxPrice = 0;

  let horizonDays = null;
  if (/next week/.test(lower)) horizonDays = 7;
  else if (/next month/.test(lower)) horizonDays = 30;
  else if (/this weekend/.test(lower)) horizonDays = 5;
  else if (/today/.test(lower)) horizonDays = 1;
  if (horizonDays) filters.withinDays = horizonDays;

  // Whatever's left over (minus the bits we already parsed out) becomes a
  // plain text search fallback so Mongo's text index can still help.
  let remainder = lower
    .replace(/under\s*\$?\s*\d+/g, '')
    .replace(/below\s*\$?\s*\d+/g, '')
    .replace(/less than\s*\$?\s*\d+/g, '')
    .replace(/next week|next month|this weekend|today/g, '')
    .replace(/find me|show me|i want|looking for|search for/g, '')
    .trim();
  if (city) remainder = remainder.replace(city, '').trim();
  if (remainder.length > 2) filters.text = remainder;

  return { filters, category, city, ...filters };
}

module.exports = { generateEventDraft, parseSearchQuery, extractCareerContext, guessSkills };
