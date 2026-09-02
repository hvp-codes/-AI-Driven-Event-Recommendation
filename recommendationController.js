const { getRecommendationsForUser } = require('../utils/recommender');

exports.getRecommendations = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const results = await getRecommendationsForUser(req.user._id, req.user, { limit });
    res.json({
      count: results.length,
      recommendations: results.map((r) => ({
        event: r.event,
        score: r.score,
        reasons: r.reasons,
        opportunity: r.opportunity,
        badges: r.badges,
        closingSoon: r.closingSoon,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate recommendations', error: err.message });
  }
};

// "Don't Miss This" - the subset of a user's own recommendations that
// are both a strong match and closing soon. Reuses the same scored list
// rather than re-computing, so the two views can never disagree.
exports.getUrgentRecommendations = async (req, res) => {
  try {
    const results = await getRecommendationsForUser(req.user._id, req.user, { limit: 50 });
    const urgent = results
      .filter((r) => r.closingSoon && r.opportunity.total >= 50)
      .slice(0, 5);
    res.json({
      count: urgent.length,
      recommendations: urgent.map((r) => ({
        event: r.event,
        score: r.score,
        reasons: r.reasons,
        opportunity: r.opportunity,
        badges: r.badges,
        closingSoon: r.closingSoon,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate urgent recommendations', error: err.message });
  }
};
