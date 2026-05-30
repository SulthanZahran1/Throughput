import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Order, SimulationContext } from '../../engine/types';
import { ITEM_COLORS } from '../../constants/config';
import { getBreachDamageLabel } from '../../engine/types';
import { diagnoseOrder } from '../../engine/diagnostics';
import { useUiStore } from '../../store/uiStore';
import { previewPriorityOverride } from '../../engine/ability-preview';

interface ExpandableOrderStripProps {
  context: SimulationContext;
  onOrderTap: (orderId: string) => void;
}

export function ExpandableOrderStrip({ context, onOrderTap }: ExpandableOrderStripProps) {
  const { isOrderStripExpanded, toggleOrderStrip, selectedAbility, clearAbility } = useUiStore();
  const [diagnostics] = useState(() => new Map<string, ReturnType<typeof diagnoseOrder>>());

  // Update diagnostics on new context
  useMemo(() => {
    for (const order of context.orders) {
      if (!diagnostics.has(order.id)) {
        diagnostics.set(order.id, diagnoseOrder(order, context));
      }
    }
  }, [context.orders.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sort orders by risk (most urgent first)
  const sortedOrders = useMemo(() => {
    return [...context.orders].sort((a, b) => {
      const dA = a.deadline;
      const dB = b.deadline;
      if (dA !== dB) return dA - dB;
      return a.createdAt - b.createdAt;
    });
  }, [context.orders]);

  // Top 2-3 highest-risk orders for the strip
  const highRiskOrders = useMemo(() => {
    return sortedOrders.slice(0, 3).filter((o) => {
      const diag = diagnostics.get(o.id);
      return diag?.breachRisk === 'LIKELY BREACH' || diag?.breachRisk === 'BLOCKED' || o.deadline / o.maxDeadline < 0.4;
    });
  }, [sortedOrders, diagnostics]);

  const stripOrders = highRiskOrders.length >= 2 ? highRiskOrders : sortedOrders.slice(0, 3);
  const isVip = (o: Order) => o.priority === 'vip' || o.orderClass === 'vip';
  const isBatch = (o: Order) => o.orderClass === 'batch';

  // Calculate ability preview for the selected ability
  const abilityPreviews = useMemo(() => {
    if (!selectedAbility) return null;

    const previews: Record<string, { projectedEta: number | null; outcome: string }> = {};
    for (const order of sortedOrders.slice(0, 5)) {
      if (selectedAbility === 'priority_override') {
        const result = previewPriorityOverride(order.id, context);
        if (result) {
          previews[order.id] = { projectedEta: result.projectedEta, outcome: result.outcome };
        }
      }
    }
    return previews;
  }, [selectedAbility, context, sortedOrders]);

  const handleOrderClick = (orderId: string) => {
    if (selectedAbility) {
      onOrderTap(orderId);
    }
  };

  return (
    <div className="flex-shrink-0 z-20">
      {/* Critical Order Strip (compact) */}
      <div
        className="panel-industrial bg-slate-900/80 backdrop-blur-md border-t border-slate-800/50 cursor-pointer"
        onClick={() => {
          if (!isOrderStripExpanded) toggleOrderStrip();
        }}
      >
        {/* Strip header */}
        <div className="flex items-center justify-between px-3 py-1 border-b border-slate-800/30">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
            {selectedAbility ? 'ABILITY PREVIEW' : 'CRITICAL ORDERS'}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleOrderStrip();
            }}
            className="text-slate-600 hover:text-white transition-colors p-0.5"
          >
            <svg className={`w-3 h-3 transition-transform ${isOrderStripExpanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>

        {/* Strip content */}
        <div className="px-3 py-1.5 overflow-x-auto">
          <div className="flex gap-1.5 min-w-0">
            {stripOrders.length === 0 && (
              <div className="text-[10px] text-slate-600 py-1">All orders nominal</div>
            )}
            {stripOrders.map((order) => {
              const preview = abilityPreviews?.[order.id];
              return (
                <CompactOrderCard
                  key={order.id}
                  order={order}
                  isVip={isVip(order)}
                  isBatch={isBatch(order)}
                  preview={preview}
                  isSelected={selectedAbility === 'priority_override'}
                  onClick={() => handleOrderClick(order.id)}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Expandable Full Queue */}
      <AnimatePresence>
        {isOrderStripExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-slate-800/30 bg-slate-950/95 backdrop-blur-md"
          >
            <div className="max-h-[40vh] overflow-y-auto px-3 py-2 space-y-1.5">
              {/* Ability info bar */}
              {selectedAbility && (
                <div className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider mb-1 px-1 py-1 bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-between">
                  <span>Tap an order to apply {selectedAbility.replace('_', ' ')}</span>
                  <button onClick={() => clearAbility()} className="text-slate-500 hover:text-white text-[8px] font-bold uppercase">
                    Cancel
                  </button>
                </div>
              )}

              {sortedOrders.length === 0 && (
                <div className="text-center text-slate-600 py-6 text-xs">
                  No orders in queue
                </div>
              )}

              {sortedOrders.map((order) => {
                const diag = diagnostics.get(order.id);
                const preview = abilityPreviews?.[order.id];
                const isAtRisk = diag?.breachRisk === 'LIKELY BREACH' || diag?.breachRisk === 'BLOCKED';
                return (
                  <FullOrderCard
                    key={order.id}
                    order={order}
                    diagnostics={diag}
                    preview={preview}
                    isVip={isVip(order)}
                    isBatch={isBatch(order)}
                    isAtRisk={isAtRisk}
                    hasAbilitySelected={selectedAbility !== null}
                    onClick={() => handleOrderClick(order.id)}
                  />
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Compact order card for the strip
function CompactOrderCard({
  order,
  isVip,
  isBatch,
  preview,
  isSelected,
  onClick,
}: {
  order: Order;
  isVip: boolean;
  isBatch: boolean;
  preview: { projectedEta: number | null; outcome: string } | undefined;
  isSelected: boolean;
  onClick: () => void;
}) {
  const isUrgent = order.deadline / order.maxDeadline < 0.3;
  const itemColor = ITEM_COLORS[order.itemType];
  const label = isVip ? 'VIP' : isBatch ? 'BATCH' : order.type.toUpperCase();

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-1 px-2 py-1 text-[10px] font-mono whitespace-nowrap border cursor-pointer shrink-0 transition-all ${
        isVip
          ? 'border-yellow-500/40 bg-yellow-500/10'
          : isUrgent
            ? 'border-red-500/40 bg-red-500/10'
            : 'border-slate-700/50 bg-slate-800/50'
      } ${isSelected ? 'ring-1 ring-cyan-500' : ''}`}
    >
      <div className="flex items-center gap-1">
        {isVip && <span className="text-[9px]">👑</span>}
        <span className="font-bold text-white">{label}</span>
        <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: itemColor }} />
      </div>
      {preview ? (
        <span className={preview.outcome === 'SAVES' ? 'text-green-400' : preview.outcome === 'RISK' ? 'text-yellow-400' : 'text-slate-500'}>
          {Math.ceil(order.deadline)}→{Math.ceil(preview.projectedEta ?? order.deadline)} · {preview.outcome}
        </span>
      ) : (
        <span className={isUrgent ? 'text-red-400' : 'text-slate-400'}>
          {Math.ceil(order.deadline)}s{isVip ? ` · ${getBreachDamageLabel(order)}` : ''}
        </span>
      )}
    </div>
  );
}

// Full order card for expanded queue
function FullOrderCard({
  order,
  diagnostics,
  preview,
  isVip,
  isBatch,
  isAtRisk,
  hasAbilitySelected,
  onClick,
}: {
  order: Order;
  diagnostics?: { eta: number | null; breachRisk: string; bottleneck: string | null; canBeFulfilled: boolean };
  preview?: { projectedEta: number | null; outcome: string } | null;
  isVip: boolean;
  isBatch: boolean;
  isAtRisk: boolean;
  hasAbilitySelected: boolean;
  onClick: () => void;
}) {
  const itemColor = ITEM_COLORS[order.itemType];
  const deadlinePercent = order.maxDeadline > 0 ? (order.deadline / order.maxDeadline) * 100 : 0;
  const isUrgent = deadlinePercent < 30;
  const isBlocked = diagnostics?.breachRisk === 'BLOCKED';

  return (
    <div
      onClick={onClick}
      className={`relative p-2.5 border text-[10px] transition-all ${
        isVip
          ? 'border-yellow-500/30 bg-yellow-500/5'
          : isAtRisk
            ? 'border-red-500/30 bg-red-500/5'
            : 'border-slate-800 bg-slate-900/50'
      } ${hasAbilitySelected ? 'cursor-pointer hover:border-cyan-500/50' : ''}`}
    >
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {isVip && <span className="text-[10px]">👑</span>}
          <span className="font-bold text-white uppercase tracking-tight">
            {order.type} {order.itemType.toUpperCase()}
          </span>
          {isBatch && <span className="text-[8px] font-bold text-purple-400 bg-purple-500/20 px-1">BATCH</span>}
          {order.orderClass === 'contract' && <span className="text-[8px] font-bold text-orange-400 bg-orange-500/20 px-1">CONTRACT</span>}
        </div>
        <div className="w-4 h-4 rounded-sm border border-white/20" style={{ backgroundColor: itemColor }} />
      </div>

      {/* Deadline bar */}
      <div className="h-1 bg-slate-900 rounded-full overflow-hidden mb-1.5">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isBlocked ? 'bg-red-500 opacity-50' : isUrgent ? 'bg-red-500' : 'bg-blue-500'
          }`}
          style={{ width: `${Math.max(0, deadlinePercent)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[9px]">
        {/* ETA / Deadline info */}
        <div className="flex items-center gap-2">
          {diagnostics?.eta !== undefined && diagnostics.eta !== null && !isBlocked ? (
            <span className="text-blue-400 font-mono">
              ETA {Math.ceil(diagnostics.eta)}s
            </span>
          ) : (
            <span className="text-red-400 font-bold">BLOCKED</span>
          )}
          <span className="text-slate-500">DL {Math.ceil(order.deadline)}s</span>
          <span className="text-slate-600">{getBreachDamageLabel(order)}</span>
        </div>

        {/* Bottleneck / Status */}
        {diagnostics?.bottleneck && (
          <span className="text-red-400 font-bold">{diagnostics.bottleneck}</span>
        )}
      </div>

      {/* Ability preview detail */}
      {preview && (
        <div className={`mt-1.5 pt-1.5 border-t border-slate-800/50 flex items-center gap-2 text-[9px] font-mono ${
          preview.outcome === 'SAVES' ? 'text-green-400' : preview.outcome === 'RISK' ? 'text-yellow-400' : 'text-slate-500'
        }`}>
          <span>{diagnostics?.eta !== null && diagnostics?.eta !== undefined ? `${Math.ceil(diagnostics.eta)}s` : '?'} → {Math.ceil(preview.projectedEta ?? order.deadline)}s</span>
          <span className="font-bold">· {preview.outcome}</span>
          <span className="text-slate-600">· Cost: 35 EP</span>
        </div>
      )}
    </div>
  );
}
