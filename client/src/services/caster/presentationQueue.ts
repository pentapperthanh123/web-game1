import {
  BOSS_CAPTION,
  CASTER_PRIORITY,
  CASTER_PRIORITY_TTL_MS,
  CASTER_QUEUE,
  CASTER_SIGNAL,
  CASTER_SPEECH,
  CASTER_VOICE,
  CasterPriority,
  CasterSignal,
  CasterVoice,
  isDonateSignal,
} from '../../constants/caster';
import { BOSS_VOICE_KIND } from '../../constants/sfx';
import { useGameStore } from '../../store/gameStore';
import { playBossVoice } from '../bossVoice';
import { TeamType } from '../../constants/game';
import { useCasterStore } from '../../store/casterStore';
import { isCurrentRoundIntroActive } from '../../store/roundIntroStore';
import { composeCasterLine, getCasterLang, joinSpokenNames } from './casterComposer';
import { casterSpeechEngine, SPEECH_OUTCOME, SpeechOutcome } from './speechEngine';

export interface CasterLine {
  signal: CasterSignal;
  priority: CasterPriority;
  text: string;
  createdAt: number;
  /** Summons only: used to merge a wave of one team into a single line. */
  team?: TeamType;
  teamTag?: string;
  speakerName?: string;
  /** Who speaks: the caster (default) or the boss (roar + caption, no speech). */
  voice?: CasterVoice;
  /** Overrides the priority TTL for lines that belong to one long sequence. */
  ttlMs?: number;
  /** Epoch ms by which the line should have finished (sped up to fit, e.g. intro card lines). */
  deadlineAt?: number;
}

interface QueuedLine extends CasterLine {
  id: number;
}

/** Emoji and pictographs would be spelled out by the TTS voice. */
const PICTOGRAPHS = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu;
const WHITESPACE_RUN = /\s+/g;
export const toSpeakableText = (text: string): string =>
  text.replace(PICTOGRAPHS, '').replace(WHITESPACE_RUN, ' ').trim();

/** Outcomes where viewers still get the caption although nothing was heard. */
const SUBTITLE_ONLY_OUTCOMES = new Set<SpeechOutcome>([
  SPEECH_OUTCOME.SUSPENDED,
  SPEECH_OUTCOME.UNAVAILABLE,
]);

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const estimateSubtitleMs = (text: string): number =>
  Math.max(CASTER_SPEECH.SUBTITLE_MIN_MS, text.length * CASTER_SPEECH.SUBTITLE_MS_PER_CHAR);

interface RollCall {
  names: string[];
  lineIds: Set<number>;
}

/**
 * Picks the summoners named by one roll-call line, oldest first, until the line is full.
 * Lines that do not fit stay queued and are named by the next roll call.
 */
const pickRollCall = (lines: readonly QueuedLine[]): RollCall => {
  const names: string[] = [];
  const lineIds = new Set<number>();
  let usedChars = 0;
  for (const line of lines) {
    const name = line.speakerName;
    if (!name) continue;
    const isAlreadyNamed = names.includes(name);
    const hasRoom = usedChars + name.length <= CASTER_QUEUE.ROLLCALL_MAX_NAME_CHARS;
    if (!isAlreadyNamed && !hasRoom) continue;
    lineIds.add(line.id);
    if (isAlreadyNamed) continue;
    names.push(name);
    usedChars += name.length + CASTER_QUEUE.SPOKEN_NAME_SEPARATOR.length;
  }
  return { names, lineIds };
};

const byPriorityThenAge = (a: QueuedLine, b: QueuedLine): number =>
  a.priority - b.priority || a.createdAt - b.createdAt;

/**
 * Dual-channel Presentation Queue:
 * - Channel 1 (Main Commentary): Priority ladder P1..P5 for general game events, summons & banter.
 * - Channel 2 (Donate Voice): High-priority parallel channel for donation shoutouts that plays
 *   simultaneously, ducking ongoing commentary so donors are never delayed or dropped.
 */
class PresentationQueue {
  private pendingMain: QueuedLine[] = [];
  private pendingDonate: QueuedLine[] = [];
  private currentMain: QueuedLine | null = null;
  private currentDonate: QueuedLine | null = null;
  private nextId = 1;
  private lastP4At = 0;
  private lastSummonTeam: TeamType | null = null;
  private lastSpeechEndAt = Date.now();
  private mainPumpTimer: ReturnType<typeof setTimeout> | null = null;
  private donatePumpTimer: ReturnType<typeof setTimeout> | null = null;

  public enqueue(line: CasterLine): void {
    if (!useCasterStore.getState().isTtsEnabled) return;
    if (isCurrentRoundIntroActive() && line.voice === CASTER_VOICE.BOSS) return;
    const text = toSpeakableText(line.text);
    if (!text) return;
    const queued: QueuedLine = { ...line, text, id: this.nextId++ };

    if (isDonateSignal(queued.signal)) {
      this.pendingDonate.push(queued);
      this.trimDonateOverflow();
      casterSpeechEngine.prefetch(queued.text, getCasterLang());
      this.scheduleDonatePump(0);
      return;
    }

    this.pendingMain.push(queued);
    this.trimMainOverflow();
    const isSpoken = queued.voice !== CASTER_VOICE.BOSS;
    if (isSpoken && queued.priority <= CASTER_QUEUE.PREFETCH_MAX_PRIORITY) {
      casterSpeechEngine.prefetch(queued.text, getCasterLang());
    }
    const isPreempting =
      queued.priority === CASTER_PRIORITY.P1 &&
      this.currentMain !== null &&
      this.currentMain.priority !== CASTER_PRIORITY.P1;
    if (isPreempting) casterSpeechEngine.interrupt();
    this.scheduleMainPump(0);
  }

  public isBusy(): boolean {
    return (
      this.currentMain !== null ||
      this.pendingMain.length > 0 ||
      this.currentDonate !== null ||
      this.pendingDonate.length > 0
    );
  }

  public getSilenceMs(now: number): number {
    return this.isBusy() ? 0 : now - this.lastSpeechEndAt;
  }

  /** Drops queued (not yet spoken) lines of these signals; the line being spoken finishes. */
  public dropPending(signals: ReadonlySet<CasterSignal>): void {
    this.pendingMain = this.pendingMain.filter((line) => !signals.has(line.signal));
    this.pendingDonate = this.pendingDonate.filter((line) => !signals.has(line.signal));
  }

  public clear(): void {
    this.pendingMain = [];
    this.pendingDonate = [];
    casterSpeechEngine.interruptAll();
  }

  private trimMainOverflow(): void {
    if (this.pendingMain.length <= CASTER_QUEUE.MAX_PENDING_LINES) return;
    this.pendingMain.sort(byPriorityThenAge);
    this.pendingMain.pop();
  }

  private trimDonateOverflow(): void {
    if (this.pendingDonate.length <= CASTER_QUEUE.MAX_PENDING_LINES) return;
    this.pendingDonate.sort((a, b) => a.createdAt - b.createdAt);
    this.pendingDonate.pop();
  }

  // ── Donate Voice Channel (Parallel) ───────────────────────────────────────────

  private scheduleDonatePump(delayMs: number): void {
    if (this.donatePumpTimer) clearTimeout(this.donatePumpTimer);
    this.donatePumpTimer = setTimeout(() => {
      this.donatePumpTimer = null;
      this.pumpDonate();
    }, delayMs);
  }

  private pumpDonate(): void {
    if (this.currentDonate || casterSpeechEngine.isLocked()) return;
    const now = Date.now();
    this.pendingDonate = this.pendingDonate.filter(
      (line) => now - line.createdAt < (line.ttlMs ?? CASTER_SPEECH.DONATE_TTL_MS)
    );
    if (this.pendingDonate.length === 0) return;
    this.pendingDonate.sort((a, b) => a.createdAt - b.createdAt);

    const next = this.pendingDonate.shift();
    if (!next) return;
    void this.speakDonate(next);
  }

  private async speakDonate(line: QueuedLine): Promise<void> {
    this.currentDonate = line;
    const showSubtitle = (): void =>
      useCasterStore.setState({
        donateSubtitle: {
          id: line.id,
          text: line.text,
          priority: line.priority,
          voice: CASTER_VOICE.CASTER,
        },
      });

    const outcome = await casterSpeechEngine.speakDonate(
      line.text,
      getCasterLang(),
      showSubtitle,
      line.deadlineAt
    );

    if (outcome === SPEECH_OUTCOME.AUTOPLAY_BLOCKED) {
      this.holdUntilDonateVoiceUnlocked(line);
      return;
    }

    if (SUBTITLE_ONLY_OUTCOMES.has(outcome)) {
      showSubtitle();
      await wait(estimateSubtitleMs(line.text));
    }

    if (outcome !== SPEECH_OUTCOME.EXPIRED) await wait(CASTER_SPEECH.SUBTITLE_LINGER_MS);
    if (useCasterStore.getState().donateSubtitle?.id === line.id) {
      useCasterStore.setState({ donateSubtitle: null });
    }

    this.currentDonate = null;
    this.scheduleDonatePump(CASTER_SPEECH.DONATE_GAP_MS);
  }

  private holdUntilDonateVoiceUnlocked(line: QueuedLine): void {
    this.pendingDonate.unshift(line);
    this.currentDonate = null;
    void casterSpeechEngine.whenUnlocked().then(() => this.scheduleDonatePump(0));
  }

  // ── Main Commentary Channel ───────────────────────────────────────────────────

  private scheduleMainPump(delayMs: number): void {
    if (this.mainPumpTimer) clearTimeout(this.mainPumpTimer);
    this.mainPumpTimer = setTimeout(() => {
      this.mainPumpTimer = null;
      this.pumpMain();
    }, delayMs);
  }

  private pumpMain(): void {
    if (this.currentMain || casterSpeechEngine.isLocked()) return;
    const now = Date.now();
    this.pendingMain = this.pendingMain.filter(
      (line) => now - line.createdAt < (line.ttlMs ?? CASTER_PRIORITY_TTL_MS[line.priority])
    );
    if (this.pendingMain.length === 0) return;
    this.pendingMain.sort(byPriorityThenAge);

    const head = this.pendingMain[0];
    const p4WaitMs = CASTER_QUEUE.MIN_P4_GAP_MS - (now - this.lastP4At);
    if (head.priority === CASTER_PRIORITY.P4 && p4WaitMs > 0) {
      this.scheduleMainPump(p4WaitMs);
      return;
    }
    const next = head.signal === CASTER_SIGNAL.SUMMON ? this.pickFairSummon(head) : head;
    this.pendingMain = this.pendingMain.filter((line) => line.id !== next.id);
    if (next.signal !== CASTER_SIGNAL.SUMMON) {
      void this.speakMain(next);
      return;
    }
    this.lastSummonTeam = next.team ?? null;
    void this.speakMain(this.mergeSummonWave(next));
  }

  /** Alternates teams: a flood on one side must not starve the other side's summon lines. */
  private pickFairSummon(head: QueuedLine): QueuedLine {
    if (head.team !== this.lastSummonTeam) return head;
    const otherTeamLine = this.pendingMain.find(
      (line) => line.signal === CASTER_SIGNAL.SUMMON && line.team !== this.lastSummonTeam
    );
    return otherTeamLine ?? head;
  }

  /** Roll call: "A, B, C và D xuống đường cho T1!" names every queued summoner of that team. */
  private mergeSummonWave(first: QueuedLine): QueuedLine {
    const sameTeam = this.pendingMain.filter(
      (line) => line.signal === CASTER_SIGNAL.SUMMON && line.team === first.team
    );
    if (sameTeam.length + 1 < CASTER_QUEUE.MERGE_SUMMON_THRESHOLD) return first;

    const rollCall = pickRollCall([first, ...sameTeam]);
    if (rollCall.names.length < CASTER_QUEUE.ROLLCALL_MIN_NAMES) return this.mergeAsCount(first, sameTeam);

    this.pendingMain = this.pendingMain.filter((line) => !rollCall.lineIds.has(line.id));
    const text = composeCasterLine(CASTER_SIGNAL.SUMMON_MERGED, {
      names: joinSpokenNames(rollCall.names),
      count: rollCall.lineIds.size,
      team: first.teamTag ?? '',
    });
    return text ? { ...first, signal: CASTER_SIGNAL.SUMMON_MERGED, text } : first;
  }

  /** "T1 thêm 5 tướng!" when there are no distinct names to read. */
  private mergeAsCount(first: QueuedLine, sameTeam: readonly QueuedLine[]): QueuedLine {
    const mergedIds = new Set(sameTeam.map((line) => line.id));
    this.pendingMain = this.pendingMain.filter((line) => !mergedIds.has(line.id));
    const text = composeCasterLine(CASTER_SIGNAL.SUMMON_WAVE, {
      count: sameTeam.length + 1,
      team: first.teamTag ?? '',
    });
    return text ? { ...first, signal: CASTER_SIGNAL.SUMMON_WAVE, text } : first;
  }

  private async speakMain(line: QueuedLine): Promise<void> {
    this.currentMain = line;
    const voice = line.voice ?? CASTER_VOICE.CASTER;
    const showSubtitle = (): void =>
      useCasterStore.setState({ subtitle: { id: line.id, text: line.text, priority: line.priority, voice } });
    if (voice === CASTER_VOICE.BOSS) {
      await this.showBossLine(line, showSubtitle);
      return;
    }
    const outcome = await casterSpeechEngine.speakMain(line.text, getCasterLang(), showSubtitle, line.deadlineAt);
    if (outcome === SPEECH_OUTCOME.AUTOPLAY_BLOCKED) {
      this.holdUntilMainVoiceUnlocked(line);
      return;
    }

    if (SUBTITLE_ONLY_OUTCOMES.has(outcome)) {
      showSubtitle();
      await wait(estimateSubtitleMs(line.text));
    }
    if (outcome !== SPEECH_OUTCOME.EXPIRED) await wait(CASTER_SPEECH.SUBTITLE_LINGER_MS);
    if (useCasterStore.getState().subtitle?.id === line.id) useCasterStore.setState({ subtitle: null });

    this.currentMain = null;
    this.lastSpeechEndAt = Date.now();
    if (line.priority === CASTER_PRIORITY.P4) this.lastP4At = this.lastSpeechEndAt;
    this.scheduleMainPump(CASTER_QUEUE.LINE_GAP_MS);
  }

  private holdUntilMainVoiceUnlocked(line: QueuedLine): void {
    this.pendingMain.unshift(line);
    this.currentMain = null;
    void casterSpeechEngine.whenUnlocked().then(() => this.scheduleMainPump(0));
  }

  /** The boss roars with its own voice SFX while its line is shown as a caption. */
  private async showBossLine(line: QueuedLine, showSubtitle: () => void): Promise<void> {
    if (isCurrentRoundIntroActive()) {
      this.currentMain = null;
      return;
    }
    playBossVoice(useGameStore.getState().gameTheme, BOSS_VOICE_KIND.ROAR);
    showSubtitle();
    await wait(Math.max(BOSS_CAPTION.MIN_MS, line.text.length * BOSS_CAPTION.MS_PER_CHAR));
    if (useCasterStore.getState().subtitle?.id === line.id) useCasterStore.setState({ subtitle: null });
    this.currentMain = null;
    this.lastSpeechEndAt = Date.now();
    this.scheduleMainPump(CASTER_QUEUE.LINE_GAP_MS);
  }
}

export const casterQueue = new PresentationQueue();
