import * as THREE from 'three';
import { PERFORMANCE_3D_LIMITS } from '@shared/constants/prankConfig';
import type { CharacterExpression, PrankActionType } from '@shared/types/prank';
import { ModelLoader3D } from './ModelLoader3D';
import { ProjectilePool3D, type ActiveProjectile3D } from './ProjectilePool3D';
import { AttachmentPool3D } from './AttachmentPool3D';
import { ParticlePool3D } from './ParticlePool3D';
import { audioSynthesizer } from '../engine/audioSynthesizer';
import { usePrankStore } from '../store/prankStore';

export class SceneManager {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;

  // Sub-systems
  public readonly modelLoader: ModelLoader3D;
  public readonly projectilePool: ProjectilePool3D;
  public readonly attachmentPool: AttachmentPool3D;
  public readonly particlePool: ParticlePool3D;

  // Loop control
  private animFrameId: number | null = null;
  private lastFrameTime = performance.now();
  private readonly frameInterval = PERFORMANCE_3D_LIMITS.FRAME_INTERVAL_MS; // 33.33ms

  // Camera settings & Shake
  private readonly defaultCamPos = new THREE.Vector3(0, 1.45, 6.0);
  private readonly camLookAt = new THREE.Vector3(0, 1.45, 0);
  private cameraShake = 0;

  constructor(canvas: HTMLCanvasElement) {
    // 1. WebGL Renderer with strict 720p & pixelRatio = 1
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(PERFORMANCE_3D_LIMITS.STAGE_WIDTH, PERFORMANCE_3D_LIMITS.STAGE_HEIGHT);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    // 2. Camera for Vertical 9:16 framing
    const aspect = PERFORMANCE_3D_LIMITS.STAGE_WIDTH / PERFORMANCE_3D_LIMITS.STAGE_HEIGHT;
    this.camera = new THREE.PerspectiveCamera(56, aspect, 0.1, 30);
    this.camera.position.copy(this.defaultCamPos);
    this.camera.lookAt(this.camLookAt);

    // 3. Three-Point Lighting
    this.setupLighting();

    // 4. Initialize 3D Engine subsystems
    this.modelLoader = new ModelLoader3D();
    this.projectilePool = new ProjectilePool3D();
    this.attachmentPool = new AttachmentPool3D();
    this.particlePool = new ParticlePool3D();

    this.scene.add(
      this.modelLoader.rootGroup,
      this.projectilePool.sceneGroup,
      this.attachmentPool.sceneGroup,
      this.particlePool.sceneGroup
    );
  }

  private setupLighting(): void {
    // Ambient Light
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    // Key Light
    const keyLight = new THREE.DirectionalLight(0xfffaed, 0.85);
    keyLight.position.set(2.5, 4.5, 3.5);
    // Hemisphere Ground Bounce Light
    const hemiLight = new THREE.HemisphereLight(0xdce775, 0x4e342e, 0.45);
    this.scene.add(ambient, keyLight, hemiLight);
  }

  public start(): void {
    let isRunning = true;

    const renderTick = (currentTime: number) => {
      if (!isRunning) return;

      const elapsed = currentTime - this.lastFrameTime;

      // Strict 30 FPS Throttling
      if (elapsed >= this.frameInterval) {
        this.lastFrameTime = currentTime - (elapsed % this.frameInterval);
        const deltaSec = elapsed / 1000;

        // 1. Tick Store & Decays
        usePrankStore.getState().tickDecay(deltaSec);
        const { expression, isMeltdownActive } = usePrankStore.getState();

        // 2. Update Subsystems
        this.modelLoader.setExpression(expression);
        this.modelLoader.update(deltaSec);
        this.projectilePool.update((proj) => this.handleImpact(proj));
        this.attachmentPool.update();
        this.particlePool.update();

        // 3. Meltdown Steam Particles
        if (isMeltdownActive && Math.random() > 0.4) {
          const headPos = new THREE.Vector3(
            (Math.random() - 0.5) * 0.4,
            1.9 + Math.random() * 0.2,
            0.15
          );
          this.particlePool.spawn(headPos, 2, 0xffffff, 0.02, true);
        }

        // 4. Update Camera Shake
        if (this.cameraShake > 0) {
          this.camera.position.set(
            this.defaultCamPos.x + (Math.random() - 0.5) * this.cameraShake * 0.15,
            this.defaultCamPos.y + (Math.random() - 0.5) * this.cameraShake * 0.15,
            this.defaultCamPos.z
          );
          this.cameraShake = Math.max(0, this.cameraShake - deltaSec * 3);
        } else {
          this.camera.position.copy(this.defaultCamPos);
        }
        this.camera.lookAt(this.camLookAt);

        // 5. Render Three.js frame
        if (this.renderer) {
          this.renderer.render(this.scene, this.camera);
        }
      }

      this.animFrameId = requestAnimationFrame(renderTick);
    };

    this.animFrameId = requestAnimationFrame(renderTick);
  }

  private handleImpact(proj: ActiveProjectile3D): void {
    const { action, initiatorName, avatarUrl, targetPos } = proj;
    const store = usePrankStore.getState();

    // 1. Recoil character body spring
    this.modelLoader.applyImpact(action === 'BALL' ? 1.6 : 1.0);
    this.cameraShake = action === 'BALL' || action === 'CAKE' ? 0.8 : 0.4;

    // 2. Sound & 3D Attachments
    switch (action) {
      case 'EGG': {
        audioSynthesizer.playEggSplat();
        this.particlePool.spawn(targetPos, 14, 0xffb300, 0.07);
        this.particlePool.spawn(targetPos, 8, 0xf5e6d3, 0.09);
        const anchor = this.modelLoader.getAnchorWorldPosition('NOSE');
        this.attachmentPool.attach('EGG_SPLAT', anchor, 'NOSE');
        break;
      }

      case 'CAKE': {
        audioSynthesizer.playCakeSploosh();
        this.particlePool.spawn(targetPos, 16, 0xff80ab, 0.06);
        const anchor = this.modelLoader.getAnchorWorldPosition('HEAD');
        this.attachmentPool.attach('CAKE_SMEAR', anchor, 'HEAD');
        break;
      }

      case 'BALL': {
        audioSynthesizer.playBallBonk();
        this.particlePool.spawn(targetPos, 10, 0xff6f00, 0.08);
        const anchor = this.modelLoader.getAnchorWorldPosition('HEAD');
        this.attachmentPool.attach('BUMP_STARS', anchor, 'HEAD');
        break;
      }

      case 'WIND': {
        audioSynthesizer.playWindWhoosh();
        this.particlePool.spawn(targetPos, 15, 0xe0f7fa, 0.1);
        this.modelLoader.triggerBeanieWindBlow();
        break;
      }

      case 'MILK': {
        audioSynthesizer.playMilkSplash();
        this.particlePool.spawn(targetPos, 18, 0xffffff, 0.07);
        const anchor = this.modelLoader.getAnchorWorldPosition('CHEST');
        this.attachmentPool.attach('MILK_SPLASH', anchor, 'CHEST');
        break;
      }

      case 'TAUNT': {
        audioSynthesizer.playTaunt();
        this.particlePool.spawn(targetPos, 8, 0xd50000, 0.04, true);
        store.addRage(6);
        break;
      }

      case 'SURPRISE': {
        audioSynthesizer.playMeltdownAlarm();
        this.particlePool.spawn(targetPos, 15, 0xab47bc, 0.09);
        const anchor = this.modelLoader.getAnchorWorldPosition('HEAD');
        this.attachmentPool.attach('EGG_SPLAT', anchor, 'HEAD');
        break;
      }
    }

    // 3. Record Hit in Store
    store.recordHit(action, initiatorName, avatarUrl, 1);
  }

  public triggerPrank(
    action: PrankActionType,
    initiatorName: string,
    avatarUrl?: string
  ): void {
    this.projectilePool.spawn(action, initiatorName, avatarUrl);
  }

  public cleanTarget(): void {
    this.attachmentPool.clearAll();
    this.particlePool.clear();
    this.projectilePool.clear();
  }

  public destroy(): void {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.renderer?.dispose();
  }
}
