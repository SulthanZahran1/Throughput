import type { SimulationContext } from '../../engine/types';
import { useUiStore, type AbilityId } from '../../store/uiStore';
import { POLICY_NAMES } from '../../engine/types';

interface BottomActionBarProps {
  context: SimulationContext;
  hp: number;
  ep: number;
  policyCooldownRemaining: number;
  currentPolicy: string;
  onAbilityActivate: (ability: AbilityId) => void;
  onPolicyClick: () => void;
}

interface AbilityConfig {
  id: AbilityId;
  label: string;
  icon: string;
  cost: number;
  costType: 'ep' | 'integrity';
  requiresTarget: boolean;
  requiresConfirmation: boolean;
  description: string;
}

const ABILITIES: AbilityConfig[] = [
  {
    id: 'priority_override',
    label: 'Priority',
    icon: '🎯',
    cost: 35,
    costType: 'ep',
    requiresTarget: true,
    requiresConfirmation: false,
    description: 'Hard reassign cranes to selected order',
  },
  {
    id: 'turbo',
    label: 'Turbo',
    icon: '⚡',
    cost: 35,
    costType: 'ep',
    requiresTarget: false,
    requiresConfirmation: false,
    description: 'All cranes faster for 7s',
  },
  {
    id: 'freeze',
    label: 'Freeze',
    icon: '❄️',
    cost: 60,
    costType: 'ep',
    requiresTarget: false,
    requiresConfirmation: false,
    description: 'Pause order timers for 4s',
  },
  {
    id: 'reject',
    label: 'Reject',
    icon: '🗑️',
    cost: 1,
    costType: 'integrity',
    requiresTarget: true,
    requiresConfirmation: true,
    description: 'Remove order at HP cost',
  },
  {
    id: 'core_surge',
    label: 'Surge',
    icon: '🔥',
    cost: 1,
    costType: 'integrity',
    requiresTarget: false,
    requiresConfirmation: true,
    description: 'Stronger all-crane boost at HP cost',
  },
];

export function BottomActionBar({
  context,
  hp,
  ep,
  policyCooldownRemaining,
  currentPolicy,
  onAbilityActivate,
  onPolicyClick,
}: BottomActionBarProps) {
  const { selectedAbility } = useUiStore();
  const isTurboActive = context.activeAbilities?.turbo ?? false;
  const isFreezeActive = context.activeAbilities?.freeze ?? false;
  const isCoreSurgeActive = context.activeAbilities?.coreSurge ?? false;
  const inPolicyCooldown = policyCooldownRemaining > 0;

  const isAbilityDisabled = (ability: AbilityConfig): boolean => {
    // Abilities that are already active cannot be re-activated
    if (ability.id === 'turbo' && isTurboActive) return true;
    if (ability.id === 'freeze' && isFreezeActive) return true;
    if (ability.id === 'core_surge' && isCoreSurgeActive) return true;

    // Cost check
    if (ability.costType === 'ep' && ep < ability.cost) return true;
    if (ability.costType === 'integrity' && hp <= 0) return true;

    return false;
  };

  const handleAbilityClick = (ability: AbilityConfig) => {
    if (isAbilityDisabled(ability)) return;

    // EP abilities: immediate selection
    if (ability.costType === 'ep') {
      onAbilityActivate(ability.id);
    }
    // Integrity abilities: show confirmation sheet
    else if (ability.requiresConfirmation) {
      onAbilityActivate(ability.id);
    }
  };

  return (
    <div className="flex-shrink-0 z-30">
      {/* Policy indicator bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-slate-900/90 border-t border-slate-800/50">
        <button
          onClick={onPolicyClick}
          className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider transition-colors hover:text-white"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span className={inPolicyCooldown ? 'text-slate-600' : 'text-blue-400'}>
            {POLICY_NAMES[currentPolicy as keyof typeof POLICY_NAMES] || currentPolicy}
          </span>
          {inPolicyCooldown && (
            <span className="text-slate-600 font-mono">{Math.ceil(policyCooldownRemaining)}s</span>
          )}
          <svg className="w-2.5 h-2.5 text-slate-600 ml-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <div className="flex items-center gap-2 text-[9px] text-slate-600">
          <span>EP {ep}/{context.ep.max}</span>
          <span>HP {hp}</span>
        </div>
      </div>

      {/* Action bar */}
      <div className="bg-slate-950/95 backdrop-blur-md border-t border-slate-800/30 px-2 py-1.5">
        <div className="flex justify-between gap-1">
          {/* Policy Button (standalone) */}
          <ActionButton
            icon="📋"
            label="Policy"
            onClick={onPolicyClick}
            disabled={inPolicyCooldown}
            isActive={false}
            badge={inPolicyCooldown ? `${Math.ceil(policyCooldownRemaining)}s` : undefined}
          />

          {ABILITIES.map((ability) => {
            const disabled = isAbilityDisabled(ability);
            const isSelected = selectedAbility === ability.id;
            const isCurrentlyActive = (ability.id === 'turbo' && isTurboActive) ||
                                      (ability.id === 'freeze' && isFreezeActive) ||
                                      (ability.id === 'core_surge' && isCoreSurgeActive);

            return (
              <ActionButton
                key={ability.id}
                icon={isCurrentlyActive ? '✓' : ability.icon}
                label={ability.label}
                onClick={() => handleAbilityClick(ability)}
                disabled={disabled || isCurrentlyActive}
                isActive={isSelected || isCurrentlyActive}
                badge={`${ability.costType === 'ep' ? '' : '♥'}${ability.cost}`}
                badgeColor={ability.costType === 'ep' ? (ep >= ability.cost ? 'text-cyan-400' : 'text-red-400') : 'text-red-400'}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
  isActive,
  badge,
  badgeColor,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  disabled: boolean;
  isActive: boolean;
  badge?: string;
  badgeColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded-lg transition-all flex-1 min-w-0 ${
        isActive
          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
          : disabled
            ? 'bg-slate-900/50 text-slate-700 cursor-not-allowed'
            : 'bg-slate-900/70 text-slate-400 hover:text-white hover:bg-slate-800/70 border border-transparent'
      }`}
    >
      {badge && (
        <span className={`absolute -top-1 -right-1 text-[8px] font-bold font-mono bg-slate-950 px-1 rounded-sm border border-slate-700 ${badgeColor || 'text-slate-500'}`}>
          {badge}
        </span>
      )}
      <span className="text-sm leading-none">{icon}</span>
      <span className="text-[8px] font-bold uppercase tracking-tight truncate w-full text-center">{label}</span>
    </button>
  );
}
