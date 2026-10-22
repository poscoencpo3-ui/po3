"""아이들 그림(art/*.jpg)을 게임용 배경·슬라임 발판·괴물 이미지로 바꿉니다.

    pip install pillow numpy scipy
    python3 tools/process_drawings.py

결과: public/maps/<맵>/bg.jpg, c*.png, monster.png, map.json
"""
import json
import os

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W = 1080  # 게임 세계 폭(px)

SKY_TOP = np.array([0.86, 0.95, 1.00])
SKY_BOTTOM = np.array([1.00, 0.91, 0.96])

JELLY = [  # 귀여운 젤리 색
    (1.00, 0.72, 0.84), (0.66, 0.92, 0.80), (0.80, 0.73, 1.00),
    (0.66, 0.86, 1.00), (1.00, 0.94, 0.62), (1.00, 0.80, 0.66),
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


def sky(h):
    t = np.linspace(0, 1, h)[:, None, None]
    return np.broadcast_to(SKY_TOP * (1 - t) + SKY_BOTTOM * t, (h, W, 3)).copy()


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


def jelly_sprite(norm, mask, base, pad=6):
    """마스크 영역을 젤리처럼 색칠한 RGBA 스프라이트."""
    ys, xs = np.nonzero(mask)
    y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad + 1, mask.shape[0])
    x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad + 1, mask.shape[1])
    m = mask[y0:y1, x0:x1]
    n = norm[y0:y1, x0:x1]
    base = np.array(base)
    d = ndi.distance_transform_edt(m)
    dn = np.clip(d / max(d.max(), 1), 0, 1)
    col = base * (0.86 + 0.14 * dn[..., None])
    # 위·왼쪽은 밝게, 아래·오른쪽은 진하게 (말랑한 느낌)
    s = max(3, int(min(m.shape) * 0.07))
    up = m & ~np.roll(np.roll(m, s, 0), s, 1)
    dn_rim = m & ~np.roll(np.roll(m, -s, 0), -s, 1)
    col[ndi.gaussian_filter(dn_rim.astype(float), 2) > 0.3] *= 0.86
    hl = ndi.gaussian_filter(up.astype(float), 2)[..., None]
    col = col * (1 - 0.35 * hl) + 0.35 * hl
    # 반짝이
    h, w = m.shape
    gy, gx = np.mgrid[0:h, 0:w]
    ey, ex = ndi.center_of_mass(m)
    ey -= h * 0.22
    ex -= w * 0.2
    r = min(h, w) * 0.11
    gloss = (((gx - ex) / (r * 1.4)) ** 2 + ((gy - ey) / r) ** 2) < 1
    gloss &= ndi.binary_erosion(m, iterations=4)
    col[gloss] = col[gloss] * 0.3 + 0.7
    rgb = np.where(m[..., None], col * n, n)
    alpha = ndi.gaussian_filter(ndi.binary_dilation(m, iterations=2).astype(float), 1.0)
    alpha = np.clip(alpha * 1.6, 0, 1)
    rgba = np.dstack([rgb, alpha])
    img = Image.fromarray((np.clip(rgba, 0, 1) * 255).astype(np.uint8), 'RGBA')
    return img, (int(x0), int(y0))


def save_map(key, title, norm, bgmask, clouds, extra):
    out = os.path.join(ROOT, 'public', 'maps', key)
    os.makedirs(out, exist_ok=True)
    for f in os.listdir(out):
        os.remove(os.path.join(out, f))
    h = norm.shape[0]
    s = sky(h)
    # 발판·괴물 자리는 하늘로 비우고, 나머지 그림은 연필 느낌 그대로 곱하기
    keep = ~ndi.binary_dilation(bgmask, iterations=9)
    soft = ndi.gaussian_filter(keep.astype(float), 1.5)[..., None]
    bg = s * (norm * soft + (1 - soft))
    Image.fromarray((bg * 255).astype(np.uint8)).save(os.path.join(out, 'bg.jpg'), quality=86)
    meta = dict(id=key, title=title, width=W, height=h, bg='bg.jpg', clouds=[])
    for i, c in enumerate(clouds):
        img, (x0, y0) = c['sprite']
        fn = 'c%d.png' % i
        img.save(os.path.join(out, fn), optimize=True)
        meta['clouds'].append(dict(id=i, img=fn, x=x0, y=y0, w=img.width, h=img.height,
                                   cx=round(c['cx']), cy=round(c['cy']),
                                   role=c.get('role'), face=c.get('face', True),
                                   drift=c.get('drift')))
    meta.update(extra)
    with open(os.path.join(out, 'map.json'), 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)
    print(key, h, len(clouds), 'clouds')


def monster_sprite(norm, body, base):
    """괴물 몸통 + 바깥 테두리만 (눈은 게임에서 움직이게 그림)."""
    ys, xs = np.nonzero(body)
    pad = 8
    y0, y1, x0, x1 = ys.min() - pad, ys.max() + pad + 1, xs.min() - pad, xs.max() + pad + 1
    m = body[y0:y1, x0:x1]
    n = norm[y0:y1, x0:x1].copy()
    line = n.mean(2) < 0.72
    ring = ndi.binary_dilation(m, iterations=3) & ~ndi.binary_erosion(m, iterations=7)
    n[~(line & ring)] = 1  # 안쪽 연필선(눈) 지우기
    eyes_line = line & ndi.binary_erosion(m, iterations=10)
    lab, cs = components(ndi.binary_fill_holes(ndi.binary_dilation(eyes_line, iterations=2)), 200)
    eyes = []
    for c in sorted(cs, key=lambda c: c['cx']):
        sl = c['sl']
        eyes.append(dict(x=round(c['cx']), y=round(c['cy']),
                         r=round(max(sl[0].stop - sl[0].start, sl[1].stop - sl[1].start) / 2)))
    img, _ = jelly_sprite(n, m, base, pad=0)
    return img, eyes, (int(x0), int(y0))


def saebom():
    norm = load('saebom', (110, 430, 2230, 3590))
    norm[:, :14] = 1  # 스프링 구멍
    norm[330:392, 92:140] = 1  # 시작 구름 위 막대 사람(플레이어가 대신 섬)
    line = norm.mean(2) < 0.72
    line[-3:, :200] = True  # 종이 아래에 잘린 구름 닫기
    a = interiors(line, 2)
    lab_a, ca = components(a, 1200)
    regions = [lab_a == c['id'] for c in ca]
    for k in (4, 6):  # 선에 틈이 있는 구름은 더 크게 메워서 다시 찾기
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
    comps = [c for c in comps if c is monster
             or not monster['mask'][int(c['cy']), int(c['cx'])]]  # 괴물 눈
    slide = pick(comps, 925, 730)
    ladder_parts = [c for c in comps if c is not monster and c is not slide
                    and c['cx'] > 540 and c['cy'] < 880]
    clouds = [c for c in comps if c is not monster and c is not slide
              and not any(c is p for p in ladder_parts)]
    start = pick(clouds, 144, 431)
    goal = pick(clouds, 578, 1571)
    start['role'] = 'start'
    goal['role'] = 'goal'
    start['face'] = goal['face'] = False
    pick(clouds, 680, 1190)['drift'] = dict(ax=70, ay=0, period=7)
    pick(clouds, 572, 1018)['drift'] = dict(ax=0, ay=40, period=5)
    pick(clouds, 300, 1420)['drift'] = dict(ax=40, ay=20, period=9)
    clouds.sort(key=lambda c: (c['cy'], c['cx']))
    for i, c in enumerate(clouds):
        if c.get('role') == 'start':
            base = (1.00, 0.88, 0.60)
        elif c.get('role') == 'goal':
            base = (1.00, 0.85, 0.40)
        else:
            base = JELLY[i % len(JELLY)]
        c['sprite'] = jelly_sprite(norm, c['mask'], base)
    # 사다리 칸·미끄럼틀은 배경에서 색칠
    for c in ladder_parts:
        m = ndi.binary_erosion(c['mask'], iterations=2)
        norm[m] = norm[m] * np.array([1.0, 0.86, 0.55])
    m = ndi.binary_erosion(slide['mask'], iterations=2)
    stripes = ((np.add.outer(np.arange(norm.shape[0]), np.arange(W)) // 18) % 2).astype(bool)
    norm[m & stripes] *= np.array([0.70, 0.88, 1.0])
    norm[m & ~stripes] *= np.array([1.0, 0.80, 0.90])
    mimg, eyes, (mx, my) = monster_sprite(norm, monster['mask'], (0.55, 0.88, 0.50))
    bgmask = np.zeros(norm.shape[:2], bool)
    for c in clouds:
        bgmask |= c['mask']
    bgmask |= monster['mask']
    save_map('saebom', '새봄이의 슬라임 숲', norm, bgmask, clouds, dict(
        monster=dict(img='monster.png', x=mx, y=my, w=mimg.width, h=mimg.height, eyes=eyes,
                     scale=0.55, home=[650, 440]),
        ladder=dict(entry=[540, 822], climb=[[540, 822], [872, 566]],
                    slide=[[880, 600], [915, 700], [950, 800], [965, 865]], land=[855, 1462]),
        door=[578, 1548],
    ))
    out = os.path.join(ROOT, 'public', 'maps', 'saebom')
    mimg.save(os.path.join(out, 'monster.png'), optimize=True)


def saebyeol():
    norm = load('saebyeol', (100, 360, 1990, 3170))
    norm[:, :20] = 1  # 종이 가장자리 그림자
    g = norm.mean(2)
    sat = norm.max(2) - norm.min(2)
    ink = ndi.binary_closing((g < 0.80) | (sat > 0.10), iterations=4)
    region = ndi.binary_opening(ndi.binary_fill_holes(ink), iterations=3)
    lab, cs = components(region, 3000)
    want = {'start': (866, 263)}
    # 새별이가 칠한 색: 파랑, 분홍, 노랑, 보라, 보라, 분홍보라, 파랑, 노랑
    picks = [(550, 250, (0.70, 0.84, 1.00)), (866, 263, (1.00, 0.76, 0.84)),
             (248, 560, (1.00, 0.93, 0.55)), (850, 680, (0.86, 0.78, 1.00)),
             (476, 889, (0.80, 0.80, 1.00)), (158, 928, (1.00, 0.76, 0.92)),
             (863, 1145, (0.66, 0.86, 1.00)), (509, 1315, (1.00, 0.92, 0.50))]
    clouds = []
    for x, y, col in picks:
        c = pick(cs, x, y)
        clouds.append(dict(mask=lab == c['id'], cx=c['cx'], cy=c['cy'], base=col))
    sx, sy = want['start']
    start = min(clouds, key=lambda c: (c['cx'] - sx) ** 2 + (c['cy'] - sy) ** 2)
    start['role'] = 'start'
    start['face'] = False
    min(clouds, key=lambda c: (c['cx'] - 863) ** 2 + (c['cy'] - 1145) ** 2)['drift'] = dict(ax=0, ay=60, period=6)
    min(clouds, key=lambda c: (c['cx'] - 248) ** 2 + (c['cy'] - 560) ** 2)['drift'] = dict(ax=50, ay=0, period=8)
    clouds.sort(key=lambda c: (c['cy'], c['cx']))
    for c in clouds:
        # 연필 색은 살리되 너무 진해지지 않게 절반만 곱함
        soft = 0.5 + 0.5 * norm
        c['sprite'] = jelly_sprite(soft, c['mask'], c['base'])
    # 문 도착 발판(아이가 그린 문 앞의 땅)
    gy, gx = np.mgrid[0:norm.shape[0], 0:W]
    pad = (((gx - 300) / 90.0) ** 2 + ((gy - 1565) / 42.0) ** 2) < 1
    pad_c = dict(mask=pad, cx=300, cy=1565, role='goal', face=False)
    pad_c['sprite'] = jelly_sprite(np.ones_like(norm), pad, (1.0, 0.86, 0.42))
    clouds.append(pad_c)
    bgmask = np.zeros(norm.shape[:2], bool)
    for c in clouds:
        if c is not pad_c:
            bgmask |= c['mask']
    mon = Image.open(os.path.join(ROOT, 'public', 'maps', 'saebom', 'monster.png'))
    meta_sb = json.load(open(os.path.join(ROOT, 'public', 'maps', 'saebom', 'map.json'), encoding='utf-8'))
    m = meta_sb['monster']
    save_map('saebyeol', '새별이의 구름 하늘', norm, bgmask, clouds, dict(
        monster=dict(img='monster.png', x=0, y=0, w=m['w'], h=m['h'], eyes=m['eyes'],
                     scale=0.5, home=[700, 560]),
        ladder=dict(entry=[78, 1112], climb=[[78, 1112], [325, 1318]],
                    slide=[[338, 1340], [330, 1430], [312, 1520], [300, 1560]], land=[300, 1560]),
        door=[155, 1548],
    ))
    # 새별이 맵 괴물은 보라색
    r, g, b, a = mon.split()
    h, s_, v = Image.merge('RGB', (r, g, b)).convert('HSV').split()
    h = h.point(lambda x: (x + 150) % 256)
    purple = Image.merge('HSV', (h, s_, v)).convert('RGB')
    purple.putalpha(a)
    purple.save(os.path.join(ROOT, 'public', 'maps', 'saebyeol', 'monster.png'), optimize=True)


def thumb(key):
    """고르기 화면용 미리보기 (배경 + 구름 + 괴물)."""
    d = os.path.join(ROOT, 'public', 'maps', key)
    meta = json.load(open(os.path.join(d, 'map.json'), encoding='utf-8'))
    im = Image.open(os.path.join(d, 'bg.jpg')).convert('RGBA')
    for c in meta['clouds']:
        im.alpha_composite(Image.open(os.path.join(d, c['img'])).convert('RGBA'), (c['x'], c['y']))
    m = meta['monster']
    mon = Image.open(os.path.join(d, 'monster.png')).convert('RGBA')
    mon = mon.resize((round(mon.width * m['scale']), round(mon.height * m['scale'])), Image.LANCZOS)
    hx, hy = m['home']
    im.alpha_composite(mon, (round(hx - mon.width / 2), round(hy - mon.height / 2)))
    im = im.convert('RGB').resize((360, round(im.height * 360 / im.width)), Image.LANCZOS)
    im.save(os.path.join(d, 'thumb.jpg'), quality=85)


if __name__ == '__main__':
    saebom()
    saebyeol()
    thumb('saebom')
    thumb('saebyeol')
