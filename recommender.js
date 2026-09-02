/**
 * Hybrid recommendation engine.
 *
 * Combines three signals into a single score per event:
 *   1. Content-based similarity  - overlap between an event's
 *      category/tags and the profile built from the user's stated
 *      interests + their past interactions (view/like/register).
 *   2. Collaborative filtering   - user-user cosine similarity over an
 *      implicit interaction matrix, so "people similar to you liked X"
 *      surfaces events you haven't touched yet.
 *   3. Popularity fallback       - normalized view/like/registration
 *      counts, weighted highly for brand-new (cold-start) users who have
 *      no interaction history yet.
 *
 * Everything below is plain JS (no external ML dependency) so it is easy
 * to explain in a demo and easy to tune live.
 */

const Interaction = require('../models/Interaction');
const Event = require('../models/Event');
const { computeSkillGap, eventCareerRelevance } = require('./careerEngine');

const INTERACTION_WEIGHTS = {
  view: 1,
  like: 3,
  register: 5,
  dismiss: -4,
};

// How much each signal contributes to the final blended score.
// Two profiles: users who haven't set a career goal get the original
// content/collaborative/popularity blend; users who have get career and
// skill-gap signals folded in too (this is what turns "here are events
// you might like" into "here is the event that helps your career goal").
const WEIGHTS = {
  content: 0.5,
  collaborative: 0.3,
  popularity: 0.2,
};

const WEIGHTS_WITH_CAREER = {
  content: 0.2,
  collaborative: 0.15,
  popularity: 0.1,
  career: 0.25,
  skillGap: 0.3,
};

const REGISTRATION_CLOSING_SOON_DAYS = 3;

function cosineSimilarity(vecA, vecB) {
  const keys = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (const k of keys) {
    const a = vecA[k] || 0;
    const b = vecB[k] || 0;
    dot += a * b;
    magA += a * a;
    magB += b * b;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/** Build a { tagOrCategory: weight } vector for one event. */
function eventFeatureVector(event) {
  const vec = {};
  vec[`cat:${event.category}`] = 2; // category counts double
  (event.tags || []).forEach((t) => {
    vec[`tag:${t}`] = (vec[`tag:${t}`] || 0) + 1;
  });
  return vec;
}

/** Build the user's taste profile from stated interests + interaction history. */
async function buildUserProfile(userId, user) {
  const profile = {};

  (user?.interests || []).forEach((interest) => {
    profile[`cat:${interest}`] = (profile[`cat:${interest}`] || 0) + 2;
    profile[`tag:${interest}`] = (profile[`tag:${interest}`] || 0) + 2;
  });

  const interactions = await Interaction.find({ user: userId }).populate('event');
  const touchedEventIds = new Set();

  interactions.forEach((interaction) => {
    if (!interaction.event) return;
    touchedEventIds.add(String(interaction.event._id));
    const weight = INTERACTION_WEIGHTS[interaction.type] ?? 0;
    const vec = eventFeatureVector(interaction.event);
    Object.entries(vec).forEach(([k, v]) => {
      profile[k] = (profile[k] || 0) + v * weight;
    });
  });

  return { profile, touchedEventIds };
}

/** user-user collaborative filtering: rate every other user's overlap with this one. */
async function buildCollaborativeScores(userId) {
  const allInteractions = await Interaction.find({});
  const matrix = {}; // userId -> { eventId: weight }

  allInteractions.forEach((i) => {
    const uid = String(i.user);
    const eid = String(i.event);
    const w = INTERACTION_WEIGHTS[i.type] ?? 0;
    if (!matrix[uid]) matrix[uid] = {};
    matrix[uid][eid] = (matrix[uid][eid] || 0) + w;
  });

  const me = matrix[String(userId)] || {};
  const eventScores = {}; // eventId -> aggregated collaborative score

  Object.entries(matrix).forEach(([otherUserId, otherVec]) => {
    if (otherUserId === String(userId)) return;
    const sim = cosineSimilarity(me, otherVec);
    if (sim <= 0) return;
    Object.entries(otherVec).forEach(([eid, weight]) => {
      if (weight <= 0) return;
      eventScores[eid] = (eventScores[eid] || 0) + sim * weight;
    });
  });

  return eventScores;
}

function normalize(scoresObj) {
  const values = Object.values(scoresObj);
  if (values.length === 0) return {};
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const out = {};
  Object.entries(scoresObj).forEach(([k, v]) => {
    out[k] = (v - min) / range;
  });
  return out;
}

function daysUntil(date) {
  return (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
}

/**
 * Returns an array of:
 *   { event, score, reasons, opportunity: { total, breakdown }, badges, closingSoon }
 * sorted by score desc. `limit` caps how many recommendations come back.
 * `score` (0..1) is kept as the top-level field for backward
 * compatibility with the existing "% match" badge in the UI; `opportunity`
 * is the same number (0..100) plus the sub-score breakdown that powers
 * the "Why this event?" panel.
 */
async function getRecommendationsForUser(userId, user, { limit = 10, excludePast = true } = {}) {
  const [events, { profile, touchedEventIds }, rawCollabScores] = await Promise.all([
    Event.find({ date: { $gte: new Date() } }).lean(),
    buildUserProfile(userId, user),
    buildCollaborativeScores(userId),
  ]);

  const collabScores = normalize(rawCollabScores);
  const gapInfo = computeSkillGap(user);

  const maxPopularity =
    Math.max(...events.map((e) => e.stats.views + e.stats.likes * 3 + e.stats.registrations * 5), 1) || 1;

  const isColdStart = Object.keys(profile).length === 0;

  const scored = events
    .filter((e) => !excludePast || !touchedEventIds.has(String(e._id)))
    .map((event) => {
      const contentScore = cosineSimilarity(profile, eventFeatureVector(event));
      const collaborativeScore = collabScores[String(event._id)] || 0;
      const popularityRaw = event.stats.views + event.stats.likes * 3 + event.stats.registrations * 5;
      const popularityScore = popularityRaw / maxPopularity;
      const { careerScore, skillGapScore, matchedMissingSkills } = eventCareerRelevance(event, gapInfo);

      let weights;
      if (isColdStart && !gapInfo) weights = { content: 0.1, collaborative: 0.1, popularity: 0.8 };
      else if (gapInfo) weights = WEIGHTS_WITH_CAREER;
      else weights = WEIGHTS;

      const finalScore =
        contentScore * (weights.content || 0) +
        collaborativeScore * (weights.collaborative || 0) +
        popularityScore * (weights.popularity || 0) +
        careerScore * (weights.career || 0) +
        skillGapScore * (weights.skillGap || 0);

      const reasons = [];
      if (matchedMissingSkills.length > 0) {
        reasons.push(`Closes your ${matchedMissingSkills.slice(0, 2).join(', ')} skill gap`);
      }
      if (careerScore > 0.3) reasons.push(`Matches your ${gapInfo.label} goal`);
      if (contentScore > 0.15) reasons.push('Matches your interests');
      if (collaborativeScore > 0.15) reasons.push('Popular with similar users');
      if (popularityScore > 0.6) reasons.push('Trending now');
      if (reasons.length === 0) reasons.push('New for you');

      const daysLeft = daysUntil(event.registrationDeadline || event.date);
      const closingSoon = daysLeft >= 0 && daysLeft <= REGISTRATION_CLOSING_SOON_DAYS;

      const badges = [];
      if (matchedMissingSkills.length > 0) badges.push({ icon: '🧠', label: 'Skill Builder' });
      if (careerScore > 0.3) badges.push({ icon: '🎯', label: 'Career Boost' });
      if (popularityScore > 0.6) badges.push({ icon: '🔥', label: 'Trending' });
      if (closingSoon) badges.push({ icon: '⚡', label: 'Closing Soon' });
      if (event.price === 0) badges.push({ icon: '💰', label: 'Free' });
      if (event.difficulty === 'beginner') badges.push({ icon: '🚀', label: 'Beginner Friendly' });
      if (user?.location && event.location && event.location.toLowerCase().includes(String(user.location).toLowerCase())) {
        badges.push({ icon: '📍', label: 'Near You' });
      }

      return {
        event,
        score: Number(finalScore.toFixed(4)),
        reasons,
        opportunity: {
          total: Math.round(finalScore * 100),
          breakdown: {
            interests: Math.round(contentScore * 100),
            career: Math.round(careerScore * 100),
            skillGap: Math.round(skillGapScore * 100),
            pastActivity: Math.round(collaborativeScore * 100),
            popularity: Math.round(popularityScore * 100),
          },
        },
        badges,
        closingSoon,
        matchedMissingSkills,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}

module.exports = { getRecommendationsForUser, cosineSimilarity, eventFeatureVector };
