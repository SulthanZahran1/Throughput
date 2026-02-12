import { create } from 'zustand'

interface SimulationState {
    simulation: any | null
    state: any | null
    selectedVehicleId: string | null
    isRunning: boolean
    isPaused: boolean
    speed: number
    setSimulation: (sim: any) => void
    setState: (state: any) => void
    setSelectedVehicleId: (id: string | null) => void
    setPaused: (paused: boolean) => void
    setSpeed: (speed: number) => void
    addVehicle: (id: string, x: number, y: number) => void
    teleportVehicle: (vehicleId: string, x: number, y: number) => void
    addOrder: (id: string, pickup: string, delivery: string) => void
    start: () => void
    stop: () => void
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
    simulation: null,
    state: null,
    selectedVehicleId: null,
    isRunning: false,
    isPaused: false,
    speed: 1,

    setSimulation: (sim) => {
        console.log('Store: setSimulation called')
        set({ simulation: sim })
            // Expose to window for console debugging
            ; (window as any).sim = sim
    },

    setState: (state) => {
        // console.log('Store: setState called')
        set({ state })
    },

    setSelectedVehicleId: (id) => set({ selectedVehicleId: id }),
    setPaused: (isPaused) => set({ isPaused }),
    setSpeed: (speed) => set({ speed }),

    addVehicle: (id, x, y) => {
        const { simulation } = get()
        if (simulation) {
            simulation.addVehicle(id, x, y)
            set({ state: simulation.getState() })
        }
    },

    teleportVehicle: (vehicleId, x, y) => {
        const { simulation } = get()
        if (simulation) {
            simulation.teleportVehicle(vehicleId, x, y)
            set({ state: simulation.getState() })
        }
    },

    addOrder: (id, pickup, delivery) => {
        const { simulation } = get()
        if (simulation) {
            simulation.addOrder(id, pickup, delivery)
            set({ state: simulation.getState() })
        }
    },

    start: () => set({ isRunning: true }),
    stop: () => set({ isRunning: false }),
}))
