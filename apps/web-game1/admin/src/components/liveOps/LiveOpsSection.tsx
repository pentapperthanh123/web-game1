import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { LIVE_OPS_TEXT } from '../../constants/liveOps';
import { useLiveOpsState } from '../../hooks/useLiveOpsState';
import { BlockedTermsCard } from './BlockedTermsCard';
import { ChampionAliasCard } from './ChampionAliasCard';
import { ChatLimitsCard } from './ChatLimitsCard';
import { LiveOpsSwitchesCard } from './LiveOpsSwitchesCard';

/** Admin controls for unattended operation: caster switches, chat limits, blocklist, aliases. */
export const LiveOpsSection: React.FC = () => {
  const liveOpsState = useLiveOpsState();

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-black uppercase text-white">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          {LIVE_OPS_TEXT.SECTION_TITLE}
        </h2>
        <span className="text-[10px] text-slate-400">{LIVE_OPS_TEXT.SECTION_HINT}</span>
      </div>

      {!liveOpsState && (
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs text-slate-400">
          {LIVE_OPS_TEXT.LOADING}
        </div>
      )}

      {liveOpsState && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          <LiveOpsSwitchesCard
            casterConfig={liveOpsState.casterConfig}
            isTelegramConfigured={liveOpsState.opsAlert.isConfigured}
          />
          <ChatLimitsCard config={liveOpsState.chatLimitConfig} />
          <BlockedTermsCard terms={liveOpsState.moderation.blockedTerms} />
          <ChampionAliasCard aliases={liveOpsState.moderation.championAliases} />
        </div>
      )}
    </section>
  );
};
