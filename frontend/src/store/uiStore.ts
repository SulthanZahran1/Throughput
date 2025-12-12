import { create } from 'zustand';

type Screen = 'main_menu' | 'level_select' | 'game' | 'shift_summary' | 'settings' | 'sandbox';
type EditorMode = 'none' | 'zone_painting' | 'rules';

interface UIStore {
    // Navigation
    currentScreen: Screen;
    setScreen: (screen: Screen) => void;

    // Editor
    editorMode: EditorMode;
    selectedZoneId: string | null;
    setEditorMode: (mode: EditorMode) => void;
    setSelectedZone: (zoneId: string | null) => void;

    // Modals
    isSettingsOpen: boolean;
    setSettingsOpen: (open: boolean) => void;

    // Game speed (for sandbox)
    gameSpeed: number;
    setGameSpeed: (speed: number) => void;
}

export const useUIStore = create<UIStore>((set) => ({
    // Navigation
    currentScreen: 'main_menu',
    setScreen: (screen) => set({ currentScreen: screen }),

    // Editor
    editorMode: 'none',
    selectedZoneId: null,
    setEditorMode: (mode) => set({ editorMode: mode }),
    setSelectedZone: (zoneId) => set({ selectedZoneId: zoneId }),

    // Modals
    isSettingsOpen: false,
    setSettingsOpen: (open) => set({ isSettingsOpen: open }),

    // Game speed
    gameSpeed: 1,
    setGameSpeed: (speed) => set({ gameSpeed: speed }),
}));
