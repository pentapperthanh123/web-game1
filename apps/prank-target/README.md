# Prank Target 3D (`apps/prank-target`)

TikTok LIVE Interactive 3D Prank Game built with **Three.js**, locking 9:16 vertical stage (`720x1280`) at **30 FPS**. Seamlessly connects to Core Connect Service (`server/`) via `NormalizedLiveEvent`.

---

## 1. 3D Architecture & Dual-Mode Character

- **Mode 1 — Built-in Stylized 3D Character (Runs out-of-the-box):**
  - Fully procedural stylized old maintenance worker in front of a rustic porch door sitting on a wooden chair.
  - **Spring Physics Recoil:** When impacted by thrown objects, the character body recoils back and pitches with dynamic damped spring oscillations.
  - **3D Morph / Rig Facial Deformation:**
    - `squint`: Eyes tightly close on impact (`HIT_IMPACT`).
    - `angry`: Bushy eyebrows furrow aggressively, forehead vein pops up (`FURIOUS` / `MELTDOWN`).
    - `puffed`: Bulbous pink nose inflates and turns bright red.
    - `shock`: Mouth/jaw drops in shock.
    - **Wind Reaction:** Hat (`beanieGroup`) flies up spinning into the air on `WIND` command and lands back onto the head!
    - Raw cracked eggs with yellow yolks permanently resting on both knees (signature look from photo).
- **Mode 2 — Custom GLB Dropzone (`public/models/character.glb`):**
  - Drop any Blender/GLTF character model into `apps/prank-target/client/public/models/character.glb`.
  - Auto-detects and smoothly interpolates (`lerp`) morph target influences: `angry`, `squint`, `shock`, `puffed`.

---

## 2. 3D Projectile & Attachment Pools (Zero Garbage Collection)

- **3D Projectiles (`ProjectilePool3D` — Max 6):**
  - `EGG`: Oval 3D egg flying with parabolic arc.
  - `CAKE`: Layered 3D cake slice on a plate.
  - `BALL`: 3D basketball with bouncy impact.
  - `WIND`: 3D double tornado vortex ribbon.
  - `MILK`: 3D fluid splashing cluster.
  - `SURPRISE`: 3D gift box with ribbon.
- **3D Attachments / Decals (`AttachmentPool3D` — Max 8):**
  - 3D convex egg yolks & cracked shells sticking on nose/chest/knees.
  - 3D cake cream smears on cheeks.
  - 3D bump knot with orbiting yellow stars.
  - Lasts **8–12 seconds**, slowly drips downward, and scales out smoothly before recycling into the pool.
- **3D Particles (`ParticlePool3D` — Max 60):**
  - Instant splashes and Meltdown steam clouds billowing from ears and head.

---

## 3. Core Event Mapping (`NormalizedLiveEvent`)

- **`CHAT` (2.5s anti-spam cooldown per user):**
  - `egg` / `trung` / `1` → Throw Egg (splat + yolk drip + squint eyes).
  - `wind` / `gio` / `2` → Wind Gust (tornado + beanie flies off head!).
  - `cake` / `banh` / `3` → Smash Cake (cake flying into face + frosting smear).
  - `ball` / `bong` / `4` → Throw Ball (ball bonk + head knot & spinning stars).
  - `milk` / `sua` / `5` → Splash Milk (white liquid spray).
  - `wtf` / `haha` / `lol` → Taunt (+6% rage + furious expression).
- **`LIKE` (Batched every 200ms):**
  - Accumulates rage; milestone triggers surprise Random Prank!
- **`GIFT`:**
  - `1–4 coins`: Fast single prank + `<Name> threw EGG!` banner.
  - `5–29 coins`: **Prank Combo** (3 rapid items + camera shake).
  - `30+ coins`: **Meltdown / Chaos Shower** (5 seconds of rapid 3D items + top pranker spotlight).

---

## 4. How to Run Locally

1. Run Client (port 8040) and Admin (port 8041):
```bash
pnpm dev:prank
```
2. Open Admin at `http://localhost:8041`:
   - The **9:16 Live Client Preview** is automatically opened side-by-side.
3. In the Admin **LIVE SIMULATOR** panel, click **`BẬT AUTO-BOT`** (or click any manual prank button) to watch real-time 3D physics, facial morphing, and attachments!
4. *(Optional)* To test your own 3D character, place your `.glb` file at `apps/prank-target/client/public/models/character.glb`.
