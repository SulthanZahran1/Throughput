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
  reservedKey?: CellKey | null;
  currentOrderId?: string | null;
  taskType?: 'store' | 'retrieve' | null;
}

// ============================================================================
// AUTOMATION POLICY
// ============================================================================

export type AutomationPolicy =
  | 'balanced'        // Default FIFO, fair baseline
  | 'deadline_first'  // Prioritize shortest remaining deadline
  | 'nearest_first'   // Minimize crane travel distance
  | 'storage_first'   // Favor store orders to prevent input buildup
  | 'retrieval_first' // Favor retrieve orders to clear storage/output
  | 'vip_first';      // Favor high-value VIP orders

export const ALL_POLICIES: AutomationPolicy[] = [
  'balanced',
  'deadline_first',
  'nearest_first',
  'storage_first',
  'retrieval_first',
  'vip_first',
];

export const POLICY_NAMES: Record<AutomationPolicy, string> = {
  balanced: 'Balanced',
  deadline_first: 'Deadline First',
  nearest_first: 'Nearest First',
  storage_first: 'Storage First',
  retrieval_first: 'Retrieval First',
  vip_first: 'VIP First',
};

export const POLICY_COOLDOWN_MIN = 6;  // seconds
export const POLICY_COOLDOWN_MAX = 8;  // seconds

// ============================================================================
// FULL ORDER TAXONOMY
// ============================================================================

export type OrderType = 'store' | 'retrieve';
export type OrderPriority = 'normal' | 'vip';
export type OrderClass = 'normal' | 'vip' | 'batch' | 'contract';

export interface BatchInfo {
  batchId: string;          // Shared batch ID across parent+children
  parentOrderId: string;    // The parent batch order ID
  childIndex: number;       // Index within batch (0-based)
  totalChildren: number;    // Total child jobs in batch
}

export interface ContractInfo {
  contractId: string;       // Contract upgrade ID that spawned this
  breachDamage: number;     // Variable breach damage shown on card
  reward: string;           // Completion reward description
  condition: string;        // Special condition text
}

export interface Order {
  id: string;
  type: OrderType;
  priority: OrderPriority;
  orderClass: OrderClass;     // normal | vip | batch | contract
  itemType: ItemType;
  deadline: number;           // Seconds remaining
  maxDeadline: number;        // Original deadline for progress calc
  createdAt: number;          // Timestamp
  
  // VIP properties
  vipMultiplier: number;      // Score multiplier for VIP orders
  
  // Batch properties
  batchInfo: BatchInfo | null;
  
  // Contract properties
  contractInfo: ContractInfo | null;
  
  // For retrieve orders
  sourceSlotKey: CellKey | null;  // Pre-resolved slot (affected by retrieval mode)
}

/** A batch parent order that spawns child store/retrieve jobs */
export interface BatchOrderParent {
  id: string;
  batchId: string;
  createdAt: number;
  deadline: number;
  maxDeadline: number;
  children: Order[];              // The child orders
  childrenCompleted: number;      // How many children done
  childrenTotal: number;
  itemTypes: ItemType[];          // Items needed (same-type or mixed)
  targetType: 'store' | 'retrieve';
  breachDamage: number;           // -2 for batch in MVP
  vipMultiplier: number;
}

// ============================================================================
// BREACH DAMAGE
// ============================================================================

export function getBreachDamage(order: Order): number {
  if (order.contractInfo) {
    return order.contractInfo.breachDamage;
  }
  if (order.orderClass === 'vip' || order.orderClass === 'batch') {
    return 2;
  }
  return 1; // Normal store/retrieve
}

export function getBreachDamageLabel(order: Order): string {
  const dmg = getBreachDamage(order);
  return dmg === 1 ? '-1 INT' : `-${dmg} INT`;
}

// ============================================================================
// EMERGENCY POWER (EP)
// ============================================================================

export const EP_MAX = 100;
export const EP_START_PER_SHIFT = 100;
export const EP_NO_PASSIVE_REGEN = true;

export const EP_RECOVERY_4_ORDERS = 10;      // 4 orders without breach
export const EP_RECOVERY_VIP = 5;             // VIP order completed
export const EP_RECOVERY_QUEUE_CLEAR = 10;    // Queue cleared from 5+

export interface EpState {
  current: number;
  max: number;
  consecutiveOrdersWithoutBreach: number;  // Track for 4-order recovery
  lastClearQueueCount: number;             // Track for queue-clear recovery
}

export function createEpState(): EpState {
  return {
    current: EP_START_PER_SHIFT,
    max: EP_MAX,
    consecutiveOrdersWithoutBreach: 0,
    lastClearQueueCount: 0,
  };
}

// ============================================================================
// ORDER DIAGNOSTICS (Bottleneck Labels)
// ============================================================================

export type BottleneckLabel =
  | 'ALL CRANES BUSY'       // All cranes occupied
  | 'NO MATCHING ITEM'      // Cannot find item for retrieve
  | 'NO STORAGE SPACE'      // Cannot find slot for store
  | 'INPUT BLOCKED'         // No empty input slots
  | 'OUTPUT CONGESTED'      // Output slots full
  | 'LOW DEADLINE'          // Deadline is critically low
  | 'VIP RISK'              // VIP order at risk
  | null;                   // No bottleneck

export interface OrderDiagnostics {
  orderId: string;
  bottleneck: BottleneckLabel;
  canBeFulfilled: boolean;
  eta: number | null;          // ETA in seconds (null if blocked)
  deadline: number;
  breachRisk: EtaDesignation;
}

// ============================================================================
// EXACT ETA
// ============================================================================

export type EtaDesignation = 'ON TRACK' | 'LIKELY BREACH' | 'BLOCKED';

export interface EtaResult {
  eta: number;                // ETA in seconds (Infinity if blocked)
  designation: EtaDesignation;
  breakdown: {
    travelTime: number;       // Movement time
    transferTime: number;     // Pickup + dropoff time
    queueTime: number;        // Time waiting for crane to become available
  };
}

// ============================================================================
// ABILITY PREVIEW
// ============================================================================

export type PreviewOutcome = 'SAVES' | 'RISK' | 'NO EFFECT' | 'NET +1 HP';

export interface AbilityPreview {
  abilityId: string;
  abilityName: string;
  targetOrderId: string | null;
  currentEta: number;
  projectedEta: number;
  outcome: PreviewOutcome;
  cost: number;               // EP or Integrity cost
  costType: 'ep' | 'integrity';
  reason: string;             // Human-readable reason
}

export interface PriorityOverridePreview {
  orderId: string;
  currentEta: number;
  projectedEta: number;
  outcome: PreviewOutcome;
  cranesInterrupted: number;  // How many cranes would be interrupted
  reason: string;
}

export interface TurboPreview {
  duration: number;           // seconds
  speedMultiplier: number;
  affectedOrders: Array<{
    orderId: string;
    currentEta: number;
    projectedEta: number;
    outcome: PreviewOutcome;
  }>;
}

export interface FreezePreview {
  duration: number;           // seconds
  deadlineExtension: number;  // Effective extension for each order
}

export interface RejectPreview {
  orderId: string;
  breachDamage: number;       // Damage avoided
  cost: number;               // Integrity cost = 1
  netHpGain: number;          // Net integrity change
}

export interface CoreSurgePreview {
  duration: number;
  speedMultiplier: number;
  cost: number;               // Integrity cost
}

// ============================================================================
// SAFE INTERRUPTION MODEL
// ============================================================================

export type Interruptibility = 'safe' | 'unsafe';

/**
 * Determines if a crane can be safely interrupted.
 * Safe: not holding an item and not in DEPOSITING phase.
 * Unsafe: carrying an item or actively depositing.
 */
export function getCraneInterruptibility(crane: Crane): Interruptibility {
  if (crane.heldItem !== null) return 'unsafe';
  if (crane.state === 'DEPOSITING') return 'unsafe';
  return 'safe';
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
  
  // --- NEW: Automation Policy ---
  currentPolicy: AutomationPolicy;
  policyCooldownRemaining: number;   // Seconds of cooldown left (0 = ready)
  lastPolicySwitchTime: number;      // realTime when policy was last switched
  
  // --- NEW: Emergency Power ---
  ep: EpState;
  
  // --- NEW: Breach tracking ---
  integrity: number;                 // Current system integrity (HP)
  maxIntegrity: number;              // Max system integrity
  
  // --- NEW: Active abilities ---
  activeAbilities: {
    turbo: boolean;
    turboRemaining: number;          // Seconds remaining
    turboSpeedMultiplier: number;
    freeze: boolean;
    freezeRemaining: number;         // Seconds remaining
    coreSurge: boolean;
    coreSurgeRemaining: number;
    coreSurgeSpeedMultiplier: number;
  };
  
  // Order generation
  orderSpawnRate: number;           // Seconds between orders
  orderDeadlineBase: number;        // Base seconds for order deadlines
  lastOrderTime: number;            // Time of last order spawn
  rng: RNG;
  
  // Stats
  stats: {
    ordersCompleted: number;
    ordersFailed: number;
    itemsStored: number;
    itemsRetrieved: number;
    vipOrdersCompleted: number;
    // New
    batchOrdersCompleted: number;
    contractOrdersCompleted: number;
    integrityLost: number;
    epSpent: number;
    epRecovered: number;
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
  | 'SHIFT_END'
  // New events
  | 'INTEGRITY_LOST'
  | 'EP_CHANGED'
  | 'POLICY_SWITCHED'
  | 'ABILITY_USED'
  | 'BATCH_CHILD_COMPLETED'
  | 'BATCH_PARENT_COMPLETED'
  | 'BATCH_PARENT_FAILED'
  | 'DIAGNOSTIC_UPDATED';

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
  batchOrdersCompleted: number;
  contractOrdersCompleted: number;
  hpLost: number;
  hpRecovered: number;
  epSpent: number;
  epRecovered: number;
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
