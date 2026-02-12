import { Group, RegularPolygon, Text, Circle } from 'react-konva'
import { useSimulationStore } from '../stores/simulationStore'

interface VehicleRendererProps {
    vehicle: {
        id: string
        position: [number, number]
        state: string
    }
}

export default function VehicleRenderer({ vehicle }: VehicleRendererProps) {
    const selectedVehicleId = useSimulationStore((s) => s.selectedVehicleId)
    const setSelectedVehicleId = useSimulationStore((s) => s.setSelectedVehicleId)
    const isSelected = selectedVehicleId === vehicle.id
    const [x, y] = vehicle.position

    // Color based on state
    const getFillColor = () => {
        switch (vehicle.state) {
            case 'Idle': return '#6b7280' // Gray
            case 'Moving': return '#3b82f6' // Blue
            case 'Waiting': return '#eab308' // Yellow
            case 'Error': return '#ef4444' // Red
            default: return '#6b7280'
        }
    }

    return (
        <Group
            x={x}
            y={y}
            onClick={(e) => {
                e.cancelBubble = true // Prevent stage click
                setSelectedVehicleId(isSelected ? null : vehicle.id)
            }}
            onMouseEnter={(e) => {
                const container = e.target.getStage()?.container()
                if (container) container.style.cursor = 'pointer'
            }}
            onMouseLeave={(e) => {
                const container = e.target.getStage()?.container()
                if (container) container.style.cursor = 'default'
            }}
        >
            {/* Selection highlight */}
            {isSelected && (
                <Circle
                    radius={18}
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dash={[4, 4]}
                />
            )}

            {/* Vehicle body (Triangle pointing up by default) */}
            <RegularPolygon
                sides={3}
                radius={12}
                fill={getFillColor()}
                stroke={isSelected ? "#fff" : "#1e293b"}
                strokeWidth={2}
                rotation={0} // TODO: Add rotation based on movement direction
            />

            {/* Vehicle ID label */}
            <Text
                text={vehicle.id}
                fontSize={10}
                fontStyle="bold"
                fill="#fff"
                x={-15}
                y={15}
                align="center"
                width={30}
            />
        </Group>
    )
}
