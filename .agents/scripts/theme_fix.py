import os, glob

replacements = {
    'rgba(15, 23, 42, 0.5)': 'white',
    'border: "1px solid #1e293b"': 'border: "1px solid #e2e8f0"',
    'bg-slate-900/80': 'bg-white',
    'bg-slate-900/60': 'bg-white',
    'bg-slate-800/80': 'bg-slate-50',
    'bg-slate-800/50': 'bg-slate-50',
    'bg-slate-800': 'bg-slate-100',
    'border-slate-700/50': 'border-slate-200',
    'border-slate-700': 'border-slate-200',
    'border-slate-800': 'border-slate-100',
    'border-slate-600': 'border-slate-300',
    'text-white': 'text-slate-900',
    'text-slate-200': 'text-slate-700',
    'text-slate-300': 'text-slate-600',
    'text-slate-400': 'text-slate-500',
    'text-slate-500': 'text-slate-400',
    'color: \'white\'': 'color: \'#0f172a\'',
    'color: "white"': 'color: "#0f172a"',
    'color: "#94a3b8"': 'color: "#64748b"',
    'color: \'#94a3b8\'': 'color: \'#64748b\'',
    'hover:bg-slate-800/80': 'hover:bg-slate-50',
    'bg-white/20': 'bg-black/10'
}

files = glob.glob('web-apps/src/pages/admin/**/*.tsx', recursive=True)

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements.items():
        content = content.replace(old, new)
        
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)
print('Done!')
