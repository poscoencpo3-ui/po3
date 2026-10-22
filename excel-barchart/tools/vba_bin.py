"""vbaProject.bin(VBA 프로젝트) 생성기.

Excel 없이 VBA 소스(.bas)를 xlsm 에 넣기 위해 MS-OVBA / MS-CFB 규격대로
vbaProject.bin 을 직접 만든다. 컴파일된 p-code 는 넣지 않으므로
Excel 이 파일을 열 때 소스에서 다시 컴파일한다.

한글 문자열이 깨지지 않도록 코드 페이지 949(한국어)로 소스를 저장한다.
"""
import struct
import uuid

# ---------------------------------------------------------------------------
# MS-OVBA 2.4.1 압축
# ---------------------------------------------------------------------------

def _copy_token_help(diff):
    bit_count = 4
    while (1 << bit_count) < diff:
        bit_count += 1
    length_mask = 0xFFFF >> bit_count
    max_len = length_mask + 3
    return bit_count, length_mask, max_len


def _compress_chunk(data):
    out = bytearray()
    pos = 0
    n = len(data)
    table = {}

    def register(i):
        if i + 3 <= n:
            table.setdefault(data[i:i + 3], []).append(i)

    while pos < n:
        flag = 0
        flag_index = len(out)
        out.append(0)
        for bit in range(8):
            if pos >= n:
                break
            best_len, best_off = 0, 0
            if pos > 0:
                bit_count, _, max_len = _copy_token_help(pos)
                max_len = min(max_len, n - pos)
                for cand in reversed(table.get(data[pos:pos + 3], [])):
                    length = 3
                    while length < max_len and data[cand + length] == data[pos + length]:
                        length += 1
                    if length > best_len:
                        best_len, best_off = length, pos - cand
                        if length == max_len:
                            break
            if best_len >= 3:
                bit_count, _, _ = _copy_token_help(pos)
                token = ((best_off - 1) << (16 - bit_count)) | (best_len - 3)
                out += struct.pack("<H", token)
                flag |= 1 << bit
                for i in range(pos, pos + best_len):
                    register(i)
                pos += best_len
            else:
                out.append(data[pos])
                register(pos)
                pos += 1
        out[flag_index] = flag
    return bytes(out)


def compress(data):
    out = bytearray(b"\x01")
    for start in range(0, len(data), 4096):
        chunk = data[start:start + 4096]
        body = _compress_chunk(chunk)
        if len(body) > 4096 and len(chunk) == 4096:
            out += struct.pack("<H", 0x3000 | 0x0FFF) + chunk         # 비압축 청크 (크기 4098-3)
        else:
            if len(body) > 4096:
                raise ValueError("압축 청크가 너무 큽니다")
            out += struct.pack("<H", 0xB000 | (len(body) + 2 - 3)) + body
    return bytes(out)


# ---------------------------------------------------------------------------
# MS-CFB 복합 파일 (v3, 512바이트 섹터) 작성
# ---------------------------------------------------------------------------
FREESECT, ENDOFCHAIN, FATSECT, NOSTREAM = 0xFFFFFFFF, 0xFFFFFFFE, 0xFFFFFFFD, 0xFFFFFFFF
SECTOR, MINI, CUTOFF = 512, 64, 4096


class _Entry:
    def __init__(self, name, kind, data=b""):
        self.name, self.kind, self.data = name, kind, data   # kind: 1 저장소, 2 스트림, 5 루트
        self.children = []
        self.left = self.right = self.child = NOSTREAM
        self.color = 1
        self.start, self.size = ENDOFCHAIN, 0


def _cfb_key(e):
    return (len(e.name), e.name.upper())


def _build_tree(entries, index_of):
    """형제 항목을 균형 이진 탐색 트리로 만들고 레드-블랙 규칙에 맞게 색칠."""
    entries = sorted(entries, key=_cfb_key)

    def build(lo, hi, depth, depths):
        if lo > hi:
            return NOSTREAM
        mid = (lo + hi) // 2
        e = entries[mid]
        depths[id(e)] = depth
        e.left = build(lo, mid - 1, depth + 1, depths)
        e.right = build(mid + 1, hi, depth + 1, depths)
        return index_of[id(e)]

    depths = {}
    root = build(0, len(entries) - 1, 0, depths)
    if entries:
        max_depth = max(depths.values())
        full = (1 << (max_depth + 1)) - 1 == len(entries)
        for e in entries:
            e.color = 0 if (depths[id(e)] == max_depth and not full and max_depth > 0) else 1
    return root


def write_cfb(tree):
    """tree: {이름: bytes | dict} 구조를 복합 파일 bytes 로 변환."""
    root = _Entry("Root Entry", 5)

    def add(parent, items):
        for name, val in items.items():
            if isinstance(val, dict):
                e = _Entry(name, 1)
                add(e, val)
            else:
                e = _Entry(name, 2, bytes(val))
            parent.children.append(e)

    add(root, tree)
    flat = []

    def walk(e):
        flat.append(e)
        for c in e.children:
            walk(c)

    walk(root)
    index_of = {id(e): i for i, e in enumerate(flat)}
    for e in flat:
        if e.children:
            e.child = _build_tree(e.children, index_of)
    root.color = 1

    # 작은 스트림 → 미니 스트림
    mini_stream = bytearray()
    minifat = []
    big = []
    for e in flat:
        if e.kind != 2:
            continue
        e.size = len(e.data)
        if e.size == 0:
            e.start = ENDOFCHAIN
        elif e.size < CUTOFF:
            first = len(mini_stream) // MINI
            n = (e.size + MINI - 1) // MINI
            mini_stream += e.data + b"\0" * (n * MINI - e.size)
            minifat += [first + i + 1 for i in range(n - 1)] + [ENDOFCHAIN]
            e.start = first
        else:
            big.append(e)

    def nsec(size):
        return (size + SECTOR - 1) // SECTOR

    n_ministream = nsec(len(mini_stream))
    n_big = [nsec(e.size) for e in big]
    n_minifat = nsec(len(minifat) * 4)
    n_dir = nsec(len(flat) * 128)
    data_secs = n_ministream + sum(n_big) + n_minifat + n_dir
    n_fat = 1
    while (data_secs + n_fat) > n_fat * (SECTOR // 4):
        n_fat += 1
    if n_fat > 109:
        raise ValueError("파일이 너무 큽니다 (DIFAT 미지원)")

    fat = []
    sectors = bytearray()

    def place(blob, count):
        start = len(fat)
        for i in range(count):
            fat.append(start + i + 1 if i < count - 1 else ENDOFCHAIN)
        sectors.extend(blob + b"\0" * (count * SECTOR - len(blob)))
        return start if count else ENDOFCHAIN

    root.start = place(bytes(mini_stream), n_ministream)
    root.size = len(mini_stream)
    for e, n in zip(big, n_big):
        e.start = place(e.data, n)
    minifat_bytes = b"".join(struct.pack("<I", x) for x in minifat)
    minifat_bytes += struct.pack("<I", FREESECT) * ((n_minifat * SECTOR - len(minifat_bytes)) // 4)
    minifat_start = place(minifat_bytes, n_minifat)

    dir_bytes = bytearray()
    for e in flat:
        name = e.name.encode("utf-16-le")
        dir_bytes += name + b"\0" * (64 - len(name))
        dir_bytes += struct.pack("<HBB", len(name) + 2, e.kind, e.color)
        dir_bytes += struct.pack("<III", e.left, e.right, e.child)
        dir_bytes += b"\0" * 16 + b"\0" * 4 + b"\0" * 16
        dir_bytes += struct.pack("<IQ", e.start if (e.kind != 1) else 0, e.size)
    while len(dir_bytes) < n_dir * SECTOR:
        dir_bytes += b"\0" * 64 + struct.pack("<HBB", 0, 0, 0)
        dir_bytes += struct.pack("<III", NOSTREAM, NOSTREAM, NOSTREAM) + b"\0" * 48
    dir_start = place(bytes(dir_bytes), n_dir)

    fat_start = len(fat)
    fat += [FATSECT] * n_fat
    fat += [FREESECT] * (n_fat * (SECTOR // 4) - len(fat))
    sectors += b"".join(struct.pack("<I", x) for x in fat)

    header = bytearray()
    header += bytes.fromhex("D0CF11E0A1B11AE1") + b"\0" * 16
    header += struct.pack("<HHHHH", 0x003E, 0x0003, 0xFFFE, 9, 6) + b"\0" * 6
    header += struct.pack("<IIIIIIIII", 0, n_fat, dir_start, 0, CUTOFF,
                          minifat_start if n_minifat else ENDOFCHAIN, n_minifat, ENDOFCHAIN, 0)
    difat = [fat_start + i for i in range(n_fat)] + [FREESECT] * (109 - n_fat)
    header += b"".join(struct.pack("<I", x) for x in difat)
    assert len(header) == 512
    return bytes(header) + bytes(sectors)


# ---------------------------------------------------------------------------
# VBA 프로젝트
# ---------------------------------------------------------------------------
DOC_ATTRS = {
    "workbook": "0{00020819-0000-0000-C000-000000000046}",
    "sheet": "0{00020820-0000-0000-C000-000000000046}",
}
STDOLE_LIBID = ("*\\G{00020430-0000-0000-C000-000000000046}#2.0#0#"
                "C:\\Windows\\System32\\stdole2.tlb#OLE Automation")


def _rec(rid, data=b""):
    return struct.pack("<HI", rid, len(data)) + data


def _project_key(project_id):
    return sum(project_id.encode("ascii")) & 0xFF


def _encrypt(data, project_id, seed=0x07):
    """MS-OVBA 2.4.3 데이터 암호화 (CMG/DPB/GC 값용)."""
    key = _project_key(project_id)
    version = 2
    enc = bytearray([seed, version ^ seed, key ^ seed])
    unenc1, enc1, enc2 = key, enc[2], enc[1]
    ignored = (seed & 6) // 2
    for _ in range(ignored):
        temp = 0
        b = (temp ^ (enc2 + unenc1)) & 0xFF
        enc.append(b)
        enc2, enc1, unenc1 = enc1, b, temp
    length = struct.pack("<I", len(data))
    for byte in length + data:
        b = (byte ^ (enc2 + unenc1)) & 0xFF
        enc.append(b)
        enc2, enc1, unenc1 = enc1, b, byte
    return enc.hex().upper()


def build_vba_project(std_modules, doc_modules, codepage=949):
    """std_modules: [(이름, 소스)], doc_modules: [(코드이름, 'workbook'|'sheet', 소스)].

    소스에는 Attribute VB_Name 줄을 넣지 않는다 (여기서 붙임).
    """
    enc = "cp%d" % codepage
    modules = []
    for name, kind, src in doc_modules:
        head = (f'Attribute VB_Name = "{name}"\r\n'
                f'Attribute VB_Base = "{DOC_ATTRS[kind]}"\r\n'
                'Attribute VB_GlobalNameSpace = False\r\n'
                'Attribute VB_Creatable = False\r\n'
                'Attribute VB_PredeclaredId = True\r\n'
                'Attribute VB_Exposed = True\r\n'
                'Attribute VB_TemplateDerived = False\r\n'
                'Attribute VB_Customizable = True\r\n')
        modules.append((name, True, head + src))
    for name, src in std_modules:
        modules.append((name, False, f'Attribute VB_Name = "{name}"\r\n' + src))

    def crlf(s):
        return s.replace("\r\n", "\n").replace("\n", "\r\n")

    # dir 스트림
    d = bytearray()
    d += _rec(0x0001, struct.pack("<I", 1))           # SYSKIND win32
    d += _rec(0x0002, struct.pack("<I", 0x0409))      # 규격상 0x0409 고정
    d += _rec(0x0014, struct.pack("<I", 0x0409))
    d += _rec(0x0003, struct.pack("<H", codepage))
    d += _rec(0x0004, b"VBAProject")
    d += _rec(0x0005) + _rec(0x0040)
    d += _rec(0x0006) + _rec(0x003D)
    d += _rec(0x0007, struct.pack("<I", 0))
    d += _rec(0x0008, struct.pack("<I", 0))
    d += struct.pack("<HIIH", 0x0009, 4, 1, 0)        # PROJECTVERSION
    d += _rec(0x000C) + _rec(0x003C)
    # 참조: stdole
    d += _rec(0x0016, b"stdole") + _rec(0x003E, "stdole".encode("utf-16-le"))
    libid = STDOLE_LIBID.encode("ascii")
    d += _rec(0x000D, struct.pack("<I", len(libid)) + libid + struct.pack("<IH", 0, 0))
    d += _rec(0x000F, struct.pack("<H", len(modules)))
    d += _rec(0x0013, struct.pack("<H", 0xFFFF))
    for name, is_doc, _ in modules:
        nb, nu = name.encode(enc), name.encode("utf-16-le")
        d += _rec(0x0019, nb) + _rec(0x0047, nu)
        d += _rec(0x001A, nb) + _rec(0x0032, nu)
        d += _rec(0x001C) + _rec(0x0048)
        d += _rec(0x0031, struct.pack("<I", 0))       # 소스 시작 위치 (p-code 없음)
        d += _rec(0x001E, struct.pack("<I", 0))
        d += _rec(0x002C, struct.pack("<H", 0xFFFF))
        d += _rec(0x0022 if is_doc else 0x0021)
        d += _rec(0x002B)
    d += _rec(0x0010)

    vba = {
        "_VBA_PROJECT": bytes([0xCC, 0x61, 0xFF, 0xFF, 0x00, 0x00, 0x00]),
        "dir": compress(bytes(d)),
    }
    for name, _, src in modules:
        vba[name] = compress(crlf(src).encode(enc))

    project_id = "{%s}" % str(uuid.uuid4()).upper()
    cmg = _encrypt(struct.pack("<I", 0), project_id)   # 보호 없음
    dpb = _encrypt(b"\x00", project_id)                # 암호 없음
    gc = _encrypt(b"\xff", project_id)                 # 프로젝트 보이기
    lines = [f'ID="{project_id}"']
    for name, is_doc, _ in modules:
        lines.append(f"Document={name}/&H00000000" if is_doc else f"Module={name}")
    lines += ['Name="VBAProject"', 'HelpContextID="0"', 'VersionCompatible32="393222000"',
              f'CMG="{cmg}"', f'DPB="{dpb}"', f'GC="{gc}"',
              "", "[Host Extender Info]",
              "&H00000001={3832D640-CF90-11CF-8E43-00A0C911005A};VBE;&H00000000",
              "", "[Workspace]"]
    for name, _, _ in modules:
        lines.append(f"{name}=0, 0, 0, 0, C")
    project = ("\r\n".join(lines) + "\r\n").encode(enc)

    wm = bytearray()
    for name, _, _ in modules:
        wm += name.encode(enc) + b"\0" + name.encode("utf-16-le") + b"\0\0"
    wm += b"\0\0"

    return write_cfb({"VBA": vba, "PROJECT": project, "PROJECTwm": bytes(wm)})
