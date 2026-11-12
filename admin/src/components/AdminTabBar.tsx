import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Swords,
  Compass,
  Sliders,
  MessageSquare,
  LayoutGrid,
  Users,
  Flame,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  ADMIN_PORTAL_TAB,
  ADMIN_PORTAL_TABS,
  AdminPortalTabId,
} from '../constants/tabs';
import { TOTAL_OVERLAY_SECTIONS } from '../utils/overlayVisibility';

interface AdminTabBarProps {
  activeTab: AdminPortalTabId;
  activeOverlayCount: number;
  logCount: number;
  onSelectTab: (tabId: AdminPortalTabId) => void;
}

const TAB_ICON_MAP: Record<AdminPortalTabId, typeof Swords> = {
  [ADMIN_PORTAL_TAB.ALL]: LayoutGrid,
  [ADMIN_PORTAL_TAB.TEAMS]: Users,
  [ADMIN_PORTAL_TAB.SERIES_DUEL]: Flame,
  [ADMIN_PORTAL_TAB.OVERLAYS]: Sliders,
  [ADMIN_PORTAL_TAB.INTERACTION]: Swords,
  [ADMIN_PORTAL_TAB.BOSS_MAP]: Compass,
  [ADMIN_PORTAL_TAB.LOGS]: MessageSquare,
};

function getTabBadge(
  tabId: AdminPortalTabId,
  activeOverlayCount: number,
  logCount: number
): string | null {
  switch (tabId) {
    case ADMIN_PORTAL_TAB.OVERLAYS:
      return `${activeOverlayCount}/${TOTAL_OVERLAY_SECTIONS}`;
    case ADMIN_PORTAL_TAB.LOGS:
      return String(logCount);
    default:
      return null;
  }
}

const SCROLL_OFFSET_PX = 200;

export const AdminTabBar: React.FC<AdminTabBarProps> = ({
  activeTab,
  activeOverlayCount,
  logCount,
  onSelectTab,
}) => {
  const navRef = useRef<HTMLElement>(null);
  const activeBtnRef = useRef<HTMLButtonElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = navRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
    const handleResize = () => updateScrollState();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateScrollState]);

  useEffect(() => {
    if (activeBtnRef.current) {
      activeBtnRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
    const timer = setTimeout(updateScrollState, 300);
    return () => clearTimeout(timer);
  }, [activeTab, updateScrollState]);

  const handleScrollLeft = () => {
    if (navRef.current) {
      navRef.current.scrollBy({ left: -SCROLL_OFFSET_PX, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (navRef.current) {
      navRef.current.scrollBy({ left: SCROLL_OFFSET_PX, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative flex items-center p-1.5 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-xl backdrop-blur-md">
      {canScrollLeft && (
        <button
          type="button"
          onClick={handleScrollLeft}
          title="Cuộn sang trái"
          className="shrink-0 p-1.5 mr-1 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white transition shadow active:scale-95 z-10"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      <nav
        ref={navRef}
        onScroll={updateScrollState}
        aria-label="Admin Portal Sections"
        className="flex-1 flex items-center gap-1.5 overflow-x-auto admin-tab-scroll touch-pan-x overscroll-x-contain pb-1.5 pt-0.5 px-0.5"
      >
        {ADMIN_PORTAL_TABS.map((tab) => {
          const Icon = TAB_ICON_MAP[tab.id];
          const isActive = activeTab === tab.id;
          const badge = getTabBadge(tab.id, activeOverlayCount, logCount);

          return (
            <button
              key={tab.id}
              ref={isActive ? activeBtnRef : undefined}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap shrink-0 transition active:scale-95 ${
                isActive
                  ? 'bg-cyan-950/90 text-cyan-300 border border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                  : 'text-slate-400 border border-transparent hover:text-slate-200 hover:bg-slate-800/70'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
              {badge !== null && (
                <span
                  className={`text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded-full shrink-0 ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {canScrollRight && (
        <button
          type="button"
          onClick={handleScrollRight}
          title="Cuộn sang phải"
          className="shrink-0 p-1.5 ml-1 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white transition shadow active:scale-95 z-10"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
