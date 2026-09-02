const Interaction = require('../models/Interaction');
const Event = require('../models/Event');
const User = require('../models/User');

const STAT_FIELD = { like: 'likes', register: 'registrations', view: 'views' };

exports.recordInteraction = async (req, res) => {
  try {
    const { eventId, type } = req.body;
    if (!eventId || !['view', 'like', 'register', 'dismiss', 'save'].includes(type)) {
      return res.status(400).json({ message: 'Valid eventId and type are required' });
    }

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const interaction = await Interaction.findOneAndUpdate(
      { user: req.user._id, event: eventId, type },
      { $setOnInsert: { weight: 1 } },
      { upsert: true, new: true }
    );

    const statField = STAT_FIELD[type];
    if (statField) {
      await Event.findByIdAndUpdate(eventId, { $inc: { [`stats.${statField}`]: 1 } });
    }

    res.status(201).json({ interaction });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(200).json({ message: 'Interaction already recorded' });
    }
    res.status(500).json({ message: 'Failed to record interaction', error: err.message });
  }
};

// AI feedback loop: after attending/registering, the user reports which
// of an event's requiredSkills they actually picked up. Kept separate
// from recordInteraction so re-submitting feedback never double-counts
// registration stats - this only ever touches the user's skill profile.
exports.recordSkillsGained = async (req, res) => {
  try {
    const { skillsGained } = req.body;
    if (!Array.isArray(skillsGained) || skillsGained.length === 0) {
      return res.status(400).json({ message: 'skillsGained must be a non-empty array' });
    }
    const wanted = new Set(skillsGained.map((s) => String(s).toLowerCase()));
    const user = await User.findById(req.user._id);
    user.skills = user.skills || [];
    let changed = false;
    wanted.forEach((name) => {
      const existing = user.skills.find((s) => s.name === name);
      if (existing) {
        if (existing.level === 'none' || existing.level === 'beginner') {
          existing.level = 'intermediate';
          changed = true;
        }
      } else {
        user.skills.push({ name, level: 'intermediate' });
        changed = true;
      }
    });
    if (changed) await user.save();
    res.json({ skills: user.skills });
  } catch (err) {
    res.status(500).json({ message: 'Failed to record skills gained', error: err.message });
  }
};

exports.removeInteraction = async (req, res) => {
  try {
    const { eventId, type } = req.params;
    const removed = await Interaction.findOneAndDelete({ user: req.user._id, event: eventId, type });
    if (removed) {
      const statField = STAT_FIELD[type];
      if (statField) {
        await Event.findByIdAndUpdate(eventId, { $inc: { [`stats.${statField}`]: -1 } });
      }
    }
    res.json({ message: 'Interaction removed' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to remove interaction', error: err.message });
  }
};

exports.myInteractions = async (req, res) => {
  try {
    const interactions = await Interaction.find({ user: req.user._id })
      .populate('event')
      .sort({ createdAt: -1 });
    res.json({ interactions });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch interactions', error: err.message });
  }
};
