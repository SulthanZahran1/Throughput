import { motion, AnimatePresence } from 'framer-motion';
import type { AutomationPolicy } from '../../engine/types';
import { ALL_POLICIES, POLICY_NAMES } from '../../engine/types';
import { useUiStore } from '../../store/uiStore';

interface PolicyPickerSheetProps {
  currentPolicy: string;
  policyCooldownRemaining: number;
  onSelect: (policy: AutomationPolicy) => void;
}

const POLICY_ICONS: Record<AutomationPolicy, string> = {
  balanced: '⚖️',
  deadline_first: '⏰',
  nearest_first: '📍',
  storage_first: '📥',
  retrieval_first: '📤',
  vip_first: '👑',
};

const POLICY_DESCRIPTIONS: Record<AutomationPolicy, string> = {
  balanced: 'Fair FIFO baseline. Predictable, stable flow.',
  deadline_first: 'Prioritize shortest remaining deadline. Minimize failures.',
  nearest_first: 'Minimize crane travel distance. Best throughput.',
  storage_first: 'Favor store orders. Prevents input buildup.',
  retrieval_first: 'Favor retrieve orders. Clears storage/output fast.',
  vip_first: 'Favor high-value VIP orders. Save the important ones.',
};

export function PolicyPickerSheet({ currentPolicy, policyCooldownRemaining, onSelect }: PolicyPickerSheetProps) {
  const { showPolicyPicker, closePolicyPicker } = useUiStore();

  const handleSelect = (policy: AutomationPolicy) => {
    if (policy === currentPolicy) {
      closePolicyPicker();
      return;
    }
    if (policyCooldownRemaining > 0) return;
    onSelect(policy);
    closePolicyPicker();
  };

  return (
    <AnimatePresence>
      {showPolicyPicker && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end"
          onClick={closePolicyPicker}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full bg-slate-950 border-t border-slate-800 rounded-t-xl max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-slate-700 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-5 py-3 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-white uppercase tracking-wider">Automation Policy</h2>
                <button onClick={closePolicyPicker} className="text-slate-600 hover:text-white text-lg">
                  ✕
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Controls how cranes prioritize and assign jobs.
                {policyCooldownRemaining > 0 && (
                  <span className="text-yellow-400"> Cooldown: {Math.ceil(policyCooldownRemaining)}s</span>
                )}
              </p>
            </div>

            {/* Policy options */}
            <div className="p-3 space-y-1">
              {ALL_POLICIES.map((policy) => {
                const isActive = policy === currentPolicy;
                const onCooldown = policyCooldownRemaining > 0 && !isActive;

                return (
                  <button
                    key={policy}
                    onClick={() => handleSelect(policy)}
                    disabled={onCooldown}
                    className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all ${
                      isActive
                        ? 'bg-blue-500/20 border border-blue-500/30'
                        : onCooldown
                          ? 'bg-slate-900/50 text-slate-600 cursor-not-allowed'
                          : 'bg-slate-900/70 hover:bg-slate-800/70 border border-transparent'
                    }`}
                  >
                    <span className="text-lg mt-0.5">{POLICY_ICONS[policy]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold uppercase tracking-wider ${
                          isActive ? 'text-blue-300' : onCooldown ? 'text-slate-600' : 'text-white'
                        }`}>
                          {POLICY_NAMES[policy]}
                        </span>
                        {isActive && (
                          <span className="text-[8px] font-bold text-blue-400 bg-blue-500/20 px-1.5 py-0.5 rounded">
                            ACTIVE
                          </span>
                        )}
                        {onCooldown && (
                          <span className="text-[8px] text-slate-600">{Math.ceil(policyCooldownRemaining)}s</span>
                        )}
                      </div>
                      <p className="text-[9px] text-slate-500 mt-0.5 leading-relaxed">
                        {POLICY_DESCRIPTIONS[policy]}
                      </p>
                    </div>
                    {isActive && (
                      <svg className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-800">
              <p className="text-[8px] text-slate-600 text-center">
                Free to switch. {Math.ceil(policyCooldownRemaining > 0 ? policyCooldownRemaining : 6)}s cooldown between switches.
                Affects new job assignments only.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
