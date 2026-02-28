import { create } from 'zustand';

export type Screen = 
  | 'main_menu' 
  | 'pre_shift' 
  | 'game' 
  | 'upgrade_pick' 
  | 'victory' 
  | 'run_over' 
  | 'unlock_shop';

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
}

const initialState: UiState = {
  currentScreen: 'main_menu',
  previousScreen: null,
  hpFlash: null,
  screenTransition: false,
  isPaused: false,
  showHelp: false,
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
}));
