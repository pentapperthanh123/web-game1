import {
  BOSS_CAPTION,
  CASTER_CALMER_INTENSITY,
  CASTER_DIALOGUE,
  CASTER_INTENSITY,
  CASTER_PRIORITY,
  CASTER_PRIORITY_TTL_MS,
  CASTER_QUEUE,
  CASTER_SIGNAL,
  CASTER_SPEAKER,
  CASTER_SPEECH,
  CASTER_VOICE,
  CasterIntensity,
  CasterPriority,
  CasterRole,
  CasterSignal,
  CasterSpeaker,
  CasterVoice,
  DEFAULT_CASTER_SPEAKER,
  isDonateSignal,
  resolveSpeakerRole,
} from '../../constants/caster';
import { BOSS_VOICE_KIND } from '../../constants/sfx';
import { useGameStore } from '../../store/gameStore';
import { playBossVoice } from '../bossVoice';
import { TeamType } from '../../constants/game';
import { CasterSubtitleTurn, useCasterStore } from '../../store/casterStore';
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
  /** Explicit voice; otherwise the speaker's voice. */
  role?: CasterRole;
  intensity?: CasterIntensity;
  /** Which caster says it (A by default). */
  speaker?: CasterSpeaker;
  /** Turns of one two-caster exchange share an id and are said back to back, in `turnIndex` order. */
  exchangeId?: number;
  turnIndex?: number;
}

interface QueuedLine extends CasterLine {
  id: number;
}

interface TurnVoice {
  role: CasterRole;
  intensity: CasterIntensity;
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

/** After one of these the rest of an exchange is dropped: a reply to a line nobody heard is worse than silence. */
const EXCHANGE_STOP_OUTCOMES = new Set<SpeechOutcome>([
  SPEECH_OUTCOME.INTERRUPTED,
  SPEECH_OUTCOME.EXPIRED,
  SPEECH_OUTCOME.FAILED,
]);

const BOSS_HP_RATIO_CLIMAX = 0.2;
const BOSS_HP_RATIO_HYPE = 0.5;
const FIRST_TURN_INDEX = 0;

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const estimateSubtitleMs = (text: string): number =>
  Math.max(CASTER_SPEECH.SUBTITLE_MIN_MS, text.length * CASTER_SPEECH.SUBTITLE_MS_PER_CHAR);

const byTurnIndex = (a: QueuedLine, b: QueuedLine): number => (a.turnIndex ?? 0) - (b.turnIndex ?? 0);

/** Commentary gets louder as the boss gets lower. */
const resolveDefaultIntensity = (): CasterIntensity => {
  const gameState = useGameStore.getState();
  const bossHpRatio = gameState.bossMaxHp > 0 ? gameState.bossHp / gameState.bossMaxHp : 1;
  if (bossHpRatio <= BOSS_HP_RATIO_CLIMAX) return CASTER_INTENSITY.CLIMAX;
  if (bossHpRatio <= BOSS_HP_RATIO_HYPE) return CASTER_INTENSITY.HYPE;
  return CASTER_INTENSITY.NORMAL;
};

/** The voice of a turn follows its speaker; B stays one notch calmer than A at the same moment. */
const resolveTurnVoice = (line: QueuedLine, defaultIntensity: CasterIntensity): TurnVoice => {
  const speaker = line.speaker ?? DEFAULT_CASTER_SPEAKER;
  const baseIntensity = line.intensity ?? defaultIntensity;
  return {
    role: line.role ?? resolveSpeakerRole(speaker),
    intensity: speaker === CASTER_SPEAKER.B ? CASTER_CALMER_INTENSITY[baseIntensity] : baseIntensity,
  };
};

const resolveDonateDefaultIntensity = (line: QueuedLine): CasterIntensity =>
  line.signal === CASTER_SIGNAL.GIFT_MEGA ? CASTER_INTENSITY.CLIMAX : CASTER_INTENSITY.HYPE;

const toSubtitleTurn = (line: QueuedLine): CasterSubtitleTurn => ({
  speaker: line.speaker ?? DEFAULT_CASTER_SPEAKER,
  text: line.text,
});

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
 * A two-caster exchange is several lines sharing an `exchangeId`: they are said back to back with a
 * short breath, every reply's clip must be ready before it plays, and an interrupted exchange is dropped.
 */
class PresentationQueue {
  private pendingMain: QueuedLine[] = [];
  private pendingDonate: QueuedLine[] = [];
  private currentMain: QueuedLine | null = null;
  private currentDonate: QueuedLine | null = null;
  private nextId = 1;
  private nextExchangeId = 1;
  private lastP4At = 0;
  private lastSummonTeam: TeamType | null = null;
  private lastSpeechEndAt = Date.now();
  private mainPumpTimer: ReturnType<typeof setTimeout> | null = null;
  private donatePumpTimer: ReturnType<typeof setTimeout> | null = null;

  public enqueue(line: CasterLine): void {
    this.enqueueLine(line, false);
  }

  /** Queues the turns of one exchange; every turn's clip is fetched now so the replies land on time. */
  public enqueueExchange(turns: readonly CasterLine[]): void {
    if (turns.length === 0) return;
    const exchangeId = this.nextExchangeId++;
    turns.forEach((turn, turnIndex) => this.enqueueLine({ ...turn, exchangeId, turnIndex }, true));
  }

  private enqueueLine(line: CasterLine, isExchangeTurn: boolean): void {
    if (!useCasterStore.getState().isTtsEnabled) return;
    if (isCurrentRoundIntroActive() && line.voice === CASTER_VOICE.BOSS) return;
    const text = toSpeakableText(line.text);
    if (!text) return;
    const speaker = line.speaker ?? DEFAULT_CASTER_SPEAKER;
    const queued: QueuedLine = { ...line, text, speaker, id: this.nextId++ };
    const isFirstTurn = (queued.turnIndex ?? FIRST_TURN_INDEX) === FIRST_TURN_INDEX;

    if (isDonateSignal(queued.signal)) {
      const isMegaOpening = queued.signal === CASTER_SIGNAL.GIFT_MEGA && isFirstTurn;
      const isBigOpening = queued.signal === CASTER_SIGNAL.GIFT_BIG && isFirstTurn;
      const isMediumOpening = queued.signal === CASTER_SIGNAL.GIFT_MEDIUM && isFirstTurn;

      if (isMegaOpening) {
        casterSpeechEngine.interruptAll();
        this.pendingDonate = [];
        this.pendingDonate.unshift(queued);
      } else if (isBigOpening) {
        casterSpeechEngine.interruptDonate();
        if (this.currentMain && this.currentMain.priority >= CASTER_PRIORITY.P3) {
          casterSpeechEngine.interrupt();
        }
        this.pendingDonate = this.pendingDonate.filter((l) => l.signal === CASTER_SIGNAL.GIFT_MEGA);
        this.pendingDonate.unshift(queued);
      } else if (isMediumOpening) {
        if (
          this.currentDonate &&
          this.currentDonate.signal !== CASTER_SIGNAL.GIFT_MEGA &&
          this.currentDonate.signal !== CASTER_SIGNAL.GIFT_BIG
        ) {
          casterSpeechEngine.interruptDonate();
        }
        this.pendingDonate.unshift(queued);
      } else {
        this.pendingDonate.push(queued);
      }
      this.trimDonateOverflow();
      this.prefetchTurn(queued, resolveDonateDefaultIntensity(queued));
      this.scheduleDonatePump(0);
      return;
    }

    const isCombatCritical =
      queued.signal === CASTER_SIGNAL.BOSS_SKILL ||
      queued.signal === CASTER_SIGNAL.BOSS_ULTIMATE ||
      queued.signal === CASTER_SIGNAL.BOSS_ENRAGE ||
      queued.signal === CASTER_SIGNAL.ROUND_WIN ||
      queued.signal === CASTER_SIGNAL.ROUND_FINISHER;

    if (isCombatCritical && isFirstTurn) {
      // Clear out stale low-priority lines so they never play after the critical event
      this.pendingMain = this.pendingMain.filter((l) => l.priority <= CASTER_PRIORITY.P2);
      this.pendingMain.unshift(queued);
      if (this.currentMain !== null && this.currentMain.priority > CASTER_PRIORITY.P1) {
        casterSpeechEngine.interrupt();
      }
      this.prefetchTurn(queued, resolveDefaultIntensity());
      this.scheduleMainPump(0);
      return;
    }

    this.pendingMain.push(queued);
    this.trimMainOverflow();
    const isSpoken = queued.voice !== CASTER_VOICE.BOSS;
    if (isSpoken && (queued.priority <= CASTER_QUEUE.PREFETCH_MAX_PRIORITY || isExchangeTurn)) {
      this.prefetchTurn(queued, resolveDefaultIntensity());
    }
    const isPreempting =
      isFirstTurn &&
      this.currentMain !== null &&
      ((queued.priority === CASTER_PRIORITY.P1 && this.currentMain.priority > CASTER_PRIORITY.P1) ||
        (queued.priority <= CASTER_PRIORITY.P2 && this.currentMain.priority >= CASTER_PRIORITY.P3));
    if (isPreempting) casterSpeechEngine.interrupt();
    this.scheduleMainPump(0);
  }

  private prefetchTurn(line: QueuedLine, defaultIntensity: CasterIntensity): void {
    const { role, intensity } = resolveTurnVoice(line, defaultIntensity);
    casterSpeechEngine.prefetch(line.text, getCasterLang(), role, intensity);
  }

  public isBusy(): boolean {
    return (
      this.currentMain !== null ||
      this.pendingMain.length > 0 ||
      this.currentDonate !== null ||
      this.pendingDonate.length > 0 ||
      casterSpeechEngine.isSpeaking()
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

  /** The other turns of `first`'s exchange, taken out of the pending list, in speaking order. */
  private takeExchangeTurns(first: QueuedLine, pending: QueuedLine[]): QueuedLine[] {
    if (first.exchangeId === undefined) return [first];
    const others = pending.filter((line) => line.exchangeId === first.exchangeId);
    const otherIds = new Set(others.map((line) => line.id));
    const remaining = pending.filter((line) => !otherIds.has(line.id));
    pending.splice(0, pending.length, ...remaining);
    return [first, ...others].sort(byTurnIndex);
  }

  /** A reply only plays if its clip is ready in time; otherwise the exchange ends there (no holes). */
  private isReplyReady(line: QueuedLine, voice: TurnVoice): Promise<boolean> {
    return casterSpeechEngine.isClipReady(
      line.text,
      getCasterLang(),
      voice.role,
      voice.intensity,
      CASTER_DIALOGUE.TURN_READY_WAIT_MS
    );
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
    void this.speakDonateExchange(this.takeExchangeTurns(next, this.pendingDonate));
  }

  private async speakDonateExchange(turns: QueuedLine[]): Promise<void> {
    let previousTurn: CasterSubtitleTurn | undefined;
    for (let index = 0; index < turns.length; index += 1) {
      const line = turns[index];
      const voice = resolveTurnVoice(line, resolveDonateDefaultIntensity(line));
      if (index > FIRST_TURN_INDEX) {
        if (!(await this.isReplyReady(line, voice))) break;
        await wait(CASTER_DIALOGUE.TURN_GAP_MS);
      }
      this.currentDonate = line;
      const outcome = await this.speakDonateTurn(line, voice, previousTurn);
      if (outcome === SPEECH_OUTCOME.AUTOPLAY_BLOCKED) {
        this.holdUntilDonateVoiceUnlocked(turns.slice(index));
        return;
      }
      if (EXCHANGE_STOP_OUTCOMES.has(outcome)) break;
      previousTurn = toSubtitleTurn(line);
    }
    this.currentDonate = null;
    this.scheduleDonatePump(CASTER_SPEECH.DONATE_GAP_MS);
  }

  private async speakDonateTurn(
    line: QueuedLine,
    voice: TurnVoice,
    previousTurn: CasterSubtitleTurn | undefined
  ): Promise<SpeechOutcome> {
    const showSubtitle = (): void =>
      useCasterStore.setState({
        donateSubtitle: {
          id: line.id,
          text: line.text,
          priority: line.priority,
          voice: CASTER_VOICE.CASTER,
          speaker: line.speaker,
          previousTurn,
        },
      });

    const outcome = await casterSpeechEngine.speakDonate(
      line.text,
      getCasterLang(),
      showSubtitle,
      line.deadlineAt,
      voice.role,
      voice.intensity
    );
    if (outcome === SPEECH_OUTCOME.AUTOPLAY_BLOCKED) return outcome;

    if (SUBTITLE_ONLY_OUTCOMES.has(outcome)) {
      showSubtitle();
      await wait(estimateSubtitleMs(line.text));
    }
    if (outcome !== SPEECH_OUTCOME.EXPIRED) await wait(CASTER_SPEECH.SUBTITLE_LINGER_MS);
    if (useCasterStore.getState().donateSubtitle?.id === line.id) {
      useCasterStore.setState({ donateSubtitle: null });
    }
    return outcome;
  }

  private holdUntilDonateVoiceUnlocked(lines: readonly QueuedLine[]): void {
    this.pendingDonate.unshift(...lines);
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
      void this.speakMainExchange(this.takeExchangeTurns(next, this.pendingMain));
      return;
    }
    this.lastSummonTeam = next.team ?? null;
    void this.speakMainExchange([this.mergeSummonWave(next)]);
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

  /**
   * Says the turns of one exchange (a single line is an exchange of one). With a backlog waiting,
   * only the first turn is said so the fight keeps its pace.
   */
  private async speakMainExchange(turns: QueuedLine[]): Promise<void> {
    const isBacklogged = this.pendingMain.length > CASTER_DIALOGUE.MAX_BACKLOG_LINES;
    const playable = isBacklogged ? turns.slice(0, 1) : turns;
    const defaultIntensity = resolveDefaultIntensity();
    let previousTurn: CasterSubtitleTurn | undefined;
    let lastLine: QueuedLine = playable[0];

    for (let index = 0; index < playable.length; index += 1) {
      const line = playable[index];
      const voice = resolveTurnVoice(line, defaultIntensity);
      if (index > FIRST_TURN_INDEX) {
        if (!(await this.isReplyReady(line, voice))) break;
        await wait(CASTER_DIALOGUE.TURN_GAP_MS);
      }
      this.currentMain = line;
      lastLine = line;
      const outcome = await this.speakMainTurn(line, voice, previousTurn);
      if (outcome === SPEECH_OUTCOME.AUTOPLAY_BLOCKED) {
        this.holdUntilMainVoiceUnlocked(playable.slice(index));
        return;
      }
      if (EXCHANGE_STOP_OUTCOMES.has(outcome)) break;
      previousTurn = toSubtitleTurn(line);
    }

    this.currentMain = null;
    this.lastSpeechEndAt = Date.now();
    if (lastLine.priority === CASTER_PRIORITY.P4) this.lastP4At = this.lastSpeechEndAt;
    this.scheduleMainPump(CASTER_QUEUE.LINE_GAP_MS);
  }

  private async speakMainTurn(
    line: QueuedLine,
    voice: TurnVoice,
    previousTurn: CasterSubtitleTurn | undefined
  ): Promise<SpeechOutcome> {
    const lineVoice = line.voice ?? CASTER_VOICE.CASTER;
    const showSubtitle = (): void =>
      useCasterStore.setState({
        subtitle: {
          id: line.id,
          text: line.text,
          priority: line.priority,
          voice: lineVoice,
          speaker: lineVoice === CASTER_VOICE.BOSS ? undefined : line.speaker,
          previousTurn,
        },
      });
    if (lineVoice === CASTER_VOICE.BOSS) return this.showBossLine(line, showSubtitle);

    const outcome = await casterSpeechEngine.speakMain(
      line.text,
      getCasterLang(),
      showSubtitle,
      line.deadlineAt,
      voice.role,
      voice.intensity
    );
    if (outcome === SPEECH_OUTCOME.AUTOPLAY_BLOCKED) return outcome;

    if (SUBTITLE_ONLY_OUTCOMES.has(outcome)) {
      showSubtitle();
      await wait(estimateSubtitleMs(line.text));
    }
    if (outcome !== SPEECH_OUTCOME.EXPIRED) await wait(CASTER_SPEECH.SUBTITLE_LINGER_MS);
    if (useCasterStore.getState().subtitle?.id === line.id) useCasterStore.setState({ subtitle: null });
    return outcome;
  }

  private holdUntilMainVoiceUnlocked(lines: readonly QueuedLine[]): void {
    this.pendingMain.unshift(...lines);
    this.currentMain = null;
    void casterSpeechEngine.whenUnlocked().then(() => this.scheduleMainPump(0));
  }

  /** The boss roars with its own voice SFX while its line is shown as a caption. */
  private async showBossLine(line: QueuedLine, showSubtitle: () => void): Promise<SpeechOutcome> {
    if (isCurrentRoundIntroActive()) return SPEECH_OUTCOME.EXPIRED;
    playBossVoice(useGameStore.getState().gameTheme, BOSS_VOICE_KIND.ROAR);
    showSubtitle();
    await wait(Math.max(BOSS_CAPTION.MIN_MS, line.text.length * BOSS_CAPTION.MS_PER_CHAR));
    if (useCasterStore.getState().subtitle?.id === line.id) useCasterStore.setState({ subtitle: null });
    return SPEECH_OUTCOME.SPOKEN;
  }
}

export const casterQueue = new PresentationQueue();
