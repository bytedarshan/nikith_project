# SAME SPOT ✳
### A playable daily game about human instinct

**Status:** Working, self-contained MVP with instant round rewards, real daily rankings, XP, levels, 7-day streak shields and achievement badges, for local testing and small single-server pilots. Not yet a fully production-hardened, high-scale public release.

Play five illustrated puzzles, secretly choose where other people would tap, get an immediate predicted or real heatmap after every tap, and challenge a friend to compare spots. A password-protected studio lets the creator upload and schedule new puzzles without editing code.

## NEW IN V5: Instant per-puzzle heatmap reveals and scores

**The main gameplay flow is now: choose a spot → confirm → immediate heatmap reveal with an animated 0–100 hotspot score, 3/2/1/0-star reward, and +10 XP → next puzzle.** The reveal appears **after every individual puzzle**, not only after finishing five.

### First players still get a reveal, honestly

- With fewer than `MIN_CROWD` genuine submissions on a particular puzzle (50 by default), the API scores the tap against an **editorial prediction model**: a probability distribution calculated from 2–5 preselected visual focal points. The screen conspicuously says **PREDICTED HEATMAP · NOT REAL PLAYERS**. These focal points are hypotheses about what players might choose. They are **not actual observed clicks and are not validated predictions**.
- As soon as at least `MIN_CROWD` real answers exist, the **same reveal uses aggregated real coordinates**, with a `LIVE CROWD` label. This decision is made server-side for each puzzle. The open reveal and completed daily-results screen check every 25 seconds for updated real results, and automatically replace the prediction when the threshold is reached; reloading also works.
- The score animates immediately, with a large **hotspot fit score** from 0–100, tier-specific panels, star bursts, and confetti for the highest tier. `Hotspot fit` means how closely the selection matches the strongest predicted or observed density peak. A separate percentage indicates the modeled or real nearby share. A perfect hotspot fit is **not** a claim that 100% of people tapped there.
- Predicted top-tier results are called **POTENTIAL PERFECT PULSE**. They do **not** create permanent crowd badges, contribute to real-percentile rankings, or change actual player submissions. Every valid confirmed tap still earns **exactly +10 permanent XP once**, regardless of the prediction.
- Official crowd matching and percentile calculations **only** use genuine players' taps. A live same-day score remains provisional until the day closes.
- The `/api/round-result?puzzleId=...` route allows a player to revisit a puzzle's latest heatmap **after submitting**, never before. The `POST /api/answers` response returns that puzzle's complete instant round result in `roundResult`.

### Add or change predicted focal points from the admin

1. In `/admin`, choose a future date and puzzle slot, upload artwork or choose an illustrated scene, and write a short question.
2. In **Predicted heatmap focal points**, click on the image to mark **2–5 plausible spots**. Built-in illustrated scenes start with suggested positions; custom artwork requires selecting points manually.
3. Adjust each point's **priority slider** if one is more likely to attract attention. Save and schedule. The positions are stored per puzzle and **cannot be changed after someone has answered**.
4. These marks are never shown on the player's unanswered puzzle. They are only used to make a transparent, model-estimated heatmap and instant provisional score until enough genuine answers exist.

Use the real crowd's response patterns to recalibrate editorial assumptions over time. **Never advertise the model as actual players' choices.** The preview images are sample layouts, not proof of predictive accuracy.

### Why the numbers may look different

- **99/100 Hotspot fit** = your spot is almost exactly at the most concentrated estimated or real hotspot.
- **27% nearby share** = an estimated or measured 27% of other responses fall within the matching radius.
- **You beat 82% of players** = a separate real-person daily percentile that needs at least `MIN_RANKED` completed games (50 by default). It is never modeled.

### Testing V5

Run `npm run test:all` to check immediate score/reveal behavior, threshold switching, no fake award persistence, uploads, puzzle publishing, and previous V4 streaks. A static mobile screenshot preview of the predicted reveal is included in the delivery outside the ZIP. The full browser-to-local-server run is still worth checking in Antigravity on your Mac.

## NEW IN V4: Daily streaks, shields, and milestone rewards

**Daily streak:** A day counts only when the same anonymous player submits all **five** daily puzzles; entering the site or submitting one tap does not count. Streaks use the configured `GAME_TIMEZONE` (default: Asia/Kolkata). Existing V3 player submissions remain compatible: streaks and bonuses are recomputed from verified full completions.

- **On home:** A small flame card shows current streak, personal best, one shield slot, and a seven-segment progress bar. Before finishing today's game it says either *Finish today's five to keep it*, *Shield ready to save your streak*, or *Start a new streak*.
- **On results:** A much more prominent streak card celebrates today's success and milestones, beside the existing percentile leaderboard, Perfect Pulse and XP rewards.
- **Milestones:** 3 completed consecutive days earn the *First Flame* badge and **+20 XP**; 7 days earn *Week Warrior*, **+50 XP**, and **one Streak Shield**; 14 days earn **+100 XP**; 30 days earn **+200 XP**. A replacement shield can be earned at each seven-day multiple (7, 14, 21, etc), with **maximum one shield held** at once.
- **Streak Shield:** It **automatically** protects exactly one missed calendar day *if you return and finish all five the following day*. It is consumed at most once, and the missed day does **not** count as a completion. Two or more consecutive missed days break the streak. The shield never pretends you played a day you missed.
- **Fair rewards:** Milestone XP is derived from immutable server-side completions and cannot be earned again by refreshing or retapping. All future and old activity uses the same backend calculations; practice mode earns no XP or streaks.
- **7-day schedule is critical:** The editor must have a complete 5-puzzle set every day, or a player cannot protect their streak. Seeded demo content lasts 14 days; schedule originals in advance.

### Streak mechanic example

| Day | Action | Streak | Shield | Outcome |
|---|---|---:|---:|---|
| Mon–Sun | Complete all 5 daily puzzles | 7 | 1 | Week Warrior + 50 XP |
| Monday | Miss the game | 7 (at risk) | 1 | Not counted as played |
| Tuesday | Complete all 5 | 8 | 0 | Shield saves streak |
| Wednesday | Complete all 5 | 9 | 0 | Continues normally |
| If Monday **and** Tuesday missed | Return Wednesday | 1 | 1 | Streak restarts; best is preserved |

The percentile and **official real-crowd** score mechanics from V3 remain unchanged; V5 additionally shows editorial estimated results while the real crowd is small.

## NEW IN V3: Real Daily Ranking + Retention

- After all five puzzles, see **“You beat X% of players today”**, calculated from actual scores of other people who finished all five puzzles (not simulated data).
- The rank stays **locked until at least 50 completed players** exist (override with `MIN_RANKED` for a small local test). During the day it is marked **provisional**, and it becomes **final** after the daily reset.
- Tied scores do **not** count as players you beat; the screen displays the number of ties.
- A **Crowd Whisperer** badge is awarded after the daily results become final, if you beat at least 90% of other eligible completed players. During the day you see your provisional standing without a prematurely permanent badge.
- After finishing, there is a reminder that five new puzzles arrive tomorrow. The existing XP, level, 3-day streak, and Perfect Pulse feedback remain intact.
- The percentile is computed from the same real population snapshot for all eligible completed players. It is distinct from the per-puzzle crowd-match score.

## What you get

- Beautiful responsive desktop/mobile web interface
- 8 starter vector scenes: park, cafe, island, gallery, plaza, abstract patterns, train station, and garden
- 5 puzzles per day with a configured daily reset timezone (`Asia/Kolkata` by default)
- 14 seeded days of **example content**; scenes repeat and are intended to be replaced with original daily artwork before a public launch
- A practice scene with a **prominently labeled simulated** crowd, so a solo tester can see the reveal experience
- Anonymous browser sessions (no signup necessary)
- Tap anywhere, confirm the choice, and progress through five rounds
- **Instant gratification:** +10 XP immediately after every locked tap, with animated reward feedback
- **Four performance tiers** when enough real crowd answers exist: Perfect Pulse (3 stars + confetti), Nailed It (2), Pretty Close (1) and Wild Card (0)
- **Daily awards:** Daily Finisher, Perfect Pulse, Crowd Magnet and 3-day streak badges
- **XP & levels:** 10 XP per confirmed choice; 250 XP required per level; persistent across days
- Server-side recording, coordinate validation and duplicate answer protection
- Real crowd matching scores and heatmaps aggregated into a 25×17 grid
- Predicted, clearly labeled editorial heatmaps and instant scores below the real-player threshold; real aggregated heatmaps replace them once enough players have answered
- Finalized results after daily reset; early results are marked provisional
- Friend-challenge links, revealing 0–5 pairwise matches after both players finish
- Private admin dashboard for uploads, previews, schedules and participation counts
- Persistent local JSON database, automatic updates on each write, and no npm dependencies
- Built-in backend and frontend smoke-test scripts

## Fastest way to run (Mac / Windows / Linux)

You need [Node.js 20+](https://nodejs.org/) installed (22 recommended). There is **no** `npm install` step: everything uses Node's built-in libraries.

1. Unzip this folder.
2. Open a terminal in the folder.
3. Run:

   ```bash
   npm start
   ```

4. Visit **http://localhost:3000** to play the game.
5. Click **Try the sample** to see a heatmap with clearly labeled example data.

Without environment configuration, the game works, but the admin dashboard is disabled and session cookies reset when the server restarts. Set credentials before testing admin or inviting real participants.

### Enable the private admin dashboard

Mac / Linux:

```bash
cp .env.example .env
# Edit .env with your own unique ADMIN_PASSWORD and COOKIE_SECRET.
set -a; source .env; set +a
npm start
```

Use a long, unique `COOKIE_SECRET` (at least 32 random characters) and a separate long admin password. To generate a random secret: `openssl rand -hex 32`.

Windows PowerShell (replace example values):

```powershell
$env:ADMIN_PASSWORD = "choose-a-long-unique-password"
$env:COOKIE_SECRET = "replace-with-at-least-32-random-characters"
$env:GAME_TIMEZONE = "Asia/Kolkata"
npm start
```

Then visit **http://localhost:3000/admin** and log in.

> `.env` is deliberately not loaded automatically, to keep the backend dependency-free. Export the variables into the shell before `npm start` as shown above.

## How to publish a new daily set

1. Log into `/admin`.
2. Pick a future **Publish date** and a slot from **1 to 5**.
3. Write a question and optional category label.
4. Pick one of eight illustration templates, or upload a custom **PNG, JPG or WebP** under 3 MB.
5. The recommended image ratio is **480:330 (16:11)**. For example, 1440×990 pixels. The app preserves the entire image; it does not crop the artwork.
6. Press **Save & schedule this puzzle**.
7. Repeat for slots 1–5.
8. When all five slots exist, that day is automatically ready. At midnight in `GAME_TIMEZONE`, the backend serves the new set, without a redeploy or scheduled job.

The database is persistent in `data/store.json`; uploaded images are stored under `data/uploads/`. These directories are ignored by git. Back them up before deploying.

**Important:** If a puzzle has received player answers, it cannot be replaced, protecting score consistency. Build and QA tomorrow's set in advance.

## Daily ranking formula

When at least `MIN_RANKED` people have completed **all five** puzzles, the backend computes every completed player’s mean match rate across their five choices using the same response snapshot. The percentile is `floor(100 × number of other completers with a strictly lower score / number of other completers)`. Tied players are excluded from the numerator and are shown separately. Scores are provisional until reset. No ranking is invented at low participation.

## Game rules and scoring

The user sees a 480×330 visual coordinate plane and taps anywhere. The client normalizes X and Y to 0–1, so a tap remains consistent on different phone sizes.

- Each person makes one confirmed choice per puzzle.
- The server rejects coordinates outside 0–1 and prevents repeat submissions for the same player/puzzle.
- Matching radius: Euclidean distance of **0.11** in normalized coordinates (approximately 7.8% of the normalized diagonal).
- A puzzle score is `100 × number of OTHER players within 0.11 / total number of OTHER players`.
- The final daily score is the average of five puzzle scores.
- Friend compatibility is a separate `0–5` count based on the same distance threshold.
- The results API sends **aggregated** crowd-grid counts, not individual player coordinates.
- Real crowd heatmaps are only shown at `MIN_CROWD` genuine submissions; below that, an explicitly labeled editorial prediction heatmap is shown instantly.
- The practice-mode sample uses generated points and is explicitly called **SIMULATED** in the interface.

The 0.11 radius and five-scene format are initial design choices. They should be calibrated using real playtesting. A softer distance-based score could replace the binary matching radius later.

## New: Instant rewards and achievements

**The central game rule remains unchanged:** there is no objectively "correct" answer. The crowd determines how close your choice is to its most popular region.

### What happens immediately after a tap?

- Every confirmed tap receives **+10 XP** immediately, even for a wildly different answer. An already-submitted answer never generates additional XP.
- If at least `MIN_CROWD` real people have submitted that puzzle, a personal **live** grade appears immediately, with a short animated reward panel. The personal grade reveals no crowd heatmap or other users' exact tap positions.
- With fewer than `MIN_CROWD` submissions, the player sees **+10 XP**, an editorially **predicted heatmap**, an estimated hotspot-fit score, and a clearly **provisional** potential-tier celebration on the immediately following reveal screen. We never present modeled choices as real players.
- Practice mode demonstrates every part of the animation with distinctly labeled **simulated** data and never saves practice XP.

### Scoring & rewards

The **crowd match score** stays transparent: `100 × nearby OTHER players / all OTHER players` rounded to a whole percent. "Nearby" means within the 0.11 normalized tap radius.

For an *achievable* but honest "perfect" reward, we also compare how densely populated your spot is relative to the strongest crowd hotspot on that image. `alignment = nearby players / maximum nearby players in any hotspot × 100` (rounded). The maximum is estimated on a fine, fixed 21×21 lattice, and also includes your own location as a candidate to avoid an estimated peak smaller than your score.

| Grade | Eligibility | Stars | Experience |
|---|---|---|---|
| 🏆 Perfect Pulse | ≥95% hotspot alignment **and** ≥20% of others nearby | ★★★ | Gold panel + confetti |
| ⚡ Nailed It | ≥75% alignment and ≥15% of others nearby | ★★ | Green celebration |
| ✨ Pretty Close | ≥45% alignment and ≥8% of others nearby | ★ | Blue recognition |
| 🪄 Wild Card | Anything else | 0 | Playful purple response |

The absolute crowd thresholds prevent a player in a tiny isolated two-person cluster from winning a misleading Perfect Pulse just because it is their closest match. Scores and grades shown on the current day are **provisional**; they may change as the real crowd grows. After daily reset, results become final.

### Earned badges and leveling

- **Daily Finisher:** automatically after five locked choices.
- **Perfect Pulse:** when at least one puzzle qualifies as Perfect Pulse.
- **Crowd Magnet:** when three or more puzzles qualify as Perfect Pulse or Nailed It.
- **On a Roll:** after a streak of at least three consecutive daily completions.
- **XP:** exactly 10 per real locked answer, up to 50 per standard daily set. Total XP determines the player's level (250 XP per level), displayed on their results screen. Practice answers do not count.

These badges are derived from actual stored submissions and crowd scores, rather than client-only flags. On current-day provisional results, crowd-dependent badges can change as participation grows. The MVP does not yet provide separate inventory, redemption, or permanent trophy storage.

### First-time visual test

Open the game, click **Try the sample**, tap around the middle of the simulated plaza, and **Lock in my spot**. You should immediately see a colored reward panel with a grade and practice XP. To see a real crowd grade in an isolated local test, at least `MIN_CROWD` distinct real sessions must answer the same puzzle. For local testing you can set `MIN_CROWD=2` (never use a two-player threshold as a genuine public score).

## Backend routes

| Route | Method | Behavior |
|---|---|---|
| `/api/config` | GET | Today, timezone and crowd threshold |
| `/api/daily` | GET | The five current puzzles plus your own submitted positions |
| `/api/answers` | POST | Submit one confirmed normalized tap; returns instant XP, provisional crowd tier when eligible |
| `/api/results` | GET | Five scores/heatmaps and earned awards after completing the day, with predictions clearly marked until genuine data qualifies |
| `/api/round-result?puzzleId=...` | GET | Return the latest predicted or real heatmap/score for a submitted puzzle; blocked before answering |
| `/api/invites` | POST | Create a friend-challenge link after finishing |
| `/api/invites/:code` | GET | Pairwise comparison after both finish |
| `/api/admin/login` | POST | Password login, signed HttpOnly cookie |
| `/api/admin/logout` | POST | Log out |
| `/api/admin/data` | GET | Admin schedules and basic participation counts |
| `/api/admin/puzzles` | POST | Create or replace an unplayed puzzle in a date/slot |
| `/api/admin/upload` | POST | Upload PNG/JPG/WebP into local image storage |

The backend is in `server.mjs`. Daily starter puzzle generation is in `seed.mjs`. The frontend and studio live under `public/`.

### Example public JSON request

```json
{
  "puzzleId": "seed-1-1",
  "x": 0.48,
  "y": 0.64
}
```

Send this as JSON to `/api/answers` after visiting `/api/daily` to receive your signed anonymous player cookie. The cookie is essential to associating your session with your five taps.

## Test it

```bash
npm test
node scripts/frontend-check.mjs
node scripts/rewards-check.mjs
node scripts/streak-check.mjs
```

`npm test` spins up a temporary server and confirms scheduling, anonymity, immutable submissions, scoring, honest crowd thresholds, friend links, admin permissions, uploads and persistence. It uses a temporary test database and doesn't modify real player data.

`rewards-check.mjs` validates threshold boundaries, perfect-award safeguards and earned badges. `streak-check.mjs` validates streak expiry, grace-day use, milestone XP, shield inventory and double-award prevention.

`frontend-check.mjs` checks the client state transitions (welcome → practice → demo reveal → daily game → five confirmed taps → waiting results) with a minimal simulated DOM.

**Browser visual QA note:** The interface has not been validated in a real graphical browser in this delivery environment. Check it in Chrome/Safari on mobile and desktop after unzipping. In particular inspect tap placement, image rendering, keyboard access and heatmap layering.

## Deploying a small pilot

Use one Node.js server with a **persistent data volume** and HTTPS. A single-instance Railway, Render or VPS deployment with a mounted disk can support a controlled pilot. Do not deploy this exact JSON storage design to serverless / ephemeral filesystem hosts (for example, a typical Vercel setup): you would lose or fork player data. The supplied Dockerfile is for a persistent single-instance deployment.

Suggested environment:

```bash
PORT=3000
ADMIN_PASSWORD=<your-long-password>
COOKIE_SECRET=<your-strong-random-secret>
GAME_TIMEZONE=Asia/Kolkata
MIN_CROWD=50
MIN_RANKED=50
DATA_DIR=/app/data
NODE_ENV=production
```

Put a trusted HTTPS proxy in front of Node so secure cookies work. Mount `/app/data` to a persistent disk and back it up. Configure your host's health checks against `/api/config`.

## Before launching publicly (important)

This app is a **real working MVP**, not production-scale architecture. For a public launch, I recommend these upgrades:

1. **Move persistence to PostgreSQL/Supabase**, with indexed tables for players, daily sets, puzzles, taps and invites, transaction-safe writes, and a background job to aggregate heatmaps. The current JSON file is a simple single-process development/pilot store and rewrites the entire dataset on every answer.
2. **Move images to Supabase Storage or S3** with immutable object URLs and content validation.
3. **Upgrade admin authentication** to a managed provider with MFA, CSRF protections, logging and stricter login throttling; the MVP uses signed HttpOnly cookies plus basic per-IP throttling.
4. **Add abuse prevention** for cookie resets, bots and mass fake submissions. Anonymous browser IDs do not represent unique people.
5. **Add analytics events / Mixpanel or PostHog** for start, first tap, completion, next-day retention, social shares, invite opens and invite conversions.
6. **Improve accessibility** beyond initial keyboard arrow support, including live score announcements, focus restoration and testing with assistive technology.
7. **Create an original daily editorial pipeline**. The seeded days reuse sample illustrations and are only placeholders for a real content plan.
8. **QA UX in real browsers and devices**, add automated UI end-to-end tests, load tests, backups/restore tests, monitoring and abuse alerts.

### Proposed PostgreSQL tables for the next stage

```
players(id, created_at)
daily_sets(id, date, timezone, status)
puzzles(id, question, eyebrow, scene, image_url, created_at)
daily_set_puzzles(daily_set_id, puzzle_id, slot)
taps(id, player_id, daily_set_id, puzzle_id, x, y, created_at)
friend_challenges(id, creator_player_id, daily_set_id, token, created_at)
puzzle_daily_stats(daily_set_id, puzzle_id, player_count, heatmap_grid, finalized_at)
events(id, player_id, date, event_name, created_at)
```

In PostgreSQL, create a unique constraint on `(player_id, daily_set_id, puzzle_id)` to enforce one answer per participant at the database level.

## File overview

```
same-spot-mvp/
  package.json
  server.mjs          # Node backend/API and local persistence
  seed.mjs            # Initial example daily sets
  public/
    rewards.js         # Shared real crowd grading, award tiers and XP rules
    index.html        # Game entry
    app.js            # Player UI, score display and share flows
    scenes.js         # Eight starter vector illustrations
    styles.css        # Responsive visual design
    admin.html        # Studio entry
    admin.js          # Upload/scheduling/analytics UI
    favicon.svg
  scripts/
    smoke.mjs         # API end-to-end smoke test
    frontend-check.mjs  # Frontend state flow test
    rewards-check.mjs   # Reward and grading edge-case tests
  Dockerfile
  .env.example
  .gitignore
  data/               # Writable DB + image storage (generated)
```

---

**The next best product step:** run the five-puzzle game with 20–50 testers and watch their reaction to the crowd reveal. Don't invest in a large daily-content pipeline until the core experience genuinely makes people want to compare choices.
"# nikith_project" 
