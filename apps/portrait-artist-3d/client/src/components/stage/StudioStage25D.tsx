import React, { useEffect, useMemo, useRef, useState } from 'react';
import { STUDIO_STRINGS } from '../../../../shared/constants/i18nStrings';
import { STUDIO_LIMITS } from '../../../../shared/constants/studioConfig';
import type { CameraPreset, PortraitStyle } from '../../../../shared/types/studio';
import { CHIBI_STAND_VARIANTS, STAGE_25D_CONFIG } from '../../config/stageLayout';
import { studioSfx } from '../../engine/audio/studioSfx';
import {
  DEMO_USER_AVATAR_URLS,
  drawProceduralChibiPortrait,
  getDemoUserAvatarUrl,
  loadPortraitSource,
} from '../../engine/painting/avatarLoader';
import { BrushRevealEngine, type PaintDepthPhase } from '../../engine/painting/brushRevealEngine';
import {
  INITIAL_SEEDED_GALLERY,
  subscribeStudioVfx,
  useStudioStore,
} from '../../store/studioStore';
import { clampValue, hashString } from '../../utils/hashString';
import {
  ARM_KINEMATICS,
  canvasUVToStage,
  solveArmIK,
  stageToCanvasUV,
  type StagePoint,
} from '../../utils/stageTransform';

const FRAME_INTERVAL_MS = 1000 / STUDIO_LIMITS.TARGET_FPS;

const CAMERA_25D_TRANSFORMS: Record<CameraPreset, string> = {
  WIDE_STUDIO: 'translate3d(0px, 0px, 0px) scale(1)',
  OVER_SHOULDER: 'translate3d(-74px, 14px, 0px) scale(1.22)',
  VIP_SPOTLIGHT: 'translate3d(-112px, -22px, 0px) scale(1.25)',
  REVEAL_CLOSEUP: 'translate3d(-56px, 20px, 0px) scale(1.26)',
};

const DUST_MOTES: ReadonlyArray<{
  id: number;
  left: number;
  top: number;
  size: number;
  durationSec: number;
  delaySec: number;
}> = [
  { id: 1, left: 68, top: 290, size: 5, durationSec: 6.5, delaySec: 0.2 },
  { id: 2, left: 124, top: 345, size: 4, durationSec: 7.2, delaySec: 1.1 },
  { id: 3, left: 178, top: 390, size: 6, durationSec: 5.8, delaySec: 0.7 },
  { id: 4, left: 95, top: 460, size: 4, durationSec: 6.9, delaySec: 2.0 },
  { id: 5, left: 215, top: 440, size: 5, durationSec: 7.6, delaySec: 1.5 },
  { id: 6, left: 152, top: 520, size: 4, durationSec: 6.1, delaySec: 0.4 },
  { id: 7, left: 264, top: 495, size: 5, durationSec: 7.0, delaySec: 2.4 },
  { id: 8, left: 235, top: 585, size: 4, durationSec: 6.4, delaySec: 0.9 },
  { id: 9, left: 310, top: 540, size: 5, durationSec: 7.8, delaySec: 1.8 },
  { id: 10, left: 188, top: 645, size: 4, durationSec: 6.7, delaySec: 2.8 },
  { id: 11, left: 292, top: 635, size: 5, durationSec: 5.9, delaySec: 0.6 },
  { id: 12, left: 136, top: 590, size: 4, durationSec: 7.3, delaySec: 1.3 },
];

interface GalleryCardView {
  id: string;
  nickname: string;
  isRoyalFrame: boolean;
  dataUrl: string;
}

interface PoolParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  isHeart: boolean;
  age: number;
  maxAge: number;
}

interface TrailSample {
  x: number;
  y: number;
  alpha: number;
  color: string;
}

interface ArmPoseState {
  angleDeg: number;
  scaleX: number;
  tipStageX: number;
  tipStageY: number;
  depthPhase: PaintDepthPhase;
}

const PARTICLE_COLORS = ['#f43f5e', '#fbbf24', '#34d399', '#38bdf8', '#fb7185', '#f97316'] as const;

const QUEUE_TAG_THEMES = [
  'bg-stone-900/90 text-sky-100 border-sky-300/70',
  'bg-stone-900/90 text-rose-100 border-rose-300/70',
  'bg-stone-900/90 text-emerald-100 border-emerald-300/70',
] as const;

const CAT_SLEEP_ZZZ_PARTICLES: ReadonlyArray<{
  id: number;
  label: string;
  offsetX: number;
  offsetY: number;
  delaySec: number;
  durationSec: number;
  sizeClass: string;
}> = [
  { id: 1, label: 'z', offsetX: 0, offsetY: 0, delaySec: 0, durationSec: 3.6, sizeClass: 'text-[11px]' },
  { id: 2, label: 'Z', offsetX: 10, offsetY: -6, delaySec: 1.2, durationSec: 3.6, sizeClass: 'text-[14px]' },
  { id: 3, label: 'z', offsetX: -5, offsetY: -12, delaySec: 2.4, durationSec: 3.6, sizeClass: 'text-[12px]' },
];

const CAT_DREAM_ICONS = ['🐟', '💗', '🧶', '🥛'] as const;

function pickStandingChibiVariant(userId: string, slotIdx: number): string {
  // Guarantee adjacent queue slots display distinct chibi outfits when possible
  const idx = (hashString(userId) + slotIdx) % CHIBI_STAND_VARIANTS.length;
  return CHIBI_STAND_VARIANTS[idx];
}

function buildInitialSeededGalleryCards(): GalleryCardView[] {
  const engine = new BrushRevealEngine();
  const out: GalleryCardView[] = [];
  for (const item of INITIAL_SEEDED_GALLERY) {
    const src = drawProceduralChibiPortrait(item.userId);
    engine.preparePortrait(src, item.style, item.userId, item.isRoyalFrame, 'en');
    engine.updateProgress(1);
    const snap = engine.createGallerySnapshotCanvas(item.nickname, item.isRoyalFrame);
    out.push({
      id: item.id,
      nickname: item.nickname,
      isRoyalFrame: item.isRoyalFrame,
      dataUrl: snap.toDataURL('image/png'),
    });
  }
  return out;
}

/**
 * 2.5D Cozy Golden-Hour Anime Layered Stage (Locked 30 FPS simulation loop, 720x1280).
 * - Separated `artist-body.png` & `artist-arm.png` with shoulder-pivot atan2 + lerp synchronization
 * - Natural skin tones on all Chibi queue characters (0 hue-rotate distortion, 3 distinct outfit/hair variants)
 */
export const StudioStage25D: React.FC = () => {
  const phase = useStudioStore((s) => s.phase);
  const cameraPreset = useStudioStore((s) => s.cameraPreset);
  const artistMood = useStudioStore((s) => s.artistMood);
  const activeSession = useStudioStore((s) => s.activeSession);
  const vipQueue = useStudioStore((s) => s.vipQueue);
  const normalQueue = useStudioStore((s) => s.normalQueue);
  const paintSpeedMultiplier = useStudioStore((s) => s.paintSpeedMultiplier);
  const vipHatActiveUntil = useStudioStore((s) => s.vipHatActiveUntil);
  const config = useStudioStore((s) => s.config);

  const easelCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const vfxCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const brushEngineRef = useRef<BrushRevealEngine | null>(null);
  const preparedSessionIdRef = useRef<string | null>(null);
  const preparedStyleRef = useRef<PortraitStyle | null>(null);
  const hungSessionIdRef = useRef<string | null>(null);
  const brushUVRef = useRef<{ u: number; v: number; depthPhase: PaintDepthPhase }>({
    u: 0.5,
    v: 0.48,
    depthPhase: 'BASE_COLOR',
  });
  const currentArmRef = useRef<{ angleDeg: number; scaleX: number }>({
    angleDeg: ARM_KINEMATICS.REST_ANGLE_DEG,
    scaleX: ARM_KINEMATICS.REST_SCALE_X,
  });

  // Reusable 50-particle object pool (zero allocation in render loop)
  const particlePoolRef = useRef<PoolParticle[]>(
    Array.from({ length: ARM_KINEMATICS.MAX_BRUSH_PARTICLES }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 0,
      color: '#fff',
      isHeart: false,
      age: 0,
      maxAge: 1,
    }))
  );

  // Reusable 8-sample ring buffer for brush trail (zero allocation)
  const trailRingRef = useRef<TrailSample[]>(
    Array.from({ length: ARM_KINEMATICS.MAX_TRAIL_POINTS }, () => ({
      x: 0,
      y: 0,
      alpha: 0,
      color: 'rgba(72,56,46,0.5)',
    }))
  );
  const trailHeadIdxRef = useRef<number>(0);

  // Palette Dipping state machine
  const paletteDipRef = useRef<{
    isDipping: boolean;
    elapsedSec: number;
    durationSec: number;
    lastDabIndex: number;
    canvasResumeStagePt: StagePoint;
  }>({
    isDipping: false,
    elapsedSec: 0,
    durationSec: 1.15,
    lastDabIndex: -1,
    canvasResumeStagePt: { x: 488, y: 604 },
  });
  const timeSinceLastDipRef = useRef<number>(0);
  const lastPhaseRef = useRef<PaintDepthPhase>('SKETCH');
  const giftFlourishTimerRef = useRef<number>(0);

  const [galleryCards, setGalleryCards] = useState<GalleryCardView[]>(() =>
    buildInitialSeededGalleryCards()
  );
  const [armPose, setArmPose] = useState<ArmPoseState>(() => {
    const { artistAnchor } = STAGE_25D_CONFIG;
    const sx = artistAnchor.x + artistAnchor.bodyShoulderOffsetX;
    const sy = artistAnchor.y + artistAnchor.bodyShoulderOffsetY;
    return {
      angleDeg: ARM_KINEMATICS.REST_ANGLE_DEG,
      scaleX: ARM_KINEMATICS.REST_SCALE_X,
      tipStageX: sx - artistAnchor.armReachLengthPx * ARM_KINEMATICS.REST_SCALE_X,
      tipStageY: sy + 8,
      depthPhase: 'SKETCH',
    };
  });
  const [paletteTiltDeg, setPaletteTiltDeg] = useState<number>(0);
  const [isDabbingPalette, setIsDabbingPalette] = useState<boolean>(false);
  const [activeAvatarSrc, setActiveAvatarSrc] = useState<string>('');
  const [catDreamIdx, setCatDreamIdx] = useState<number>(0);
  const [isCatPurring, setIsCatPurring] = useState<boolean>(false);
  const [isQueueFlashing, setIsQueueFlashing] = useState<boolean>(false);
  const [easelFlash, setEaselFlash] = useState<'NONE' | 'GIFT' | 'ROYAL'>('NONE');

  // Rotate the sleeping cat's dream icon every 9 seconds & trigger cute purr hearts on VIP/fast speed
  useEffect(() => {
    const dreamTimer = window.setInterval(() => {
      setCatDreamIdx((prev) => (prev + 1) % CAT_DREAM_ICONS.length);
    }, 9000);
    return () => window.clearInterval(dreamTimer);
  }, []);

  useEffect(() => {
    if (artistMood === 'VIP_WAVE' || artistMood === 'FAST_SWEAT' || paintSpeedMultiplier >= 1.45) {
      setIsCatPurring(true);
      const timer = window.setTimeout(() => setIsCatPurring(false), 3200);
      return () => window.clearTimeout(timer);
    }
  }, [artistMood, paintSpeedMultiplier]);

  const visibleQueue = useMemo(() => {
    return [...vipQueue, ...normalQueue].slice(0, STAGE_25D_CONFIG.queueSlots.length);
  }, [vipQueue, normalQueue]);

  useEffect(() => {
    if (!activeSession) {
      setActiveAvatarSrc('');
      return;
    }
    const rawUrl = activeSession.entry.user.avatarUrl?.trim() ?? '';
    if (rawUrl.length > 0) {
      setActiveAvatarSrc(rawUrl);
      return;
    }
    setActiveAvatarSrc(getDemoUserAvatarUrl(activeSession.entry.user.id));
  }, [activeSession]);

  // Hydrate initial hanging gallery frames with real user portrait photos
  useEffect(() => {
    let cancelled = false;
    const hydrateRealGallery = async () => {
      const engine = new BrushRevealEngine();
      const cards: GalleryCardView[] = [];
      for (let i = 0; i < INITIAL_SEEDED_GALLERY.length; i++) {
        const item = INITIAL_SEEDED_GALLERY[i];
        const demoUrl = DEMO_USER_AVATAR_URLS[(i + 5) % DEMO_USER_AVATAR_URLS.length];
        const loaded = await loadPortraitSource(item.userId, demoUrl, {
          autoChibiFallback: false,
          avatarProxyUrl: '',
        });
        if (cancelled) return;
        engine.preparePortrait(loaded.canvas, item.style, item.userId, item.isRoyalFrame, config.locale);
        engine.updateProgress(1);
        const snap = engine.createGallerySnapshotCanvas(item.nickname, item.isRoyalFrame);
        cards.push({
          id: item.id,
          nickname: item.nickname,
          isRoyalFrame: item.isRoyalFrame,
          dataUrl: snap.toDataURL('image/png'),
        });
      }
      if (!cancelled && cards.length > 0) {
        setGalleryCards(cards);
      }
    };
    void hydrateRealGallery();
    return () => {
      cancelled = true;
    };
  }, []);

  // Main 30 FPS Simulation, BrushRevealEngine, Shoulder-Pivot Arm Lerp & 2D VFX Loop
  useEffect(() => {
    if (!brushEngineRef.current) {
      brushEngineRef.current = new BrushRevealEngine();
    }
    const engine = brushEngineRef.current;
    let disposed = false;
    let rafId = 0;
    let lastTs = performance.now();
    let accumMs = 0;
    let elapsedSec = 0;

    const copyEngineToDisplay = () => {
      const target = easelCanvasRef.current;
      if (!target) return;
      const ctx = target.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, target.width, target.height);
      ctx.drawImage(engine.displayCanvas, 0, 0, target.width, target.height);
    };

    // Initialize easel canvas to clean blank paper on mount
    engine.clearToBlankPaper();
    copyEngineToDisplay();

    const preparePortraitAsync = async (sessionId: string) => {
      const state = useStudioStore.getState();
      const sess = state.activeSession;
      if (!sess || sess.entry.id !== sessionId) return;

      const loaded = await loadPortraitSource(sess.entry.user.id, sess.entry.user.avatarUrl, {
        autoChibiFallback: state.config.autoChibiFallback,
        avatarProxyUrl: state.config.avatarProxyUrl,
      });
      if (disposed) return;
      const latest = useStudioStore.getState();
      if (latest.activeSession?.entry.id !== sessionId) return;

      engine.preparePortrait(
        loaded.canvas,
        latest.activeSession.style,
        latest.activeSession.entry.user.id,
        latest.activeSession.isRoyalFrame,
        latest.config.locale
      );
      if (latest.phase === 'WALK_IN' || latest.activeSession.progress <= 0) {
        engine.clearToBlankPaper();
        copyEngineToDisplay();
      } else {
        const uv = engine.updateProgress(latest.activeSession.progress, latest.paintSpeedMultiplier);
        brushUVRef.current = { u: uv.u, v: uv.v, depthPhase: uv.depthPhase };
        copyEngineToDisplay();
      }
      preparedStyleRef.current = latest.activeSession.style;
    };

    // Allocator for fixed 50-particle pool (zero allocation in loop)
    const spawnParticleFromPool = (
      x: number,
      y: number,
      vx: number,
      vy: number,
      size: number,
      color: string,
      isHeart: boolean,
      maxAge: number
    ) => {
      const pool = particlePoolRef.current;
      let targetIdx = -1;
      let maxAgeFound = -1;
      for (let i = 0; i < pool.length; i++) {
        if (!pool[i].active) {
          targetIdx = i;
          break;
        }
        if (pool[i].age > maxAgeFound) {
          maxAgeFound = pool[i].age;
          targetIdx = i;
        }
      }
      if (targetIdx >= 0) {
        const p = pool[targetIdx];
        p.active = true;
        p.x = x;
        p.y = y;
        p.vx = vx;
        p.vy = vy;
        p.size = size;
        p.color = color;
        p.isHeart = isHeart;
        p.age = 0;
        p.maxAge = maxAge;
      }
    };

    const spawnParticleBurst = (
      count: number,
      isHeart: boolean,
      originX?: number,
      originY?: number
    ) => {
      const ox = originX ?? 470 + (Math.random() - 0.5) * 160;
      const oy = originY ?? 590 + (Math.random() - 0.5) * 120;
      for (let i = 0; i < count; i++) {
        spawnParticleFromPool(
          ox + (Math.random() - 0.5) * 40,
          oy + (Math.random() - 0.5) * 30,
          (Math.random() - 0.5) * 120,
          -90 - Math.random() * 110,
          isHeart ? 16 + Math.random() * 8 : 6 + Math.random() * 6,
          PARTICLE_COLORS[i % PARTICLE_COLORS.length],
          isHeart,
          1.0 + Math.random() * 0.6
        );
      }
    };

    const recordTrailPoint = (x: number, y: number, color: string) => {
      const ring = trailRingRef.current;
      const idx = (trailHeadIdxRef.current + 1) % ARM_KINEMATICS.MAX_TRAIL_POINTS;
      trailHeadIdxRef.current = idx;
      const pt = ring[idx];
      pt.x = x;
      pt.y = y;
      pt.alpha = 0.55;
      pt.color = color;
    };

    const unsubVfx = subscribeStudioVfx((signal) => {
      if (signal.kind === 'HEARTS') {
        spawnParticleBurst(signal.count, true);
      } else if (signal.kind === 'CONFETTI') {
        spawnParticleBurst(signal.count, false);
      } else if (signal.kind === 'CLEAR_GALLERY') {
        setGalleryCards([]);
        engine.clearToBlankPaper();
        copyEngineToDisplay();
      } else if (signal.kind === 'CHAT_JOIN_FLASH') {
        setIsQueueFlashing(true);
        window.setTimeout(() => setIsQueueFlashing(false), 900);
      } else if (signal.kind === 'BRUSH_SPARK') {
        const cur = currentArmRef.current;
        const { artistAnchor } = STAGE_25D_CONFIG;
        const sx = artistAnchor.x + artistAnchor.bodyShoulderOffsetX;
        const sy = artistAnchor.y + artistAnchor.bodyShoulderOffsetY;
        const r = (cur.angleDeg * Math.PI) / 180;
        const reach = artistAnchor.armReachLengthPx * cur.scaleX;
        const tipX = sx - reach * Math.cos(r);
        const tipY = sy - reach * Math.sin(r);
        for (let i = 0; i < 6; i++) {
          spawnParticleFromPool(
            tipX + (Math.random() - 0.5) * 20,
            tipY + (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 60,
            -45 - Math.random() * 45,
            5 + Math.random() * 4,
            PARTICLE_COLORS[i % PARTICLE_COLORS.length],
            false,
            0.6 + Math.random() * 0.3
          );
        }
      } else if (signal.kind === 'GIFT_EASEL_FLASH') {
        giftFlourishTimerRef.current = 0.65;
        setEaselFlash(signal.isRoyal ? 'ROYAL' : 'GIFT');
        window.setTimeout(() => setEaselFlash('NONE'), 1400);

        // If actively painting, trigger palette reload dip immediately
        if (useStudioStore.getState().phase === 'PAINTING') {
          paletteDipRef.current.isDipping = true;
          paletteDipRef.current.elapsedSec = 0;
          paletteDipRef.current.lastDabIndex = -1;
          timeSinceLastDipRef.current = 0;
        }
      }
    });

    const stepVfxCanvas = (dt: number) => {
      const canvas = vfxCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw Brush Trail
      const ring = trailRingRef.current;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 0; i < ring.length; i++) {
        const pt = ring[i];
        if (pt.alpha <= 0.01) continue;
        pt.alpha = Math.max(0, pt.alpha - dt * 2.4);
        const nextPt = ring[(i + 1) % ring.length];
        if (nextPt.alpha <= 0.01) continue;
        const dist = Math.hypot(pt.x - nextPt.x, pt.y - nextPt.y);
        if (dist > 65) continue; // Skip teleport/wrap seams

        ctx.strokeStyle = pt.color;
        ctx.globalAlpha = (pt.alpha + nextPt.alpha) * 0.5;
        ctx.lineWidth = Math.max(1.5, 4.5 * pt.alpha);
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(nextPt.x, nextPt.y);
        ctx.stroke();
      }
      ctx.restore();

      // 2. Draw Active Particles
      const pool = particlePoolRef.current;
      for (let i = 0; i < pool.length; i++) {
        const p = pool[i];
        if (!p.active) continue;
        p.age += dt;
        if (p.age >= p.maxAge) {
          p.active = false;
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 85 * dt;
        const alpha = Math.max(0, 1 - p.age / p.maxAge);

        ctx.save();
        ctx.globalAlpha = alpha;
        if (p.isHeart) {
          ctx.font = `${Math.round(p.size)}px sans-serif`;
          ctx.fillText('❤️', p.x, p.y);
        } else {
          ctx.fillStyle = p.color;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.age * 5);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
        }
        ctx.restore();
      }
    };

    const loop = (now: number) => {
      if (disposed) return;
      rafId = window.requestAnimationFrame(loop);

      const dtMs = Math.min(100, now - lastTs);
      lastTs = now;
      accumMs += dtMs;
      if (accumMs < FRAME_INTERVAL_MS) return;

      const stepSec = Math.min(0.1, accumMs / 1000);
      accumMs = 0;
      elapsedSec += stepSec;

      useStudioStore.getState().tick(stepSec);
      const st = useStudioStore.getState();
      const sess = st.activeSession;

      if (sess && sess.entry.id !== preparedSessionIdRef.current) {
        preparedSessionIdRef.current = sess.entry.id;
        preparedStyleRef.current = sess.style;
        hungSessionIdRef.current = null;
        engine.clearToBlankPaper();
        copyEngineToDisplay();
        void preparePortraitAsync(sess.entry.id);

        const strings = STUDIO_STRINGS[st.config.locale];
        const welcomeLine = strings.speechWalkIn(sess.entry.user.nickname);
        studioSfx.speakLine(welcomeLine, st.config.locale, st.config.micMode);
      } else if (!sess && preparedSessionIdRef.current !== null) {
        preparedSessionIdRef.current = null;
        preparedStyleRef.current = null;
        engine.clearToBlankPaper();
        copyEngineToDisplay();
      }

      if (
        sess &&
        sess.entry.id === preparedSessionIdRef.current &&
        preparedStyleRef.current !== null &&
        sess.style !== preparedStyleRef.current
      ) {
        preparedStyleRef.current = sess.style;
        engine.switchStyleLive(sess.style, st.config.locale, sess.progress);
        copyEngineToDisplay();

        // Trigger palette reload dip on live style switch
        paletteDipRef.current.isDipping = true;
        paletteDipRef.current.elapsedSec = 0;
        paletteDipRef.current.lastDabIndex = -1;
        timeSinceLastDipRef.current = 0;
      }

      // Check phase transitions or style switch to trigger palette dip
      const isActivelyPainting =
        st.phase === 'PAINTING' && sess !== null && sess.progress > 0 && sess.progress < 1;
      const strokeUV = engine.getStrokePointUV(sess ? sess.progress : 0);

      const { artistAnchor, easelCanvas, paletteAnchor } = STAGE_25D_CONFIG;
      const shoulderX = artistAnchor.x + artistAnchor.bodyShoulderOffsetX;
      const shoulderY = artistAnchor.y + artistAnchor.bodyShoulderOffsetY;

      if (isActivelyPainting && sess) {
        if (strokeUV.depthPhase !== lastPhaseRef.current) {
          lastPhaseRef.current = strokeUV.depthPhase;
          paletteDipRef.current.isDipping = true;
          paletteDipRef.current.elapsedSec = 0;
          paletteDipRef.current.lastDabIndex = -1;
          paletteDipRef.current.canvasResumeStagePt = canvasUVToStage(
            strokeUV.u,
            strokeUV.v,
            easelCanvas
          );
          timeSinceLastDipRef.current = 0;
        } else {
          timeSinceLastDipRef.current += stepSec;
          const periodicThreshold =
            10.5 / Math.min(1.8, Math.pow(st.paintSpeedMultiplier, 0.6));
          if (timeSinceLastDipRef.current >= periodicThreshold) {
            paletteDipRef.current.isDipping = true;
            paletteDipRef.current.elapsedSec = 0;
            paletteDipRef.current.lastDabIndex = -1;
            paletteDipRef.current.canvasResumeStagePt = canvasUVToStage(
              strokeUV.u,
              strokeUV.v,
              easelCanvas
            );
            timeSinceLastDipRef.current = 0;
          }
        }
      }

      // Decrement gift flourish timer
      if (giftFlourishTimerRef.current > 0) {
        giftFlourishTimerRef.current = Math.max(0, giftFlourishTimerRef.current - stepSec);
      }

      let targetStageX = shoulderX - artistAnchor.armReachLengthPx * ARM_KINEMATICS.REST_SCALE_X;
      let targetStageY = shoulderY + 8;
      let leanOffset: StagePoint = { x: 0, y: 0 };
      let currentPaletteTilt = 0;

      const dip = paletteDipRef.current;
      if (dip.isDipping) {
        dip.elapsedSec += stepSec;
        const total = dip.durationSec;
        const t = Math.min(1, dip.elapsedSec / total);

        if (t < 0.35) {
          // Arc down from canvas to palette
          const blend = t / 0.35;
          const smoothBlend = 0.5 - 0.5 * Math.cos(blend * Math.PI);
          targetStageX =
            dip.canvasResumeStagePt.x +
            (paletteAnchor.stageDabX - dip.canvasResumeStagePt.x) * smoothBlend;
          targetStageY =
            dip.canvasResumeStagePt.y +
            (paletteAnchor.stageDabY - dip.canvasResumeStagePt.y) * smoothBlend;
        } else if (t < 0.7) {
          // Dab twice on palette
          const dabNorm = (t - 0.35) / 0.35;
          const dabWave = Math.sin(dabNorm * Math.PI * 4) * 6.5;
          targetStageX = paletteAnchor.stageDabX;
          targetStageY = paletteAnchor.stageDabY + dabWave;
          currentPaletteTilt = paletteAnchor.tiltAngleDeg * Math.sin(dabNorm * Math.PI);

          const currentDabIdx = Math.floor(dabNorm * 2);
          if (currentDabIdx !== dip.lastDabIndex) {
            dip.lastDabIndex = currentDabIdx;
            studioSfx.playBrushSwish(0.85);
            const sparkColor =
              strokeUV.depthPhase === 'SKETCH'
                ? '#78716c'
                : PARTICLE_COLORS[(currentDabIdx * 2) % PARTICLE_COLORS.length];
            spawnParticleFromPool(
              paletteAnchor.stageDabX,
              paletteAnchor.stageDabY,
              (Math.random() - 0.5) * 30,
              -25 - Math.random() * 20,
              5,
              sparkColor,
              false,
              0.45
            );
          }
        } else if (t < 1.0) {
          // Arc back up from palette to canvas
          const blend = (t - 0.7) / 0.3;
          const smoothBlend = 0.5 - 0.5 * Math.cos(blend * Math.PI);
          targetStageX =
            paletteAnchor.stageDabX +
            (dip.canvasResumeStagePt.x - paletteAnchor.stageDabX) * smoothBlend;
          targetStageY =
            paletteAnchor.stageDabY +
            (dip.canvasResumeStagePt.y - paletteAnchor.stageDabY) * smoothBlend;
          currentPaletteTilt = paletteAnchor.tiltAngleDeg * (1 - blend);
        } else {
          dip.isDipping = false;
        }
      } else if (isActivelyPainting && sess) {
        // Active Painting Mode: track the true stroke path on easelCanvas
        const baseCanvasPt = canvasUVToStage(strokeUV.u, strokeUV.v, easelCanvas);
        dip.canvasResumeStagePt = baseCanvasPt;

        // Smooth speed multiplier scaling: 1.0x -> 1.8x
        const sweepFreq = 7.2 * Math.min(1.8, Math.pow(st.paintSpeedMultiplier, 0.72));
        const arcAmp = giftFlourishTimerRef.current > 0 ? 8.5 : 4.8;

        // Tangent & normal oscillation for organic curved brushstrokes
        const tangentCos = Math.cos(strokeUV.angleRad);
        const tangentSin = Math.sin(strokeUV.angleRad);
        const strokeTangWiggle = Math.sin(elapsedSec * sweepFreq) * arcAmp;
        const strokeNormWiggle = Math.cos(elapsedSec * (sweepFreq * 0.75)) * (arcAmp * 0.6);

        targetStageX = baseCanvasPt.x + tangentCos * strokeTangWiggle - tangentSin * strokeNormWiggle;
        targetStageY = baseCanvasPt.y + tangentSin * strokeTangWiggle + tangentCos * strokeNormWiggle;

        // Torso lean towards easel when reaching far left
        if (targetStageX < 490) {
          const reachFrac = clampValue((490 - targetStageX) / 120, 0, 1);
          leanOffset = {
            x: -reachFrac * ARM_KINEMATICS.LEAN_MAX_X_PX,
            y: -reachFrac * ARM_KINEMATICS.LEAN_MAX_Y_PX,
          };
        }
      } else {
        // Idle Wait / Model Walk In / 0% Progress: Resting Pose near hip
        const idleSway = Math.sin(elapsedSec * 1.8) * 2.2;
        targetStageX = shoulderX - artistAnchor.armReachLengthPx * ARM_KINEMATICS.REST_SCALE_X;
        targetStageY = shoulderY + 8 + idleSway;
      }

      const solution = solveArmIK(
        targetStageX,
        targetStageY,
        shoulderX,
        shoulderY,
        artistAnchor.armReachLengthPx,
        leanOffset
      );

      const lerpAlpha = 1 - Math.exp(-ARM_KINEMATICS.SMOOTH_LERP_SPEED * stepSec);
      const cur = currentArmRef.current;
      cur.angleDeg += (solution.angleDeg - cur.angleDeg) * lerpAlpha;
      cur.scaleX += (solution.scaleX - cur.scaleX) * lerpAlpha;

      const rad = (cur.angleDeg * Math.PI) / 180;
      const reach = artistAnchor.armReachLengthPx * cur.scaleX;
      const tipStageX = shoulderX + leanOffset.x - reach * Math.cos(rad);
      const tipStageY = shoulderY + leanOffset.y - reach * Math.sin(rad);

      if (isActivelyPainting && sess && !dip.isDipping) {
        const tipCanvas = stageToCanvasUV(tipStageX, tipStageY, easelCanvas);
        const uv = engine.updateProgress(sess.progress, st.paintSpeedMultiplier, {
          u: tipCanvas.u,
          v: tipCanvas.v,
        });
        brushUVRef.current = { u: uv.u, v: uv.v, depthPhase: uv.depthPhase };
        copyEngineToDisplay();

        // Record fading brush trail
        const trailColor =
          uv.depthPhase === 'SKETCH'
            ? 'rgba(72, 56, 46, 0.45)'
            : uv.depthPhase === 'BASE_COLOR'
            ? 'rgba(234, 88, 12, 0.45)'
            : 'rgba(254, 240, 138, 0.55)';
        recordTrailPoint(tipStageX, tipStageY, trailColor);

        // Spawn occasional pigment dust / sparkles at tip
        if (Math.random() < 0.38 * Math.min(2.0, st.paintSpeedMultiplier)) {
          const dustColor =
            uv.depthPhase === 'SKETCH'
              ? '#78716c'
              : PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
          spawnParticleFromPool(
            tipStageX,
            tipStageY,
            (Math.random() - 0.5) * 35,
            -20 - Math.random() * 25,
            3 + Math.random() * 3,
            dustColor,
            false,
            0.45 + Math.random() * 0.35
          );
        }
      } else if (!sess || sess.progress <= 0) {
        engine.clearToBlankPaper();
        copyEngineToDisplay();
      }

      setArmPose({
        angleDeg: cur.angleDeg,
        scaleX: cur.scaleX,
        tipStageX,
        tipStageY,
        depthPhase: brushUVRef.current.depthPhase,
      });
      setPaletteTiltDeg(currentPaletteTilt);
      setIsDabbingPalette(dip.isDipping && dip.elapsedSec >= 0.35 && dip.elapsedSec < 0.7);

      if (st.phase === 'HANG_UP' && sess && hungSessionIdRef.current !== sess.entry.id) {
        hungSessionIdRef.current = sess.entry.id;
        engine.updateProgress(1);
        copyEngineToDisplay();
        const snapCanvas = engine.createGallerySnapshotCanvas(
          sess.entry.user.nickname,
          sess.isRoyalFrame
        );
        const cardDataUrl = snapCanvas.toDataURL('image/png');
        const newCard: GalleryCardView = {
          id: sess.entry.id,
          nickname: sess.entry.user.nickname,
          isRoyalFrame: sess.isRoyalFrame,
          dataUrl: cardDataUrl,
        };
        setGalleryCards((prev) =>
          [newCard, ...prev].slice(0, STAGE_25D_CONFIG.galleryWire.maxFrames)
        );
      }

      stepVfxCanvas(stepSec);
    };

    rafId = window.requestAnimationFrame(loop);
    return () => {
      disposed = true;
      unsubVfx();
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  const activeCameraPreset: CameraPreset = config.dynamicCameraEnabled
    ? cameraPreset
    : 'WIDE_STUDIO';
  const cameraTransform = CAMERA_25D_TRANSFORMS[activeCameraPreset];

  const { easelCanvas, stoolSeat, artistAnchor, galleryWire, sleepingCat, queueSlots } =
    STAGE_25D_CONFIG;
  const hasRoyalHat = Date.now() < vipHatActiveUntil;
  const isTrollActive = activeSession?.style === 'troll' || artistMood === 'TROLL_SMIRK';
  const brushAnimDurationSec = Math.max(0.28, (isTrollActive ? 0.55 : 0.92) / paintSpeedMultiplier);

  let artistBodyAnimation = 'studio-breathe 2.8s ease-in-out infinite';
  if (phase === 'PAINTING') {
    artistBodyAnimation = isTrollActive
      ? `studio-artist-troll-bounce ${brushAnimDurationSec}s ease-in-out infinite`
      : `studio-artist-paint ${brushAnimDurationSec}s ease-in-out infinite alternate`;
  }

  // Align `artist-arm.png` pivot (armPivotX, armPivotY) directly over `artist-body.png` shoulder (bodyShoulderOffsetX, bodyShoulderOffsetY)
  const armLeftInArtistBox = artistAnchor.bodyShoulderOffsetX - artistAnchor.armPivotX;
  const armTopInArtistBox = artistAnchor.bodyShoulderOffsetY - artistAnchor.armPivotY;

  return (
    <div className="absolute inset-0 overflow-hidden bg-amber-950 select-none">
      {/* Camera Director GPU Wrapper */}
      <div
        style={{
          width: STAGE_25D_CONFIG.WIDTH,
          height: STAGE_25D_CONFIG.HEIGHT,
          transform: cameraTransform,
          transformOrigin: '52% 54%',
          transition: 'transform 680ms cubic-bezier(0.22, 1, 0.36, 1)',
          willChange: 'transform',
        }}
        className="relative"
      >
        {/* LAYER 0: Golden-Hour Anime Studio Background + 12 Floating Sunlight Dust Motes */}
        <img
          src="/assets/bg-studio.png"
          alt="Cozy Anime Art Studio"
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />

        <div className="absolute inset-0 pointer-events-none">
          {DUST_MOTES.map((mote) => (
            <span
              key={mote.id}
              style={{
                left: mote.left,
                top: mote.top,
                width: mote.size,
                height: mote.size,
                animation: `studio-dust-float ${mote.durationSec}s ease-in-out ${mote.delaySec}s infinite alternate`,
              }}
              className="absolute rounded-full bg-amber-100/80 shadow-[0_0_6px_rgba(253,224,71,0.85)]"
            />
          ))}
        </div>

        {/* LAYER 0.5: Cute Sleeping Orange Cat on Left Wooden Shelf (Breathing + Anime Sleep Bubble + Zzz & Fish Dream) */}
        <div
          style={{
            left: sleepingCat.x,
            top: sleepingCat.y,
            width: sleepingCat.width,
            height: sleepingCat.height,
            zIndex: 880,
          }}
          onClick={() => {
            setIsCatPurring(true);
            setCatDreamIdx((prev) => (prev + 1) % CAT_DREAM_ICONS.length);
            window.setTimeout(() => setIsCatPurring(false), 2600);
          }}
          title="Chạm để nựng mèo cam 🐱"
          className="absolute cursor-pointer group"
        >
          {/* Animated Breathing Cat Body Sprite anchored to shelf contact line */}
          <div
            style={{
              transformOrigin: '52% 94%',
              animation: 'studio-cat-breathe 3.2s ease-in-out infinite',
            }}
            className="relative w-full h-full"
          >
            <img
              src="/assets/sleeping-cat.png"
              alt="Sleeping Studio Cat"
              draggable={false}
              className="w-full h-full object-contain pointer-events-none"
            />

            {/* Soft Rosy Sleeping Cheek Blush */}
            <span
              style={{ left: 17, top: 44 }}
              className="absolute w-3 h-2 rounded-full bg-rose-400/45 blur-[1.5px] pointer-events-none"
            />
            <span
              style={{ left: 48, top: 40 }}
              className="absolute w-3 h-2 rounded-full bg-rose-400/45 blur-[1.5px] pointer-events-none"
            />

            {/* Classic Anime Translucent Sleep Nose Bubble inflating & deflating with each breath */}
            <span
              style={{
                left: sleepingCat.noseOffsetX - 11,
                top: sleepingCat.noseOffsetY - 8,
                transformOrigin: '85% 65%',
                animation: 'studio-cat-nose-bubble 3.2s ease-in-out infinite',
              }}
              className="absolute w-4 h-4 rounded-full bg-sky-100/65 border border-white/90 shadow-[inset_-2px_-2px_4px_rgba(56,189,248,0.35),0_0_6px_rgba(255,255,255,0.7)] pointer-events-none"
            >
              <span className="absolute top-0.5 left-1 w-1.5 h-1 rounded-full bg-white/95" />
            </span>
          </div>

          {/* Floating Staggered 'z Z z' Sleep Letters */}
          <div
            style={{
              left: sleepingCat.dreamOriginX,
              top: sleepingCat.dreamOriginY,
            }}
            className="absolute pointer-events-none"
          >
            {CAT_SLEEP_ZZZ_PARTICLES.map((item) => (
              <span
                key={item.id}
                style={{
                  left: item.offsetX,
                  top: item.offsetY,
                  animation: `studio-cat-zzz-float ${item.durationSec}s ease-in-out ${item.delaySec}s infinite`,
                }}
                className={`absolute font-black text-amber-50 drop-shadow-[0_1.5px_2px_rgba(69,26,3,0.85)] select-none ${item.sizeClass}`}
              >
                {item.label}
              </span>
            ))}
          </div>

          {/* Mini Dream Cloud / Purr Bubble above the Cat */}
          <div
            style={{
              left: sleepingCat.dreamOriginX + 18,
              top: sleepingCat.dreamOriginY - 26,
              animation: 'studio-cat-dream-bob 2.8s ease-in-out infinite',
            }}
            className={`absolute px-2 py-0.5 rounded-full border shadow-sm flex items-center gap-1 pointer-events-none transition-all duration-300 ${
              isCatPurring
                ? 'bg-rose-50/95 border-rose-300 text-rose-600 scale-105'
                : 'bg-amber-50/90 border-amber-300/80 text-amber-900'
            }`}
          >
            <span className="text-[11px] leading-none">
              {isCatPurring ? '😻' : CAT_DREAM_ICONS[catDreamIdx]}
            </span>
            <span className="text-[9px] font-black tracking-tight whitespace-nowrap">
              {isCatPurring ? 'Gừư~ ♪' : 'Zzz'}
            </span>
            {/* Tiny cloud tail dots */}
            <span className="absolute -bottom-1.5 left-2 w-1.5 h-1.5 rounded-full bg-amber-50 border border-amber-300/80" />
          </div>
        </div>

        {/* LAYER 1: Hanging Gallery Twine Rope Portraits (Elongated Vintage Fine-Art Cards + Crafted Clothespins) */}
        <div className="absolute inset-0 pointer-events-none">
          {galleryCards.map((card, idx) => {
            const count = Math.max(1, galleryWire.maxFrames - 1);
            const t = idx / count;
            const frameX =
              galleryWire.endX -
              idx * ((galleryWire.endX - galleryWire.startX) / count) -
              galleryWire.frameWidth / 2;
            const norm = (t - 0.5) * 2;
            const sagOffset = (1 - norm * norm) * galleryWire.sagPx;
            const frameY = galleryWire.y + sagOffset;
            const tiltDeg = (idx % 2 === 0 ? 1 : -1) * 2.2;

            return (
              <div
                key={card.id}
                style={{
                  left: frameX,
                  top: frameY,
                  width: galleryWire.frameWidth,
                  height: galleryWire.frameHeight,
                  transform: `rotate(${tiltDeg}deg)`,
                  transition: 'left 480ms ease-out, top 480ms ease-out',
                }}
                className="absolute animate-bubble-pop"
              >
                {/* Handcrafted 2.5D Wooden Clothespin with Metallic Spring & Drop Shadow */}
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex flex-col items-center z-20 pointer-events-none drop-shadow-sm">
                  <div className="w-3 h-5 rounded-[2px] bg-gradient-to-b from-amber-600 via-amber-700 to-amber-900 border border-amber-950/80 relative flex items-center justify-center">
                    {/* Metal spring coil */}
                    <div className="w-2 h-1 bg-gradient-to-r from-slate-300 via-amber-200 to-slate-400 rounded-sm shadow-inner" />
                    {/* Center slit */}
                    <div className="absolute bottom-0 w-0.5 h-1.5 bg-amber-950/70" />
                  </div>
                </div>

                <div
                  className={`relative w-full h-full rounded-[6px] overflow-hidden transition-all duration-300 ${
                    card.isRoyalFrame
                      ? 'shadow-[0_6px_16px_rgba(217,119,6,0.45),0_2px_6px_rgba(0,0,0,0.3)] ring-2 ring-amber-400/95'
                      : 'shadow-[0_6px_14px_rgba(45,23,10,0.35),0_1.5px_4px_rgba(0,0,0,0.2)] ring-1 ring-amber-950/40'
                  }`}
                >
                  <img
                    src={card.dataUrl}
                    alt={card.nickname}
                    draggable={false}
                    className="w-full h-full object-cover block"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* LAYER 2: Left Waiting Queue (3 distinct Chibi variants with gentle bounce & breathing) */}
        <div className={`absolute inset-0 pointer-events-none transition-all duration-300 ${
          isQueueFlashing ? 'ring-2 ring-sky-400/70 rounded-3xl' : ''
        }`}>
          {queueSlots.map((slot, slotIdx) => {
            const entry = visibleQueue[slotIdx];
            if (!entry) return null;

            const spriteW = Math.round(slot.baseWidth * slot.scale);
            const spriteH = Math.round(slot.baseHeight * slot.scale);
            const leftPx = Math.round(slot.centerX - spriteW / 2);
            const topPx = Math.round(slot.feetY - spriteH);
            const variantSrc = pickStandingChibiVariant(entry.user.id, slotIdx);
            const themeClass = QUEUE_TAG_THEMES[slotIdx % QUEUE_TAG_THEMES.length];
            const shortName =
              entry.user.nickname.length > 7
                ? `${entry.user.nickname.slice(0, 6)}…`
                : entry.user.nickname;

            return (
              <div
                key={entry.id}
                style={{
                  left: leftPx,
                  top: topPx,
                  width: spriteW,
                  height: spriteH,
                  zIndex: Math.round(slot.feetY),
                }}
                className={`absolute transition-all duration-300 ${
                  isQueueFlashing && slotIdx === visibleQueue.length - 1 ? 'animate-pulse' : ''
                }`}
              >
                <div
                  style={{
                    bottom: -6,
                    left: '12%',
                    width: '76%',
                    height: 16,
                    background:
                      'radial-gradient(ellipse at center, rgba(45,23,10,0.42) 0%, rgba(45,23,10,0) 72%)',
                  }}
                  className="absolute pointer-events-none"
                />

                <img
                  src={variantSrc}
                  alt={entry.user.nickname}
                  draggable={false}
                  style={{
                    animation: `queue-char-bounce ${2.6 + slotIdx * 0.35}s ease-in-out infinite ${slotIdx * 0.25}s`,
                  }}
                  className="w-full h-full object-contain drop-shadow-sm"
                />

                <div
                  style={{
                    top: -22 + slot.tagOffsetY,
                    left: `calc(50% + ${slot.tagOffsetX}px)`,
                  }}
                  className={`absolute -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-full text-[10px] font-black shadow-md border ${
                    entry.isVip
                      ? 'bg-amber-600/95 text-amber-50 border-amber-200'
                      : themeClass
                  }`}
                >
                  {entry.isVip ? `👑 ${shortName}` : shortName}
                </div>
              </div>
            );
          })}
        </div>

        {/* LAYER 3: Seated Customer on Wooden Stool (`customer-sit.png`, ZERO hue-rotate!) */}
        {activeSession && (
          <div
            style={{
              left: Math.round(stoolSeat.x - stoolSeat.spriteWidth / 2),
              top: Math.round(stoolSeat.y - stoolSeat.hipOffsetPx),
              width: stoolSeat.spriteWidth,
              height: stoolSeat.spriteHeight,
              zIndex: 960,
              transform:
                phase === 'WALK_IN' ? 'translate3d(-36px, 14px, 0px)' : 'translate3d(0px, 0px, 0px)',
              transition: 'transform 550ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
            className="absolute pointer-events-none"
          >
            <div
              style={{
                top: stoolSeat.hipOffsetPx - 10,
                left: '10%',
                width: '80%',
                height: 20,
                background:
                  'radial-gradient(ellipse at center, rgba(48,24,10,0.45) 0%, rgba(48,24,10,0) 74%)',
              }}
              className="absolute"
            />

            <img
              src="/assets/customer-sit.png"
              alt={activeSession.entry.user.nickname}
              draggable={false}
              style={{
                animation: 'studio-breathe 2.6s ease-in-out infinite',
              }}
              className="relative w-full h-full object-contain drop-shadow-md"
            />

            <div
              style={{ top: -74 }}
              className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center"
            >
              <div
                className={`relative w-12 h-12 rounded-full overflow-hidden border-2 shadow-lg bg-amber-100 ${
                  activeSession.entry.isVip ? 'border-amber-400' : 'border-white'
                }`}
              >
                {activeAvatarSrc && (
                  <img
                    src={activeAvatarSrc}
                    alt={activeSession.entry.user.nickname}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div
                className={`-mt-1.5 whitespace-nowrap px-2.5 py-0.5 rounded-full text-[11px] font-black shadow border ${
                  activeSession.entry.isVip
                    ? 'bg-amber-600 text-white border-amber-200'
                    : 'bg-stone-900/92 text-white border-white/50'
                }`}
              >
                {activeSession.entry.isVip
                  ? `👑 ${activeSession.entry.user.nickname}`
                  : activeSession.entry.user.nickname}
              </div>
            </div>
          </div>
        )}

        {/* LAYER 4: Easel Canvas (`BrushRevealEngine`) with Stretched-Canvas Edge & Royal/Gift Glow */}
        <div
          style={{
            left: easelCanvas.x,
            top: easelCanvas.y,
            width: easelCanvas.width,
            height: easelCanvas.height,
            transform: `rotate(${easelCanvas.rotateDeg}deg) skewX(${easelCanvas.skewXDeg}deg)`,
            transformOrigin: 'center center',
            zIndex: 920,
          }}
          className={`absolute overflow-hidden rounded-[4px] pointer-events-none transition-all duration-500 ${
            easelFlash === 'ROYAL'
              ? 'ring-4 ring-amber-400 shadow-[0_0_36px_rgba(251,191,36,0.95),0_0_16px_rgba(245,158,11,0.85)] border-2 border-amber-500'
              : easelFlash === 'GIFT'
              ? 'ring-4 ring-rose-400 shadow-[0_0_28px_rgba(244,63,94,0.85),0_0_14px_rgba(251,191,36,0.7)] border-2 border-rose-500'
              : activeSession?.isRoyalFrame
              ? 'ring-4 ring-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.55),0_8px_20px_rgba(0,0,0,0.4)] border-2 border-amber-600'
              : 'border-[2.5px] border-amber-950/30 shadow-[0_4px_16px_rgba(45,23,10,0.38),inset_0_0_8px_rgba(60,30,10,0.1)]'
          }`}
        >
          <canvas
            ref={easelCanvasRef}
            width={STUDIO_LIMITS.CANVAS_RESOLUTION}
            height={STUDIO_LIMITS.CANVAS_RESOLUTION}
            className="w-full h-full block"
          />
        </div>

        {/* LAYER 5: Female Anime Portrait Artist (`artist-body.png` + Articulated `artist-arm.png` Shoulder IK) */}
        <div
          style={{
            left: artistAnchor.x,
            top: artistAnchor.y,
            width: artistAnchor.width,
            height: artistAnchor.height,
            zIndex: 980,
          }}
          className="absolute pointer-events-none"
        >
          {/* Grounded Radial Shadow under Artist's Mary-Jane Shoes */}
          <div
            style={{
              bottom: -8,
              left: '18%',
              width: '68%',
              height: 22,
              background:
                'radial-gradient(ellipse at center, rgba(45,23,10,0.44) 0%, rgba(45,23,10,0) 75%)',
            }}
            className="absolute"
          />

          <div
            style={{
              animation: artistBodyAnimation,
              transformOrigin: '55% 92%',
              transform: `rotate(${paletteTiltDeg.toFixed(2)}deg)`,
              transition: 'transform 100ms ease-out',
            }}
            className="relative w-full h-full"
          >
            {/* Articulated Right Arm + Paintbrush Layer rendered UNDERNEATH artist-body.png so the cream puff-sleeve cuff naturally overlaps the elbow pivot */}
            <img
              src="/assets/artist-arm.png"
              alt="Artist Painting Arm"
              draggable={false}
              style={{
                left: armLeftInArtistBox,
                top: armTopInArtistBox,
                width: artistAnchor.armWidth,
                height: artistAnchor.armHeight,
                transformOrigin: `${artistAnchor.armPivotX}px ${artistAnchor.armPivotY}px`,
                transform: `rotate(${armPose.angleDeg.toFixed(2)}deg) scaleX(${armPose.scaleX.toFixed(3)})`,
                willChange: 'transform',
              }}
              className="absolute max-w-none pointer-events-none drop-shadow-md"
            />

            {/* Base Body Layer on TOP (head, beret, apron, intact cream puff-sleeve cuff, left hand holding palette) */}
            <img
              src="/assets/artist-body.png"
              alt="Female Anime Artist Body"
              draggable={false}
              className="relative w-full h-full object-contain drop-shadow-lg"
            />

            {/* Palette Dab Gleam when loading paint */}
            {isDabbingPalette && (
              <span
                style={{
                  left: STAGE_25D_CONFIG.paletteAnchor.bodyLocalX - 9,
                  top: STAGE_25D_CONFIG.paletteAnchor.bodyLocalY - 9,
                }}
                className="absolute w-5 h-5 rounded-full bg-amber-300/85 shadow-[0_0_12px_rgba(251,191,36,0.95)] animate-ping pointer-events-none"
              />
            )}
          </div>

          {hasRoyalHat && (
            <div
              style={{ top: -18, left: 86 }}
              className="absolute text-2xl drop-shadow animate-bounce"
            >
              👑
            </div>
          )}

          {artistMood === 'FAST_SWEAT' && (
            <div
              style={{ top: 28, left: 12 }}
              className="absolute animate-bounce rounded-full bg-sky-50/95 border-2 border-sky-400 px-2 py-0.5 text-xs font-black text-sky-700 shadow"
            >
              💦🔥 {paintSpeedMultiplier.toFixed(1)}x
            </div>
          )}
          {artistMood === 'VIP_WAVE' && (
            <div
              style={{ top: 24, left: 14 }}
              className="absolute animate-bounce rounded-full bg-rose-50/95 border-2 border-rose-400 px-2 py-0.5 text-xs font-black text-rose-600 shadow"
            >
              💖 VIP ✨
            </div>
          )}
          {artistMood === 'TROLL_SMIRK' && (
            <div
              style={{ top: 24, left: 10 }}
              className="absolute animate-bounce rounded-full bg-amber-50/95 border-2 border-rose-500 px-2 py-0.5 text-xs font-black text-rose-700 shadow"
            >
              😜 Troll!
            </div>
          )}
        </div>

        {/* 2D Particle Overlay Canvas */}
        <canvas
          ref={vfxCanvasRef}
          width={STAGE_25D_CONFIG.WIDTH}
          height={STAGE_25D_CONFIG.HEIGHT}
          style={{ zIndex: 990 }}
          className="absolute inset-0 pointer-events-none"
        />
      </div>
    </div>
  );
};
