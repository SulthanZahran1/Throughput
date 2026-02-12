import { useState } from 'react'
import { useSimulationStore } from '../stores/simulationStore'

type SectionType = 'vehicles' | 'orders' | 'zones'

export default function FSMInspector() {
    const state = useSimulationStore((s) => s.state)
    const selectedVehicleId = useSimulationStore((s) => s.selectedVehicleId)
    const setSelectedVehicleId = useSimulationStore((s) => s.setSelectedVehicleId)
    const [expandedSections, setExpandedSections] = useState<Record<SectionType, boolean>>({
        vehicles: true,
        orders: true,
        zones: false,
    })

    const toggleSection = (section: SectionType) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
    }

    const getStateType = (stateObj: any): string => {
        if (!stateObj) return 'unknown'
        if (typeof stateObj === 'string') return stateObj
        if (typeof stateObj === 'object' && stateObj.state_type) return stateObj.state_type
        return Object.keys(stateObj)[0] || 'unknown'
    }

    const getStateColor = (stateType: string): string => {
        switch (stateType.toLowerCase()) {
            case 'idle': return 'text-gray-400'
            case 'moving_to_pickup':
            case 'movingtopickup': return 'text-blue-400'
            case 'moving_to_drop':
            case 'movingtodrop': return 'text-purple-400'
            case 'loading': return 'text-yellow-400'
            case 'unloading': return 'text-orange-400'
            case 'waiting':
            case 'waiting_for_zone': return 'text-amber-400'
            case 'error': return 'text-red-400'
            default: return 'text-green-400'
        }
    }

    return (
        <div className="flex-1 p-4 overflow-auto">
            <h2 className="text-white text-lg font-semibold mb-4">FSM Inspector</h2>

            <div className="space-y-3">
                {/* Vehicles Section */}
                <div>
                    <button
                        onClick={() => toggleSection('vehicles')}
                        className="flex items-center gap-2 text-gray-300 font-medium mb-2 hover:text-white transition-colors w-full"
                    >
                        <span className="text-xs">{expandedSections.vehicles ? '▼' : '▶'}</span>
                        Vehicles ({state?.vehicles?.length ?? 0})
                    </button>
                    {expandedSections.vehicles && (
                        <div className="space-y-2 pl-2">
                            {state?.vehicles?.map((vehicle: any, index: number) => {
                                const isSelected = selectedVehicleId === vehicle.id
                                const stateType = getStateType(vehicle.state)
                                return (
                                    <div
                                        key={`${vehicle.id}-${index}`}
                                        onClick={() => setSelectedVehicleId(isSelected ? null : vehicle.id)}
                                        className={`p-3 rounded cursor-pointer transition-all ${isSelected
                                                ? 'bg-blue-900 border-2 border-blue-500'
                                                : 'bg-gray-700 border-2 border-transparent hover:bg-gray-600'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-white font-mono text-sm">{vehicle.id}</span>
                                            <span className={`text-xs font-medium ${getStateColor(stateType)}`}>
                                                {stateType.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="text-gray-400 text-xs mt-1 space-y-0.5">
                                            <div>
                                                Position: ({vehicle.position?.x?.toFixed(0) ?? '?'}, {vehicle.position?.y?.toFixed(0) ?? '?'})
                                            </div>
                                            {vehicle.current_node && (
                                                <div>Node: <span className="text-gray-300">{vehicle.current_node}</span></div>
                                            )}
                                            {vehicle.order_id && (
                                                <div>Order: <span className="text-cyan-400">{vehicle.order_id}</span></div>
                                            )}
                                            <div>Battery: <span className="text-gray-300">{vehicle.battery?.toFixed(1) ?? 100}%</span></div>
                                        </div>
                                    </div>
                                )
                            }) || <div className="text-gray-500 text-sm">No vehicles</div>}
                        </div>
                    )}
                </div>

                {/* Orders Section */}
                <div>
                    <button
                        onClick={() => toggleSection('orders')}
                        className="flex items-center gap-2 text-gray-300 font-medium mb-2 hover:text-white transition-colors w-full"
                    >
                        <span className="text-xs">{expandedSections.orders ? '▼' : '▶'}</span>
                        Orders ({state?.orders?.length ?? 0})
                    </button>
                    {expandedSections.orders && (
                        <div className="space-y-2 pl-2">
                            {state?.orders?.map((order: any, index: number) => {
                                const stateType = getStateType(order.state)
                                return (
                                    <div key={`${order.id}-${index}`} className="bg-gray-700 p-3 rounded">
                                        <div className="flex items-center justify-between">
                                            <span className="text-white font-mono text-sm">{order.id}</span>
                                            <span className="text-blue-400 text-xs font-medium">
                                                {stateType.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="text-gray-400 text-xs mt-1">
                                            {order.pickup_location} → {order.delivery_location}
                                        </div>
                                        {order.vehicle_id && (
                                            <div className="text-gray-400 text-xs">
                                                Vehicle: <span className="text-cyan-400">{order.vehicle_id}</span>
                                            </div>
                                        )}
                                    </div>
                                )
                            }) || <div className="text-gray-500 text-sm">No orders</div>}
                        </div>
                    )}
                </div>

                {/* Zones Section */}
                <div>
                    <button
                        onClick={() => toggleSection('zones')}
                        className="flex items-center gap-2 text-gray-300 font-medium mb-2 hover:text-white transition-colors w-full"
                    >
                        <span className="text-xs">{expandedSections.zones ? '▼' : '▶'}</span>
                        Zones ({state?.zones?.length ?? 0})
                    </button>
                    {expandedSections.zones && (
                        <div className="space-y-2 pl-2">
                            {state?.zones?.length > 0 ? (
                                state.zones.map((zone: any, index: number) => (
                                    <div key={`zone-${index}`} className="bg-gray-700 p-3 rounded">
                                        <div className="text-white font-mono text-sm">Zone {zone.id ?? index}</div>
                                        <div className="text-gray-400 text-xs mt-1">
                                            State: <span className="text-yellow-400">{zone.state_type ?? 'free'}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-gray-500 text-sm italic">
                                    Zones will appear when traffic control is implemented (Phase 4)
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
