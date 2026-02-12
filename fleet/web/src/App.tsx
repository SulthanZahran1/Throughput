import { useState } from 'react'
import PlantView from './components/PlantView'
import ControlPanel from './components/ControlPanel'
import FSMInspector from './components/FSMInspector'
import { useSimulation } from './hooks/useSimulation'
import { logger } from './utils/logger'

function App() {
    const { isLoading, error, reinit } = useSimulation()
    const [showDebug] = useState(true)

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
                <div className="text-xl">Loading WASM module...</div>
            </div>
        )
    }

    if (error) {
        logger.error('system', `App error: ${error}`)
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
                <div className="text-xl text-red-500">Error: {error}</div>
            </div>
        )
    }

    return (
        <div className="h-screen flex flex-col bg-gray-900">
            <header className="bg-gray-800 text-white p-4 shadow-lg">
                <h1 className="text-2xl font-bold">AGV Fleet Simulator</h1>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 flex flex-col">
                    <PlantView />
                </div>

                <div className="w-96 flex flex-col bg-gray-800 border-l border-gray-700">
                    <ControlPanel onLoadPlant={reinit} />
                    {showDebug && <FSMInspector />}
                </div>
            </div>
        </div>
    )
}

export default App
