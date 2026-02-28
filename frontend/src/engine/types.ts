import type { RNG } from './rng';

// ============================================================================
// Core Geometry Types
// ============================================================================

export interface Vec2 {
  x: number;
  y: number;
}

export type CellKey = string;  // "x,y" format

export function toKey(x: number, y: number): CellKey {
  return `${x},${y}`;
}

export function fromKey(key: CellKey): Vec2 {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
}

export function manhattanDistance(a: Vec2, b: Vec2): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// ============================================================================
// Item Types
// ============================================================================

export type ItemType = 
  | 'red' | 'blue' | 'green' | 'yellow' 
  | 'purple' | 'orange' | 'cyan' | 'magenta';

export const ITEM_TYPES: ItemType[] = [
  'red', 'blue', 'green', 'yellow', 
  'purple', 'orange', 'cyan', 'magenta'
];

export interface Item {
  id: string;
  type: ItemType;
  storedAt: number;  // Timestamp when stored (for FIFO)
}

// ============================================================================
// Grid & Storage
// ============================================================================

export type SlotType = 'empty' | 'blocked' | 'storage' | 'output' | 'input';

export interface Slot {
  key: CellKey;
  x: number;
  y: number;
  type: SlotType;
  item: Item | null;
  zone: string | null;  // Zone identifier for zone-priority storage
}

export interface Grid {
  width: number;
  height: number;
  slots: Map<CellKey, Slot>;
  inputSlots: CellKey[];
  outputSlots: CellKey[];
  storageSlots: CellKey[];
}

export interface Zone {
  id: string;
  name: string;
  cells: CellKey[];
  priority: number;  // Lower = higher priority for storage
}

// ============================================================================
// Transfer Job - A complete unit of work for a crane
// ============================================================================

export type JobPhase = 
  | 'MOVING_TO_SOURCE'   // Going to pick up location
  | 'ACQUIRING'          // Picking up item (transfer animation)
  | 'MOVING_TO_DEST'     // Going to drop off location  
  | 'DEPOSITING';        // Dropping off item (transfer animation)

export interface TransferJob {
  id: string;                    // Unique job ID
  orderId: string;               // Associated order ID
  jobType: 'store' | 'retrieve'; // Type of job
  
  // Locations
  sourceKey: CellKey;            // Where to pick up from
  destKey: CellKey;              // Where to drop off to
  
  // Progress
  phase: JobPhase;               // Current phase of the job
  
  // Item info (for validation)
  expectedItemType: string;      // What item type we expect to find
}

// ============================================================================
// Crane FSM
// ============================================================================

export type CraneState = 
  | 'IDLE'              // No job, waiting for assignment
  | 'MOVING_TO_SOURCE'  // Moving to pick up location
  | 'ACQUIRING'         // Transferring (picking up)
  | 'MOVING_TO_DEST'    // Moving to drop off location
  | 'DEPOSITING';       // Transferring (dropping off)

export interface Crane {
  id: string;
  // Position
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  
  // FSM
  state: CraneState;
  
  // Movement - axis-locked movement (no diagonals)
  movingAxis: 'x' | 'y' | null;  // Current axis being moved on
  
  // Cargo
  heldItem: Item | null;
  
  // Timing
  transferProgress: number;  // 0-1 for ACQUIRING/DEPOSITING states
  transferTime: number;      // Seconds to complete transfer
  
  // Current job (null when IDLE)
  currentJob: TransferJob | null;
  
  // Legacy fields (for backward compatibility during transition)
  // TODO: Remove these after full migration
  reservedKey?: CellKey | null;
  currentOrderId?: string | null;
  taskType?: 'store' | 'retrieve' | null;
}

// ============================================================================
// Orders
// ============================================================================

export type OrderType = 'store' | 'retrieve';
export type OrderPriority = 'normal' | 'vip' | 'urgent';

export interface Order {
  id: string;
  type: OrderType;
  priority: OrderPriority;
  itemType: ItemType;
  deadline: number;       // Seconds remaining
  maxDeadline: number;    // Original deadline for progress calc
  createdAt: number;      // Timestamp
  
  // VIP properties
  vipMultiplier: number;  // Score multiplier for VIP orders
  
  // For retrieve orders
  sourceSlotKey: CellKey | null;  // Pre-resolved slot (affected by retrieval mode)
}

// ============================================================================
// Simulation Flags (from upgrades/modifiers)
// ============================================================================

export interface SimulationFlags {
  // Crane upgrades
  dualCommand: boolean;        // Can store+retrieve in one trip
  afterburners: boolean;       // +30% crane speed
  overclocked: boolean;        // Faster transfer but random failures
  conveyorBelt: boolean;       // Auto-input from trucks
  
  // Storage upgrades
  smartSorting: boolean;       // Zone-aware storage
  zoneMastery: boolean;        // Zone-specific item placement
  
  // Order upgrades
  vipClients: boolean;         // VIP orders spawn
  timeWarp: boolean;           // Slower deadline drain
  emergencyBrake: boolean;     // One-time HP save
  predictivePathing: boolean;  // Pre-reserve retrieval paths
  
  // Grid modifiers
  blockedCells: number;        // Number of blocked cells to generate
  multiCrane: number;          // Number of cranes (1-3)
}

// ============================================================================
// Simulation Context & Results
// ============================================================================

export interface SimulationContext {
  // Identity
  seed: number;
  shiftNumber: number;
  difficulty: 'normal' | 'hard' | 'brutal';
  
  // Time
  shiftTimeRemaining: number;  // Seconds
  totalShiftTime: number;
  realTime: number;            // Accumulated real time
  
  // State
  grid: Grid;
  cranes: Crane[];
  orders: Order[];
  zones: Zone[];
  inventory: Map<ItemType, number>;  // Count per item type in storage
  
  // Configuration
  flags: SimulationFlags;
  retrievalMode: 'fifo' | 'deadline' | 'nearest';
  
  // Order generation
  orderSpawnRate: number;      // Seconds between orders
  orderDeadlineBase: number;   // Base seconds for order deadlines
  lastOrderTime: number;       // Time of last order spawn
  rng: RNG;
  
  // Stats
  stats: {
    ordersCompleted: number;
    ordersFailed: number;
    itemsStored: number;
    itemsRetrieved: number;
    vipOrdersCompleted: number;
  };
}

export type SimulationEventType = 
  | 'ORDER_CREATED'
  | 'ORDER_COMPLETED'
  | 'ORDER_FAILED'
  | 'ITEM_STORED'
  | 'ITEM_RETRIEVED'
  | 'CRANE_PICKUP'
  | 'CRANE_DROPOFF'
  | 'HP_LOST'
  | 'SHIFT_END';

export interface SimulationEvent {
  type: SimulationEventType;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface TickResult {
  context: SimulationContext;
  events: SimulationEvent[];
  deltaTime: number;
}

// ============================================================================
// Shift Parameters & Results
// ============================================================================

export interface ShiftParameters {
  shiftNumber: number;
  seed: number;
  difficulty: 'normal' | 'hard' | 'brutal';
  
  // Grid
  gridWidth: number;
  gridHeight: number;
  blockedCells: number;
  initialInventory: number;
  
  // Cranes
  craneCount: number;
  craneSpeed: number;
  transferTime: number;
  
  // Orders
  orderSpawnRate: number;
  orderDeadlineBase: number;
  vipOrderChance: number;
  
  // Time
  totalShiftTime: number;
  
  // Modifiers
  modifierId: string | null;
  
  // Upgrades applied
  flags: SimulationFlags;
  retrievalMode: 'fifo' | 'deadline' | 'nearest';
}

export interface ShiftResult {
  shiftNumber: number;
  completed: boolean;  // true = time ran out, false = HP hit 0
  ordersCompleted: number;
  ordersFailed: number;
  vipOrdersCompleted: number;
  hpLost: number;
  hpRecovered: number;
  score: number;
  events: SimulationEvent[];
}

// ============================================================================
// Run State
// ============================================================================

export interface HeldUpgrade {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic';
}

export interface RunState {
  isActive: boolean;
  seed: number;
  difficulty: 'normal' | 'hard' | 'brutal';
  rng: RNG;
  
  // Progress
  currentShift: number;  // 1-8
  
  // HP
  hp: number;
  maxHp: number;
  
  // Upgrades
  heldUpgrades: HeldUpgrade[];
  
  // Modifiers
  currentModifier: string | null;
  nextModifier: string | null;
  usedModifiers: string[];
  
  // Card offering
  offeredCards: string[];
  rerollsRemaining: number;
  
  // Results
  shiftResults: ShiftResult[];
  totalOrdersCompleted: number;
  totalOrdersFailed: number;
}

export interface RunResult {
  seed: number;
  difficulty: 'normal' | 'hard' | 'brutal';
  won: boolean;
  shiftsSurvived: number;
  totalOrdersCompleted: number;
  totalOrdersFailed: number;
  finalHp: number;
  maxHp: number;
  score: number;
  upgradesHeld: string[];
}

// ============================================================================
// Meta Progression
// ============================================================================

export interface MetaState {
  deviceId: string;
  crates: number;
  unlockedCards: string[];
  milestones: string[];
  bestScores: {
    normal: number;
    hard: number;
    brutal: number;
  };
  bestShift: number;
  totalRuns: number;
  totalWins: number;
}

// ============================================================================
// Upgrade & Modifier Definitions
// ============================================================================

export type UpgradeRarity = 'common' | 'rare' | 'epic';
export type UpgradeCategory = 'crane' | 'storage' | 'orders' | 'special';

export interface UpgradeDefinition {
  id: string;
  name: string;
  description: string;
  rarity: UpgradeRarity;
  category: UpgradeCategory;
  maxCount: number;
  unlockCost: number;  // Crates to unlock
  prerequisites: string[];  // Required upgrade IDs
  appliesFlags: Partial<SimulationFlags>;
  modifiesRetrievalMode?: 'fifo' | 'deadline' | 'nearest';
}

export interface ModifierDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  apply: (params: ShiftParameters) => ShiftParameters;
}

export interface MilestoneDefinition {
  id: string;
  name: string;
  description: string;
  check: (meta: MetaState, run?: RunResult) => boolean;
}
