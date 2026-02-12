import { useState } from 'react'
import { useSimulationStore } from '../stores/simulationStore'
import { logger } from '../utils/logger'

interface ControlPanelProps {
    onLoadPlant: (json: string) => Promise<void>
}

const SPEED_OPTIONS = [0.5, 1, 2, 5, 10]

export default function ControlPanel({ onLoadPlant }: ControlPanelProps) {
    const [vehicleId, setVehicleId] = useState('')
    const [orderId, setOrderId] = useState('')
    const [isUploading, setIsUploading] = useState(false)
    const addVehicle = useSimulationStore((s) => s.addVehicle)
    const addOrder = useSimulationStore((s) => s.addOrder)
    const isPaused = useSimulationStore((s) => s.isPaused)
    const speed = useSimulationStore((s) => s.speed)
    const state = useSimulationStore((s) => s.state)
    const setPaused = useSimulationStore((s) => s.setPaused)
    const setSpeed = useSimulationStore((s) => s.setSpeed)

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            logger.info('system', `File selected: ${file.name} (${file.size} bytes)`)
            setIsUploading(true)
            const reader = new FileReader()
            reader.onload = async (event) => {
                const content = event.target?.result as string
                logger.info('system', `File read successfully, starting reinit...`)
                try {
                    await onLoadPlant(content)
                    logger.info('system', `Plant loaded successfully from ${file.name}`)
                } catch (err) {
                    logger.error('system', `Failed to load plant from ${file.name}: ${err}`)
                } finally {
                    setIsUploading(false)
                }
            }
            reader.onerror = (err) => {
                logger.error('system', `FileReader error: ${err}`)
                setIsUploading(false)
            }
            reader.readAsText(file)
            e.target.value = ''
        }
    }

    const handleAddVehicle = () => {
        if (vehicleId) {
            const x = Math.random() * 700 + 50
            const y = Math.random() * 500 + 50
            addVehicle(vehicleId, x, y)
            setVehicleId('')
        }
    }

    const handleAddOrder = () => {
        if (orderId) {
            addOrder(orderId, 'A1', 'B2')
            setOrderId('')
        }
    }

    return (
        <div className="p-4 border-b border-gray-700">
            <h2 className="text-white text-lg font-semibold mb-4">Control Panel</h2>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm text-gray-300 mb-2">Load Plant (JSON)</label>
                    <div className="flex gap-2">
                        <input
                            type="file"
                            accept=".json"
                            onChange={handleFileUpload}
                            disabled={isUploading}
                            className="hidden"
                            id="plant-upload"
                        />
                        <label
                            htmlFor="plant-upload"
                            className={`flex-1 px-4 py-2 text-center rounded cursor-pointer border border-dashed transition-colors ${isUploading
                                ? 'bg-gray-800 border-gray-600 text-gray-500 cursor-not-allowed'
                                : 'bg-gray-700 border-gray-500 text-white hover:bg-gray-600 hover:border-blue-500'
                                }`}
                        >
                            {isUploading ? 'Loading...' : 'Select JSON File'}
                        </label>
                    </div>
                </div>

                <div>
                    <label className="block text-sm text-gray-300 mb-2">Add Vehicle</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={vehicleId}
                            onChange={(e) => setVehicleId(e.target.value)}
                            placeholder="Vehicle ID"
                            className="flex-1 px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                        />
                        <button
                            onClick={handleAddVehicle}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Add
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm text-gray-300 mb-2">Add Order</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={orderId}
                            onChange={(e) => setOrderId(e.target.value)}
                            placeholder="Order ID"
                            className="flex-1 px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                        />
                        <button
                            onClick={handleAddOrder}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                            Add
                        </button>
                    </div>
                </div>

                {/* Simulation Controls */}
                <div className="border-t border-gray-600 pt-4">
                    <label className="block text-sm text-gray-300 mb-2">Simulation Controls</label>

                    {/* Pause/Resume + Tick Counter */}
                    <div className="flex items-center gap-3 mb-3">
                        <button
                            onClick={() => setPaused(!isPaused)}
                            className={`px-4 py-2 rounded font-medium transition-colors ${isPaused
                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                    : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                }`}
                        >
                            {isPaused ? '▶ Resume' : '⏸ Pause'}
                        </button>
                        <div className="text-gray-400 text-sm font-mono">
                            Tick: <span className="text-white">{state?.tick_count ?? 0}</span>
                        </div>
                    </div>

                    {/* Speed Selector */}
                    <div className="flex gap-1">
                        {SPEED_OPTIONS.map((s) => (
                            <button
                                key={s}
                                onClick={() => setSpeed(s)}
                                className={`flex-1 px-2 py-1 rounded text-sm font-medium transition-colors ${speed === s
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                            >
                                {s}x
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
