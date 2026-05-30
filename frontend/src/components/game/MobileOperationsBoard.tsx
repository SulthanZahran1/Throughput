import type { SimulationContext, Crane } from '../../engine/types';
import { getSystemDiagnostics } from '../../engine/diagnostics';
import { ITEM_COLORS } from '../../constants/config';

interface MobileOperationsBoardProps {
  context: SimulationContext;
}

export function MobileOperationsBoard({ context }: MobileOperationsBoardProps) {
  const diagnostics = getSystemDiagnostics(context);

  // Calculate zone summaries
  const zoneSummaries = context.zones.map((zone) => {
    const total = zone.cells.length;
    const occupied = zone.cells.filter((key) => context.grid.slots.get(key)?.item !== null).length;
    const fullness = total > 0 ? Math.round((occupied / total) * 100) : 0;

    // Determine dominant item types in this zone
    const itemTypeCount: Record<string, number> = {};
    for (const key of zone.cells) {
      const slot = context.grid.slots.get(key);
      if (slot?.item) {
        itemTypeCount[slot.item.type] = (itemTypeCount[slot.item.type] || 0) + 1;
      }
    }
    const dominantTypes = Object.entries(itemTypeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([type]) => type);

    // Risk label
    const riskLabel = fullness >= 95 ? 'FULL' : fullness >= 80 ? 'CONGESTED' : fullness >= 60 ? 'HIGH' : 'STABLE';

    return { id: zone.id, name: zone.name, fullness, dominantTypes, riskLabel, occupied, total };
  });

  // Calculate crane task summaries
  const craneSummaries = context.cranes.map((crane: Crane) => {
    const craneNum = crane.id.split('-')[1] || '0';
    let taskLabel = 'IDLE';
    let taskColor = 'text-slate-500';
    let itemColor = null;

    if (crane.currentJob) {
      const job = crane.currentJob;
      if (crane.state === 'MOVING_TO_SOURCE') {
        taskLabel = `→ ${job.jobType === 'store' ? 'INPUT' : 'PICKUP'}`;
        taskColor = 'text-blue-400';
      } else if (crane.state === 'ACQUIRING') {
        taskLabel = `ACQUIRING ${Math.round(crane.transferProgress * 100)}%`;
        taskColor = 'text-cyan-400';
      } else if (crane.state === 'MOVING_TO_DEST') {
        taskLabel = `→ ${job.jobType === 'store' ? 'STORAGE' : 'OUTPUT'}`;
        taskColor = 'text-amber-400';
      } else if (crane.state === 'DEPOSITING') {
        taskLabel = `DEPOSIT ${Math.round(crane.transferProgress * 100)}%`;
        taskColor = 'text-green-400';
      }
    }

    if (crane.heldItem) {
      itemColor = ITEM_COLORS[crane.heldItem.type] || '#888';
    }

    return { id: crane.id, craneNum, taskLabel, taskColor, itemColor, heldItemType: crane.heldItem?.type ?? null };
  });

  // Calculate bottleneck summary
  const bottleneckLabel = diagnostics.bottleneck;

  return (
    <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
      {/* Flow Status */}
      <div className="panel-industrial bg-slate-900/30 p-2.5 border border-slate-800/50">
        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Flow Status</div>
        <div className="flex items-center gap-3 text-[10px]">
          <div className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${diagnostics.inputOk ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-slate-400">Input:</span>
            <span className={`font-bold ${diagnostics.inputOk ? 'text-green-400' : 'text-red-400'}`}>
              {diagnostics.inputOk ? 'OK' : 'BLOCKED'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="text-slate-400">Storage:</span>
            <span className="font-bold text-white">{Math.round(diagnostics.storageUtilization * 100)}%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${diagnostics.outputClear ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-slate-400">Output:</span>
            <span className={`font-bold ${diagnostics.outputClear ? 'text-green-400' : 'text-red-400'}`}>
              {diagnostics.outputClear ? 'CLEAR' : 'FULL'}
            </span>
          </div>
        </div>
        {bottleneckLabel && (
          <div className="mt-1.5 text-[9px] font-bold text-red-400 uppercase tracking-wider">
            ⚠ Bottleneck: {bottleneckLabel}
          </div>
        )}
      </div>

      {/* Zone Summaries */}
      {zoneSummaries.length > 0 && (
        <div className="panel-industrial bg-slate-900/30 p-2.5 border border-slate-800/50">
          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Zones</div>
          <div className="space-y-1">
            {zoneSummaries.slice(0, 3).map((zone) => (
              <ZoneSummaryRow key={zone.id} zone={zone} />
            ))}
          </div>
        </div>
      )}

      {/* Crane Task Board */}
      <div className="panel-industrial bg-slate-900/30 p-2.5 border border-slate-800/50">
        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Crane Tasks</div>
        <div className="space-y-1">
          {craneSummaries.map((crane) => (
            <CraneTaskRow key={crane.id} crane={crane} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ZoneSummaryRow({ zone }: {
  zone: { id: string; name: string; fullness: number; dominantTypes: string[]; riskLabel: string; occupied: number; total: number };
}) {
  const riskColors: Record<string, string> = { STABLE: 'text-green-400', HIGH: 'text-yellow-400', CONGESTED: 'text-orange-400', FULL: 'text-red-400' };
  const riskBgColors: Record<string, string> = { STABLE: 'bg-green-500/20', HIGH: 'bg-yellow-500/20', CONGESTED: 'bg-orange-500/20', FULL: 'bg-red-500/20' };

  return (
    <div className="flex items-center justify-between text-[10px]">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-slate-300 truncate">{zone.name}</span>
        <div className="flex gap-0.5">
          {zone.dominantTypes.map((type) => (
            <div
              key={type}
              className="w-1.5 h-1.5 rounded-sm"
              style={{ backgroundColor: ITEM_COLORS[type as keyof typeof ITEM_COLORS] || '#666' }}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-white font-mono">{zone.fullness}%</span>
        <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${zone.occupied >= zone.total ? 'text-red-300 bg-red-500/20' : riskBgColors[zone.riskLabel]} ${riskColors[zone.riskLabel]}`}>
          {zone.riskLabel}
        </span>
      </div>
    </div>
  );
}

function CraneTaskRow({ crane }: { crane: { id: string; craneNum: string; taskLabel: string; taskColor: string; itemColor: string | null; heldItemType: string | null } }) {
  return (
    <div className="flex items-center justify-between text-[10px]">
      <div className="flex items-center gap-1.5">
        <span className="text-yellow-500 font-bold font-mono">C{crane.craneNum}</span>
        <span className={`font-bold ${crane.taskColor}`}>{crane.taskLabel}</span>
      </div>
      {crane.heldItemType && (
        <div
          className="w-3 h-3 rounded-sm border border-white/20"
          style={{ backgroundColor: crane.itemColor || '#666' }}
        />
      )}
    </div>
  );
}
