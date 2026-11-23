import type { CharacterType } from '../../../shared/types/clash';

export interface RenderFighterParams {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  time: number;
  type: CharacterType;
  side: 'LEFT' | 'RIGHT';
  primaryColor: string;
  secondaryColor: string;
  isWinning: boolean;
  isLosing: boolean;
  screenShake: number;
}

export class CharacterRenderer {
  public renderFighter(params: RenderFighterParams): void {
    const { ctx, x, y, side, isWinning, isLosing } = params;
    ctx.save();
    ctx.translate(x, y);

    // If right side, flip horizontally so character faces left towards center
    if (side === 'RIGHT') {
      ctx.scale(-1, 1);
    }

    // Dynamic battle lean based on winning/losing
    const battleLean = isWinning ? 7 : isLosing ? -6 : 0;
    ctx.rotate((battleLean * Math.PI) / 180);

    // Render shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 8, 48, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Render character according to type
    switch (params.type) {
      case 'girl':
        this.drawGirl(params);
        break;
      case 'boy':
        this.drawBoy(params);
        break;
      case 'cat':
        this.drawCat(params);
        break;
      case 'dog':
        this.drawDog(params);
        break;
      case 'red_fighter':
        this.drawRedFighter(params);
        break;
      case 'blue_fighter':
        this.drawBlueFighter(params);
        break;
      default:
        if (params.side === 'LEFT') {
          this.drawGirl(params);
        } else {
          this.drawBoy(params);
        }
        break;
    }

    // Render comic sweat droplet if losing/pressed
    if (isLosing) {
      this.drawSweatDroplet(ctx, params.time);
    }

    // Hand charge flare if winning or high shake
    if (params.isWinning || params.screenShake > 0.3) {
      this.drawMuzzleAura(ctx, params.primaryColor, params.time);
    }

    ctx.restore();
  }

  // 1. ANIME CHIBI GIRL (GIRL - Twin Pigtails, Sporty Crop Hoodie, Sneaker Boots)
  private drawGirl({ ctx, time, primaryColor, secondaryColor }: RenderFighterParams): void {
    const bob = Math.sin(time * 8) * 3;
    const hairSway = Math.sin(time * 10) * 8;

    // A. Martial Stance Legs (Front bent, back rooted)
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#1e1b4b';

    // Back leg (rooted right)
    ctx.fillStyle = '#312e81';
    ctx.beginPath();
    ctx.moveTo(-10, -40);
    ctx.lineTo(-38, -5);
    ctx.lineTo(-24, 0);
    ctx.lineTo(-2, -35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Back sneaker
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(-46, -3, 26, 11, 4);
    ctx.fill();
    ctx.stroke();

    // Front leg (bent forward left)
    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    ctx.moveTo(2, -40);
    ctx.lineTo(24, -18);
    ctx.lineTo(24, 0);
    ctx.lineTo(10, 0);
    ctx.lineTo(8, -20);
    ctx.lineTo(-4, -36);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Front sneaker
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(8, -3, 26, 11, 4);
    ctx.fill();
    ctx.stroke();

    // B. Torso (Leaning forward into Kamehameha blast)
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.roundRect(-16, -92 + bob, 34, 48, 8);
    ctx.fill();
    ctx.stroke();

    // Crop top trim with team color
    ctx.fillStyle = primaryColor;
    ctx.fillRect(-16, -58 + bob, 34, 12);
    ctx.strokeRect(-16, -58 + bob, 34, 12);

    // Belt / Waistline
    ctx.fillStyle = '#fce7f3';
    ctx.fillRect(-12, -46 + bob, 26, 6);

    // C. Pigtails Back Layer
    ctx.fillStyle = '#fbbf24'; // Golden blonde
    // Back pigtail flying in wind
    ctx.beginPath();
    ctx.ellipse(-28 + hairSway * 0.3, -115 + bob, 14, 28, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // D. Head
    ctx.fillStyle = '#ffedd5'; // Anime skin tone
    ctx.beginPath();
    ctx.arc(2, -108 + bob, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Anime Eyes (Large determined anime style)
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.ellipse(8, -108 + bob, 4.5, 7, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Eye shine
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(9, -111 + bob, 2, 0, Math.PI * 2);
    ctx.fill();

    // Eyebrow determined
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(3, -118 + bob);
    ctx.lineTo(14, -115 + bob);
    ctx.stroke();

    // Smile / Battle shouting mouth
    ctx.fillStyle = '#be123c';
    ctx.beginPath();
    ctx.arc(10, -98 + bob, 4, 0, Math.PI);
    ctx.fill();

    // Cute blush
    ctx.fillStyle = 'rgba(244, 63, 94, 0.45)';
    ctx.beginPath();
    ctx.ellipse(14, -103 + bob, 5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // E. Front Hair & Pink Ribbons
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(0, -118 + bob, 22, Math.PI * 0.8, Math.PI * 2.1);
    ctx.fill();
    ctx.stroke();

    // Pink Hair Bow/Clip
    ctx.fillStyle = secondaryColor;
    ctx.beginPath();
    ctx.arc(-16, -125 + bob, 8, 0, Math.PI * 2);
    ctx.arc(16, -125 + bob, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // F. Front Pigtail (Fluttering towards left)
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.ellipse(-24 + hairSway, -105 + bob, 15, 26, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // G. Arms Extended Forward (Kamehameha thrust)
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#1e1b4b';
    ctx.fillStyle = '#1e1b4b';

    // Both arms reaching forward
    ctx.beginPath();
    ctx.roundRect(-2, -84 + bob, 48, 14, 7);
    ctx.fill();
    ctx.stroke();

    // Gloves / Hands
    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    ctx.arc(46, -77 + bob, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // 2. ANIME CHIBI BOY (BOY - Spiky Green/Cyan Hair, Streetwear Bomber Jacket, Joggers)
  private drawBoy({ ctx, time, primaryColor, secondaryColor }: RenderFighterParams): void {
    const bob = Math.sin(time * 8 + 1) * 3;
    const windHair = Math.cos(time * 9) * 5;

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0f172a';

    // A. Martial Stance Legs
    // Back leg
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(-10, -40);
    ctx.lineTo(-38, -5);
    ctx.lineTo(-24, 0);
    ctx.lineTo(-2, -35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Back high-top sneaker
    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    ctx.roundRect(-46, -4, 26, 12, 4);
    ctx.fill();
    ctx.stroke();

    // Front leg
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(2, -40);
    ctx.lineTo(24, -18);
    ctx.lineTo(24, 0);
    ctx.lineTo(10, 0);
    ctx.lineTo(8, -20);
    ctx.lineTo(-4, -36);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Front high-top sneaker
    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    ctx.roundRect(8, -4, 26, 12, 4);
    ctx.fill();
    ctx.stroke();

    // B. Torso (Bomber Jacket with cyan accents)
    ctx.fillStyle = '#065f46'; // Dark Emerald / Jacket body
    ctx.beginPath();
    ctx.roundRect(-16, -92 + bob, 34, 48, 8);
    ctx.fill();
    ctx.stroke();

    // Jacket Zipper & Collar trim
    ctx.fillStyle = secondaryColor;
    ctx.fillRect(0, -92 + bob, 4, 48);

    // C. Head
    ctx.fillStyle = '#fed7aa'; // Skin tone
    ctx.beginPath();
    ctx.arc(2, -108 + bob, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Determined Boy Eye
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.ellipse(8, -108 + bob, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Eye pupil reflection
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(7, -110 + bob, 2, 0, Math.PI * 2);
    ctx.fill();

    // Sharp Brow
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(2, -117 + bob);
    ctx.lineTo(14, -113 + bob);
    ctx.stroke();

    // Shouting Mouth
    ctx.fillStyle = '#991b1b';
    ctx.beginPath();
    ctx.arc(10, -98 + bob, 5, 0, Math.PI);
    ctx.fill();
    ctx.stroke();

    // D. Spiky Streetwear Hair (Blowing backwards in wind)
    ctx.fillStyle = '#10b981'; // Vivid green hair
    ctx.beginPath();
    ctx.moveTo(-18, -114 + bob);
    ctx.lineTo(-32 + windHair, -128 + bob);
    ctx.lineTo(-14, -126 + bob);
    ctx.lineTo(-20 + windHair, -142 + bob);
    ctx.lineTo(0, -132 + bob);
    ctx.lineTo(8 + windHair, -145 + bob);
    ctx.lineTo(16, -130 + bob);
    ctx.lineTo(26, -120 + bob);
    ctx.lineTo(22, -108 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // E. Arms Extended Forward
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0f172a';
    ctx.fillStyle = '#065f46';
    ctx.beginPath();
    ctx.roundRect(-2, -84 + bob, 48, 15, 7);
    ctx.fill();
    ctx.stroke();

    // Gloves
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(46, -76 + bob, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // 3. CHONKY ORANGE CAT (CAT - Expressive, Ears, Whiskers, Tail, Cat Claws)
  private drawCat({ ctx, time, primaryColor }: RenderFighterParams): void {
    const bob = Math.sin(time * 7) * 4;
    const tailWag = Math.sin(time * 10) * 16;

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#431407';

    // A. Wavy Animated Cat Tail (Stretching up back)
    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    ctx.moveTo(-18, -45);
    ctx.quadraticCurveTo(-45 + tailWag, -75, -30 + tailWag, -110);
    ctx.quadraticCurveTo(-22 + tailWag, -114, -18 + tailWag, -105);
    ctx.quadraticCurveTo(-35 + tailWag, -75, -12, -40);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // B. Chunky Martial Feet / Legs
    ctx.fillStyle = primaryColor;
    // Back leg
    ctx.beginPath();
    ctx.ellipse(-26, -6, 16, 9, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Front leg
    ctx.beginPath();
    ctx.ellipse(14, -6, 18, 10, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // C. Round Chonky Body (Ginger Cat)
    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    ctx.ellipse(0, -60 + bob, 32, 38, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Cream Belly Patch
    ctx.fillStyle = '#ffedd5';
    ctx.beginPath();
    ctx.ellipse(6, -58 + bob, 18, 24, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Red Hero Belt
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.roundRect(-22, -42 + bob, 44, 8, 3);
    ctx.fill();
    ctx.stroke();

    // D. Big Round Cat Head
    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    ctx.arc(6, -105 + bob, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Pointy Cat Ears
    // Left ear
    ctx.beginPath();
    ctx.moveTo(-16, -122 + bob);
    ctx.lineTo(-24, -145 + bob);
    ctx.lineTo(-4, -128 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Left ear pink inner
    ctx.fillStyle = '#fda4af';
    ctx.beginPath();
    ctx.moveTo(-14, -123 + bob);
    ctx.lineTo(-20, -138 + bob);
    ctx.lineTo(-6, -127 + bob);
    ctx.closePath();
    ctx.fill();

    // Right ear
    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    ctx.moveTo(14, -126 + bob);
    ctx.lineTo(26, -146 + bob);
    ctx.lineTo(28, -120 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Right ear pink inner
    ctx.fillStyle = '#fda4af';
    ctx.beginPath();
    ctx.moveTo(16, -125 + bob);
    ctx.lineTo(23, -138 + bob);
    ctx.lineTo(24, -122 + bob);
    ctx.closePath();
    ctx.fill();

    // Funny / Determined Anime Cat Face
    // Big round eyes
    ctx.fillStyle = '#fef08a'; // Yellow cat eyes
    ctx.beginPath();
    ctx.ellipse(14, -107 + bob, 6, 8, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Slit pupil
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(15, -107 + bob, 2.5, 7, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Pink Triangle Nose
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.moveTo(22, -101 + bob);
    ctx.lineTo(26, -97 + bob);
    ctx.lineTo(18, -97 + bob);
    ctx.closePath();
    ctx.fill();

    // Cat Whiskers
    ctx.strokeStyle = '#431407';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(24, -98 + bob);
    ctx.lineTo(44, -102 + bob);
    ctx.moveTo(24, -95 + bob);
    ctx.lineTo(42, -92 + bob);
    ctx.stroke();

    // E. Front Cat Paws Extended (Claws out)
    ctx.lineWidth = 3;
    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    ctx.roundRect(8, -82 + bob, 42, 16, 8);
    ctx.fill();
    ctx.stroke();

    // Paw Pads / Claws
    ctx.fillStyle = '#ffedd5';
    ctx.beginPath();
    ctx.arc(48, -74 + bob, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Glowing Cat Claws (Energy Claws)
    ctx.fillStyle = '#fef08a';
    for (let c = 0; c < 3; c++) {
      ctx.beginPath();
      ctx.moveTo(56, -80 + c * 6 + bob);
      ctx.lineTo(66, -78 + c * 6 + bob);
      ctx.lineTo(56, -74 + c * 6 + bob);
      ctx.closePath();
      ctx.fill();
    }
  }

  // 4. SHIBA INU / HUSKY DOG (DOG - Expressive Shiba Brows, Bandana, Tail, Woof Pose)
  private drawDog({ ctx, time, primaryColor }: RenderFighterParams): void {
    const bob = Math.sin(time * 7 + 0.5) * 4;
    const tailWag = Math.cos(time * 12) * 14;

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0f172a';

    // A. Curled Shiba Tail
    ctx.fillStyle = '#f59e0b'; // Shiba tan
    ctx.beginPath();
    ctx.arc(-24 + tailWag * 0.4, -65 + bob, 16, 0, Math.PI * 1.5);
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0f172a';

    // B. Sturdy Legs
    ctx.fillStyle = '#f59e0b';
    // Back leg
    ctx.beginPath();
    ctx.ellipse(-24, -6, 17, 10, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Front leg
    ctx.beginPath();
    ctx.ellipse(14, -6, 18, 10, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // C. Shiba Body
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.ellipse(0, -60 + bob, 32, 36, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // White Chest Fur (Urajiro)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(8, -58 + bob, 18, 22, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Blue Ninja Bandana / Scarf
    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    ctx.moveTo(-18, -80 + bob);
    ctx.lineTo(22, -80 + bob);
    ctx.lineTo(14, -65 + bob);
    ctx.lineTo(-24, -68 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // D. Shiba Head
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(6, -105 + bob, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // White Muzzle (Cheeks)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(14, -100 + bob, 14, 0, Math.PI * 2);
    ctx.fill();

    // Shiba Ears
    // Left ear
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(-14, -122 + bob);
    ctx.lineTo(-22, -145 + bob);
    ctx.lineTo(-2, -128 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Right ear
    ctx.beginPath();
    ctx.moveTo(12, -126 + bob);
    ctx.lineTo(24, -146 + bob);
    ctx.lineTo(26, -120 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Shiba Eyebrows (Two White Dots)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(4, -118 + bob, 4, 0, Math.PI * 2);
    ctx.arc(18, -117 + bob, 4, 0, Math.PI * 2);
    ctx.fill();

    // Determined Dog Eyes
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(12, -108 + bob, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Shine
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(10, -110 + bob, 2, 0, Math.PI * 2);
    ctx.fill();

    // Dog Nose & Tongue sticking out (Classic meme dog)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(26, -102 + bob, 4, 0, Math.PI * 2);
    ctx.fill();

    // Playful tongue
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.ellipse(28, -94 + bob, 4, 6, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // E. Front Paws Reaching Forward
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0f172a';
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.roundRect(8, -82 + bob, 44, 16, 8);
    ctx.fill();
    ctx.stroke();

    // White Paw Tip
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(50, -74 + bob, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // 5. RED MARTIAL FIGHTER (RED - Headband fluttering, Muscular wrap, Fiery Dragon punch)
  private drawRedFighter({ ctx, time, primaryColor }: RenderFighterParams): void {
    const bob = Math.sin(time * 8) * 3;
    const bandFlutter = Math.sin(time * 12) * 12;

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#450a0a';

    // Long Red Headband tails flying backwards
    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    ctx.moveTo(-12, -114 + bob);
    ctx.quadraticCurveTo(-38 + bandFlutter, -118 + bob, -55 + bandFlutter, -100 + bob);
    ctx.lineTo(-58 + bandFlutter, -108 + bob);
    ctx.quadraticCurveTo(-35 + bandFlutter, -126 + bob, -10, -120 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Deep Horse / Dragon Battle Stance
    ctx.fillStyle = '#1c1917'; // Dark gi pants
    // Back leg
    ctx.beginPath();
    ctx.moveTo(-8, -42);
    ctx.lineTo(-42, -6);
    ctx.lineTo(-26, 0);
    ctx.lineTo(0, -36);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Front leg
    ctx.beginPath();
    ctx.moveTo(4, -42);
    ctx.lineTo(26, -18);
    ctx.lineTo(26, 0);
    ctx.lineTo(10, 0);
    ctx.lineTo(10, -20);
    ctx.lineTo(-2, -36);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Torso (Muscular red martial gi)
    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    ctx.roundRect(-16, -94 + bob, 36, 52, 8);
    ctx.fill();
    ctx.stroke();

    // Black Martial Arts Belt
    ctx.fillStyle = '#09090b';
    ctx.fillRect(-18, -50 + bob, 40, 8);
    ctx.strokeRect(-18, -50 + bob, 40, 8);

    // Head
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.arc(2, -108 + bob, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Red Headband wrapped around forehead
    ctx.fillStyle = primaryColor;
    ctx.fillRect(-18, -120 + bob, 40, 8);
    ctx.strokeRect(-18, -120 + bob, 40, 8);

    // Spiky Red Flame Hair
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(-16, -120 + bob);
    ctx.lineTo(-26, -138 + bob);
    ctx.lineTo(-10, -132 + bob);
    ctx.lineTo(-14, -148 + bob);
    ctx.lineTo(4, -135 + bob);
    ctx.lineTo(16, -145 + bob);
    ctx.lineTo(22, -124 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Intense Battle Eyes
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.ellipse(8, -107 + bob, 4.5, 6, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Gritted Teeth
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(5, -98 + bob, 12, 6);
    ctx.strokeRect(5, -98 + bob, 12, 6);

    // Arms in Tiger Strike / Kamehameha thrust
    ctx.fillStyle = '#fed7aa'; // Muscular arm
    ctx.beginPath();
    ctx.roundRect(-2, -84 + bob, 48, 16, 8);
    ctx.fill();
    ctx.stroke();

    // Boxing Handwraps (Red)
    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    ctx.arc(46, -76 + bob, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // 6. BLUE LIGHTNING / FROST WARRIOR (BLUE - Electric Spikes, Cape, Lightning Orb)
  private drawBlueFighter({ ctx, time, primaryColor }: RenderFighterParams): void {
    const bob = Math.sin(time * 8 + 0.8) * 3;
    const capeFlutter = Math.cos(time * 11) * 12;

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#082f49';

    // Flowing Blue Cape
    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    ctx.moveTo(-10, -84 + bob);
    ctx.quadraticCurveTo(-45 + capeFlutter, -80, -60 + capeFlutter, -20);
    ctx.lineTo(-46 + capeFlutter, -16);
    ctx.quadraticCurveTo(-30 + capeFlutter, -65, -8, -60 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Stance Legs (Armored boots)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(-8, -42);
    ctx.lineTo(-38, -6);
    ctx.lineTo(-24, 0);
    ctx.lineTo(0, -36);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(4, -42);
    ctx.lineTo(24, -18);
    ctx.lineTo(24, 0);
    ctx.lineTo(10, 0);
    ctx.lineTo(10, -20);
    ctx.lineTo(-2, -36);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Torso (Cyan / Blue Frost Armor)
    ctx.fillStyle = '#0369a1';
    ctx.beginPath();
    ctx.roundRect(-16, -94 + bob, 36, 52, 8);
    ctx.fill();
    ctx.stroke();

    // Chest Crystal Emblem
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(2, -85 + bob);
    ctx.lineTo(9, -75 + bob);
    ctx.lineTo(2, -65 + bob);
    ctx.lineTo(-5, -75 + bob);
    ctx.closePath();
    ctx.fill();

    // Head
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.arc(2, -108 + bob, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Electric Spiky Hair (Crystalline Blue)
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(-16, -114 + bob);
    ctx.lineTo(-30, -135 + bob);
    ctx.lineTo(-12, -128 + bob);
    ctx.lineTo(-18, -148 + bob);
    ctx.lineTo(2, -134 + bob);
    ctx.lineTo(14, -148 + bob);
    ctx.lineTo(22, -120 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glowing Electric Eyes (Cyan)
    ctx.fillStyle = '#00f2fe';
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.ellipse(8, -107 + bob, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Arms
    ctx.fillStyle = '#0369a1';
    ctx.beginPath();
    ctx.roundRect(-2, -84 + bob, 48, 16, 8);
    ctx.fill();
    ctx.stroke();

    // Glowing Hands
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(46, -76 + bob, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Comic Anime Sweat Droplet when losing / pressed
  private drawSweatDroplet(ctx: CanvasRenderingContext2D, time: number): void {
    const sweatBounce = Math.sin(time * 12) * 4;
    ctx.fillStyle = '#38bdf8';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-10, -124 + sweatBounce);
    ctx.quadraticCurveTo(-14, -116 + sweatBounce, -18, -118 + sweatBounce);
    ctx.arc(-13, -116 + sweatBounce, 4, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Muzzle Flash / Hand Power Aura when winning
  private drawMuzzleAura(ctx: CanvasRenderingContext2D, color: string, time: number): void {
    const pulse = Math.sin(time * 15) * 6;
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 12;
    ctx.globalAlpha = 0.65;
    ctx.beginPath();
    ctx.arc(48, -76, 16 + pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export const characterRenderer = new CharacterRenderer();
