import trimesh
import numpy as np
from PIL import Image

# Load body, wings, sword
body = trimesh.load('client/public/models/aatrox_skn_out/Body.obj')
wings = trimesh.load('client/public/models/aatrox_skn_out/Wings.obj')
sword = trimesh.load('client/public/models/aatrox_skn_out/Sword.obj')
shoulder = trimesh.load('client/public/models/aatrox_skn_out/Shoulder.obj')

# Center and scale to unit size (~3.5 units tall)
# Original body height is ~250 units (League of Legends game scale)
all_vertices = np.vstack([body.vertices, wings.vertices, sword.vertices, shoulder.vertices])
min_bound = all_vertices.min(axis=0)
max_bound = all_vertices.max(axis=0)
center = (min_bound + max_bound) / 2
# Ground the feet at y = 0
center[1] = min_bound[1]
height = max_bound[1] - min_bound[1]
scale_factor = 3.8 / height # Scale to ~3.8 units in Three.js

for m in [body, wings, sword, shoulder]:
    m.vertices = (m.vertices - center) * scale_factor

# Load textures
tex = Image.open('client/public/models/aatrox_textures/5b51382275ea3644.png')

body.visual = trimesh.visual.TextureVisuals(uv=body.visual.uv, image=tex)
wings.visual = trimesh.visual.TextureVisuals(uv=wings.visual.uv, image=tex)
sword.visual = trimesh.visual.TextureVisuals(uv=sword.visual.uv, image=tex)
shoulder.visual = trimesh.visual.TextureVisuals(uv=shoulder.visual.uv, image=tex)

scene = trimesh.Scene([body, wings, sword, shoulder])
scene.export('client/public/models/aatrox_boss.glb')
print('Successfully exported client/public/models/aatrox_boss.glb!')
