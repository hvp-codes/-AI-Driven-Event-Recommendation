const mongoose = require('mongoose');

// Every meaningful user <-> event touchpoint is logged here. This is the
// raw signal the recommendation engine (utils/recommender.js) learns from.
const interactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    type: {
      type: String,
      enum: ['view', 'like', 'register', 'dismiss', 'save'],
      required: true,
    },
    // Implicit-feedback weight used by the recommender. Kept on the
    // document so scoring logic can change without a migration.
    weight: { type: Number, default: 1 },
  },
  { timestamps: true }
);

interactionSchema.index({ user: 1, event: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Interaction', interactionSchema);
