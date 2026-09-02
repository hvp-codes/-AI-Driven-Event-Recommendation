const Event = require('../models/Event');
const Interaction = require('../models/Interaction');
const { generateEventDraft, parseSearchQuery } = require('../utils/aiAssist');

exports.createEvent = async (req, res) => {
  try {
    const event = await Event.create({ ...req.body, organizer: req.user._id });
    res.status(201).json({ event });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create event', error: err.message });
  }
};

exports.listEvents = async (req, res) => {
  try {
    const { category, search, location, upcoming, maxPrice, withinDays } = req.query;
    const filter = {};
    if (category) filter.category = category.toLowerCase();
    if (location) filter.location = new RegExp(location, 'i');
    if (upcoming === 'true') filter.date = { $gte: new Date() };
    if (withinDays) {
      const to = new Date(Date.now() + Number(withinDays) * 24 * 60 * 60 * 1000);
      filter.date = { ...(filter.date || {}), $gte: new Date(), $lte: to };
    }
    if (maxPrice !== undefined) filter.price = { $lte: Number(maxPrice) };
    if (search) filter.$text = { $search: search };

    const events = await Event.find(filter).sort({ date: 1 }).limit(200);
    res.json({ events });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch events', error: err.message });
  }
};

// Events the logged-in user is hosting - powers the "Hosted" stat and
// event-management views on the Profile page.
exports.myEvents = async (req, res) => {
  try {
    const events = await Event.find({ organizer: req.user._id }).sort({ date: 1 });
    res.json({ events });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch your events', error: err.message });
  }
};

// Turns a natural-language ask ("tech conferences in New York next month
// under $100") into structured filters, runs it, and returns both the
// results and the filters we inferred so the UI can show its work.
exports.aiSearch = async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({ message: 'query is required' });
    }
    const parsed = parseSearchQuery(query);
    const filter = { date: { $gte: new Date() } };
    if (parsed.filters.category) filter.category = parsed.filters.category;
    if (parsed.filters.location) filter.location = new RegExp(parsed.filters.location, 'i');
    if (parsed.filters.maxPrice !== undefined) filter.price = { $lte: parsed.filters.maxPrice };
    if (parsed.filters.withinDays) {
      filter.date.$lte = new Date(Date.now() + parsed.filters.withinDays * 24 * 60 * 60 * 1000);
    }
    if (parsed.filters.text) filter.$text = { $search: parsed.filters.text };

    let events = await Event.find(filter).sort({ date: 1 }).limit(60);
    // Text search with no hits is common for short/odd phrasing - retry
    // once without it rather than showing an empty result.
    if (events.length === 0 && filter.$text) {
      delete filter.$text;
      events = await Event.find(filter).sort({ date: 1 }).limit(60);
    }

    res.json({ events, interpreted: parsed.filters });
  } catch (err) {
    res.status(500).json({ message: 'AI search failed', error: err.message });
  }
};

// Expands a short event idea into a draft (category, tags, description)
// for the "Generate with AI" box on the Host Event page.
exports.aiAssist = async (req, res) => {
  try {
    const { idea } = req.body;
    if (!idea || !idea.trim()) {
      return res.status(400).json({ message: 'idea is required' });
    }
    const draft = generateEventDraft(idea);
    res.json({ draft });
  } catch (err) {
    res.status(500).json({ message: 'AI assist failed', error: err.message });
  }
};

exports.getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    // Log an implicit "view" signal for logged-in users, fire-and-forget.
    if (req.user) {
      Interaction.findOneAndUpdate(
        { user: req.user._id, event: event._id, type: 'view' },
        { $setOnInsert: { weight: 1 } },
        { upsert: true }
      ).catch(() => {});
      Event.findByIdAndUpdate(event._id, { $inc: { 'stats.views': 1 } }).catch(() => {});
    }

    res.json({ event });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch event', error: err.message });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (String(event.organizer) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not allowed to edit this event' });
    }
    Object.assign(event, req.body);
    await event.save();
    res.json({ event });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update event', error: err.message });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (String(event.organizer) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not allowed to delete this event' });
    }
    await event.deleteOne();
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete event', error: err.message });
  }
};
