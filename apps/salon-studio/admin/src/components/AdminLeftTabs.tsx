import React, { useState } from 'react';
import { Bot, Radio, Sliders } from 'lucide-react';
import { AudioHostPanel } from './AudioHostPanel';
import { LiveControlsPanel } from './LiveControlsPanel';
import { LiveSimulatorPanel } from './LiveSimulatorPanel';
import { PreviewControlsBlock } from './PreviewControlsBlock';
import { TikTokConnectPanel } from './TikTokConnectPanel';

type AdminTabKey = 'CONTROLS' | 'SIMULATOR' | 'CONNECT_AUDIO';

const TABS: Array<{ key: AdminTabKey; label: string; icon: React.FC<{ className?: string }> }> = [
  { key: 'CONTROLS', label: 'Điều Khiển & Preview', icon: Sliders },
  { key: 'SIMULATOR', label: 'Giả Lập & Auto-Bot', icon: Bot },
  { key: 'CONNECT_AUDIO', label: 'Kết Nối & Âm Thanh', icon: Radio },
];

export const AdminLeftTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTabKey>('CONTROLS');

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#FFFDF9] border-[3px] border-[#3A2825] rounded-[20px] p-2.5 shadow-[0_4px_0_#3A2825] overflow-hidden">
      {/* Tab Navigation Bar */}
      <div className="shrink-0 grid grid-cols-3 gap-1.5 p-1 bg-[#F5E6DD] rounded-xl border-2 border-[#3A2825] mb-2.5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`py-1.5 px-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition ${
                isActive
                  ? 'bg-[#FFD56B] text-[#3A2825] border-2 border-[#3A2825] shadow-sm'
                  : 'text-[#7D6059] hover:text-[#3A2825] hover:bg-white/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Panels (Scrollable within tab container, no page overflow) */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
        {activeTab === 'CONTROLS' && (
          <div className="space-y-2.5">
            {/* Controls Block for Preview & Quick Sandbox Tests (Moved from right panel) */}
            <PreviewControlsBlock />
            {/* Salon Operation & Host Direct Interventions */}
            <LiveControlsPanel />
          </div>
        )}

        {activeTab === 'SIMULATOR' && (
          <div className="space-y-2.5">
            <LiveSimulatorPanel />
          </div>
        )}

        {activeTab === 'CONNECT_AUDIO' && (
          <div className="space-y-2.5">
            <TikTokConnectPanel />
            <AudioHostPanel />
          </div>
        )}
      </div>
    </div>
  );
};
