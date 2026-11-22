# SAME SPOT V6 release notes

## Player flow
- Submit each individual tap and immediately show its heatmap, animated score, reward tier and +10 XP.
- Before `MIN_CROWD=5` actual taps per puzzle, the heatmap and fit score are an editor-authored estimate, not player data. After five taps, real aggregate observations replace it automatically. The short 'Estimated' tag remains on the reveal until that threshold, with detailed disclosure in How to Play.
- Rankings only reflect real five-puzzle completions after `MIN_RANKED=50` completed players (configurable). Estimated perfect results never grant official crowd awards.

## Admin
- Open `/admin` and sign in using `ADMIN_PASSWORD`.
- New 'Create a new day's five puzzles' wizard copies a complete set to a future date with new puzzle IDs. Pick a source set, choose a fresh destination, click Create, then edit each of the five slots.
- Image uploads remain PNG/JPG/WebP under 3MB. Upload, click 2–5 points in the preview, adjust their priority, then Save.
- Bug fix: hotspot priority sliders are relative 1–10 values; they are normalized by the backend. Previously a slider value greater than 1 was rejected, making Save fail.
- A successful Save now has persistent confirmation; server errors remain visible under the form.
- Publishing dates and current daily set are based on `GAME_TIMEZONE`.

## Local configuration
- `npm run setup:admin` securely creates a local ignored `.env` with password, cookie secret and MIN_CROWD=5.
- `npm run test:all`, then `npm start`.
- Environment variables already defined by the hosting service take precedence over the local `.env`.
- For Railway or other deployments, set `MIN_CROWD=5`, `DATA_DIR` to persistent storage and set strong `ADMIN_PASSWORD` and `COOKIE_SECRET` secrets.
- App version visible in footer; CSS and JS fetch with v6 query parameters to avoid misleading stale local browser builds.

## Limitations / release readiness
- This is still a small-server MVP, not a scale-ready public infrastructure.
- 5 real responses is enough to demonstrate a live heatmap, but an extremely small and noisy sample. Rankings still require a larger completed-player sample.
- Anonymous sessions alone do not fully prevent bots, device switching, or repeated registrations. Secure production deployments, monitoring and anti-abuse are necessary.
- Puzzles from existing project data must be migrated or preserved separately; do not replace it with this clean archive.
