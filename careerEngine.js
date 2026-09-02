/**
 * Career Copilot engine.
 *
 * Turns a user's stated career goal + skills into:
 *   - a skill-gap analysis (what they have vs. what the goal needs)
 *   - a per-event "career relevance" and "skill gap" score, used by the
 *     recommender to blend career-awareness into the Opportunity Score
 *   - an ordered roadmap of upcoming events that close those gaps
 *
 * Deliberately dependency-free (same philosophy as recommender.js): a
 * few small, explainable functions rather than a black box, so it's easy
 * to demo and easy to reason about in a hackathon judging session.
 */

const { getGoalConfig } = require('./careerPaths');

const SKILL_LEVEL_RANK = { none: 0, beginner: 1, intermediate: 2, advanced: 3 };

/** Skills the user has at beginner-or-above, lowercased. */
function userSkillSet(user) {
  const set = new Set();
  (user?.skills || []).forEach((s) => {
    if (s?.name && (SKILL_LEVEL_RANK[s.level] ?? 1) > 0) set.add(s.name.toLowerCase());
  });
  return set;
}

/**
 * Compares the user's skills against their goal's core skill list.
 * Returns null if the user hasn't set a career goal - every downstream
 * consumer treats that as "career features are simply switched off".
 */
function computeSkillGap(user) {
  const goalKey = user?.careerGoal;
  const config = getGoalConfig(goalKey);
  if (!config) return null;

  const have = userSkillSet(user);
  const haveList = config.coreSkills.filter((s) => have.has(s));
  const missing = config.coreSkills.filter((s) => !have.has(s));
  const progressPct = Math.round((haveList.length / config.coreSkills.length) * 100);

  return {
    goal: goalKey,
    label: config.label,
    coreSkills: config.coreSkills,
    have: haveList,
    missing,
    progressPct,
  };
}

/** Does this event look like it teaches/builds `skill`? */
function eventTeachesSkill(event, skill) {
  const haystack = [
    event.category,
    ...(event.tags || []),
    ...(event.requiredSkills || []),
    event.title,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(skill);
}

/**
 * Scores one event's relevance to the user's career goal.
 * Returns { careerScore, skillGapScore, matchedMissingSkills } all in
 * the 0..1 range (skillGapScore is the fraction of the user's current
 * missing skills this single event would help close).
 */
function eventCareerRelevance(event, gapInfo) {
  if (!gapInfo) return { careerScore: 0, skillGapScore: 0, matchedMissingSkills: [] };

  const config = getGoalConfig(gapInfo.goal);
  const haystack = [event.category, ...(event.tags || [])].filter(Boolean).map((s) => s.toLowerCase());

  const categoryHit = config.categories.includes((event.category || '').toLowerCase()) ? 1 : 0;
  const tagHits = config.tags.filter((t) => haystack.includes(t)).length;
  const careerScore = Math.min(1, categoryHit * 0.5 + tagHits * 0.2);

  const matchedMissingSkills = gapInfo.missing.filter((skill) => eventTeachesSkill(event, skill));
  const skillGapScore = gapInfo.missing.length
    ? matchedMissingSkills.length / gapInfo.missing.length
    : 0;

  return { careerScore, skillGapScore, matchedMissingSkills };
}

/**
 * Builds the "Career Journey" roadmap: for each missing skill (in the
 * goal's declared order, treated as roughly foundational -> advanced),
 * find the best upcoming event that teaches it. Capped at 5 steps so
 * the UI stays readable. The first step is labeled NOW, the next NEXT,
 * the rest LATER, and a step whose event looks like a capstone
 * (internship/fair/hackathon-style) is labeled GOAL if present.
 */
function buildRoadmap(gapInfo, events, { limit = 5 } = {}) {
  if (!gapInfo || gapInfo.missing.length === 0) return [];

  const upcoming = events
    .filter((e) => new Date(e.date).getTime() >= Date.now())
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const used = new Set();
  const steps = [];

  for (const skill of gapInfo.missing) {
    if (steps.length >= limit) break;
    const match = upcoming.find((e) => !used.has(String(e._id)) && eventTeachesSkill(e, skill));
    if (match) {
      used.add(String(match._id));
      steps.push({ skill, event: match });
    }
  }

  const CAPSTONE_HINTS = ['hackathon', 'internship', 'fair', 'competition', 'contest'];
  steps.forEach((step, i) => {
    const isCapstone = CAPSTONE_HINTS.some((h) =>
      (step.event.title + ' ' + (step.event.tags || []).join(' ')).toLowerCase().includes(h)
    );
    if (isCapstone && i === steps.length - 1) step.label = 'GOAL';
    else if (i === 0) step.label = 'NOW';
    else if (i === 1) step.label = 'NEXT';
    else step.label = 'LATER';
  });

  return steps;
}

module.exports = { computeSkillGap, eventCareerRelevance, buildRoadmap, userSkillSet, SKILL_LEVEL_RANK };
