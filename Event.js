const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, required: true, trim: true, lowercase: true },
    tags: [{ type: String, trim: true, lowercase: true }],
    location: { type: String, required: true, trim: true },
    venue: { type: String, trim: true, default: '' },
    date: { type: Date, required: true },
    price: { type: Number, default: 0 },
    capacity: { type: Number, default: 0 },
    imageUrl: { type: String, default: '' },
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Career Copilot fields - all optional so existing/older events (or
    // organizers who skip them) degrade gracefully to "no career data".
    requiredSkills: [{ type: String, trim: true, lowercase: true }],
    difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
    registrationDeadline: { type: Date },
    // Denormalized counters updated as interactions come in - keeps
    // popularity-based scoring cheap at read time.
    stats: {
      views: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
      registrations: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

eventSchema.index({ title: 'text', description: 'text', tags: 'text', category: 'text' });
eventSchema.index({ date: 1 });
eventSchema.index({ category: 1 });

module.exports = mongoose.model('Event', eventSchema);
