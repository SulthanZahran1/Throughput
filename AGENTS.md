# AGENTS.md — Throughput

Guidelines for AI coding agents working on this project.

---

## Core Rules

1. **Ask before deciding.** Do not make architectural decisions without human input. If unclear, ask clarifying questions first.
2. **Atomic commits.** Never commit half-done work. Never commit code that doesn't compile/build. Commit when you have a complete, working feature.
3. **Terminal-first debugging.** Do not use browser DevTools as primary debug method. Use terminal, logs, and test files.
4. **Keep docs updated.** When making changes, update `plan.md`, `tutorial.md`, or this file as needed.
5. **No orphan TODOs.** If you add a TODO comment, create a corresponding issue or note in plan.md.
6. **DO NOT USE BROWSER FUNCTIONALITY.**
7. **Log all work in CHANGELOG.md.** After every commit or doc modification, add an entry to [CHANGELOG.md](./CHANGELOG.md).

---

## Project Overview

**Throughput** is a real-time warehouse optimization game.

- **Frontend:** React + TypeScript + Vite + Zustand + Tailwind + Framer Motion
- **Backend:** Go (Gin or Echo) + PostgreSQL
- **Docs:** `docs/plan.md`, `docs/tutorial.md`

See `docs/plan.md` for full architecture, roadmap, and data structures.

---

## Architecture Philosophy

1. **Separation of Concerns**
   - Game engine logic (`/engine`) is pure TypeScript, no React dependencies
   - React components (`/components`) only handle rendering and user input
   - State lives in Zustand stores (`/store`), not in component state
   - Backend is stateless REST + WebSocket; all game logic runs client-side

2. **Interface-Driven Design**
   - Define TypeScript interfaces before implementation
   - Backend Go structs mirror frontend types where applicable
   - API contracts defined in `docs/api.md`

3. **Minimize Duplication**
   - Shared types in `/types`
   - Reusable UI primitives in `/components/ui`
   - Game constants in `/constants`

---

## Code Guidelines

### General

1. Use `/tmp` folder for helper scripts (bash, Python, etc.). Do not commit them.
2. Do not create README files to track progress. Use `plan.md` or this file.
3. After modifying code or docs, update [CHANGELOG.md](./CHANGELOG.md) with your commits and changes.
4. Use linters before committing. If build fails 3× in a row, step back and try a different debugging approach.

### TypeScript / React

1. **No `any` casts.** Fix the type properly. If genuinely unavoidable, add a comment explaining why.
2. **No excessive try/catch.** Only catch errors you can handle meaningfully. Let unexpected errors bubble up.
3. **No redundant comments.** Code should be self-documenting. Only comment "why," not "what."
4. **Consistent style.** Run `eslint --fix` and `prettier --write` before committing.
5. **State in Zustand, not useState.** Component-local state is allowed only for ephemeral UI state (hover, focus, animation).
6. **Engine is framework-agnostic.** Files in `/engine` must not import React, Zustand, or any UI library.

### Go / Backend

1. **No panics in handlers.** Return proper HTTP errors.
2. **Use structured logging.** `log.Printf` is acceptable for MVP; switch to `slog` or `zap` later.
3. **SQL queries in `/storage`.** Handlers should not contain raw SQL.
4. **Validate inputs at API boundary.** Inner functions assume valid data.
5. **Run `go fmt` and `go vet` before committing.**

### CSS / Tailwind

1. **Tailwind-first.** Avoid custom CSS unless Tailwind can't express it.
2. **No inline styles.** Use Tailwind classes or CSS modules.
3. **Dark mode only (for now).** Don't add light mode variants until explicitly requested.

---

## File Structure Conventions

```
frontend/src/
├── components/
│   ├── game/        # Game-specific components (Grid, Crane, etc.)
│   ├── ui/          # Reusable primitives (Button, Modal, etc.)
│   ├── editor/      # Zone editor components
│   └── screens/     # Full-page screens (MainMenu, GameScreen, etc.)
├── engine/          # Pure game logic (no React)
├── store/           # Zustand stores
├── hooks/           # Custom React hooks
├── api/             # Backend API client
├── types/           # Shared TypeScript interfaces
├── utils/           # Pure utility functions
└── constants/       # Magic numbers, config values
```

```
backend/
├── cmd/server/      # Entry point
├── internal/
│   ├── api/         # HTTP handlers, router, middleware
│   ├── models/      # Go structs (User, Progress, Level)
│   ├── storage/     # Database queries
│   ├── auth/        # OAuth logic
│   └── validation/  # Input validation
├── migrations/      # SQL migrations
└── levels/          # Level JSON definitions
```

---

## Debugging Guidelines

### Frontend

1. **Console logging is fine during dev.** Remove before committing.
2. **For complex state issues:** Add a `debugStore` action that dumps current state to console or sends to backend.
3. **For animation issues:** Slow down with `transition: all 2s` temporarily.
4. **For engine bugs:** Write a failing unit test first, then fix.

### Backend

1. **Log request/response bodies** during dev (remove before prod).
2. **Use `httpie` or `curl` for API testing**, not browser.
3. **For DB issues:** Check `migrations/` order; run `psql` directly to inspect.

### Cross-Stack Debugging

If you need to debug frontend behavior using backend:

```typescript
// Frontend: send debug data to backend
fetch('/api/debug', {
  method: 'POST',
  body: JSON.stringify({ event: 'crane_move', data: craneState }),
});
```

```go
// Backend: write to file
func debugHandler(c *gin.Context) {
    var payload map[string]interface{}
    c.BindJSON(&payload)
    f, _ := os.OpenFile("/tmp/debug.json", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
    json.NewEncoder(f).Encode(payload)
    f.Close()
    c.Status(200)
}
```

Then inspect `/tmp/debug.json`.

---

## Testing Strategy

### Frontend

| Layer | Tool | Location |
|-------|------|----------|
| Engine logic | Vitest | `frontend/src/engine/__tests__/` |
| Components | React Testing Library (later) | `frontend/src/components/__tests__/` |
| E2E | Playwright (post-MVP) | `frontend/e2e/` |

**Priority:** Engine tests first. Component tests later. E2E much later.

### Backend

| Layer | Tool | Location |
|-------|------|----------|
| Handlers | `net/http/httptest` | `backend/internal/api/*_test.go` |
| Storage | Test DB + fixtures | `backend/internal/storage/*_test.go` |

**Priority:** Storage tests first (ensure queries work). Handler tests later.

---

## Commit Message Format

```
<type>(<scope>): <subject>

<body (optional)>
```

**Types:** `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

**Scopes:** `engine`, `ui`, `store`, `api`, `db`, `auth`, `levels`

**Examples:**
```
feat(engine): implement dual command crane mode
fix(ui): order timer not updating on re-render
docs(plan): add sandbox mode specification
refactor(store): split gameStore into smaller slices
test(engine): add unit tests for zone priority resolution
```

---

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Zustand state not updating UI | Make sure you're selecting specific state, not whole store |
| Framer Motion janky | Use `layout` prop; avoid animating `width`/`height` directly |
| Go handler returning 200 on error | Always check `err != nil` before success response |
| TypeScript "possibly undefined" | Use optional chaining or fix the data flow |
| Tailwind class not applying | Check for typos; run `npx tailwindcss` to rebuild |
| Zone overlap logic wrong | Refer to `plan.md` Section 5.1 for exact algorithm |

---

## Quick Reference

### Run Frontend
```bash
cd frontend
npm install
npm run dev        # Dev server at localhost:5173
npm run lint       # ESLint check
npm run build      # Production build
npm run test       # Vitest
```

### Run Backend
```bash
cd backend
go mod tidy
go run cmd/server/main.go   # Dev server at localhost:8080
go fmt ./...                # Format
go vet ./...                # Static analysis
go test ./...               # Tests
```

### Database
```bash
# Start Postgres (Docker)
docker-compose up -d db

# Run migrations
cd backend
go run cmd/migrate/main.go up

# Connect directly
psql -h localhost -U throughput -d throughput
```

---

## When In Doubt

1. Check `plan.md` for intended behavior
2. Check `tutorial.md` for player-facing expectations
3. Check this file for code conventions
4. If still unclear: **ask the human**

**Before ending a session:** Always update `CHANGELOG.md` with your commits and doc changes.

---

## Implementation Log

See [CHANGELOG.md](./CHANGELOG.md) for the full history of changes and commits.