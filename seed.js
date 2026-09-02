/**
 * Quick demo-data seeder. Run with: npm run seed
 * Creates a handful of users and events with varied categories/tags/
 * skills so both the hybrid recommender and the Career Copilot features
 * (skill gap, roadmap, "Don't miss this") have something meaningful to
 * work with out of the box.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Event = require('../models/Event');
const Interaction = require('../models/Interaction');

const days = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

const events = [
  {
    title: 'Python Foundations Workshop',
    category: 'tech',
    tags: ['coding', 'python', 'beginner friendly'],
    requiredSkills: ['python'],
    difficulty: 'beginner',
    location: 'Coimbatore',
    price: 0,
    description: 'Hands-on introduction to Python for students with no prior programming background.',
    dateOffset: 2,
    deadlineOffset: 1,
  },
  {
    title: 'Machine Learning Fundamentals',
    category: 'tech',
    tags: ['ai', 'machine learning', 'ml'],
    requiredSkills: ['machine learning', 'statistics'],
    difficulty: 'intermediate',
    location: 'Coimbatore',
    price: 0,
    description: 'Core ML concepts - regression, classification, and evaluation - with guided exercises.',
    dateOffset: 6,
  },
  {
    title: 'React & AI Hackathon',
    category: 'tech',
    tags: ['coding', 'ai', 'hackathon'],
    requiredSkills: ['python', 'machine learning', 'apis'],
    difficulty: 'intermediate',
    location: 'Coimbatore',
    price: 0,
    description: '24-hour build sprint for student developers - ship an AI-powered project end to end.',
    dateOffset: 10,
    deadlineOffset: 8,
  },
  {
    title: 'Deep Learning Bootcamp (Online)',
    category: 'tech',
    tags: ['ai', 'deep learning', 'tensorflow'],
    requiredSkills: ['deep learning', 'tensorflow'],
    difficulty: 'advanced',
    location: 'Online',
    price: 0,
    description: 'A weekend deep-dive into neural networks and TensorFlow, run fully online.',
    dateOffset: 16,
  },
  {
    title: 'Data Science Competition',
    category: 'tech',
    tags: ['data', 'data science', 'competition'],
    requiredSkills: ['data science', 'sql'],
    difficulty: 'intermediate',
    location: 'Bengaluru',
    price: 0,
    description: 'Team up to tackle a real dataset and present findings to a panel of judges.',
    dateOffset: 20,
  },
  {
    title: 'Cloud & DevOps Meetup',
    category: 'tech',
    tags: ['cloud', 'devops', 'networking'],
    requiredSkills: ['cloud'],
    difficulty: 'intermediate',
    location: 'Coimbatore',
    price: 0,
    description: 'Monthly meetup on cloud infrastructure and deployment pipelines.',
    dateOffset: 5,
  },
  {
    title: 'AI Career Fair & Internship Expo',
    category: 'business',
    tags: ['career', 'networking', 'ai', 'internship', 'fair'],
    requiredSkills: [],
    difficulty: 'beginner',
    location: 'Coimbatore',
    price: 0,
    description: 'Meet recruiters from AI-focused companies and apply for internships on the spot.',
    dateOffset: 25,
  },
  {
    title: 'Indie Music Night',
    category: 'music',
    tags: ['live music', 'indie', 'concert'],
    location: 'Chennai',
    price: 300,
    description: 'Local indie bands performing live.',
    dateOffset: 4,
  },
  {
    title: 'Startup Pitch Fest',
    category: 'business',
    tags: ['startup', 'networking', 'pitch'],
    requiredSkills: ['pitching', 'market research'],
    difficulty: 'intermediate',
    location: 'Bengaluru',
    price: 100,
    description: 'Early-stage founders pitch to investors.',
    dateOffset: 12,
    deadlineOffset: 9,
  },
  {
    title: 'Contemporary Art Expo',
    category: 'art',
    tags: ['exhibition', 'painting', 'sculpture'],
    location: 'Coimbatore',
    price: 50,
    description: 'Regional artists showcase new work.',
    dateOffset: 8,
  },
  {
    title: 'UX/UI Design Sprint',
    category: 'art',
    tags: ['ux', 'ui', 'design', 'prototyping'],
    requiredSkills: ['wireframing', 'prototyping', 'figma'],
    difficulty: 'beginner',
    location: 'Chennai',
    price: 0,
    description: 'A two-day sprint from wireframes to a clickable Figma prototype.',
    dateOffset: 14,
  },
  {
    title: 'Marathon for a Cause',
    category: 'sports',
    tags: ['running', 'fitness', 'charity'],
    location: 'Chennai',
    price: 20,
    description: '10k charity run through the city.',
    dateOffset: 9,
  },
  {
    title: 'Classical Fusion Concert',
    category: 'music',
    tags: ['classical', 'fusion', 'concert'],
    location: 'Bengaluru',
    price: 250,
    description: 'Carnatic meets jazz in one evening.',
    dateOffset: 18,
  },
  {
    title: 'Food & Culture Festival',
    category: 'food',
    tags: ['festival', 'street food', 'culture'],
    location: 'Chennai',
    price: 0,
    description: 'A weekend of street food and folk performances.',
    dateOffset: 7,
  },
];

async function seed() {
  await connectDB();

  await Promise.all([User.deleteMany({}), Event.deleteMany({}), Interaction.deleteMany({})]);

  const organizer = await User.create({
    name: 'Demo Organizer',
    email: 'organizer@demo.com',
    password: 'password123',
    role: 'organizer',
  });

  const alice = await User.create({
    name: 'Alice',
    email: 'alice@demo.com',
    password: 'password123',
    interests: ['tech', 'ai', 'coding'],
    location: 'Coimbatore',
    careerGoal: 'ai-ml-engineer',
    skills: [
      { name: 'python', level: 'intermediate' },
      { name: 'javascript', level: 'beginner' },
    ],
  });

  const bob = await User.create({
    name: 'Bob',
    email: 'bob@demo.com',
    password: 'password123',
    interests: ['music', 'concert'],
    location: 'Chennai',
  });

  const createdEvents = await Event.insertMany(
    events.map((e) => ({
      title: e.title,
      description: e.description,
      category: e.category,
      tags: e.tags,
      requiredSkills: e.requiredSkills || [],
      difficulty: e.difficulty || 'beginner',
      location: e.location,
      price: e.price,
      organizer: organizer._id,
      date: days(e.dateOffset),
      registrationDeadline: e.deadlineOffset ? days(e.deadlineOffset) : undefined,
      capacity: 100,
    }))
  );

  const pythonWorkshop = createdEvents.find((e) => e.title.includes('Python Foundations'));
  const musicEvent = createdEvents.find((e) => e.title.includes('Music Night'));

  await Interaction.create([
    { user: alice._id, event: pythonWorkshop._id, type: 'like', weight: 3 },
    { user: alice._id, event: pythonWorkshop._id, type: 'register', weight: 5 },
    { user: bob._id, event: musicEvent._id, type: 'like', weight: 3 },
  ]);

  console.log('Seed complete. Demo logins: alice@demo.com / bob@demo.com, password: password123');
  console.log('Alice has careerGoal=ai-ml-engineer with python (intermediate) - log in as her to see the Career Roadmap, Skill Gap Analyzer, and Opportunity Score in action.');
  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
