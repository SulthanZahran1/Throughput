# Throughput Refactor Plan

**Status:** Planning Phase  
**Last Updated:** 2026-02-21

---

## 1. Current State Analysis

### 1.1 Project Overview
Throughput is a warehouse optimization game with:
- **Frontend:** React + TypeScript + Vite + Zustand + Tailwind
- **Backend:** Go (Gin) - Currently minimal

### 1.2 Identified Issues

#### Frontend Issues

| Issue | Location | Severity | Description |
|-------|----------|----------|-------------|
| **God Store** | `gameStore.ts` (661 lines) | High | Single store managing game state, logic, AND actions |
| **Mixed Concerns** | `gameStore.tick()` | High | Store contains game loop logic directly |
| **Inline Logic** | `decision.ts` | Medium | Engine logic mixed with React-aware types |
| **Missing API Layer** | - | High | No abstraction for backend communication |
| **Dead Code** | `gameStore.ts` | Low | Manual crane actions deprecated but still present |
| **Duplicated Types** | `game.ts` vs `plan.md` | Low | Some drift between types and documentation |

#### Backend Issues

| Issue | Location | Severity | Description |
|-------|----------|----------|-------------|
| **No Models** | `internal/` | High | Missing models, storage, auth packages |
| **No Database** | - | High | No PostgreSQL connection or migrations |
| **No API Implementation** | `internal/api/` | High | Only logging endpoints exist |
| **Missing Middleware** | `main.go` | Medium | No auth middleware, rate limiting |
| **Static Only** | `main.go` | Low | Serves only static frontend files |

### 1.3 Architecture Diagram (Current)

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Components │  │  gameStore  │  │   useGameLoop       │  │
│  │  (UI only)  │◄─┤  (661 loc)  │◄─┤  (calls tick())     │  │
│  └─────────────┘  └──────┬──────┘  └─────────────────────┘  │
│                          │                                   │
│                   ┌──────▼──────┐                            │
│                   │  decision.ts│ (engine logic)             │
│                   └─────────────┘                            │
└──────────────────────────┬──────────────────────────────────┘
                           │ No API client
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ /health     │  │ /api/log    │  │   Static Files      │  │
│  │ /api/ping   │  │ (frontend)  │  │   (frontend dist)   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                                                              │
│  Missing: Auth, DB, Models, Storage, Level API              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Refactor Goals

### 2.1 Primary Goals

1. **Separate Concerns**: Store should only manage state, not game logic
2. **Engine Purity**: `/engine` should be framework-agnostic (no React imports)
3. **Backend Completeness**: Implement full backend per plan.md spec
4. **API Layer**: Create proper frontend API client with type safety
5. **Testability**: Enable unit testing for engine logic

### 2.2 Secondary Goals

1. **Performance**: Reduce unnecessary re-renders with granular selectors
2. **Type Safety**: Ensure Go models mirror TypeScript types
3. **Documentation**: Keep all docs in sync with implementation
4. **Maintainability**: Smaller, focused files with single responsibilities

---

## 3. Target Architecture

### 3.1 Frontend Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  COMPONENTS                          │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐│    │
│  │  │  screens/   │ │   game/     │ │   editor/       ││    │
│  │  │  UI only    │ │   Visual    │ │   Zone editing  ││    │
│  │  └──────┬──────┘ └──────┬──────┘ └────────┬────────┘│    │
│  └─────────┼───────────────┼─────────────────┼─────────┘    │
│            │               │                 │               │
│            └───────────────┴─────────────────┘               │
│                            │                                 │
│                            ▼                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    STORES                            │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐             │    │
│  │  │gameStore │ │uiStore   │ │progress  │             │    │
│  │  │(state)   │ │(state)   │ │Store     │             │    │
│  │  │~150 loc  │ │~50 loc   │ │~100 loc  │             │    │
│  │  └────┬─────┘ └──────────┘ └──────────┘             │    │
│  └───────┼─────────────────────────────────────────────┘    │
│          │                                                   │
│          │ dispatch                                          │
│          ▼                                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  ENGINE                              │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐             │    │
│  │  │simulation│ │  crane   │ │ storage  │             │    │
│  │  │.tick()   │ │  .ts     │ │ .ts      │             │    │
│  │  └──────────┘ └──────────┘ └──────────┘             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    API CLIENT                        │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐             │    │
│  │  │  auth.ts │ │ levels.ts│ │progress.ts             │    │
│  │  └──────────┘ └──────────┘ └──────────┘             │    │
│  └────────────────────┬────────────────────────────────┘    │
│                       │                                      │
└───────────────────────┼──────────────────────────────────────┘
                        │ REST / WebSocket
                        ▼
```

### 3.2 Backend Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                              │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   API LAYER                          │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐             │    │
│  │  │  auth.go │ │ levels.go│ │progress.go             │    │
│  │  │  /auth/* │ │/api/levels│ │/api/progress           │    │
│  │  └──────────┘ └──────────┘ └──────────┘             │    │
│  └────────────────────┬────────────────────────────────┘    │
│                       │                                      │
│  ┌────────────────────▼────────────────────────────────┐    │
│  │                 SERVICE LAYER                        │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐             │    │
│  │  │authsvc   │ │levelsvc  │ │progresssvc             │    │
│  │  └──────────┘ └──────────┘ └──────────┘             │    │
│  └────────────────────┬────────────────────────────────┘    │
│                       │                                      │
│  ┌────────────────────▼────────────────────────────────┐    │
│  │                STORAGE LAYER                         │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐             │    │
│  │  │  user.go │ │ level.go │ │progress.go             │    │
│  │  │ (queries)│ │ (queries)│ │ (queries)              │    │
│  │  └──────────┘ └──────────┘ └──────────┘             │    │
│  └────────────────────┬────────────────────────────────┘    │
│                       │                                      │
│  ┌────────────────────▼────────────────────────────────┐    │
│  │                   MODELS                             │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐             │    │
│  │  │  user.go │ │ level.go │ │progress.go             │    │
│  │  │  (struct)│ │ (struct) │ │ (struct)               │    │
│  │  └──────────┘ └──────────┘ └──────────┘             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Detailed Changes

### 4.1 Frontend Changes

#### Phase A: Store Refactor

**Current:** `gameStore.ts` (661 lines)

**Target:**
```
store/
├── gameStore.ts          # State + actions only (~150 lines)
├── uiStore.ts            # Unchanged
└── progressStore.ts      # Update to sync with backend
```

**Actions to Move to Engine:**
- `tick()` - Move to `engine/simulation.ts`
- `moveCraneTo()` - Move to `engine/crane.ts`
- Store manipulation in `tick()` - Move to pure functions

**State to Keep in Store:**
- `levelId`, `currentLevel`, `shiftDuration`
- `shiftTime`, `realTime`, `isPaused`
- `grid`, `crane`, `orders`, `zones`
- `stats`, `retrievalMode`, `craneMode`

#### Phase B: Engine Restructure

**Current:** `engine/decision.ts` (150 lines)

**Target:**
```
engine/
├── index.ts              # Public API exports
├── simulation.ts         # Main tick() function
├── crane.ts              # Crane movement & actions
├── storage.ts            # Storage decision logic
├── retrieval.ts          # Retrieval decision logic
├── orders.ts             # Order management
└── __tests__/            # Unit tests
    ├── simulation.test.ts
    ├── storage.test.ts
    └── retrieval.test.ts
```

**Key Principles:**
- No React/Zustand imports
- Pure functions where possible
- Accept state, return new state
- Framework-agnostic (could run in Node.js)

#### Phase C: API Client

**New Directory:** `frontend/src/api/`

```
api/
├── client.ts             # Axios/fetch wrapper, base config
├── types.ts              # API-specific types (mirrors Go)
├── auth.ts               # Auth endpoints
├── levels.ts             # Level fetching
└── progress.ts           # Progress sync
```

**Example:**
```typescript
// api/client.ts
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
});

// api/levels.ts
export const fetchLevel = async (id: string): Promise<LevelDefinition> => {
  const response = await apiClient.get(`/levels/${id}`);
  return response.data;
};
```

#### Phase D: Hook Updates

**Current:** `useGameLoop.ts` calls `gameStore.tick()`

**Target:** `useGameLoop.ts` calls `engine.simulation.tick()` then updates store

```typescript
// hooks/useGameLoop.ts
import { tickSimulation } from '../engine/simulation';
import { useGameStore } from '../store/gameStore';

export function useGameLoop() {
  const setState = useGameStore((state) => state.setSimulationState);
  const currentState = useGameStore(/* selector */);
  
  useEffect(() => {
    const animate = (time: number) => {
      const dt = calculateDelta(time);
      const newState = tickSimulation(currentState, dt);
      setState(newState);
      requestRef.current = requestAnimationFrame(animate);
    };
    // ...
  }, []);
}
```

### 4.2 Backend Changes

#### Phase A: Models

**New:** `backend/internal/models/`

```go
// models/user.go
type User struct {
    ID        string    `json:"id" db:"id"`
    Email     string    `json:"email" db:"email"`
    Name      string    `json:"name" db:"name"`
    Provider  string    `json:"provider" db:"provider"`
    CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// models/level.go
type LevelDefinition struct {
    ID               string       `json:"id" db:"id"`
    Name             string       `json:"name" db:"name"`
    Description      string       `json:"description" db:"description"`
    Act              int          `json:"act" db:"act"`
    GridWidth        int          `json:"gridWidth" db:"grid_width"`
    GridHeight       int          `json:"gridHeight" db:"grid_height"`
    IOPortPosition   Position     `json:"ioPortPosition" db:"io_port_position"`
    ItemTypes        []string     `json:"itemTypes" db:"item_types"`
    InitialInventory []InitialItem `json:"initialInventory" db:"initial_inventory"`
    ShiftDuration    int          `json:"shiftDuration" db:"shift_duration"`
    OrderSchedule    []OrderWave  `json:"orderSchedule" db:"order_schedule"`
    StarThresholds   StarThresholds `json:"starThresholds" db:"star_thresholds"`
    UnlocksFeature   string       `json:"unlocksFeature,omitempty" db:"unlocks_feature"`
    RequiresStars    int          `json:"requiresStars" db:"requires_stars"`
}

// models/progress.go
type LevelProgress struct {
    LevelID      string    `json:"levelId" db:"level_id"`
    UserID       string    `json:"userId" db:"user_id"`
    Stars        int       `json:"stars" db:"stars"`
    BestJPH      float64   `json:"bestJph" db:"best_jph"`
    BestCycleTime float64  `json:"bestCycleTime" db:"best_cycle_time"`
    Attempts     int       `json:"attempts" db:"attempts"`
    CompletedAt  *time.Time `json:"completedAt,omitempty" db:"completed_at"`
}
```

#### Phase B: Storage Layer

**New:** `backend/internal/storage/`

```
storage/
├── postgres.go           # DB connection & pool
├── user.go               # User queries
├── level.go              # Level queries
└── progress.go           # Progress queries
```

#### Phase C: Service Layer

**New:** `backend/internal/services/`

```
services/
├── auth.go               # OAuth logic
├── levels.go             # Level business logic
└── progress.go           # Progress validation & storage
```

#### Phase D: API Handlers

**Update:** `backend/internal/api/`

```
api/
├── router.go             # Route definitions
├── middleware.go         # Auth, CORS, logging
├── auth.go               # Auth handlers
├── levels.go             # Level handlers
└── progress.go           # Progress handlers
```

---

## 5. Migration Strategy

### 5.1 Step-by-Step Plan

#### Week 1: Frontend Engine Extraction

1. **Create new engine structure**
   - Create `engine/simulation.ts` with `tickSimulation()` function
   - Create `engine/crane.ts` with crane logic
   - Move storage logic from `decision.ts` to `engine/storage.ts`
   - Move retrieval logic from `decision.ts` to `engine/retrieval.ts`

2. **Refactor gameStore**
   - Remove `tick()` method
   - Keep only state and simple setters
   - Update imports

3. **Update useGameLoop**
   - Call engine instead of store
   - Update state after tick

4. **Testing**
   - Add unit tests for engine functions
   - Verify game still works

#### Week 2: Backend Implementation

1. **Database Setup**
   - Add PostgreSQL to docker-compose
   - Create migration files
   - Set up storage layer

2. **Models & Storage**
   - Implement all models
   - Implement storage methods
   - Add tests

3. **API Implementation**
   - Implement auth endpoints
   - Implement level endpoints
   - Implement progress endpoints

#### Week 3: Frontend API Integration

1. **API Client**
   - Create API client structure
   - Implement auth client
   - Implement levels client
   - Implement progress client

2. **Progress Sync**
   - Update progressStore to sync with backend
   - Add offline support (localStorage fallback)

3. **Level Loading**
   - Load levels from API instead of static imports
   - Add loading states

#### Week 4: Polish & Testing

1. **End-to-End Testing**
   - Test full flow: auth → play → save progress

2. **Error Handling**
   - Add error boundaries
   - Add retry logic for API calls

3. **Documentation Updates**
   - Update AGENTS.md
   - Update plan.md
   - Update CHANGELOG.md

### 5.2 Compatibility Strategy

During migration:

1. **Feature Flags**: Add `USE_BACKEND` env var
2. **Graceful Degradation**: Fall back to localStorage if backend fails
3. **Static Fallback**: Keep static level files as fallback

---

## 6. File Change Summary

### New Files

```
# Frontend (13 files)
frontend/src/
├── api/
│   ├── client.ts
│   ├── types.ts
│   ├── auth.ts
│   ├── levels.ts
│   └── progress.ts
└── engine/
    ├── index.ts
    ├── simulation.ts
    ├── crane.ts
    ├── storage.ts
    ├── retrieval.ts
    ├── orders.ts
    └── __tests__/
        ├── simulation.test.ts
        └── storage.test.ts

# Backend (14 files)
backend/
├── internal/
│   ├── models/
│   │   ├── user.go
│   │   ├── level.go
│   │   └── progress.go
│   ├── storage/
│   │   ├── postgres.go
│   │   ├── user.go
│   │   ├── level.go
│   │   └── progress.go
│   └── services/
│       ├── auth.go
│       ├── levels.go
│       └── progress.go
└── migrations/
    ├── 001_users.sql
    ├── 002_levels.sql
    └── 003_progress.sql
```

### Modified Files

```
# Frontend (4 files)
frontend/src/
├── store/
│   └── gameStore.ts          # Reduce from 661 to ~150 lines
├── hooks/
│   └── useGameLoop.ts        # Call engine instead of store
├── engine/
│   └── decision.ts           # Split into new files
└── data/levels/
    └── index.ts              # Add API fetching

# Backend (4 files)
backend/
├── cmd/server/
│   └── main.go               # Add DB init, routes
└── internal/api/
    ├── router.go             # Define all routes
    ├── auth.go               # Add OAuth handlers
    ├── levels.go             # Add level handlers
    └── progress.go           # Add progress handlers
```

### Deleted Files

```
frontend/src/engine/decision.ts  # Split into separate files
```

---

## 7. Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking game logic during refactor | Medium | High | Comprehensive unit tests before refactor |
| TypeScript/Go type drift | Medium | Medium | Automated type checking, shared schema |
| Backend complexity increases | Low | Medium | Start with simple REST, add features incrementally |
| Performance regression | Low | Medium | Benchmark before/after, profile if needed |
| Auth complexity | Medium | Medium | Use established OAuth libraries (goth) |

---

## 8. Success Criteria

1. **Frontend:**
   - [ ] `gameStore.ts` under 200 lines
   - [ ] `/engine` has no React imports
   - [ ] All engine functions have unit tests
   - [ ] API client abstraction exists

2. **Backend:**
   - [ ] All models implemented
   - [ ] All storage methods tested
   - [ ] All API endpoints implemented per plan.md
   - [ ] Auth flow working

3. **Integration:**
   - [ ] Frontend loads levels from API
   - [ ] Progress syncs to backend
   - [ ] Auth persists across sessions
   - [ ] Full e2e flow working

---

## 9. Next Steps

1. **Review this plan** - Discuss and approve
2. **Create feature branch** - `refactor/architecture`
3. **Start Week 1 tasks** - Engine extraction
4. **Update CHANGELOG.md** - After each phase

---

**Questions to resolve:**

1. Should we use a schema validation tool (zod) for API types?
2. Should we implement WebSocket support now or later?
3. What's the priority order if we need to cut scope?
