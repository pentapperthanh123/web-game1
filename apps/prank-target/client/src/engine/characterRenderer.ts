import type { CharacterExpression } from '@shared/types/prank';
import { PERFORMANCE_LIMITS } from '@shared/constants/prankConfig';

export class CharacterRenderer {
  private breathOffset = 0;
  private breathDirection = 1;
  private baseImage: HTMLImageElement | null = null;
  private isImageLoaded = false;

  constructor() {
    if (typeof Image !== 'undefined') {
      const candidates = [
        '/assets/charater.png',
        '/assets/character-clean.png',
        '/assets/target_clean.jpg',
        '/assets/reference_target.jpg',
      ];

      const tryLoad = (idx: number) => {
        if (idx >= candidates.length) return;
        const img = new Image();
        img.src = candidates[idx];
        img.onload = () => {
          this.baseImage = img;
          this.isImageLoaded = true;
        };
        img.onerror = () => {
          tryLoad(idx + 1);
        };
      };

      tryLoad(0);
    }
  }

  public update(deltaMs: number): void {
    // Subtle organic breathing animation
    this.breathOffset += (deltaMs / 1000) * 1.5 * this.breathDirection;
    if (this.breathOffset > 1) {
      this.breathOffset = 1;
      this.breathDirection = -1;
    } else if (this.breathOffset < 0) {
      this.breathOffset = 0;
      this.breathDirection = 1;
    }
  }

  public render(
    ctx: CanvasRenderingContext2D,
    expression: CharacterExpression,
    screenShake: number = 0
  ): void {
    ctx.save();

    // Apply screen shake offset if active
    if (screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * screenShake;
      const shakeY = (Math.random() - 0.5) * screenShake;
      ctx.translate(shakeX, shakeY);
    }

    // Meltdown intense vibration
    if (expression === 'MELTDOWN') {
      const vibX = (Math.random() - 0.5) * 6;
      const vibY = (Math.random() - 0.5) * 4;
      ctx.translate(vibX, vibY);
    }

    if (this.isImageLoaded && this.baseImage) {
      // 1. Draw photorealistic clean character image
      ctx.drawImage(
        this.baseImage,
        0,
        0,
        PERFORMANCE_LIMITS.STAGE_WIDTH,
        PERFORMANCE_LIMITS.STAGE_HEIGHT
      );

      // 2. Dynamic reactive overlays (eyes, anger marks, meltdown steam)
      const headX = 360;
      const headY = 330;

      if (expression === 'HIT_IMPACT') {
        // Impact squint lines over eyes
        ctx.strokeStyle = '#212121';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        // Left eye >
        ctx.beginPath();
        ctx.moveTo(headX - 35, headY - 10);
        ctx.lineTo(headX - 18, headY);
        ctx.lineTo(headX - 35, headY + 10);
        ctx.stroke();
        // Right eye <
        ctx.beginPath();
        ctx.moveTo(headX + 35, headY - 10);
        ctx.lineTo(headX + 18, headY);
        ctx.lineTo(headX + 35, headY + 10);
        ctx.stroke();
      } else if (expression === 'FURIOUS' || expression === 'MELTDOWN') {
        // Red angry vein mark
        ctx.fillStyle = '#d50000';
        ctx.font = 'bold 28px sans-serif';
        ctx.fillText('💢', headX - 60, headY - 50);
      }

      if (expression === 'MELTDOWN') {
        this.renderMeltdownEffects(ctx, 0);
      }
    } else {
      // Procedural fallback
      this.renderBackground(ctx);
      this.renderChair(ctx);
      const breathY = this.breathOffset * 3;
      this.renderLegsAndBoots(ctx);
      this.renderTorsoAndVest(ctx, breathY);
      this.renderArmsAndHands(ctx);
      this.renderHead(ctx, expression, breathY);
      if (expression === 'MELTDOWN') {
        this.renderMeltdownEffects(ctx, breathY);
      }
    }

    ctx.restore();
  }

  /** Background: Rustic green door, stucco wall, ivy vines, broom, porch floor */
  private renderBackground(ctx: CanvasRenderingContext2D): void {
    const W = PERFORMANCE_LIMITS.STAGE_WIDTH; // 720
    const H = PERFORMANCE_LIMITS.STAGE_HEIGHT; // 1280

    // Warm stucco wall
    const wallGrad = ctx.createLinearGradient(0, 0, 0, H);
    wallGrad.addColorStop(0, '#d7ccc8');
    wallGrad.addColorStop(0.7, '#bcaaa4');
    wallGrad.addColorStop(1, '#a1887f');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, W, H);

    // Stone / concrete ground floor (y: 880 -> 1280)
    const floorGrad = ctx.createLinearGradient(0, 880, 0, H);
    floorGrad.addColorStop(0, '#8d6e63');
    floorGrad.addColorStop(0.3, '#6d4c41');
    floorGrad.addColorStop(1, '#4e342e');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, 880, W, H - 880);

    // Floor seam line
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 880);
    ctx.lineTo(W, 880);
    ctx.stroke();

    // Rustic Green Door in the center (x: 210, width: 300, y: 120, height: 760)
    ctx.fillStyle = '#2e5b4b'; // deep olive green door
    ctx.fillRect(210, 120, 300, 760);

    // Door Frame
    ctx.strokeStyle = '#1b382d';
    ctx.lineWidth = 14;
    ctx.strokeRect(203, 113, 314, 767);

    // Door Panels (recessed molding)
    ctx.fillStyle = '#264e40';
    ctx.fillRect(235, 150, 115, 200);
    ctx.fillRect(370, 150, 115, 200);
    ctx.fillRect(235, 380, 115, 220);
    ctx.fillRect(370, 380, 115, 220);
    ctx.fillRect(235, 630, 115, 220);
    ctx.fillRect(370, 630, 115, 220);

    // Peephole & Door handle
    ctx.fillStyle = '#ffb300'; // brass peephole
    ctx.beginPath();
    ctx.arc(360, 260, 9, 0, Math.PI * 2);
    ctx.fill();

    // Brass lever handle on the right
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(470, 480, 32, 12);
    ctx.beginPath();
    ctx.arc(470, 486, 10, 0, Math.PI * 2);
    ctx.fill();

    // Ivy vines climbing on the left wall
    ctx.fillStyle = '#2e7d32';
    const vinePoints = [
      { x: 50, y: 180, r: 16 },
      { x: 75, y: 150, r: 22 },
      { x: 110, y: 190, r: 20 },
      { x: 140, y: 160, r: 25 },
      { x: 90, y: 240, r: 28 },
      { x: 130, y: 280, r: 24 },
      { x: 60, y: 320, r: 22 },
      { x: 110, y: 360, r: 26 },
      { x: 165, y: 220, r: 20 },
    ];
    for (const vp of vinePoints) {
      ctx.beginPath();
      ctx.arc(vp.x, vp.y, vp.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Rustic Straw Broom leaning on the right wall (x: 620, y: 550 -> 880)
    ctx.save();
    ctx.translate(620, 540);
    ctx.rotate(0.12);
    // Broom wooden stick
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(-6, 0, 12, 260);
    // Straw brush bristles
    ctx.fillStyle = '#c5a059';
    ctx.beginPath();
    ctx.moveTo(-25, 260);
    ctx.lineTo(25, 260);
    ctx.lineTo(45, 350);
    ctx.lineTo(-45, 350);
    ctx.closePath();
    ctx.fill();
    // Binding ring
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(-26, 275, 52, 10);
    ctx.restore();
  }

  /** Wooden Chair */
  private renderChair(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#5d4037'; // rich oak wood
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 4;

    // Chair backrest posts
    ctx.fillRect(250, 360, 20, 380);
    ctx.fillRect(450, 360, 20, 380);

    // Horizontal back slats
    ctx.fillRect(250, 380, 220, 18);
    ctx.fillRect(250, 440, 220, 16);
    ctx.fillRect(250, 510, 220, 16);

    // Chair seat base
    ctx.fillRect(230, 660, 260, 35);
    ctx.strokeRect(230, 660, 260, 35);

    // Chair wooden front legs
    ctx.fillRect(245, 695, 26, 220);
    ctx.fillRect(449, 695, 26, 220);

    // Chair lower stretcher bar
    ctx.fillRect(245, 780, 230, 16);

    // Chair wooden armrests
    ctx.fillRect(195, 545, 45, 18);
    ctx.fillRect(480, 545, 45, 18);
    ctx.fillRect(205, 563, 18, 100);
    ctx.fillRect(495, 563, 18, 100);
  }

  /** Legs, work jeans, and muddy boots */
  private renderLegsAndBoots(ctx: CanvasRenderingContext2D): void {
    // Dark navy work jeans
    ctx.fillStyle = '#263238'; // denim navy
    ctx.strokeStyle = '#1a2327';
    ctx.lineWidth = 3;

    // Left leg
    ctx.beginPath();
    ctx.moveTo(280, 680);
    ctx.lineTo(210, 770); // knee
    ctx.lineTo(225, 920);
    ctx.lineTo(290, 920);
    ctx.lineTo(330, 780);
    ctx.lineTo(335, 680);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right leg
    ctx.beginPath();
    ctx.moveTo(385, 680);
    ctx.lineTo(390, 780);
    ctx.lineTo(430, 920);
    ctx.lineTo(495, 920);
    ctx.lineTo(510, 770); // knee
    ctx.lineTo(440, 680);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Heavy rubber work boots (with mud texture)
    this.renderBoot(ctx, 195, 900, false);
    this.renderBoot(ctx, 435, 900, true);

    // Permanent Raw Egg splats on knees (signature detail from reference photo!)
    this.renderKneeEgg(ctx, 270, 765);
    this.renderKneeEgg(ctx, 450, 765);

    // Cracked eggshells on the floor near boots
    this.renderFloorShell(ctx, 165, 930);
    this.renderFloorShell(ctx, 550, 925);
  }

  private renderBoot(ctx: CanvasRenderingContext2D, x: number, y: number, isRight: boolean): void {
    ctx.save();
    ctx.translate(x, y);
    if (isRight) {
      ctx.scale(-1, 1);
      ctx.translate(-95, 0);
    }

    // Boot base & sole
    ctx.fillStyle = '#212121';
    ctx.fillRect(0, 0, 85, 65); // shaft
    ctx.beginPath();
    ctx.moveTo(-15, 45);
    ctx.lineTo(100, 45);
    ctx.lineTo(95, 80);
    ctx.lineTo(-15, 80);
    ctx.closePath();
    ctx.fill();

    // Mud splashes on boots
    ctx.fillStyle = '#5d4037';
    ctx.beginPath();
    ctx.arc(35, 40, 18, 0, Math.PI * 2);
    ctx.arc(65, 55, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private renderKneeEgg(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    // Egg yolk puddle on knee
    ctx.fillStyle = 'rgba(255, 255, 230, 0.7)';
    ctx.beginPath();
    ctx.ellipse(x, y, 32, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rich yolk
    ctx.fillStyle = '#ffb300';
    ctx.beginPath();
    ctx.ellipse(x, y, 20, 16, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // White shell piece resting on knee
    ctx.fillStyle = '#f5e6d3';
    ctx.beginPath();
    ctx.moveTo(x + 18, y - 10);
    ctx.lineTo(x + 36, y + 2);
    ctx.lineTo(x + 24, y + 16);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d7ccc8';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  private renderFloorShell(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = '#f5e6d3';
    ctx.beginPath();
    ctx.arc(x, y, 16, 0.2, Math.PI * 0.9);
    ctx.lineTo(x + 10, y - 5);
    ctx.closePath();
    ctx.fill();
  }

  /** Torso: Green jacket + High-vis orange safety vest */
  private renderTorsoAndVest(ctx: CanvasRenderingContext2D, breathY: number): void {
    const y = 490 + breathY;

    // Green worker jacket base
    ctx.fillStyle = '#334d38';
    ctx.beginPath();
    ctx.roundRect(260, y, 200, 195, [25, 25, 10, 10]);
    ctx.fill();

    // Bright orange safety vest
    ctx.fillStyle = '#ff6f00'; // high-vis orange
    ctx.beginPath();
    // Left panel
    ctx.roundRect(260, y, 75, 190, [20, 5, 5, 10]);
    // Right panel
    ctx.roundRect(385, y, 75, 190, [5, 20, 10, 5]);
    ctx.fill();

    // Grey reflective silver stripes on vest
    ctx.fillStyle = '#cfd8dc';
    // Vertical reflective stripes
    ctx.fillRect(285, y + 15, 22, 130);
    ctx.fillRect(413, y + 15, 22, 130);
    // Horizontal reflective stripe across waist
    ctx.fillRect(260, y + 145, 75, 20);
    ctx.fillRect(385, y + 145, 75, 20);

    // Center zipper line & collar opening
    ctx.strokeStyle = '#263238';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(360, y + 30);
    ctx.lineTo(360, y + 195);
    ctx.stroke();
  }

  /** Arms & weathered hands resting on chair arms */
  private renderArmsAndHands(ctx: CanvasRenderingContext2D): void {
    // Green jacket sleeves
    ctx.fillStyle = '#334d38';
    ctx.strokeStyle = '#243728';
    ctx.lineWidth = 3;

    // Left arm reaching to left armrest
    ctx.beginPath();
    ctx.moveTo(270, 505);
    ctx.quadraticCurveTo(215, 520, 205, 555);
    ctx.lineTo(240, 565);
    ctx.quadraticCurveTo(250, 535, 285, 525);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right arm reaching to right armrest
    ctx.beginPath();
    ctx.moveTo(450, 505);
    ctx.quadraticCurveTo(505, 520, 515, 555);
    ctx.lineTo(480, 565);
    ctx.quadraticCurveTo(470, 535, 435, 525);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Weathered skin hands resting on wood
    ctx.fillStyle = '#d7a17a';
    // Left hand
    ctx.beginPath();
    ctx.ellipse(205, 555, 18, 12, -0.2, 0, Math.PI * 2);
    ctx.fill();
    // Right hand
    ctx.beginPath();
    ctx.ellipse(515, 555, 18, 12, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Head, wrinkles, beard, nose, eyebrows, expressions, beanie hat */
  private renderHead(
    ctx: CanvasRenderingContext2D,
    expr: CharacterExpression,
    breathY: number
  ): void {
    const headX = 360;
    const headY = 405 + breathY;

    // Neck
    ctx.fillStyle = '#c8926a';
    ctx.fillRect(335, headY + 55, 50, 45);

    // Head base (grumpy weathered skin)
    ctx.fillStyle = expr === 'FURIOUS' || expr === 'MELTDOWN' ? '#e57373' : '#d7a17a';
    ctx.beginPath();
    ctx.ellipse(headX, headY + 15, 62, 75, 0, 0, Math.PI * 2);
    ctx.fill();

    // Big grumpy ears
    ctx.beginPath();
    ctx.arc(headX - 64, headY + 15, 15, 0, Math.PI * 2);
    ctx.arc(headX + 64, headY + 15, 15, 0, Math.PI * 2);
    ctx.fill();

    // Stubble gray beard around jaw
    ctx.fillStyle = '#9e9e9e';
    ctx.beginPath();
    ctx.ellipse(headX, headY + 58, 48, 28, 0, 0, Math.PI);
    ctx.fill();

    // Gray mustache
    ctx.fillStyle = '#757575';
    ctx.beginPath();
    ctx.ellipse(headX - 16, headY + 44, 20, 10, -0.2, 0, Math.PI * 2);
    ctx.ellipse(headX + 16, headY + 44, 20, 10, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Big bulbous pink nose
    ctx.fillStyle = '#c9786b';
    ctx.beginPath();
    ctx.ellipse(headX, headY + 30, 22, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Render facial expression (Eyes, Mouth, Eyebrows)
    this.renderFacialExpression(ctx, expr, headX, headY);

    // Beanie Hat (navy blue knit)
    ctx.fillStyle = '#1a237e'; // deep navy
    ctx.beginPath();
    ctx.arc(headX, headY - 20, 64, Math.PI, 0); // cap dome
    ctx.lineTo(headX + 68, headY - 10);
    ctx.lineTo(headX - 68, headY - 10);
    ctx.closePath();
    ctx.fill();

    // Beanie folded cuff
    ctx.fillStyle = '#283593';
    ctx.beginPath();
    ctx.roundRect(headX - 70, headY - 22, 140, 26, 8);
    ctx.fill();

    // Beanie knit rib lines
    ctx.strokeStyle = '#3949ab';
    ctx.lineWidth = 2;
    for (let i = -55; i <= 55; i += 14) {
      ctx.beginPath();
      ctx.moveTo(headX + i, headY - 20);
      ctx.lineTo(headX + i, headY - 45);
      ctx.stroke();
    }
  }

  private renderFacialExpression(
    ctx: CanvasRenderingContext2D,
    expr: CharacterExpression,
    x: number,
    y: number
  ): void {
    const leftEyeX = x - 24;
    const rightEyeX = x + 24;
    const eyeY = y + 10;

    switch (expr) {
      case 'IDLE':
      case 'ANNOYED': {
        // One eye squinted, one wide (skeptical look like photo)
        ctx.fillStyle = '#ffffff';
        // Left eye (squinted)
        ctx.beginPath();
        ctx.ellipse(leftEyeX, eyeY, 12, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#212121';
        ctx.beginPath();
        ctx.arc(leftEyeX + 2, eyeY, 4, 0, Math.PI * 2);
        ctx.fill();

        // Right eye (wide open)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(rightEyeX, eyeY, 14, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#212121';
        ctx.beginPath();
        ctx.arc(rightEyeX - 1, eyeY, 5, 0, Math.PI * 2);
        ctx.fill();

        // Bushy eyebrows
        ctx.strokeStyle = '#424242';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        // Left brow (angled up skeptically)
        ctx.beginPath();
        ctx.moveTo(leftEyeX - 14, eyeY - 12);
        ctx.lineTo(leftEyeX + 16, eyeY - 18);
        ctx.stroke();
        // Right brow (furrowed down aggressively)
        ctx.beginPath();
        ctx.moveTo(rightEyeX - 16, eyeY - 18);
        ctx.lineTo(rightEyeX + 14, eyeY - 10);
        ctx.stroke();

        // Mouth: crooked frown
        ctx.strokeStyle = '#212121';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(x - 18, y + 62);
        ctx.quadraticCurveTo(x, y + 54, x + 18, y + 64);
        ctx.stroke();
        break;
      }

      case 'HIT_IMPACT': {
        // Squeezed tight shut eyes (> <)
        ctx.strokeStyle = '#212121';
        ctx.lineWidth = 4.5;
        ctx.lineCap = 'round';

        // Left eye '>'
        ctx.beginPath();
        ctx.moveTo(leftEyeX - 12, eyeY - 8);
        ctx.lineTo(leftEyeX + 2, eyeY);
        ctx.lineTo(leftEyeX - 12, eyeY + 8);
        ctx.stroke();

        // Right eye '<'
        ctx.beginPath();
        ctx.moveTo(rightEyeX + 12, eyeY - 8);
        ctx.lineTo(rightEyeX - 2, eyeY);
        ctx.lineTo(rightEyeX + 12, eyeY + 8);
        ctx.stroke();

        // Grimacing mouth
        ctx.fillStyle = '#d32f2f';
        ctx.beginPath();
        ctx.roundRect(x - 22, y + 56, 44, 14, 5);
        ctx.fill();
        ctx.fillStyle = '#ffffff'; // clenched teeth
        ctx.fillRect(x - 20, y + 58, 40, 5);
        break;
      }

      case 'FURIOUS':
      case 'MELTDOWN': {
        // Bloodshot bulging eyes
        ctx.fillStyle = '#ffebee';
        ctx.beginPath();
        ctx.ellipse(leftEyeX, eyeY, 15, 14, 0, 0, Math.PI * 2);
        ctx.ellipse(rightEyeX, eyeY, 15, 14, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#d50000'; // glowing angry iris
        ctx.beginPath();
        ctx.arc(leftEyeX, eyeY, 6, 0, Math.PI * 2);
        ctx.arc(rightEyeX, eyeY, 6, 0, Math.PI * 2);
        ctx.fill();

        // Angled furious V eyebrows
        ctx.strokeStyle = '#212121';
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(leftEyeX - 16, eyeY - 10);
        ctx.lineTo(leftEyeX + 16, eyeY - 22);
        ctx.moveTo(rightEyeX - 16, eyeY - 22);
        ctx.lineTo(rightEyeX + 16, eyeY - 10);
        ctx.stroke();

        // Forehead angry vein mark (💢)
        ctx.fillStyle = '#d50000';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText('💢', x - 45, y - 5);

        // Roaring angry mouth
        ctx.fillStyle = '#212121';
        ctx.beginPath();
        ctx.ellipse(x, y + 62, 24, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff'; // teeth
        ctx.fillRect(x - 16, y + 52, 32, 6);
        break;
      }
    }
  }

  private renderMeltdownEffects(ctx: CanvasRenderingContext2D, breathY: number): void {
    const headX = 360;
    const headY = 360 + breathY;

    // Steam billows from head/ears
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    const puffs = [
      { x: headX - 60, y: headY - 10, r: 18 },
      { x: headX - 85, y: headY - 35, r: 24 },
      { x: headX + 60, y: headY - 10, r: 18 },
      { x: headX + 85, y: headY - 35, r: 24 },
      { x: headX, y: headY - 70, r: 28 },
      { x: headX - 25, y: headY - 95, r: 35 },
      { x: headX + 25, y: headY - 100, r: 32 },
    ];

    for (const p of puffs) {
      ctx.beginPath();
      ctx.arc(p.x + (Math.random() - 0.5) * 6, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fire sparks
    ctx.fillStyle = '#ff3d00';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(
        headX + (Math.random() - 0.5) * 120,
        headY - 60 - Math.random() * 80,
        Math.random() * 6 + 3,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }
}
