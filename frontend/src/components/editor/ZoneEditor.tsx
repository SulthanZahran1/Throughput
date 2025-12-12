import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { COLORS } from '../../constants/colors';
import type { ItemType } from '../../types/game';

const ZONE_COLORS = [
    { name: 'Red', value: COLORS.zoneRed, item: 'red' },
    { name: 'Blue', value: COLORS.zoneBlue, item: 'blue' },
    { name: 'Green', value: COLORS.zoneGreen, item: 'green' },
    { name: 'Yellow', value: COLORS.zoneYellow, item: 'yellow' },
    { name: 'Purple', value: COLORS.zonePurple, item: 'purple' },
];

export function ZoneEditor() {
    const zones = useGameStore((state) => state.zones);
    const editingZoneId = useGameStore((state) => state.editingZoneId);
    const setEditingZoneId = useGameStore((state) => state.setEditingZoneId);
    const addZone = useGameStore((state) => state.addZone);
    const removeZone = useGameStore((state) => state.removeZone);
    const updateZone = useGameStore((state) => state.updateZone);

    const [newZoneName, setNewZoneName] = useState('');

    const handleAddZone = () => {
        const colorPreset = ZONE_COLORS[zones.length % ZONE_COLORS.length];
        const newZone = {
            id: crypto.randomUUID(),
            name: newZoneName || `Zone ${zones.length + 1}`,
            color: colorPreset.value,
            cells: new Set<string>(),
            acceptedItems: [colorPreset.item as ItemType],
            priority: 1,
        };
        addZone(newZone);
        setNewZoneName('');
        setEditingZoneId(newZone.id);
    };

    return (
        <div className="absolute top-16 left-4 bg-slate-800 p-4 rounded-lg shadow-xl border border-slate-700 w-80 max-h-[calc(100vh-6rem)] overflow-y-auto z-20">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-slate-200">Zone Editor</h2>
                <div className="text-xs text-slate-400">
                    {editingZoneId ? 'Painting Mode Active' : 'Select a zone to paint'}
                </div>
            </div>

            <div className="flex gap-2 mb-6">
                <input
                    type="text"
                    value={newZoneName}
                    onChange={(e) => setNewZoneName(e.target.value)}
                    placeholder="New Zone Name"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddZone()}
                />
                <button
                    onClick={handleAddZone}
                    disabled={!newZoneName}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors"
                >
                    Add
                </button>
            </div>

            <div className="space-y-3">
                {zones.map((zone) => (
                    <div
                        key={zone.id}
                        className={`p-3 rounded-lg border transition-all ${editingZoneId === zone.id
                            ? 'bg-slate-700/50 border-blue-500/50 ring-1 ring-blue-500/20'
                            : 'bg-slate-900/50 border-slate-700 hover:border-slate-600'
                            }`}
                        onClick={() => setEditingZoneId(editingZoneId === zone.id ? null : zone.id)}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-full shadow-sm"
                                    style={{ backgroundColor: zone.color }}
                                />
                                <span className="font-medium text-slate-200">{zone.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeZone(zone.id);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                                    title="Delete Zone"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400 w-12">Priority:</span>
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    value={zone.priority}
                                    onChange={(e) => {
                                        updateZone(zone.id, {
                                            priority: parseInt(e.target.value),
                                        });
                                    }}
                                    className="flex-1 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <span className="w-4 text-right text-slate-300 font-mono">{zone.priority}</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-slate-400 w-12">Cells:</span>
                                <span className="text-slate-300 font-mono">{zone.cells.size}</span>
                            </div>

                            <div className="pt-2 border-t border-slate-700/50">
                                <div className="mb-2 text-slate-400">Accepted Items</div>
                                <div className="flex flex-wrap gap-1.5">
                                    {['red', 'blue', 'green'].map((type) => (
                                        <button
                                            key={type}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const newTypes = zone.acceptedItems.includes(type as ItemType)
                                                    ? zone.acceptedItems.filter((t) => t !== type)
                                                    : [...zone.acceptedItems, type as ItemType];
                                                updateZone(zone.id, { acceptedItems: newTypes });
                                            }}
                                            className={`px-2 py-1 rounded text-[10px] font-medium uppercase tracking-wider border transition-all ${zone.acceptedItems.includes(type as ItemType)
                                                ? 'bg-slate-700 border-slate-500 text-white shadow-sm'
                                                : 'bg-transparent border-slate-800 text-slate-600 hover:border-slate-700'
                                                }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {zones.length === 0 && (
                    <div className="text-center py-8 text-slate-500 text-sm border-2 border-dashed border-slate-800 rounded-lg">
                        No zones created yet.<br />
                        Add one to start organizing!
                    </div>
                )}
            </div>
        </div>
    );
}
