import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ASSET_PATHS, probeAssetExists, STANDARD_HEIGHTS } from './assetLoader3D';
import { createToonMaterial } from './toonMaterials';

export const STUDIO_ANCHORS = {
  EASEL_POS: new THREE.Vector3(0.24, 0, 0.22),
  EASEL_ROT_Y: -0.18,
  CANVAS_WIDTH: 0.90,
  CANVAS_HEIGHT: 0.90,
  ARTIST_PAINT_POS: new THREE.Vector3(0.78, 0, 0.48),
  ARTIST_REVEAL_POS: new THREE.Vector3(0.98, 0, 0.58),
  STOOL_POS: new THREE.Vector3(-0.58, 0, 0.54),
  SEAT_TOP_Y: STANDARD_HEIGHTS.DEFAULT_SEAT_TOP_Y,
  GALLERY_Y: 2.52,
  GALLERY_Z: -1.56,
} as const;

export interface StudioEnvironmentRig {
  root: THREE.Group;
  easelCanvasMesh: THREE.Mesh;
  easelCanvasWorldCenter: THREE.Vector3;
  staticBlobShadows: ReadonlyArray<{ x: number; z: number; radius: number }>;
  getSeatTopY: () => number;
  update: (elapsedSec: number) => void;
  dispose: () => void;
}

function createNormalizedBox(
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  rotX = 0,
  rotY = 0,
  rotZ = 0
): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(w, h, d);
  const matrix = new THREE.Matrix4();
  matrix.compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rotX, rotY, rotZ)),
    new THREE.Vector3(1, 1, 1)
  );
  geo.applyMatrix4(matrix);
  const nonIndexed = geo.toNonIndexed();
  geo.dispose();
  return nonIndexed;
}

function createNormalizedCylinder(
  rt: number,
  rb: number,
  h: number,
  segs: number,
  x: number,
  y: number,
  z: number,
  rotX = 0,
  rotZ = 0
): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(rt, rb, h, segs);
  const matrix = new THREE.Matrix4();
  matrix.compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rotX, 0, rotZ)),
    new THREE.Vector3(1, 1, 1)
  );
  geo.applyMatrix4(matrix);
  const nonIndexed = geo.toNonIndexed();
  geo.dispose();
  return nonIndexed;
}

function mergeAndAdd(
  parent: THREE.Group,
  parts: THREE.BufferGeometry[],
  material: THREE.Material,
  disposables: { geometries: THREE.BufferGeometry[]; materials: THREE.Material[] }
): THREE.Mesh | null {
  const merged = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  if (!merged) return null;
  disposables.geometries.push(merged);
  disposables.materials.push(material);
  const mesh = new THREE.Mesh(merged, material);
  parent.add(mesh);
  return mesh;
}

function buildFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const plankTones = ['#dfb583', '#d6a874', '#e4bd8e', '#cfa06b', '#ddb27f', '#d8ab77', '#e2b98a', '#d3a470'];
    const plankH = 32;
    for (let i = 0; i < 8; i++) {
      const y = i * plankH;
      ctx.fillStyle = plankTones[i % plankTones.length];
      ctx.fillRect(0, y, 256, plankH);

      ctx.strokeStyle = 'rgba(120, 74, 36, 0.14)';
      ctx.lineWidth = 1.2;
      for (let g = 4; g < plankH - 3; g += 6) {
        ctx.beginPath();
        ctx.moveTo(0, y + g);
        ctx.bezierCurveTo(
          85,
          y + g + ((i % 2) * 3 - 1.5),
          170,
          y + g - ((i % 2) * 3 - 1.5),
          256,
          y + g
        );
        ctx.stroke();
      }

      const seamX = ((i * 97) % 200) + 28;
      ctx.strokeStyle = 'rgba(105, 62, 28, 0.32)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(seamX, y);
      ctx.lineTo(seamX, y + plankH);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 5);
  return tex;
}

function buildPastelRugTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 256, 256);

    ctx.strokeStyle = '#f5ead6';
    ctx.lineWidth = 2.5;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 36) {
      ctx.beginPath();
      ctx.moveTo(128 + Math.cos(a) * 112, 128 + Math.sin(a) * 112);
      ctx.lineTo(128 + Math.cos(a) * 124, 128 + Math.sin(a) * 124);
      ctx.stroke();
    }

    const rings: ReadonlyArray<[number, string]> = [
      [114, '#e6b89c'],
      [104, '#fae5d3'],
      [86, '#f4a28c'],
      [74, '#fdf2e9'],
      [42, '#f9d5a7'],
    ];
    for (const [radius, color] of rings) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(128, 128, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildBuntingTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 512, 96);
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.quadraticCurveTo(256, 22, 512, 8);
    ctx.stroke();

    const flagColors = ['#fb7185', '#fbbf24', '#34d399', '#38bdf8', '#f472b6', '#f97316', '#a3e635'];
    const flagCount = 11;
    const step = 512 / flagCount;
    for (let i = 0; i < flagCount; i++) {
      const x0 = i * step + 4;
      const xMid = x0 + (step - 8) / 2;
      const x1 = x0 + step - 8;
      const t = (i + 0.5) / flagCount;
      const cordY = 8 + Math.sin(t * Math.PI) * 10;

      ctx.fillStyle = flagColors[i % flagColors.length];
      ctx.beginPath();
      ctx.moveTo(x0, cordY);
      ctx.lineTo(x1, cordY);
      ctx.lineTo(xMid, cordY + 64);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildStudioEnvironment(
  paintingTexture: THREE.CanvasTexture,
  onSeatTopYResolved?: (seatTopY: number) => void
): StudioEnvironmentRig {
  const root = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];
  const disposables = { geometries, materials };
  let resolvedSeatTopY: number = STUDIO_ANCHORS.SEAT_TOP_Y;

  // 1. Natural Wood Plank Floor
  const floorTex = buildFloorTexture();
  textures.push(floorTex);
  const floorGeo = new THREE.PlaneGeometry(10, 10);
  const floorMat = new THREE.MeshLambertMaterial({ map: floorTex });
  geometries.push(floorGeo);
  materials.push(floorMat);
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  root.add(floor);

  // 2. Woven Pastel Circular Rug under Stool & Easel
  const rugTex = buildPastelRugTexture();
  textures.push(rugTex);
  const rugGeo = new THREE.PlaneGeometry(2.65, 2.65);
  const rugMat = new THREE.MeshBasicMaterial({
    map: rugTex,
    transparent: true,
    depthWrite: false,
  });
  geometries.push(rugGeo);
  materials.push(rugMat);
  const rugMesh = new THREE.Mesh(rugGeo, rugMat);
  rugMesh.rotation.x = -Math.PI / 2;
  rugMesh.position.set(-0.10, 0.005, 0.36);
  root.add(rugMesh);

  // 3. Cream Painted Walls
  mergeAndAdd(
    root,
    [
      createNormalizedBox(8.4, 5.2, 0.16, 0, 2.6, -2.95),
      createNormalizedBox(0.16, 5.2, 7.2, -2.75, 2.6, 0.4),
      createNormalizedBox(0.16, 5.2, 7.2, 2.75, 2.6, 0.4),
    ],
    createToonMaterial(0xfff5e4),
    disposables
  );

  // 4. Pastel Triangle Bunting Flags across Top Gallery Wall
  const buntingTex = buildBuntingTexture();
  textures.push(buntingTex);
  const buntingGeo = new THREE.PlaneGeometry(3.4, 0.44);
  const buntingMat = new THREE.MeshBasicMaterial({
    map: buntingTex,
    transparent: true,
    depthWrite: false,
  });
  geometries.push(buntingGeo);
  materials.push(buntingMat);
  const buntingMesh = new THREE.Mesh(buntingGeo, buntingMat);
  buntingMesh.position.set(0, 2.92, -1.54);
  root.add(buntingMesh);

  // 5. Sunlit Window Sky (Hard rectangular sunbeam planes removed per Requirement 4!)
  const skyGeo = new THREE.PlaneGeometry(1.62, 1.48);
  const skyMat = new THREE.MeshBasicMaterial({ color: 0xffe4a8 });
  geometries.push(skyGeo);
  materials.push(skyMat);
  const skyPlane = new THREE.Mesh(skyGeo, skyMat);
  skyPlane.position.set(-1.12, 1.54, -2.84);
  root.add(skyPlane);

  // 6. Merged Warm Wood Architecture + Stool with exact seatTopY = 0.58m & footrest = 0.22m
  const sx = STUDIO_ANCHORS.STOOL_POS.x;
  const sz = STUDIO_ANCHORS.STOOL_POS.z;
  const seatTopY = STUDIO_ANCHORS.SEAT_TOP_Y; // 0.58m
  const footrestY = STANDARD_HEIGHTS.FOOTREST_TOP_Y; // 0.22m

  const fallbackStoolGroup = new THREE.Group();
  const stoolWoodParts: THREE.BufferGeometry[] = [
    // Stool top disc whose upper surface sits strictly at y = seatTopY (0.58m)
    createNormalizedCylinder(0.22, 0.22, 0.05, 18, sx, seatTopY - 0.025, sz),
    createNormalizedCylinder(0.028, 0.024, seatTopY - 0.04, 8, sx - 0.13, (seatTopY - 0.04) / 2, sz + 0.12, 0.06, -0.06),
    createNormalizedCylinder(0.028, 0.024, seatTopY - 0.04, 8, sx + 0.13, (seatTopY - 0.04) / 2, sz + 0.12, 0.06, 0.06),
    createNormalizedCylinder(0.028, 0.024, seatTopY - 0.04, 8, sx - 0.13, (seatTopY - 0.04) / 2, sz - 0.12, -0.06, -0.06),
    createNormalizedCylinder(0.028, 0.024, seatTopY - 0.04, 8, sx + 0.13, (seatTopY - 0.04) / 2, sz - 0.12, -0.06, 0.06),
    // Front & side footrest bars at y = 0.22m
    createNormalizedBox(0.28, 0.026, 0.026, sx, footrestY, sz + 0.135),
    createNormalizedBox(0.026, 0.026, 0.26, sx + 0.135, footrestY, sz),
  ];
  mergeAndAdd(fallbackStoolGroup, stoolWoodParts, createToonMaterial(0xb87a4b), disposables);
  root.add(fallbackStoolGroup);

  const roomWoodParts: THREE.BufferGeometry[] = [
    createNormalizedBox(8.2, 0.17, 0.08, 0, 0.085, -2.85),
    createNormalizedBox(1.82, 0.1, 0.18, -1.12, 0.78, -2.78),
    createNormalizedBox(1.78, 0.08, 0.12, -1.12, 2.30, -2.82),
    createNormalizedBox(0.08, 1.56, 0.12, -1.97, 1.54, -2.82),
    createNormalizedBox(0.08, 1.56, 0.12, -0.27, 1.54, -2.82),
    createNormalizedBox(0.045, 1.5, 0.08, -1.12, 1.54, -2.82),
    createNormalizedBox(1.68, 0.045, 0.08, -1.12, 1.54, -2.82),
    createNormalizedBox(0.38, 0.26, 0.30, 1.28, 0.13, 0.14),
    createNormalizedBox(0.42, 0.04, 0.34, 1.28, 0.28, 0.14),
  ];
  mergeAndAdd(root, roomWoodParts, createToonMaterial(0xb87a4b), disposables);

  // 7. Terracotta Pots & Brush Bucket beside Easel
  mergeAndAdd(
    root,
    [
      createNormalizedCylinder(0.18, 0.13, 0.28, 12, 1.48, 0.14, -1.18),
      createNormalizedCylinder(0.085, 0.068, 0.18, 12, 0.56, 0.09, 0.36),
      createNormalizedCylinder(0.055, 0.055, 0.14, 10, 1.26, 0.37, 0.14),
    ],
    createToonMaterial(0xd97757),
    disposables
  );

  // 8. Potted Plant Rounded Foliage
  const leafParts: THREE.BufferGeometry[] = [];
  const leafSpecs: ReadonlyArray<[number, number, number, number]> = [
    [1.48, 0.44, -1.18, 0.22],
    [1.37, 0.58, -1.14, 0.17],
    [1.58, 0.56, -1.22, 0.16],
    [1.48, 0.74, -1.18, 0.15],
  ];
  for (const [lx, ly, lz, lr] of leafSpecs) {
    const sphere = new THREE.SphereGeometry(lr, 10, 8);
    sphere.translate(lx, ly, lz);
    const nonIdx = sphere.toNonIndexed();
    sphere.dispose();
    leafParts.push(nonIdx);
  }
  mergeAndAdd(root, leafParts, createToonMaterial(0x65a30d), disposables);

  // 9. Wooden Easel + Live Painting Canvas
  const easelGroup = new THREE.Group();
  easelGroup.position.copy(STUDIO_ANCHORS.EASEL_POS);
  easelGroup.rotation.y = STUDIO_ANCHORS.EASEL_ROT_Y;

  const easelWoodParts: THREE.BufferGeometry[] = [
    createNormalizedBox(0.06, 1.96, 0.06, -0.34, 0.95, 0.04, -0.1, 0, -0.11),
    createNormalizedBox(0.06, 1.96, 0.06, 0.34, 0.95, 0.04, -0.1, 0, 0.11),
    createNormalizedBox(0.055, 1.88, 0.055, 0, 0.90, -0.40, 0.35, 0, 0),
    createNormalizedBox(1.04, 0.065, 0.12, 0, 0.94, 0.09),
    createNormalizedBox(0.32, 0.07, 0.1, 0, 1.92, -0.02),
  ];
  mergeAndAdd(easelGroup, easelWoodParts, createToonMaterial(0x9a5b32), disposables);

  const backingGeo = new THREE.BoxGeometry(
    STUDIO_ANCHORS.CANVAS_WIDTH + 0.06,
    STUDIO_ANCHORS.CANVAS_HEIGHT + 0.06,
    0.045
  );
  const backingMat = createToonMaterial(0xf5ead6);
  geometries.push(backingGeo);
  materials.push(backingMat);
  const backingMesh = new THREE.Mesh(backingGeo, backingMat);
  backingMesh.position.set(0, 1.42, 0.02);
  backingMesh.rotation.x = -0.1;
  easelGroup.add(backingMesh);

  const canvasGeo = new THREE.PlaneGeometry(
    STUDIO_ANCHORS.CANVAS_WIDTH,
    STUDIO_ANCHORS.CANVAS_HEIGHT
  );
  const canvasMat = new THREE.MeshBasicMaterial({ map: paintingTexture });
  geometries.push(canvasGeo);
  materials.push(canvasMat);
  const easelCanvasMesh = new THREE.Mesh(canvasGeo, canvasMat);
  easelCanvasMesh.position.set(0, 1.42, 0.048);
  easelCanvasMesh.rotation.x = -0.1;
  easelGroup.add(easelCanvasMesh);

  root.add(easelGroup);
  root.updateMatrixWorld(true);

  // Optional `/assets/props.glb` loader for custom stool/props
  void (async () => {
    if (!(await probeAssetExists(ASSET_PATHS.PROPS_GLB))) return;
    try {
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(ASSET_PATHS.PROPS_GLB);
      fallbackStoolGroup.visible = false;
      gltf.scene.position.copy(STUDIO_ANCHORS.STOOL_POS);
      root.add(gltf.scene);
      gltf.scene.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(gltf.scene);
      if (box.max.y > 0.25 && box.max.y < 1.0) {
        resolvedSeatTopY = box.max.y;
        onSeatTopYResolved?.(resolvedSeatTopY);
      }
    } catch {
      // Keep architectural fallback stool
    }
  })();

  const easelCanvasWorldCenter = new THREE.Vector3();
  easelCanvasMesh.getWorldPosition(easelCanvasWorldCenter);

  const ex = STUDIO_ANCHORS.EASEL_POS.x;
  const ez = STUDIO_ANCHORS.EASEL_POS.z;
  const staticBlobShadows: ReadonlyArray<{ x: number; z: number; radius: number }> = [
    { x: sx, z: sz, radius: 0.31 },
    { x: ex - 0.36, z: ez + 0.12, radius: 0.16 },
    { x: ex + 0.36, z: ez + 0.02, radius: 0.16 },
    { x: ex - 0.08, z: ez - 0.48, radius: 0.16 },
    { x: 0.56, z: 0.36, radius: 0.14 },
    { x: 1.28, z: 0.14, radius: 0.26 },
    { x: 1.48, z: -1.18, radius: 0.24 },
  ];

  return {
    root,
    easelCanvasMesh,
    easelCanvasWorldCenter,
    staticBlobShadows,
    getSeatTopY: () => resolvedSeatTopY,
    update: () => {},
    dispose: () => {
      for (const geo of geometries) geo.dispose();
      for (const mat of materials) mat.dispose();
      for (const tex of textures) tex.dispose();
    },
  };
}
