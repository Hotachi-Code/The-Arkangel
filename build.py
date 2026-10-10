#!/usr/bin/env python3
"""Összefűzi a játékot egyetlen fájlba: src/core.html + src/*.js -> TheArkangel.html

A részek a /*@@PARTS@@*/ jelölő helyére kerülnek, ebben a sorrendben.
Használat:  python3 build.py                       (TheArkangel.html, minden rész)
            python3 build.py --out x.html
            python3 build.py --only weapons.js --out x.html   (csak a megnevezett részek; fegyver nélkül a tartalék fegyverek kerülnek be)
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
PARTS = ['world.js', 'ai.js', 'weapons.js', 'upgrades.js', 'levels.js']

def build(out, only=None):
    core = open(os.path.join(HERE, 'src', 'core.html'), encoding='utf-8').read()
    chunks = []
    names = [n for n in PARTS if only is None or n in only]
    if 'weapons.js' not in names or not os.path.exists(os.path.join(HERE, 'src', 'weapons.js')):
        names = ['_stub_weapons.js'] + names
    for name in names:
        fp = os.path.join(HERE, 'src', name)
        if os.path.exists(fp):
            chunks.append(f'// ===================== src/{name} =====================\n' + open(fp, encoding='utf-8').read().rstrip() + '\n')
    assert '/*@@PARTS@@*/' in core
    html = core.replace('/*@@PARTS@@*/', '\n'.join(chunks))
    open(out, 'w', encoding='utf-8').write(html)
    return out

if __name__ == '__main__':
    out = os.path.join(HERE, 'TheArkangel.html')
    if '--out' in sys.argv: out = sys.argv[sys.argv.index('--out') + 1]
    only = sys.argv[sys.argv.index('--only') + 1].split(',') if '--only' in sys.argv else None
    print(build(out, only))
