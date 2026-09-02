# EventAI - Personalized Event Recommendation System

Hackathon project: a full MERN-stack platform that recommends events to
users based on a hybrid recommendation engine (content-based +
collaborative filtering + popularity fallback), built in plain Node.js
so the logic is fully transparent and easy to demo/explain to judges.

## Structure

```
event-recsys/
  backend/            Node.js + Express + MongoDB (Mongoose) API
    config/db.js          Mongo connection
    models/                User, Event, Interaction schemas
    middleware/auth.js     JWT auth (protect / optionalAuth / authorize)
    controllers/            Route handlers (incl. careerController.js)
    routes/                  Express routers (incl. careerRoutes.js)
    utils/recommender.js    The recommendation engine (see below)
    utils/careerPaths.js    Career-goal reference data (skills/tags per track)
    utils/careerEngine.js   Skill-gap analysis, roadmap builder, career scoring
    utils/aiAssist.js       Deterministic keyword-based "AI" parsing (search,
                               event drafting, Copilot question parsing)
    utils/seed.js           Demo data seeder
    server.js               App entry point
  frontend/            React app (Create React App)
    src/api/api.js          Axios client with JWT interceptor
    src/context/AuthContext.js
    src/components/          Navbar, EventCard, OpportunityBreakdown, ProtectedRoute
    src/utils/careerMeta.js  Frontend career-goal/skill picker data
    src/pages/                Home, Login, Register, EventDetail,
                               Recommendations, CreateEvent, Profile
```

## How the recommendation engine works

`backend/utils/recommender.js` blends three signals per candidate event:

1. **Content-based filtering** - cosine similarity between the event's
   category/tags and a "taste profile" vector built from the user's
   stated interests plus weighted signals from their past interactions
   (`view` = 1, `like` = 3, `register` = 5, `dismiss` = -4).
2. **Collaborative filtering** - a lightweight user-user cosine
   similarity over an implicit interaction matrix, so events liked by
   people with a similar taste profile surface even if the current user
   has never touched them.
3. **Popularity fallback** - normalized view/like/registration counts,
   weighted heavily (80%) for brand-new users with no history yet, to
   solve the cold-start problem gracefully.

Scores are blended (`content 50% / collaborative 30% / popularity 20%`
for warm users with no career goal set), sorted, and returned with
human-readable `reasons` ("Matches your interests", "Popular with
similar users", "Trending now") so the UI can explain *why* each event
was suggested. **When a user has set a career goal**, two more signals
are blended in - career relevance and skill-gap closure (see the
Career Copilot section below) - and the weights shift to emphasize
those (`career 25% / skillGap 30% / content 20% / collaborative 15% /
popularity 10%`), which is what turns "here are events you might like"
into "here is the event that helps your career goal".

No external ML service is used - everything runs synchronously inside
the API layer, which keeps the project easy to set up and demo within
a hackathon's time limit, while still being a genuine hybrid
recommender rather than a random shuffle.

## What's new in this pass (UI redesign + AI features)

The UI was rebuilt to match the product's Figma (dark navy nav, indigo/violet
brand, match-score pills, gradient "Smart Match" banner) and a few genuinely
functional AI-flavored features were added on top of the existing recommender:

- **AI Agent search bar** (Home) - type something like *"tech conferences in
  New York next month under $100"* and `POST /api/events/ai-search`
  (`backend/utils/aiAssist.js`) parses category, city, price ceiling, and a
  time window out of plain text, then runs it through the normal event
  filters. It's a deterministic keyword/regex parser, not a hosted LLM call -
  no API key required, and easy to swap later.
- **"Generate with AI" drafting** (Host Event) - describe an event idea in a
  sentence and `POST /api/events/ai-assist` returns a suggested title,
  category, tags, and an expanded description to start from. Same
  heuristic-parser approach as the search bar.
- **Save/bookmark events** - a star on every event card records a `save`
  interaction (separate from `like`/`register`), surfaced under a new
  "Saved" tab on the Profile page.
- **Profile dashboard** - avatar, live stat cards (Attending / Hosted / AI
  Matches), and a "My Registered Tickets" list, backed by a new
  `GET /api/events/mine` endpoint plus the existing interactions API.
- **"More in {category}"** on the event detail page - a lightweight
  related-events strip using the existing list endpoint.
- UI polish: skeleton loaders, toast notifications, empty states, countdown
  badges ("In 3 days"), category color-coding, and a responsive/mobile nav.

## Career Copilot features (this pass)

Per the challenge brief, the recommendation engine has to reason about
**department, skills, interests, location, career goals and previous
activities** - not just "things you might like". Rather than bolting on
every idea from the brainstorm, this pass adds the six highest-impact
features on top of the existing hybrid recommender, all wired through
one shared engine (`backend/utils/careerEngine.js` +
`backend/utils/careerPaths.js`) so they can never disagree with each
other or with the main "For You" feed:

1. **Career Goal -> Event Roadmap** - set a career goal (7 tracks: AI/ML
   Engineer, Software Developer, Data Scientist, Cybersecurity Engineer,
   UX/UI Designer, Entrepreneur, Researcher) and skills on your profile.
   `GET /api/career/roadmap` finds the best upcoming event for each
   skill you're missing and orders them NOW / NEXT / LATER / GOAL -
   shown as a visual "Career Journey" on the Profile page's new **Career
   Progress** tab.
2. **Skill Gap Analyzer** - `computeSkillGap()` compares your stated
   skills against your goal's core skill list and returns what's missing
   plus a progress percentage. Feeds directly into the roadmap and the
   Opportunity Score below.
3. **Opportunity Score** - the recommender's blended score is now shown
   as a 0-100 "Opportunity Score" with a five-way breakdown (career fit,
   skill-gap closure, interests, similar students, popularity) via a
   "Why this event?" expandable panel on every event card
   (`OpportunityBreakdown.jsx`). When no career goal is set, the career/
   skill-gap rows simply show 0% - the feature degrades gracefully
   rather than breaking.
4. **AI Event Copilot** - a free-text box on the Recommendations page
   ("I know Python and want to become an ML engineer - what should I
   attend?"). `POST /api/career/copilot` parses the question for a
   career goal/skills (same deterministic keyword approach as the
   existing AI search/draft tools - no external LLM), re-runs the normal
   recommender with that context, and returns a top pick plus a
   plain-English reason tied to your last registration.
5. **"Don't Miss This"** - `GET /api/recommendations/urgent` surfaces
   your own top recommendations that are both a strong match (≥50) and
   closing soon (event or registration deadline within 3 days), shown at
   the top of the Recommendations page.
6. **Career Progress Dashboard** - `GET /api/career/dashboard` rolls up
   skills developed, events attended, career readiness %, and the single
   next recommended action.

Supporting pieces:
- **Skill feedback loop** - after registering for an event with tagged
  `requiredSkills`, you're asked what you actually learned
  (`POST /api/interactions/skills-gained`). Confirmed skills bump to
  "intermediate" immediately, so the roadmap and skill gap update live -
  a good "look, it adapts" moment for a demo.
- **Badges** on event cards (🎯 Career Boost, 🧠 Skill Builder, 🔥
  Trending, ⚡ Closing Soon, 💰 Free, 🚀 Beginner Friendly, 📍 Near You),
  computed from the same scoring pass as the Opportunity Score.
- Organizers can tag `requiredSkills`, `difficulty`, and a
  `registrationDeadline` when creating an event (also auto-suggested by
  the "Generate with AI" drafting tool).

Deliberately **not** built in this pass (per the brief's own advice to
pick a focused feature set rather than 19 disconnected ones):
gamification/XP, organizer-side analytics, the "Opportunity Radar"
visualization, and a full "Why NOT this event" explainability view.
These are reasonable follow-ups but weren't essential to the core story.

### ⚠️ Tech stack note

The challenge slides specify **Next.js (frontend) + Node.js (backend) +
PostgreSQL (database) + Flutter (mobile)**. This project is **React
(Create React App) + Node.js/Express + MongoDB**, with no mobile app -
a MERN stack, as the original README already stated. This pass adds
features on top of that existing, working codebase rather than
rewriting it, since a Next.js/PostgreSQL/Flutter rewrite is effectively
three separate codebases and a different scope of project entirely.

**Before final submission, confirm with the organizers whether the
listed stack is mandatory or a recommendation.** If it's mandatory, the
honest options are: (a) do the rewrite as a separate, larger effort with
more time, or (b) submit as-is and address the deviation directly in
your Impact Explanation / demo, framing it as "we prioritized a fully
working hybrid recommender + Career Copilot over stack compliance."
Either is defensible - just don't leave it unaddressed.



### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # edit MONGO_URI / JWT_SECRET if needed
npm run seed               # optional: loads demo users + events
npm run dev                 # starts on http://localhost:5000
```

Demo accounts created by the seed script (password: `password123`):
- alice@demo.com - interested in tech/ai, careerGoal=`ai-ml-engineer`,
  skills=[python: intermediate, javascript: beginner]. Log in as her to
  see the Career Roadmap, Skill Gap Analyzer, and career-aware
  Opportunity Score in action out of the box.
- bob@demo.com - interested in music, no career goal set (shows the
  graceful no-goal state on the Career Progress tab).

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env       # REACT_APP_API_URL, defaults to localhost:5000/api
npm start                   # starts on http://localhost:3000
```

## Key API endpoints

| Method | Endpoint                        | Description                          |
|--------|----------------------------------|---------------------------------------|
| POST   | /api/auth/register               | Create account (name, email, password, interests[]) |
| POST   | /api/auth/login                  | Login, returns JWT                    |
| GET    | /api/auth/me                     | Current user                          |
| PUT    | /api/auth/me/interests           | Update interests/location             |
| GET    | /api/events                      | List/search/filter events             |
| POST   | /api/events                      | Create event (auth required)          |
| GET    | /api/events/:id                  | Event detail (logs a "view")          |
| POST   | /api/interactions                | Record like/register/view/dismiss     |
| GET    | /api/recommendations             | Personalized recommendations for the logged-in user |
| GET    | /api/events/mine                 | Events the logged-in user is hosting (auth required) |
| POST   | /api/events/ai-search             | Natural-language query -> parsed filters + matching events |
| POST   | /api/events/ai-assist             | Idea text -> draft {category, tags, requiredSkills, description} (auth required) |
| GET    | /api/recommendations/urgent      | "Don't Miss This" - strong matches closing soon |
| GET    | /api/career/goals                | Public list of career-goal + skill options (for onboarding pickers) |
| GET    | /api/career/roadmap              | Skill Gap Analyzer + Career Roadmap for the logged-in user |
| GET    | /api/career/dashboard            | Career Progress Dashboard summary |
| POST   | /api/career/copilot               | AI Event Copilot - free-text question -> top pick + reasoning |
| POST   | /api/interactions/skills-gained   | Skill feedback loop - confirm skills learned at an event |

## Suggested demo flow for judges

1. Register a new account, pick 2-3 interests (e.g. tech, ai), and set a career
   goal (e.g. AI/ML Engineer) with a skill or two -> cold-start recommendations
   lean on career fit + popularity, and the Career Progress tab already shows a
   roadmap.
2. Like/register for a tech event with tagged skills; on the confirmation
   checklist, mark what you learned -> watch the Skill Gap Analyzer and
   roadmap update live.
3. Open an event card's "Why this event?" panel to show the Opportunity Score
   breakdown (career fit, skill gap, interests, similar students, popularity).
4. Ask the AI Event Copilot a free-text question ("I know Python, want to
   become an ML engineer - what should I attend?") and show the reasoned pick.
5. Point out "Don't Miss This" on the Recommendations page for a high-match
   event with a closing registration deadline.
6. Log in as `bob@demo.com` (no career goal set) to show the graceful
   no-goal state, and as `alice@demo.com` to contrast a fully career-aware
   feed from the same engine.
