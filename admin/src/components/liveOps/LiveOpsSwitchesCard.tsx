import React, { useState } from 'react';
import { BellRing, Mic, ShieldAlert } from 'lucide-react';
import { LIVE_OPS_TEXT, OPS_ALERT_FAILURE_LABEL } from '../../constants/liveOps';
import { adminSocket } from '../../services/socket';
import { CasterConfig } from '../../types/liveOps';

interface LiveOpsSwitchesCardProps {
  casterConfig: CasterConfig;
  isTelegramConfigured: boolean;
}

interface SwitchRowProps {
  label: string;
  hint: string;
  isOn: boolean;
  isDangerWhenOff?: boolean;
  onToggle: () => void;
}

const SwitchRow: React.FC<SwitchRowProps> = ({ label, hint, isOn, isDangerWhenOff = false, onToggle }) => {
  const offTone = isDangerWhenOff ? 'bg-rose-600' : 'bg-slate-700';
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-xs font-bold text-white">{label}</div>
        <div className="text-[10px] text-slate-400">{hint}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isOn}
        aria-label={label}
        onClick={onToggle}
        className={`relative w-11 h-6 shrink-0 rounded-full transition-colors ${isOn ? 'bg-emerald-500' : offTone}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${isOn ? 'translate-x-5' : ''}`}
        />
      </button>
    </div>
  );
};

const describeTestResult = (result: Awaited<ReturnType<typeof adminSocket.sendOpsAlertTest>>): string => {
  if (!result) return LIVE_OPS_TEXT.TELEGRAM_TEST_NO_RESPONSE;
  if (result.isDelivered) return LIVE_OPS_TEXT.TELEGRAM_TEST_DELIVERED;
  return result.failure ? OPS_ALERT_FAILURE_LABEL[result.failure] : LIVE_OPS_TEXT.TELEGRAM_TEST_NO_RESPONSE;
};

export const LiveOpsSwitchesCard: React.FC<LiveOpsSwitchesCardProps> = ({ casterConfig, isTelegramConfigured }) => {
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResultText, setTestResultText] = useState('');

  const handleSendTest = async () => {
    setIsSendingTest(true);
    try {
      setTestResultText(describeTestResult(await adminSocket.sendOpsAlertTest()));
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
      <div className="flex items-center justify-between gap-2 text-xs font-black uppercase text-white">
        <span className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-cyan-400" />
          {LIVE_OPS_TEXT.SWITCHES_TITLE}
        </span>
        {!casterConfig.isNameReadingEnabled && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-600 text-[10px] text-white">
            <ShieldAlert className="w-3 h-3" />
            {LIVE_OPS_TEXT.NAME_READING_OFF_BADGE}
          </span>
        )}
      </div>

      <SwitchRow
        label={LIVE_OPS_TEXT.TTS_LABEL}
        hint={LIVE_OPS_TEXT.TTS_HINT}
        isOn={casterConfig.isTtsEnabled}
        onToggle={() => adminSocket.updateCasterConfig({ isTtsEnabled: !casterConfig.isTtsEnabled })}
      />
      <SwitchRow
        label={LIVE_OPS_TEXT.NAME_READING_LABEL}
        hint={LIVE_OPS_TEXT.NAME_READING_HINT}
        isOn={casterConfig.isNameReadingEnabled}
        isDangerWhenOff
        onToggle={() => adminSocket.updateCasterConfig({ isNameReadingEnabled: !casterConfig.isNameReadingEnabled })}
      />

      <div className="pt-3 border-t border-slate-800 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-xs font-bold text-white">
            <BellRing className="w-4 h-4 text-amber-400" />
            {LIVE_OPS_TEXT.TELEGRAM_TITLE}
          </span>
          <span className={`text-[10px] font-bold ${isTelegramConfigured ? 'text-emerald-400' : 'text-amber-300'}`}>
            {isTelegramConfigured ? LIVE_OPS_TEXT.TELEGRAM_CONFIGURED : LIVE_OPS_TEXT.TELEGRAM_NOT_CONFIGURED}
          </span>
        </div>
        <button
          type="button"
          onClick={handleSendTest}
          disabled={isSendingTest}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 text-[11px] font-bold text-slate-200"
        >
          {isSendingTest ? LIVE_OPS_TEXT.TELEGRAM_TEST_SENDING : LIVE_OPS_TEXT.TELEGRAM_TEST_BUTTON}
        </button>
        {testResultText && <p className="text-[10px] text-slate-400">{testResultText}</p>}
      </div>
    </div>
  );
};
