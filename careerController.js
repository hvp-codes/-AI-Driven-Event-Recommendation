const Event = require('../models/Event');
const Interaction = require('../models/Interaction');
const { careerGoalOptions, KNOWN_SKILLS } = require('../utils/careerPaths');
const { computeSkillGap, buildRoadmap } = require('../utils/careerEngine');
const { getRecommendationsForUser } = require('../utils/recommender');
const { extractCareerContext } = require('../utils/aiAssist');

// Public reference data for onboarding UI (Register / Profile settings).
exports.getGoalOptions = async (req, res) => {
  res.json({ goals: careerGoalOptions(), skills: KNOWN_SKILLS });
};

// "Career Goal -> Event Roadmap" + "Skill Gap Analyzer".
exports.getRoadmap = async (req, res) => {
  try {
    const gapInfo = computeSkillGap(req.user);
    if (!gapInfo) {
      return res.json({ hasGoal: false, message: 'Set a career goal on your profile to unlock your roadmap.' });
    }
    const events = await Event.find({ date: { $gte: new Date() } }).lean();
    const roadmap = buildRoadmap(gapInfo, events);
    res.json({ hasGoal: true, ...gapInfo, roadmap });
  } catch (err) {
    res.status(500).json({ message: 'Failed to build roadmap', error: err.message });
  }
};

// "Career Progress Dashboard" - skills developed, events attended,
// career readiness %, and the single next recommended action.
exports.getDashboard = async (req, res) => {
  try {
    const gapInfo = computeSkillGap(req.user);
    const [registrations, events] = await Promise.all([
      Interaction.countDocuments({ user: req.user._id, type: 'register' }),
      gapInfo ? Event.find({ date: { $gte: new Date() } }).lean() : Promise.resolve([]),
    ]);

    const skillsDeveloped = (req.user.skills || []).filter((s) => s.level !== 'none').length;
    const roadmap = gapInfo ? buildRoadmap(gapInfo, events, { limit: 1 }) : [];

    res.json({
      hasGoal: Boolean(gapInfo),
      careerGoal: gapInfo?.label || null,
      careerReadiness: gapInfo?.progressPct ?? null,
      skillsDeveloped,
      skills: req.user.skills || [],
      eventsAttended: registrations,
      nextAction: roadmap[0]
        ? { skill: roadmap[0].skill, event: { _id: roadmap[0].event._id, title: roadmap[0].event.title } }
        : null,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to build career dashboard', error: err.message });
  }
};

// "AI Event Copilot" - answers a free-text question like "what should I
// attend this week?" by parsing the question for a career goal / skills
// (falling back to the user's saved profile), then re-using the same
// scored recommendation list everything else in the app relies on, so
// the copilot's pick can never contradict the ranked feed.
exports.askCopilot = async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ message: 'question is required' });
    }

    const parsed = extractCareerContext(question);
    // A question can temporarily "act as" a different goal/skills than the
    // saved profile without overwriting it - useful for "what if" asks.
    const effectiveUser = {
      ...req.user.toObject(),
      careerGoal: parsed.goal || req.user.careerGoal,
      skills: parsed.skills.length
        ? [
            ...(req.user.skills || []),
            ...parsed.skills
              .filter((s) => !(req.user.skills || []).some((us) => us.name === s))
              .map((name) => ({ name, level: 'beginner' })),
          ]
        : req.user.skills,
    };

    const results = await getRecommendationsForUser(req.user._id, effectiveUser, { limit: 3 });

    if (results.length === 0) {
      return res.json({
        answer: "I couldn't find an upcoming event to recommend right now - check back once new events are posted.",
        top: null,
        runnersUp: [],
        interpreted: parsed,
      });
    }

    const [top, ...runnersUp] = results;
    const lastRegistered = await Interaction.findOne({ user: req.user._id, type: 'register' })
      .sort({ createdAt: -1 })
      .populate('event');

    let story;
    if (top.matchedMissingSkills?.length) {
      story = `Based on your ${effectiveUser.careerGoal ? 'career goal' : 'interests'}, ` +
        `"${top.event.title}" is the strongest pick - it helps close your ` +
        `${top.matchedMissingSkills.slice(0, 2).join(' and ')} skill gap${lastRegistered ? `, and builds on "${lastRegistered.event.title}" which you already registered for` : ''}.`;
    } else if (lastRegistered) {
      story = `You recently registered for "${lastRegistered.event.title}" - "${top.event.title}" is a natural next step given your interests and what's trending.`;
    } else {
      story = `"${top.event.title}" is the best overall match for you right now based on your interests and what's popular.`;
    }

    res.json({
      answer: story,
      top: { event: top.event, score: top.score, reasons: top.reasons, opportunity: top.opportunity },
      runnersUp: runnersUp.map((r) => ({ event: r.event, score: r.score, reasons: r.reasons })),
      interpreted: parsed,
    });
  } catch (err) {
    res.status(500).json({ message: 'AI Copilot failed to answer', error: err.message });
  }
};
