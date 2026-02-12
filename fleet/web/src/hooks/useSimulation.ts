import { useState, useEffect } from 'react'
import { useSimulationStore } from '../stores/simulationStore'
import initWasm from '../wasm'
import { logger } from '../utils/logger'

export function useSimulation() {
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { setSimulation, setState, simulation } = useSimulationStore()

    useEffect(() => {
        async function init() {
            try {
                const response = await fetch('/plants/demo-warehouse.json')
                const plantJson = await response.text()

                const sim = await initWasm(plantJson)

                // Add default test vehicles
                sim.addVehicle('AGV-001', 100, 100) // At START node
                sim.addVehicle('AGV-002', 500, 100) // At A2 node

                const initialState = sim.getState()
                const nodes = initialState.plant.nodes
                const nodeCount = nodes instanceof Map ? nodes.size : Object.keys(nodes).length
                const isMap = nodes instanceof Map
                logger.info('system', `WASM initialized. Nodes: ${nodeCount} (isMap: ${isMap}), Edges: ${initialState.plant.edges.length}`)
                setSimulation(sim)
                setState(initialState)
                setIsLoading(false)
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Failed to load WASM'
                logger.error('system', `Init error: ${msg}`)
                setError(msg)
                setIsLoading(false)
            }
        }

        init()
    }, [])

    useEffect(() => {
        if (!simulation) return

        // Remove unused destructuring to satisfy TSC
        // const { isPaused, speed } = useSimulationStore.getState()

        const interval = setInterval(() => {
            const { isPaused: currentPaused, speed: currentSpeed } = useSimulationStore.getState()

            if (currentPaused) return

            // For speeds > 1, call tick multiple times per frame
            // For speeds < 1, we still tick once but could skip frames (simpler approach: just tick once)
            const ticksPerFrame = Math.max(1, Math.floor(currentSpeed))
            const dtMultiplier = currentSpeed < 1 ? currentSpeed : 1

            for (let i = 0; i < ticksPerFrame; i++) {
                simulation.tick((1 / 60) * dtMultiplier)
            }
            setState(simulation.getState())
        }, 1000 / 60)

        return () => clearInterval(interval)
    }, [simulation, setState])

    const reinit = async (json: string) => {
        logger.info('system', `reinit called with JSON length: ${json.length}`)
        try {
            logger.info('system', `Calling initWasm...`)
            const sim = await initWasm(json)
            logger.info('system', `initWasm returned, getting state...`)
            const newState = sim.getState()
            const nodes = newState.plant.nodes
            const nodeCount = nodes instanceof Map ? nodes.size : Object.keys(nodes).length
            const isMap = nodes instanceof Map
            logger.info('system', `WASM re-initialized. Nodes: ${nodeCount} (isMap: ${isMap}), Edges: ${newState.plant.edges.length}`)
            setSimulation(sim)
            setState(newState)
            logger.info('system', `Store updated with new simulation and state`)
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to re-initialize WASM'
            logger.error('system', `Reinit error: ${msg}`)
            setError(msg)
            setIsLoading(false)
        }
    }

    return { simulation, isLoading, error, reinit }
}
