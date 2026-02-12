import { Stage, Layer, Circle, Line } from 'react-konva'
import { useSimulationStore } from '../stores/simulationStore'
import VehicleRenderer from './VehicleRenderer'
import { useState, useEffect } from 'react'

export default function PlantView() {
    const state = useSimulationStore((s) => s.state)
    const selectedVehicleId = useSimulationStore((s) => s.selectedVehicleId)
    const setSelectedVehicleId = useSimulationStore((s) => s.setSelectedVehicleId)
    const teleportVehicle = useSimulationStore((s) => s.teleportVehicle)
    const [scale, setScale] = useState(1)
    const [position, setPosition] = useState({ x: 0, y: 0 })

    useEffect(() => {
        if (state) {
            // console.log('Simulation State Updated:', state)
        }
    }, [state])

    if (!state) return <div className="flex-1 bg-gray-950 flex items-center justify-center text-white">Loading simulation...</div>

    const handleNodeClick = (node: any) => {
        if (selectedVehicleId) {
            teleportVehicle(selectedVehicleId, node.position[0], node.position[1])
        }
    }

    const handleWheel = (e: any) => {
        e.evt.preventDefault()
        const scaleBy = 1.1
        const stage = e.target.getStage()
        const oldScale = stage.scaleX()
        const pointer = stage.getPointerPosition()

        const mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale,
        }

        const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy
        setScale(newScale)
        setPosition({
            x: pointer.x - mousePointTo.x * newScale,
            y: pointer.y - mousePointTo.y * newScale,
        })
    }

    return (
        <div className="flex-1 bg-gray-950 flex items-center justify-center overflow-hidden">
            <Stage
                width={window.innerWidth - 300} // Adjust for sidebar
                height={window.innerHeight - 64} // Adjust for header
                draggable
                onWheel={handleWheel}
                scaleX={scale}
                scaleY={scale}
                x={position.x}
                y={position.y}
                onDragEnd={(e) => setPosition({ x: e.target.x(), y: e.target.y() })}
                onClick={() => setSelectedVehicleId(null)}
            >
                <Layer>
                    {/* Render edges */}
                    {(Array.isArray(state.plant.edges) ? state.plant.edges : Array.from(state.plant.edges.values())).map((edge: any, i: number) => {
                        const nodes = state.plant.nodes
                        const fromNode = nodes instanceof Map ? nodes.get(edge.from) : nodes[edge.from]
                        const toNode = nodes instanceof Map ? nodes.get(edge.to) : nodes[edge.to]
                        if (!fromNode || !toNode) return null
                        return (
                            <Line
                                key={`edge-${i}`}
                                points={[fromNode.position[0], fromNode.position[1], toNode.position[0], toNode.position[1]]}
                                stroke="#334155"
                                strokeWidth={2}
                            />
                        )
                    })}

                    {/* Render nodes */}
                    {(state.plant.nodes instanceof Map ? Array.from(state.plant.nodes.values()) : Object.values(state.plant.nodes)).map((node: any) => (
                        <Circle
                            key={node.id}
                            x={node.position[0]}
                            y={node.position[1]}
                            radius={node.node_type === 'station' ? 8 : 4}
                            fill={node.node_type === 'station' ? '#3b82f6' : '#475569'}
                            stroke="#1e293b"
                            strokeWidth={1}
                            onClick={() => handleNodeClick(node)}
                            onMouseEnter={(e) => {
                                const container = e.target.getStage()?.container()
                                if (container) container.style.cursor = 'pointer'
                            }}
                            onMouseLeave={(e) => {
                                const container = e.target.getStage()?.container()
                                if (container) container.style.cursor = 'default'
                            }}
                        />
                    ))}

                    {/* Render vehicles */}
                    {state.vehicles.map((vehicle: any) => (
                        <VehicleRenderer key={vehicle.id} vehicle={vehicle} />
                    ))}
                </Layer>
            </Stage>
        </div>
    )
}
