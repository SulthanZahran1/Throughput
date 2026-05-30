import type { SimulationContext } from '../../engine/types';
import { formatTime } from '../../utils/formatters';

interface TopHUDProps {
  context: SimulationContext;
  currentShift: number;
  hp: number;
  maxHp: number;
  queueCount: number;
  ep: number;
  epMax: number;
  policyCooldownRemaining: number;
  policyName: string;
}

export function TopHUD({
  context,
  currentShift,
  hp,
  maxHp,
  queueCount,
  ep,
  epMax,
  policyCooldownRemaining,
  policyName,
}: TopHUDProps) {
  const epPercent = (ep / epMax) * 100;
  const isUrgent = context.shiftTimeRemaining < 20;
  const inCooldown = policyCooldownRemaining > 0;
  const queueLoadPercent = Math.min(100, (queueCount / 10) * 100);

  return (
    <div className="panel-industrial flex-shrink-0 bg-slate-900/50 backdrop-blur-md z-10">
      {/* Row 1: Shift + Timer + HP */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800/50">
        {/* Shift */}
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="text-xs font-black text-white italic tracking-tight">SHIFT</span>
          <span className="text-lg font-black text-white">{currentShift}</span>
          <span className="text-[10px] font-bold text-slate-500">/ 08</span>
        </div>

        {/* Timer */}
        <div className="flex items-center gap-1.5">
          <svg className="w-3 h-3 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className={`text-sm font-mono font-bold ${isUrgent ? 'text-red-500 animate-pulse' : 'text-blue-400'}`}>
            {formatTime(context.shiftTimeRemaining)}
          </span>
        </div>

        {/* System Integrity */}
        <div className="flex items-center gap-1">
          <svg className="w-3 h-3 text-red-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
          </svg>
          <div className="flex gap-0.5">
            {Array.from({ length: maxHp }).map((_, i) => (
              <div
                key={i}
                className={`w-4 h-1.5 transition-colors duration-500 ${
                  i < hp
                    ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]'
                    : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: EP + Queue + Policy */}
      <div className="flex items-center gap-3 px-3 py-1.5">
        {/* EP Meter */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">EP</span>
            <span className="text-[10px] font-mono font-bold text-white">
              {ep} <span className="text-slate-600">/ {epMax}</span>
            </span>
          </div>
          <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-300"
              style={{ width: `${epPercent}%` }}
            />
          </div>
        </div>

        {/* Queue Load */}
        <div className="flex items-center gap-1 min-w-0">
          <svg className="w-3 h-3 text-slate-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          <span className="text-xs font-mono font-bold text-white">{queueCount}</span>
          <div className="w-8 h-1 bg-slate-900 rounded-full overflow-hidden hidden sm:block">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                queueLoadPercent > 70 ? 'bg-red-500' : queueLoadPercent > 40 ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
              style={{ width: `${queueLoadPercent}%` }}
            />
          </div>
        </div>

        {/* Policy */}
        <div className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider flex-shrink-0 ${
          inCooldown ? 'text-slate-600' : 'text-blue-400'
        }`}>
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span className="truncate max-w-[80px]">{policyName}</span>
          {inCooldown && (
            <span className="text-slate-600">{Math.ceil(policyCooldownRemaining)}s</span>
          )}
        </div>
      </div>
    </div>
  );
}
