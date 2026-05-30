import { create } from 'zustand';

export type Screen = 
  | 'main_menu' 
  | 'pre_shift' 
  | 'game' 
  | 'upgrade_pick' 
  | 'victory' 
  | 'run_over' 
  | 'unlock_shop';

export type AbilityId = 'priority_override' | 'turbo' | 'freeze' | 'reject' | 'core_surge';

export type ConfirmActionType = 'reject' | 'core_surge';

export interface UiState {
  // Current screen
  currentScreen: Screen;
  previousScreen: Screen | null;
  
  // Animation flags
  hpFlash: 'damage' | 'heal' | null;
  screenTransition: boolean;
  
  // Modal states
  isPaused: boolean;
  showHelp: boolean;

  // Phase 3: Mobile-first UI state
  selectedAbility: AbilityId | null;
  showPolicyPicker: boolean;
  showConfirmSheet: boolean;
  confirmAction: ConfirmActionType | null;
  confirmTargetOrderId: string | null;
  isOrderStripExpanded: boolean;
}

export interface UiActions {
  navigateTo: (screen: Screen) => void;
  goBack: () => void;
  setHpFlash: (flash: 'damage' | 'heal' | null) => void;
  setScreenTransition: (transition: boolean) => void;
  setPaused: (paused: boolean) => void;
  togglePaused: () => void;
  setShowHelp: (show: boolean) => void;
  reset: () => void;

  // Phase 3: Mobile-first UI actions
  selectAbility: (ability: AbilityId | null) => void;
  clearAbility: () => void;
  openPolicyPicker: () => void;
  closePolicyPicker: () => void;
  openConfirmSheet: (action: ConfirmActionType, orderId?: string) => void;
  closeConfirmSheet: () => void;
  toggleOrderStrip: () => void;
  collapseOrderStrip: () => void;
}

const initialState: UiState = {
  currentScreen: 'main_menu',
  previousScreen: null,
  hpFlash: null,
  screenTransition: false,
  isPaused: false,
  showHelp: false,
  selectedAbility: null,
  showPolicyPicker: false,
  showConfirmSheet: false,
  confirmAction: null,
  confirmTargetOrderId: null,
  isOrderStripExpanded: false,
};

export const useUiStore = create<UiState & UiActions>((set, get) => ({
  ...initialState,

  navigateTo: (screen) => set({
    previousScreen: get().currentScreen,
    currentScreen: screen,
  }),

  goBack: () => {
    const { previousScreen } = get();
    if (previousScreen) {
      set({
        currentScreen: previousScreen,
        previousScreen: null,
      });
    }
  },

  setHpFlash: (flash) => set({ hpFlash: flash }),

  setScreenTransition: (transition) => set({ screenTransition: transition }),

  setPaused: (paused) => set({ isPaused: paused }),

  togglePaused: () => set({ isPaused: !get().isPaused }),

  setShowHelp: (show) => set({ showHelp: show }),

  reset: () => set(initialState),

  // Phase 3: Mobile-first UI actions
  selectAbility: (ability) => set({
    selectedAbility: ability,
    // Collapse order strip when selecting an ability to show action bar clearly
    isOrderStripExpanded: false,
  }),

  clearAbility: () => set({
    selectedAbility: null,
  }),

  openPolicyPicker: () => set({ showPolicyPicker: true }),
  closePolicyPicker: () => set({ showPolicyPicker: false }),

  openConfirmSheet: (action, orderId) => set({
    showConfirmSheet: true,
    confirmAction: action,
    confirmTargetOrderId: orderId ?? null,
  }),

  closeConfirmSheet: () => set({
    showConfirmSheet: false,
    confirmAction: null,
    confirmTargetOrderId: null,
  }),

  toggleOrderStrip: () => set((state) => ({
    isOrderStripExpanded: !state.isOrderStripExpanded,
  })),

  collapseOrderStrip: () => set({ isOrderStripExpanded: false }),
}));
