import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { STUDIO_LIMITS } from '../../../../shared/constants/studioConfig';
import type {
  ActivePortraitSession,
  ArtistMood,
  CameraPreset,
  PortraitStyle,
  QueueEntry,
  StudioLocale,
  TurnPhase,
} from '../../../../shared/types/studio';
import { STAGE_LAYOUT } from '../../constants/stageLayout';
import { INITIAL_SEEDED_GALLERY } from '../../store/studioStore';
import { drawProceduralChibiPortrait, loadPortraitSource } from '../painting/avatarLoader';
import { BrushRevealEngine } from '../painting/brushRevealEngine';
import { ArtistController } from './artistController';
import { CameraDirector } from './cameraDirector';
import { GalleryWallManager } from './galleryWallManager';
import { ModelAndQueueMesh } from './modelAndQueueMesh';
import { buildStudioEnvironment, type StudioEnvironmentRig } from './studioEnvironment';
import { disposeSharedToonResources } from './toonMaterials';
import { StudioVfxPool } from './vfxPool';

const FRAME_INTERVAL_MS = 1000 / STUDIO_LIMITS.TARGET_FPS;
const DRAW_CALL_LOG_INTERVAL_SEC = 5.0;

export interface SceneFrameState {
  phase: TurnPhase;
  cameraPreset: CameraPreset;
  artistMood: ArtistMood;
  activeSession: ActivePortraitSession | null;
  vipQueue: QueueEntry[];
  normalQueue: QueueEntry[];
  paintSpeedMultiplier: number;
  dynamicCameraEnabled: boolean;
  hasRoyalHat: boolean;
  locale: StudioLocale;
  autoChibiFallback: boolean;
  avatarProxyUrl: string;
}

export interface StudioSceneCallbacks {
  getFrameState: () => SceneFrameState;
  onTick: (deltaSec: number) => void;
  onArtistModeResolved: (mode: 'VRM' | 'PROCEDURAL_CHIBI') => void;
  onMissingAssetsUpdated: (missingAssets: string[]) => void;
}

/**
 * Main Three.js WebGL stage manager locked to 30 FPS, pixelRatio=1, shadowMap=false,
 * RoomEnvironment IBL + ACESFilmicToneMapping, and < 60 draw calls.
 */
export class StudioSceneManager {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly envMapTarget: THREE.WebGLRenderTarget;
  private readonly brushEngine: BrushRevealEngine;
  private readonly paintingTexture: THREE.CanvasTexture;
  private readonly environment: StudioEnvironmentRig;
  private readonly artist: ArtistController;
  private readonly modelAndQueue: ModelAndQueueMesh;
  private readonly gallery: GalleryWallManager;
  private readonly cameraDirector: CameraDirector;
  private readonly vfx: StudioVfxPool;

  private rafId = 0;
  private lastTimestamp = 0;
  private accumulatedMs = 0;
  private elapsedSec = 0;
  private lastDrawCallLogSec = -DRAW_CALL_LOG_INTERVAL_SEC;
  private disposed = false;

  private preparedSessionId: string | null = null;
  private preparedStyle: PortraitStyle | null = null;
  private hungSessionId: string | null = null;
  private missingArtistAsset: string | null = null;
  private missingCustomerAsset: string | null = null;

  constructor(
    container: HTMLElement,
    private readonly callbacks: StudioSceneCallbacks
  ) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'default',
    });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(STAGE_LAYOUT.WIDTH, STAGE_LAYOUT.HEIGHT, false);
    this.renderer.shadowMap.enabled = false;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xfff4e0);

    // Lightweight prefiltered RoomEnvironment for natural PBR/VRM/GLB material lighting
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.envMapTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    this.scene.environment = this.envMapTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    this.camera = new THREE.PerspectiveCamera(
      39,
      STAGE_LAYOUT.WIDTH / STAGE_LAYOUT.HEIGHT,
      0.1,
      40
    );

    const hemiLight = new THREE.HemisphereLight(0xfff4e0, 0xc49a6c, 0.92);
    const sunLight = new THREE.DirectionalLight(0xffd79a, 0.95);
    sunLight.position.set(-2.6, 4.2, 2.8);
    this.scene.add(hemiLight, sunLight);

    this.brushEngine = new BrushRevealEngine();
    this.paintingTexture = new THREE.CanvasTexture(this.brushEngine.displayCanvas);
    this.paintingTexture.colorSpace = THREE.SRGBColorSpace;
    this.paintingTexture.needsUpdate = true;

    this.environment = buildStudioEnvironment(this.paintingTexture, (seatTopY) => {
      this.modelAndQueue.setSeatTopY(seatTopY);
    });
    this.scene.add(this.environment.root);

    this.artist = new ArtistController(({ mode, missingAsset }) => {
      this.callbacks.onArtistModeResolved(mode);
      this.missingArtistAsset = missingAsset;
      this.reportMissingAssets();
    });
    this.scene.add(this.artist.root);

    this.modelAndQueue = new ModelAndQueueMesh((missingCustomer) => {
      this.missingCustomerAsset = missingCustomer;
      this.reportMissingAssets();
    });
    this.scene.add(this.modelAndQueue.root);

    this.gallery = new GalleryWallManager();
    this.scene.add(this.gallery.root);

    this.vfx = new StudioVfxPool();
    this.scene.add(this.vfx.root);

    this.cameraDirector = new CameraDirector(this.camera);

    this.seedInitialGalleryWall();
  }

  private reportMissingAssets(): void {
    const list: string[] = [];
    if (this.missingArtistAsset) list.push(this.missingArtistAsset);
    if (this.missingCustomerAsset) list.push(this.missingCustomerAsset);
    this.callbacks.onMissingAssetsUpdated(list);
  }

  private seedInitialGalleryWall(): void {
    const seedEngine = new BrushRevealEngine();
    const reversed = [...INITIAL_SEEDED_GALLERY].reverse();
    for (const item of reversed) {
      const chibiSource = drawProceduralChibiPortrait(item.userId);
      seedEngine.preparePortrait(chibiSource, item.style, item.userId, item.isRoyalFrame, 'vi');
      seedEngine.updateProgress(1);
      const snapshot = seedEngine.createGallerySnapshotCanvas(item.nickname, item.isRoyalFrame);
      this.gallery.addCompletedPortrait(
        snapshot,
        item.isRoyalFrame,
        this.environment.easelCanvasWorldCenter,
        true
      );
    }
  }

  public start(): void {
    if (this.rafId) return;
    this.lastTimestamp = performance.now();
    const loop = (now: number) => {
      if (this.disposed) return;
      this.rafId = window.requestAnimationFrame(loop);

      const frameMs = Math.min(100, now - this.lastTimestamp);
      this.lastTimestamp = now;
      this.accumulatedMs += frameMs;

      if (this.accumulatedMs < FRAME_INTERVAL_MS) return;
      const stepSec = Math.min(0.1, this.accumulatedMs / 1000);
      this.accumulatedMs = 0;

      this.stepSimulation(stepSec);
      this.renderer.render(this.scene, this.camera);

      if (
        import.meta.env.DEV &&
        this.elapsedSec - this.lastDrawCallLogSec >= DRAW_CALL_LOG_INTERVAL_SEC
      ) {
        this.lastDrawCallLogSec = this.elapsedSec;
        console.debug(
          `[PortraitStudio3D] Draw calls: ${this.renderer.info.render.calls} (budget < 60) | Triangles: ${this.renderer.info.render.triangles} | FPS cap: 30`
        );
      }
    };
    this.rafId = window.requestAnimationFrame(loop);
  }

  public triggerHearts(count = 10): void {
    this.vfx.spawnHearts(new THREE.Vector3(0.55, 1.55, 0.45), count);
  }

  public triggerConfetti(count = 26): void {
    this.vfx.spawnConfetti(new THREE.Vector3(0.35, 1.75, 0.35), count);
  }

  public triggerPasserby(): void {
    this.modelAndQueue.triggerBackgroundPasserby();
  }

  public clearGallery(): void {
    this.gallery.clearAll();
    this.brushEngine.clearToBlankPaper();
    this.paintingTexture.needsUpdate = true;
  }

  private async prepareActivePortrait(
    state: SceneFrameState,
    isInitialSeed: boolean
  ): Promise<void> {
    const session = state.activeSession;
    if (!session) return;
    const targetSessionId = session.entry.id;

    const loaded = await loadPortraitSource(session.entry.user.id, session.entry.user.avatarUrl, {
      autoChibiFallback: state.autoChibiFallback,
      avatarProxyUrl: state.avatarProxyUrl,
    });

    if (this.disposed) return;
    const latest = this.callbacks.getFrameState();
    if (latest.activeSession?.entry.id !== targetSessionId) return;

    this.brushEngine.preparePortrait(
      loaded.canvas,
      latest.activeSession.style,
      latest.activeSession.entry.user.id,
      latest.activeSession.isRoyalFrame,
      latest.locale
    );
    const uv = this.brushEngine.updateProgress(latest.activeSession.progress);
    this.artist.setBrushUV(uv.u, uv.v);
    this.paintingTexture.needsUpdate = true;
    this.preparedStyle = latest.activeSession.style;
    this.modelAndQueue.setActiveModel(
      latest.activeSession.entry,
      loaded.canvas,
      !isInitialSeed && latest.phase === 'WALK_IN'
    );
  }

  private stepSimulation(deltaSec: number): void {
    const isFirstTick = this.elapsedSec === 0;
    this.elapsedSec += deltaSec;
    this.callbacks.onTick(deltaSec);

    const state = this.callbacks.getFrameState();
    const session = state.activeSession;

    if (session && session.entry.id !== this.preparedSessionId) {
      this.preparedSessionId = session.entry.id;
      this.preparedStyle = session.style;
      this.hungSessionId = null;
      this.modelAndQueue.setActiveModel(
        session.entry,
        null,
        !isFirstTick && state.phase === 'WALK_IN'
      );
      void this.prepareActivePortrait(state, isFirstTick);
    } else if (!session && this.preparedSessionId !== null) {
      this.preparedSessionId = null;
      this.preparedStyle = null;
      this.modelAndQueue.setActiveModel(null, null, false);
      this.brushEngine.clearToBlankPaper();
      this.paintingTexture.needsUpdate = true;
    }

    if (
      session &&
      session.entry.id === this.preparedSessionId &&
      this.preparedStyle !== null &&
      session.style !== this.preparedStyle
    ) {
      this.preparedStyle = session.style;
      this.brushEngine.switchStyleLive(session.style, state.locale, session.progress);
      this.paintingTexture.needsUpdate = true;
    }

    if (state.phase === 'PAINTING' && session) {
      const uv = this.brushEngine.updateProgress(session.progress);
      this.artist.setBrushUV(uv.u, uv.v);
      this.paintingTexture.needsUpdate = true;
    }

    if (state.phase === 'HANG_UP' && session && this.hungSessionId !== session.entry.id) {
      this.hungSessionId = session.entry.id;
      this.brushEngine.updateProgress(1);
      const snapshotCanvas = this.brushEngine.createGallerySnapshotCanvas(
        session.entry.user.nickname,
        session.isRoyalFrame
      );
      this.gallery.addCompletedPortrait(
        snapshotCanvas,
        session.isRoyalFrame,
        this.environment.easelCanvasWorldCenter
      );
      this.brushEngine.clearToBlankPaper();
      this.paintingTexture.needsUpdate = true;
    }

    this.modelAndQueue.setQueueEntries(state.vipQueue, state.normalQueue);
    this.modelAndQueue.update(deltaSec, this.elapsedSec, state.phase);

    this.vfx.setBlobShadows([
      ...this.environment.staticBlobShadows,
      ...this.artist.getFootShadowPositions(),
      ...this.modelAndQueue.getShadowPositions(),
    ]);

    this.environment.update(this.elapsedSec);
    this.artist.update({
      deltaSec,
      elapsedSec: this.elapsedSec,
      phase: state.phase,
      mood: state.artistMood,
      speedMultiplier: state.paintSpeedMultiplier,
      hasRoyalHat: state.hasRoyalHat,
    });
    this.gallery.update(deltaSec, this.elapsedSec);
    this.vfx.update(deltaSec);
    this.cameraDirector.setPreset(state.cameraPreset, state.dynamicCameraEnabled);
    this.cameraDirector.update(deltaSec);
  }

  public dispose(): void {
    this.disposed = true;
    if (this.rafId) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    this.envMapTarget.dispose();
    this.paintingTexture.dispose();
    this.environment.dispose();
    this.artist.dispose();
    this.modelAndQueue.dispose();
    this.gallery.dispose();
    this.vfx.dispose();
    disposeSharedToonResources();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
