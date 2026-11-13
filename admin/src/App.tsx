import { useCallback, useState } from 'react';
import { getTeamTheme } from './constants/teams';
import {
  getMainGridClassName,
  LogItem,
  TAB_SECTION_ID_MAP,
} from './constants/adminPortal';
import {
  ADMIN_PORTAL_TAB,
  AdminPortalTabId,
  loadStoredAdminTab,
  saveStoredAdminTab,
} from './constants/tabs';
import { countVisibleOverlays, loadStoredOverlayVisibility } from './utils/overlayVisibility';
import { useAdminSocketSync } from './hooks/useAdminSocketSync';
import { useAdminInteractionActions } from './hooks/useAdminInteractionActions';
import { useAutoSummonRunner } from './hooks/useAutoSummonRunner';
import { AdminHeader } from './components/AdminHeader';
import { AdminTabBar } from './components/AdminTabBar';
import { AdminTokenGate } from './components/AdminTokenGate';
import { useAdminTokenGate } from './hooks/useAdminTokenGate';
import { TiktokConnectionBanner } from './components/TiktokConnectionBanner';
import { TeamConfigPanel } from './components/TeamConfigPanel';
import { SilverScrapesControls } from './components/SilverScrapesControls';
import { AdminLikeChatCard } from './components/AdminLikeChatCard';
import { AdminSummonSection } from './components/AdminSummonSection';
import { AdminGiftCard } from './components/AdminGiftCard';
import { AdminMatchControlSection } from './components/AdminMatchControlSection';
import { AdminBossMapSection } from './components/AdminBossMapSection';
import { OverlayControls } from './components/OverlayControls';
import { AdminEventLogSection } from './components/AdminEventLogSection';

export { detectSummonCommand } from './utils/commentCommand';

export function App() {
  const [logs, setLogs] = useState<LogItem[]>([]);

  const addLog = useCallback((type: string, message: string, team?: string) => {
    const newLog: LogItem = {
      id: `log-${Date.now()}-${Math.random()}`,
      time: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
      type,
      message,
      team,
    };
    setLogs((prev) => [newLog, ...prev.slice(0, 99)]);
  }, []);

  const socketSync = useAdminSocketSync(addLog);
  const tokenGate = useAdminTokenGate();
  const actions = useAdminInteractionActions({
    activeTeams: socketSync.teamConfig.activeTeams,
    onLog: addLog,
  });

  const autoRunner = useAutoSummonRunner({
    selectedTeam: actions.selectedTeam,
    selectedChampion: actions.selectedChampion,
    summonerName: actions.summonerName,
    onLog: addLog,
  });

  const [activeTab, setActiveTab] = useState<AdminPortalTabId>(loadStoredAdminTab);
  const [activeOverlayCount, setActiveOverlayCount] = useState<number>(() =>
    countVisibleOverlays(loadStoredOverlayVisibility())
  );

  const handleSelectTab = (tabId: AdminPortalTabId) => {
    setActiveTab(tabId);
    saveStoredAdminTab(tabId);
    const targetSectionId = TAB_SECTION_ID_MAP[tabId];
    if (targetSectionId) {
      setTimeout(() => {
        document.getElementById(targetSectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  };

  const leftTeam = socketSync.teamConfig.activeTeams.BLG;
  const rightTeam = socketSync.teamConfig.activeTeams.GENG;
  const leftTheme = getTeamTheme(leftTeam.colorTheme);
  const rightTheme = getTeamTheme(rightTeam.colorTheme);

  const isAllTab = activeTab === ADMIN_PORTAL_TAB.ALL;
  const shouldShowTeams = isAllTab || activeTab === ADMIN_PORTAL_TAB.TEAMS;
  const shouldShowSeriesDuel = isAllTab || activeTab === ADMIN_PORTAL_TAB.SERIES_DUEL;
  const shouldShowInteraction = isAllTab || activeTab === ADMIN_PORTAL_TAB.INTERACTION;
  const shouldShowBossMap = isAllTab || activeTab === ADMIN_PORTAL_TAB.BOSS_MAP;
  const shouldShowOverlays =
    isAllTab ||
    activeTab === ADMIN_PORTAL_TAB.OVERLAYS ||
    activeTab === ADMIN_PORTAL_TAB.INTERACTION;
  const shouldShowLogs = isAllTab || activeTab === ADMIN_PORTAL_TAB.LOGS;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-2.5 sm:p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <AdminHeader onResetBoss={actions.handleResetBoss} />

        {/* Section Navigation Tabs (Top-most & Sticky) */}
        <div className="sticky top-0 sm:top-2 z-40">
          <AdminTabBar
            activeTab={activeTab}
            activeOverlayCount={activeOverlayCount}
            logCount={logs.length}
            onSelectTab={handleSelectTab}
          />
        </div>

        <AdminTokenGate
          savedToken={tokenGate.savedToken}
          hasAuthError={tokenGate.hasAuthError}
          isOpen={tokenGate.isGateOpen}
          onSave={tokenGate.saveToken}
          onClear={tokenGate.clearToken}
          onOpen={tokenGate.openGate}
          onClose={tokenGate.closeGate}
        />

        <TiktokConnectionBanner
          tiktokUsername={socketSync.tiktokUsername}
          tiktokStatus={socketSync.tiktokStatus}
          tiktokRoomId={socketSync.tiktokRoomId}
          reconnectAttempt={socketSync.reconnectAttempt}
          nextRetryAt={socketSync.nextRetryAt}
          isConnecting={socketSync.isConnecting}
          onUsernameChange={socketSync.setTiktokUsername}
          onConnect={socketSync.handleConnectTiktok}
          onDisconnect={socketSync.handleDisconnectTiktok}
        />

        {/* Team Configuration Panel */}
        <div id="section-teams" className={`scroll-mt-24 ${shouldShowTeams ? 'block' : 'hidden'}`}>
          <TeamConfigPanel teamConfig={socketSync.teamConfig} onLog={addLog} />
        </div>

        {/* Section: Series Format (BO1/BO3/BO5) & Silver Scrapes 1v1 */}
        <div
          id="section-series-duel"
          className={`scroll-mt-24 ${shouldShowSeriesDuel ? 'block' : 'hidden'}`}
        >
          <SilverScrapesControls />
        </div>

        {/* Main Section Grid */}
        <div id="section-interaction" className={`scroll-mt-24 ${getMainGridClassName(activeTab)}`}>
          <AdminLikeChatCard
            visible={shouldShowInteraction}
            leftTeam={leftTeam}
            rightTeam={rightTeam}
            leftTheme={leftTheme}
            rightTheme={rightTheme}
            chatTeam={actions.chatTeam}
            customComment={actions.customComment}
            onChatTeamChange={actions.setChatTeam}
            onCustomCommentChange={actions.setCustomComment}
            onSendLikes={actions.handleSendLikes}
            onSendCustomChat={actions.handleSendCustomChat}
          />

          <AdminSummonSection
            visible={shouldShowInteraction}
            leftTeam={leftTeam}
            rightTeam={rightTeam}
            leftTheme={leftTheme}
            rightTheme={rightTheme}
            summonerName={actions.summonerName}
            selectedChampion={actions.selectedChampion}
            selectedTeam={actions.selectedTeam}
            isAutoSummonActive={autoRunner.isAutoSummonActive}
            autoSummonSpeed={autoRunner.autoSummonSpeed}
            autoSummonBatchSize={autoRunner.autoSummonBatchSize}
            autoSummonAlternateTeams={autoRunner.autoSummonAlternateTeams}
            autoSummonRandomChampions={autoRunner.autoSummonRandomChampions}
            onSummonerNameChange={actions.setSummonerName}
            onSelectChampion={actions.setSelectedChampion}
            onSelectTeam={actions.setSelectedTeam}
            onSummon={actions.handleSummon}
            onRandomSummon={() => actions.handleRandomSummon()}
            onSwarmSummon={actions.handleSwarmSummon}
            onToggleAutoSummon={() =>
              autoRunner.setIsAutoSummonActive(!autoRunner.isAutoSummonActive)
            }
            onAutoSummonSpeedChange={autoRunner.setAutoSummonSpeed}
            onAutoSummonBatchSizeChange={autoRunner.setAutoSummonBatchSize}
            onAutoSummonAlternateTeamsChange={autoRunner.setAutoSummonAlternateTeams}
            onAutoSummonRandomChampionsChange={autoRunner.setAutoSummonRandomChampions}
          />

          <AdminGiftCard
            visible={shouldShowInteraction}
            leftTeam={leftTeam}
            rightTeam={rightTeam}
            leftTheme={leftTheme}
            rightTheme={rightTheme}
            donorName={actions.donorName}
            giftTeam={actions.giftTeam}
            selectedGift={actions.selectedGift}
            onDonorNameChange={actions.setDonorName}
            onGiftTeamChange={actions.setGiftTeam}
            onSelectGift={actions.setSelectedGift}
            onSendGift={actions.handleSendGift}
          />

          <AdminMatchControlSection
            visible={shouldShowBossMap}
            bossHp={actions.bossHp}
            seriesConfig={socketSync.seriesConfig}
            currentRound={socketSync.currentRound}
            bo5Score={socketSync.bo5Score}
            leftTeam={leftTeam}
            rightTeam={rightTeam}
            leftTheme={leftTheme}
            rightTheme={rightTheme}
            isBotActive={autoRunner.isBotActive}
            botSpeed={autoRunner.botSpeed}
            onSetBossHp={actions.handleSetBossHp}
            onBo5Control={socketSync.handleBo5Control}
            onToggleBot={() => autoRunner.setIsBotActive(!autoRunner.isBotActive)}
            onBotSpeedChange={autoRunner.setBotSpeed}
          />
        </div>

        <AdminBossMapSection
          visible={shouldShowBossMap}
          selectedTheme={socketSync.selectedTheme}
          teamConfig={socketSync.teamConfig}
          onSelectTheme={socketSync.handleSelectTheme}
        />

        {/* Section 7: Section Visibility Controls (Overlay Controls) */}
        <div
          id="section-overlays"
          className={`scroll-mt-24 ${shouldShowOverlays ? 'block' : 'hidden'}`}
        >
          <OverlayControls
            onActiveCountChange={setActiveOverlayCount}
            leftTag={leftTeam.shortTag}
            rightTag={rightTeam.shortTag}
          />
        </div>

        <AdminEventLogSection
          visible={shouldShowLogs}
          logs={logs}
          leftTeam={leftTeam}
          rightTeam={rightTeam}
          leftTheme={leftTheme}
          rightTheme={rightTheme}
          onClearLogs={() => setLogs([])}
        />
      </div>
    </div>
  );
}

export default App;
