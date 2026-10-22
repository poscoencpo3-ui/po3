"""아이들 그림(art/*.jpg)에서 구름·괴물 모양을 오려 내서 게임용 젤리 그림으로 만듭니다.

    pip install pillow numpy scipy
    python3 tools/process_drawings.py

아이들이 그린 모양과 위치는 그대로 쓰고, 연필 자국은 지우고 부드럽게 다듬어 다시 칠합니다.
배경(봄 하늘, 밤하늘)과 지름길은 게임 코드(src/background.js, src/game.js)가 그립니다.

결과: public/maps/<맵>/c*.png, monster-*.png, thumb.jpg, map.json
"""
import json
import os

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W = 1080  # 게임 세계 폭(px)

SPRING = [  # 봄 젤리 색
    (1.00, 0.70, 0.83), (0.62, 0.91, 0.78), (0.79, 0.70, 1.00),
    (0.62, 0.84, 1.00), (1.00, 0.92, 0.55), (1.00, 0.78, 0.62),
]
MONSTER_HUES = [  # 괴물 색: 초록, 분홍, 파랑, 주황, 보라
    (0.55, 0.88, 0.45), (1.00, 0.55, 0.75), (0.45, 0.70, 1.00),
    (1.00, 0.68, 0.35), (0.72, 0.52, 1.00),
]


def load(name, box):
    im = Image.open(os.path.join(ROOT, 'art', name + '.jpg')).convert('RGB').crop(box)
    h = round(im.height * W / im.width)
    im = im.resize((W, h), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32) / 255
    g = a.mean(2)
    bg = ndi.gaussian_filter(ndi.grey_closing(g, size=(25, 25)), 20)
    n = a / bg[..., None]
    return np.clip(n / np.percentile(n, 70, axis=(0, 1)), 0, 1)  # 종이 = 흰색


def components(mask, minarea):
    lab, _ = ndi.label(mask)
    out = []
    for i, sl in enumerate(ndi.find_objects(lab)):
        m = lab[sl] == i + 1
        if m.sum() >= minarea:
            cy, cx = ndi.center_of_mass(m)
            out.append(dict(id=i + 1, area=int(m.sum()), sl=sl,
                            cx=sl[1].start + cx, cy=sl[0].start + cy))
    return lab, out


def interiors(line, k):
    """연필 선으로 둘러싸인 안쪽 영역 (틈은 k 만큼 메움)."""
    closed = ndi.binary_dilation(line, iterations=k)
    lab, _ = ndi.label(~closed)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    inside = ~closed & ~np.isin(lab, list(border))
    return ndi.binary_dilation(inside, iterations=k + 1)


def pick(comps, x, y):
    return min(comps, key=lambda c: (c['cx'] - x) ** 2 + (c['cy'] - y) ** 2)


def crop(mask):
    ys, xs = np.nonzero(mask)
    return mask[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def smooth(mask, sigma=4.0):
    """연필로 그린 삐뚤빼뚤한 테두리를 둥글게."""
    m = np.pad(crop(mask), 20)
    m = ndi.gaussian_filter(m.astype(float), sigma) > 0.5
    m = ndi.binary_fill_holes(m)
    lab, n = ndi.label(m)
    if n > 1:  # 가장 큰 덩어리만
        sizes = ndi.sum(m, lab, range(1, n + 1))
        m = lab == (np.argmax(sizes) + 1)
    return crop(m)


def scale_mask(m, s, flip=False):
    im = Image.fromarray((m * 255).astype(np.uint8))
    if flip:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    im = im.resize((max(4, round(m.shape[1] * s)), max(4, round(m.shape[0] * s))), Image.LANCZOS)
    return np.asarray(im) > 127


def jelly(m, base, glow=False):
    """모양(m)을 말랑한 젤리로 칠한 RGBA 이미지."""
    pad = 16 if glow else 6
    m = np.pad(m, pad)
    base = np.array(base, dtype=float)
    h, w = m.shape
    d = ndi.distance_transform_edt(m)
    dn = np.clip(d / max(d.max(), 1), 0, 1)
    col = base * (0.84 + 0.16 * dn[..., None])
    s = max(3, int(min(h, w) * 0.06))
    up = m & ~np.roll(np.roll(m, s, 0), s, 1)
    down = m & ~np.roll(np.roll(m, -s, 0), -s, 1)
    sh = ndi.gaussian_filter(down.astype(float), 2.5)[..., None]
    col = col * (1 - 0.22 * sh)
    hl = ndi.gaussian_filter(up.astype(float), 2.5)[..., None]
    col = col * (1 - 0.45 * hl) + 0.45 * hl
    # 반짝이 두 개
    gy, gx = np.mgrid[0:h, 0:w]
    ey, ex = ndi.center_of_mass(m)
    inner = ndi.binary_erosion(m, iterations=5)
    for oy, ox, r, a in ((0.22, 0.2, 0.11, 0.75), (0.05, 0.36, 0.04, 0.85)):
        cy, cx = ey - h * oy, ex - w * ox
        rr = min(h, w) * r
        g = (((gx - cx) / (rr * 1.5)) ** 2 + ((gy - cy) / rr) ** 2) < 1
        g &= inner
        col[g] = col[g] * (1 - a) + a
    # 테두리: 같은 색의 진한 선
    edge = m & ~ndi.binary_erosion(m, iterations=3)
    edge_s = ndi.gaussian_filter(edge.astype(float), 0.8)[..., None]
    col = col * (1 - edge_s) + (base * 0.58) * edge_s
    alpha = ndi.gaussian_filter(m.astype(float), 0.9)
    rgb = col
    if glow:
        halo = ndi.gaussian_filter(ndi.binary_dilation(m, iterations=4).astype(float), 6) * 0.55
        light = np.clip(base * 0.5 + 0.5, 0, 1)
        out_a = np.maximum(alpha, halo)
        rgb = np.where(alpha[..., None] > 0.02, col, light)
        alpha = out_a
    rgba = np.dstack([np.clip(rgb, 0, 1), np.clip(alpha, 0, 1)])
    return Image.fromarray((rgba * 255).astype(np.uint8), 'RGBA'), pad


def place(m, cx, cy, pad):
    """모양의 무게중심이 (cx, cy)에 오도록 했을 때의 왼쪽 위 좌표."""
    my, mx = ndi.center_of_mass(m)
    return round(cx - mx - pad), round(cy - my - pad)


def write_map(key, title, height, theme, clouds, extra):
    out = os.path.join(ROOT, 'public', 'maps', key)
    os.makedirs(out, exist_ok=True)
    for f in os.listdir(out):
        os.remove(os.path.join(out, f))
    meta = dict(id=key, title=title, width=W, height=height, theme=theme, clouds=[])
    for i, c in enumerate(clouds):
        img, pad = jelly(c['mask'], c['base'], glow=theme == 'night')
        x0, y0 = place(c['mask'], c['cx'], c['cy'], pad)
        fn = 'c%d.png' % i
        img.save(os.path.join(out, fn), optimize=True)
        meta['clouds'].append(dict(id=i, img=fn, x=x0, y=y0, w=img.width, h=img.height,
                                   cx=round(c['cx']), cy=round(c['cy']),
                                   role=c.get('role'), face=c.get('role') is None,
                                   kid=not c.get('extra', False), drift=c.get('drift')))
    meta.update(extra)
    with open(os.path.join(out, 'map.json'), 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)
    print(key, height, len(clouds), 'clouds')
    return meta


def write_monsters(key, body, eyes):
    out = os.path.join(ROOT, 'public', 'maps', key)
    for i, hue in enumerate(MONSTER_HUES):
        img, pad = jelly(body, hue)
        img.save(os.path.join(out, 'monster-%d.png' % i), optimize=True)
    return pad


def find_eyes(norm, body_full):
    m = body_full
    line = norm.mean(2) < 0.72
    eyes_line = line & ndi.binary_erosion(m, iterations=10)
    lab, cs = components(ndi.binary_fill_holes(ndi.binary_dilation(eyes_line, iterations=2)), 200)
    ys, xs = np.nonzero(m)
    return [dict(x=round(c['cx'] - xs.min()), y=round(c['cy'] - ys.min()),
                 r=round(max(c['sl'][0].stop - c['sl'][0].start, c['sl'][1].stop - c['sl'][1].start) / 2))
            for c in sorted(cs, key=lambda c: c['cx'])]


def thumb(meta, theme):
    d = os.path.join(ROOT, 'public', 'maps', meta['id'])
    h = meta['height']
    t = np.linspace(0, 1, h)[:, None, None]
    if theme == 'night':
        top, bot = np.array([0.11, 0.08, 0.28]), np.array([0.42, 0.29, 0.56])
    else:
        top, bot = np.array([0.75, 0.91, 1.0]), np.array([1.0, 0.89, 0.95])
    sky = np.broadcast_to(top * (1 - t) + bot * t, (h, W, 3))
    im = Image.fromarray((sky * 255).astype(np.uint8)).convert('RGBA')
    if theme == 'night':
        rng = np.random.default_rng(3)
        px = im.load()
        for _ in range(500):
            x, y = rng.integers(0, W), rng.integers(0, h)
            px[int(x), int(y)] = (255, 255, 230, 255)
    for c in meta['clouds']:
        im.alpha_composite(Image.open(os.path.join(d, c['img'])).convert('RGBA'), (c['x'], c['y']))
    mo = meta['monster']
    mon = Image.open(os.path.join(d, 'monster-0.png')).convert('RGBA')
    mon = mon.resize((round(mon.width * 0.5), round(mon.height * 0.5)), Image.LANCZOS)
    hx, hy = mo['home']
    im.alpha_composite(mon, (round(hx - mon.width / 2), round(hy - mon.height / 2)))
    im = im.convert('RGB').resize((360, round(h * 360 / W)), Image.LANCZOS)
    im.save(os.path.join(d, 'thumb.jpg'), quality=85)


# ---------------------------------------------------------------- 새봄이 맵
def saebom():
    norm = load('saebom', (110, 430, 2230, 3590))
    norm[:, :14] = 1
    norm[330:392, 92:140] = 1
    line = norm.mean(2) < 0.72
    line[-3:, :200] = True
    a = interiors(line, 2)
    lab_a, ca = components(a, 1200)
    regions = [lab_a == c['id'] for c in ca]
    for k in (4, 6):
        b = interiors(line, k)
        lab_b, cb = components(b, 1200)
        for c in cb:
            m = lab_b == c['id']
            if not any((m & r).any() for r in regions):
                regions.append(m)
    comps = []
    for m in regions:
        cy, cx = ndi.center_of_mass(m)
        comps.append(dict(mask=m, cx=cx, cy=cy, area=int(m.sum())))
    monster = max(comps, key=lambda c: c['area'])
    monster['mask'] = ndi.binary_fill_holes(monster['mask'])
    comps = [c for c in comps if c is monster or not monster['mask'][int(c['cy']), int(c['cx'])]]
    slide = pick(comps, 925, 730)
    ladder = [c for c in comps if c is not monster and c is not slide and c['cx'] > 540 and c['cy'] < 880]
    clouds = [c for c in comps if c is not monster and c is not slide and not any(c is p for p in ladder)]
    clouds.sort(key=lambda c: (c['cy'], c['cx']))
    for i, c in enumerate(clouds):
        c['shape'] = smooth(c['mask'])
        c['base'] = SPRING[i % len(SPRING)]
    pick(clouds, 144, 431)['role'] = 'start'
    pick(clouds, 578, 1571)['role'] = 'goal'
    for c in clouds:
        if c.get('role') == 'start':
            c['base'] = (1.0, 0.86, 0.55)
        if c.get('role') == 'goal':
            c['base'] = (1.0, 0.82, 0.38)
    pick(clouds, 680, 1190)['drift'] = dict(ax=70, ay=0, period=7)
    pick(clouds, 572, 1018)['drift'] = dict(ax=0, ay=40, period=5)
    pick(clouds, 300, 1420)['drift'] = dict(ax=40, ay=20, period=9)
    # 업그레이드: 아이 구름 모양을 빌려 새 발판 추가
    src = [c['shape'] for c in clouds if not c.get('role')]
    extras = [  # (x, y, 모양 번호, 크기, 뒤집기, 움직임)
        (330, 470, 2, 0.95, True, None),
        (560, 300, 7, 0.8, False, dict(ax=60, ay=0, period=6)),
        (870, 280, 4, 0.9, True, None),
        (990, 560, 1, 0.85, False, None),
        (800, 1560, 9, 0.9, True, None),
        (290, 1555, 5, 0.85, False, None),
        (110, 760, 11, 0.8, True, None),
    ]
    for j, (x, y, si, s, flip, drift) in enumerate(extras):
        clouds.append(dict(shape=scale_mask(src[si % len(src)], s, flip), cx=x, cy=y,
                           base=SPRING[(j + 2) % len(SPRING)], extra=True, drift=drift))
    for c in clouds:
        c['mask'] = c['shape']
    body = smooth(monster['mask'], 3)
    eyes = find_eyes(norm, monster['mask'])
    meta = write_map('saebom', '새봄이의 봄 하늘', norm.shape[0], 'spring', clouds, dict(
        monster=dict(w=0, h=0, eyes=eyes, home=[650, 440]),
        shortcuts=[
            dict(type='ladder', entry=[540, 822], climb=[[540, 822], [872, 566]],
                 slide=[[880, 600], [915, 700], [950, 800], [965, 865]], land=[855, 1462]),
            dict(type='portal', a=[870, 280], b=[800, 1560]),
            dict(type='spring', at=[154, 1207], land=[290, 1555]),
        ],
        door=[578, 1548],
    ))
    pad = write_monsters('saebom', body, eyes)
    mi = Image.open(os.path.join(ROOT, 'public', 'maps', 'saebom', 'monster-0.png'))
    for e in meta['monster']['eyes']:
        e['x'] += pad
        e['y'] += pad
    meta['monster'].update(w=mi.width, h=mi.height)
    with open(os.path.join(ROOT, 'public', 'maps', 'saebom', 'map.json'), 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)
    thumb(meta, 'spring')
    return body, meta['monster']


# ---------------------------------------------------------------- 새별이 맵
def saebyeol(body, monster):
    norm = load('saebyeol', (100, 360, 1990, 3170))
    norm[:, :20] = 1
    g = norm.mean(2)
    sat = norm.max(2) - norm.min(2)
    ink = ndi.binary_closing((g < 0.80) | (sat > 0.10), iterations=4)
    region = ndi.binary_opening(ndi.binary_fill_holes(ink), iterations=3)
    lab, cs = components(region, 3000)
    # 새별이가 칠한 색을 밤하늘에 맞게 조금 밝게
    picks = [(550, 250, (0.62, 0.80, 1.00)), (866, 263, (1.00, 0.70, 0.84)),
             (248, 560, (1.00, 0.90, 0.48)), (850, 680, (0.82, 0.72, 1.00)),
             (476, 889, (0.72, 0.74, 1.00)), (158, 928, (1.00, 0.70, 0.90)),
             (863, 1145, (0.60, 0.84, 1.00)), (509, 1315, (1.00, 0.90, 0.45))]
    clouds = []
    for x, y, col in picks:
        c = pick(cs, x, y)
        clouds.append(dict(shape=smooth(lab == c['id'], 5), cx=c['cx'], cy=c['cy'], base=col))
    min(clouds, key=lambda c: (c['cx'] - 866) ** 2 + (c['cy'] - 263) ** 2)['role'] = 'start'
    min(clouds, key=lambda c: (c['cx'] - 863) ** 2 + (c['cy'] - 1145) ** 2)['drift'] = dict(ax=0, ay=60, period=6)
    min(clouds, key=lambda c: (c['cx'] - 248) ** 2 + (c['cy'] - 560) ** 2)['drift'] = dict(ax=50, ay=0, period=8)
    gy, gx = np.mgrid[0:84, 0:180]
    pad = (((gx - 90) / 90.0) ** 2 + ((gy - 42) / 42.0) ** 2) < 1
    clouds.append(dict(shape=pad, cx=300, cy=1565, role='goal', base=(1.0, 0.85, 0.42)))
    src = [c['shape'] for c in clouds[:8] if not c.get('role')]
    extras = [
        (190, 230, 4, 0.5, False, None),
        (690, 1010, 4, 0.75, True, dict(ax=40, ay=0, period=5)),
        (700, 1440, 4, 0.45, True, None),
        (960, 1470, 0, 0.5, False, None),
        (330, 1220, 3, 0.4, False, None),
    ]
    for j, (x, y, si, s, flip, drift) in enumerate(extras):
        clouds.append(dict(shape=scale_mask(src[si % len(src)], s, flip), cx=x, cy=y,
                           base=[(0.66, 0.95, 0.85), (1.0, 0.8, 0.6), (0.85, 0.75, 1.0), (0.7, 0.9, 1.0), (1.0, 0.75, 0.85)][j],
                           extra=True, drift=drift))
    for c in clouds:
        c['mask'] = c['shape']
    meta = write_map('saebyeol', '새별이의 별빛 하늘', norm.shape[0], 'night', clouds, dict(
        monster=dict(monster, home=[700, 560]),
        shortcuts=[
            dict(type='ladder', entry=[78, 1112], climb=[[78, 1112], [325, 1318]],
                 slide=[[338, 1340], [330, 1430], [312, 1520], [300, 1560]], land=[300, 1560]),
            dict(type='portal', a=[531, 230], b=[700, 1440]),
            dict(type='spring', at=[241, 568], land=[500, 1325]),
        ],
        door=[300, 1540],
    ))
    write_monsters('saebyeol', body, None)
    thumb(meta, 'night')


if __name__ == '__main__':
    b, m = saebom()
    saebyeol(b, m)
