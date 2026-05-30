import { motion, AnimatePresence } from 'framer-motion';
import type { Order } from '../../engine/types';
import { getBreachDamage } from '../../engine/types';
import { useUiStore } from '../../store/uiStore';
import type { ConfirmActionType } from '../../store/uiStore';

interface IntegrityActionConfirmSheetProps {
  contextOrders: Order[];
  hp: number;
  onConfirm: (action: ConfirmActionType, targetOrderId?: string) => void;
}

export function IntegrityActionConfirmSheet({ contextOrders, hp, onConfirm }: IntegrityActionConfirmSheetProps) {
  const { showConfirmSheet, confirmAction, confirmTargetOrderId, closeConfirmSheet } = useUiStore();

  const targetOrder = confirmTargetOrderId
    ? contextOrders.find((o) => o.id === confirmTargetOrderId)
    : null;

  if (!confirmAction) return null;

  const isReject = confirmAction === 'reject';
  const breachDamage = targetOrder ? getBreachDamage(targetOrder) : 0;
  const netGain = breachDamage - 1; // Costs 1 HP to reject, avoids breach damage
  const currentHpAfter = hp - 1;

  return (
    <AnimatePresence>
      {showConfirmSheet && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          onClick={closeConfirmSheet}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Sheet */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-xs bg-slate-950 border border-slate-800 rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-3 text-center border-b border-slate-800">
              <div className="text-3xl mb-2">{isReject ? '🗑️' : '🔥'}</div>
              <h2 className="text-base font-black text-white uppercase tracking-wider">
                {isReject ? 'Reject Contract' : 'Core Surge'}
              </h2>
            </div>

            {/* Content */}
            <div className="px-5 py-4 space-y-3">
              {/* Description */}
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-300">
                  {isReject
                    ? `Remove selected order from the queue. Costs -1 System Integrity.`
                    : `Stronger all-crane boost for 6 seconds. Costs -1 System Integrity.`}
                </p>
              </div>

              {/* Effect details */}
              {isReject && targetOrder && (
                <div className="space-y-2">
                  <EffectRow label="Breach damage avoided" value={`-${breachDamage} HP`} color="text-green-400" />
                  <EffectRow label="Cost" value="-1 HP" color="text-red-400" />
                  <EffectRow label="Net integrity" value={netGain > 0 ? `+${netGain} HP` : `${netGain} HP`} color={netGain > 0 ? 'text-green-400' : 'text-yellow-400'} />
                  <EffectRow label="HP after action" value={`${currentHpAfter}/${hp}`} color={currentHpAfter <= 0 ? 'text-red-400' : 'text-white'} />
                </div>
              )}

              {!isReject && (
                <div className="space-y-2">
                  <EffectRow label="Effect" value="All cranes boosted" color="text-orange-400" />
                  <EffectRow label="Duration" value="6 seconds" color="text-orange-400" />
                  <EffectRow label="Cost" value="-1 System Integrity" color="text-red-400" />
                  <EffectRow label="HP after action" value={`${currentHpAfter}/${hp}`} color={currentHpAfter <= 0 ? 'text-red-400' : 'text-white'} />
                </div>
              )}

              {hp <= 0 && (
                <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-2.5 text-center">
                  <p className="text-xs font-bold text-red-400">⚠ Cannot afford — 0 System Integrity</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 px-5 pb-5">
              <button
                onClick={closeConfirmSheet}
                className="flex-1 py-2.5 text-xs font-bold text-slate-400 uppercase tracking-wider border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onConfirm(confirmAction, confirmTargetOrderId ?? undefined);
                  closeConfirmSheet();
                }}
                disabled={hp <= 0}
                className="flex-1 py-2.5 text-xs font-bold text-white uppercase tracking-wider bg-red-600 rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function EffectRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex justify-between items-center text-[10px]">
      <span className="text-slate-500">{label}</span>
      <span className={`font-mono font-bold ${color}`}>{value}</span>
    </div>
  );
}
