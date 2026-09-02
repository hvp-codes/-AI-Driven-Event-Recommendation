const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    // Explicit preferences the user picks at signup / from their profile page
    interests: [{ type: String, trim: true, lowercase: true }],
    location: { type: String, trim: true, default: '' },
    role: { type: String, enum: ['user', 'organizer', 'admin'], default: 'user' },
    // Career Copilot fields - optional. When careerGoal is unset, all
    // career-aware features (roadmap, skill gap, opportunity score
    // career/skillGap sub-scores) simply switch themselves off.
    careerGoal: { type: String, trim: true, lowercase: true, default: '' },
    skills: [
      {
        name: { type: String, trim: true, lowercase: true },
        level: { type: String, enum: ['none', 'beginner', 'intermediate', 'advanced'], default: 'beginner' },
      },
    ],
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
