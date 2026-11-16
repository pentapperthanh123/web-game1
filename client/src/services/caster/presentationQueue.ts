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
 * Priority ladder of spec 2.4: P1 interrupts, P2 jumps the line, P3 is FIFO,
 * P4 is spaced ≥ 4 s and merged per team, P5 only fills silence. Expired lines are dropped.
 */
class PresentationQueue {
  private pending: QueuedLine[] = [];
  private current: QueuedLine | null = null;
  private nextId = 1;
  private lastP4At = 0;
  private lastSummonTeam: TeamType | null = null;
  private lastSpeechEndAt = Date.now();
  private pumpTimer: ReturnType<typeof setTimeout> | null = null;

  public enqueue(line: CasterLine): void {
    if (!useCasterStore.getState().isTtsEnabled) return;
    if (isCurrentRoundIntroActive() && line.voice === CASTER_VOICE.BOSS) return;
    const text = toSpeakableText(line.text);
    if (!text) return;
    const queued: QueuedLine = { ...line, text, id: this.nextId++ };
    this.pending.push(queued);
    this.trimOverflow();
    // Boss lines are a roar + caption: nothing to download
    const isSpoken = queued.voice !== CASTER_VOICE.BOSS;
    if (isSpoken && queued.priority <= CASTER_QUEUE.PREFETCH_MAX_PRIORITY) {
      casterSpeechEngine.prefetch(queued.text, getCasterLang());
    }
    const isPreempting =
      queued.priority === CASTER_PRIORITY.P1 && this.current !== null && this.current.priority !== CASTER_PRIORITY.P1;
    if (isPreempting) casterSpeechEngine.interrupt();
    this.schedulePump(0);
  }

  public isBusy(): boolean {
    return this.current !== null || this.pending.length > 0;
  }

  public getSilenceMs(now: number): number {
    return this.isBusy() ? 0 : now - this.lastSpeechEndAt;
  }

  /** Drops queued (not yet spoken) lines of these signals; the line being spoken finishes. */
  public dropPending(signals: ReadonlySet<CasterSignal>): void {
    this.pending = this.pending.filter((line) => !signals.has(line.signal));
  }

  public clear(): void {
    this.pending = [];
    casterSpeechEngine.interrupt();
  }

  private trimOverflow(): void {
    if (this.pending.length <= CASTER_QUEUE.MAX_PENDING_LINES) return;
    // Drop the least important, oldest line
    this.pending.sort(byPriorityThenAge);
    this.pending.pop();
  }

  private schedulePump(delayMs: number): void {
    if (this.pumpTimer) clearTimeout(this.pumpTimer);
    this.pumpTimer = setTimeout(() => {
      this.pumpTimer = null;
      this.pump();
    }, delayMs);
  }

  private pump(): void {
    if (this.current || casterSpeechEngine.isLocked()) return;
    const now = Date.now();
    this.pending = this.pending.filter(
      (line) => now - line.createdAt < (line.ttlMs ?? CASTER_PRIORITY_TTL_MS[line.priority])
    );
    if (this.pending.length === 0) return;
    this.pending.sort(byPriorityThenAge);

    const head = this.pending[0];
    const p4WaitMs = CASTER_QUEUE.MIN_P4_GAP_MS - (now - this.lastP4At);
    if (head.priority === CASTER_PRIORITY.P4 && p4WaitMs > 0) {
      this.schedulePump(p4WaitMs);
      return;
    }
    const next = head.signal === CASTER_SIGNAL.SUMMON ? this.pickFairSummon(head) : head;
    this.pending = this.pending.filter((line) => line.id !== next.id);
    if (next.signal !== CASTER_SIGNAL.SUMMON) {
      void this.speak(next);
      return;
    }
    this.lastSummonTeam = next.team ?? null;
    void this.speak(this.mergeSummonWave(next));
  }

  /** Alternates teams: a flood on one side must not starve the other side's summon lines. */
  private pickFairSummon(head: QueuedLine): QueuedLine {
    if (head.team !== this.lastSummonTeam) return head;
    const otherTeamLine = this.pending.find(
      (line) => line.signal === CASTER_SIGNAL.SUMMON && line.team !== this.lastSummonTeam
    );
    return otherTeamLine ?? head;
  }

  /** Roll call: "A, B, C và D xuống đường cho T1!" names every queued summoner of that team. */
  private mergeSummonWave(first: QueuedLine): QueuedLine {
    const sameTeam = this.pending.filter((line) => line.signal === CASTER_SIGNAL.SUMMON && line.team === first.team);
    if (sameTeam.length + 1 < CASTER_QUEUE.MERGE_SUMMON_THRESHOLD) return first;

    const rollCall = pickRollCall([first, ...sameTeam]);
    // One viewer summoning several times (or names switched off) must not be read as "A và A"
    if (rollCall.names.length < CASTER_QUEUE.ROLLCALL_MIN_NAMES) return this.mergeAsCount(first, sameTeam);

    this.pending = this.pending.filter((line) => !rollCall.lineIds.has(line.id));
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
    this.pending = this.pending.filter((line) => !mergedIds.has(line.id));
    const text = composeCasterLine(CASTER_SIGNAL.SUMMON_WAVE, {
      count: sameTeam.length + 1,
      team: first.teamTag ?? '',
    });
    return text ? { ...first, signal: CASTER_SIGNAL.SUMMON_WAVE, text } : first;
  }

  private async speak(line: QueuedLine): Promise<void> {
    this.current = line;
    const voice = line.voice ?? CASTER_VOICE.CASTER;
    const showSubtitle = (): void =>
      useCasterStore.setState({ subtitle: { id: line.id, text: line.text, priority: line.priority, voice } });
    if (voice === CASTER_VOICE.BOSS) {
      await this.showBossLine(line, showSubtitle);
      return;
    }
    const outcome = await casterSpeechEngine.speak(line.text, getCasterLang(), showSubtitle, line.deadlineAt);
    if (outcome === SPEECH_OUTCOME.AUTOPLAY_BLOCKED) {
      this.holdUntilVoiceUnlocked(line);
      return;
    }

    if (SUBTITLE_ONLY_OUTCOMES.has(outcome)) {
      showSubtitle();
      await wait(estimateSubtitleMs(line.text));
    }
    // A skipped (too late) line showed nothing, so the next one starts right away
    if (outcome !== SPEECH_OUTCOME.EXPIRED) await wait(CASTER_SPEECH.SUBTITLE_LINGER_MS);
    if (useCasterStore.getState().subtitle?.id === line.id) useCasterStore.setState({ subtitle: null });

    this.current = null;
    this.lastSpeechEndAt = Date.now();
    if (line.priority === CASTER_PRIORITY.P4) this.lastP4At = this.lastSpeechEndAt;
    this.schedulePump(CASTER_QUEUE.LINE_GAP_MS);
  }

  /**
   * Browser tab without a click yet: keep the line and carry on after the first click.
   * Lines that went stale meanwhile are dropped by TTL, intro lines past their deadline are skipped.
   */
  private holdUntilVoiceUnlocked(line: QueuedLine): void {
    this.pending.unshift(line);
    this.current = null;
    void casterSpeechEngine.whenUnlocked().then(() => this.schedulePump(0));
  }

  /** The boss roars with its own voice SFX while its line is shown as a caption. */
  private async showBossLine(line: QueuedLine, showSubtitle: () => void): Promise<void> {
    if (isCurrentRoundIntroActive()) {
      this.current = null;
      return;
    }
    playBossVoice(useGameStore.getState().gameTheme, BOSS_VOICE_KIND.ROAR);
    showSubtitle();
    await wait(Math.max(BOSS_CAPTION.MIN_MS, line.text.length * BOSS_CAPTION.MS_PER_CHAR));
    if (useCasterStore.getState().subtitle?.id === line.id) useCasterStore.setState({ subtitle: null });
    this.current = null;
    this.lastSpeechEndAt = Date.now();
    this.schedulePump(CASTER_QUEUE.LINE_GAP_MS);
  }
}

export const casterQueue = new PresentationQueue();
