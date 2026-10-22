<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Booking room — test assignment (Mad Devs)

Project rules, the full requirement map and the recruiter's answers live in [CLAUDE.md](CLAUDE.md) (in Russian).
Key points for any agent:

- Architecture is Feature-Sliced Design: `app/` only re-exports; code lives in `src/{_app,_pages,entities,shared}`.
- All business rules are one function, `findRuleViolation` (`src/entities/booking/lib/bookingRules.ts`), shared by
  the form and the mock API. Change a rule → update its unit test first.
- UI texts live in the owning slice's `i18n/{ru,en}.json`; keep both languages in sync.
- When behaviour changes, update `README.md`, `CLAUDE.md` and the `/about` page texts.
- Before handing over: `npm run lint:all && npm test && npm run e2e && npm run build` — all green.
- Screenshots and browser artefacts never go into the repository.
