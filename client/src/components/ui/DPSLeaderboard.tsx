import { LeaderboardCycler } from './LeaderboardCycler';

export { LeaderboardCycler };

/**
 * Bottom-left HUD leaderboard panel: renders the rotating dual-board `<LeaderboardCycler />`
 * ("🏆 TOP PHIÊN LIVE" ↔ "🔥 TOP VÁN HIỆN TẠI" every 10 seconds with 3D vertical flip).
 */
export const DPSLeaderboard = LeaderboardCycler;
