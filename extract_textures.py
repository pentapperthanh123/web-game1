import glob
import os
import struct
import io
from PIL import Image

def tex_to_png(tex_path, out_png):
    try:
        with open(tex_path, 'rb') as f:
            data = f.read()
        if len(data) < 40 or data[:3] != b'TEX':
            return False
        w, h = struct.unpack('<HH', data[4:8])
        fmt = data[8]
        fourcc = b'DXT5' if fmt == 1 else b'DXT1'
        
        dds_header = bytearray(128)
        dds_header[0:4] = b'DDS '
        struct.pack_into('<I', dds_header, 4, 124)
        struct.pack_into('<I', dds_header, 8, 0x00081007)
        struct.pack_into('<I', dds_header, 12, h)
        struct.pack_into('<I', dds_header, 16, w)
        struct.pack_into('<I', dds_header, 28, 1)
        struct.pack_into('<I', dds_header, 76, 32)
        struct.pack_into('<I', dds_header, 80, 4)
        dds_header[84:88] = fourcc
        struct.pack_into('<I', dds_header, 108, 0x1000)

        for offset in [24, 40, 16, 32]:
            dds_data = bytes(dds_header) + data[offset:]
            try:
                im = Image.open(io.BytesIO(dds_data))
                im.load()
                im.save(out_png)
                print(f"Converted {os.path.basename(tex_path)} -> {os.path.basename(out_png)} ({w}x{h}, {fourcc.decode()})")
                return True
            except Exception:
                pass
    except Exception as e:
        pass
    return False

out_dir = 'client/public/models/aatrox_textures'
os.makedirs(out_dir, exist_ok=True)
tex_files = sorted(glob.glob('client/public/models/aatrox_extracted/unknown/*.tex'), key=os.path.getsize, reverse=True)
count = 0
for tf in tex_files[:20]:
    base = os.path.basename(tf).replace('.tex', '.png')
    out_name = os.path.join(out_dir, base)
    if tex_to_png(tf, out_name):
        count += 1
print(f"Done converting {count} textures!")
