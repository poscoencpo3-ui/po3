"""배포 파일 만들기.

  python3 tools/build.py

  파일 이름 = 바차트_v<버전>_<바뀐 내용>.xlsm  (이전 버전 파일도 함께 유지)
  download/바차트_v0.7.7_입력순서유지.xlsm   : 바차트 기본판 (BarChart 모듈만)
  download/바차트_v0.8.4_입력순서유지.xlsm   : 기본판 + 시간입력/시간공정표 시트 (TimeChart 모듈)
  (이전 버전 xlsm 은 지우지 않고 download/ 에 그대로 둔다. 버전을 올릴 때는 아래 파일 이름도 함께 바꿀 것 —
   같은 이름으로 다시 만들면 이미 배포한 파일이 바뀐다)
  download/BarChart.bas, TimeChart.bas          : 직접 가져오기용 모듈 (한국어 Windows 용 CP949 인코딩)
  download/ThisWorkbook_코드.txt                : 직접 가져오기 때 ThisWorkbook 에 붙여 넣을 이벤트 코드 (v0.7.3)
  download/ThisWorkbook_코드_v0.8.txt           : 〃 (v0.8, 시간공정표 자동 다시 그리기 포함)

  python3 tools/build.py --seed 공정.json --seed-out 파일.xlsm
      공정이 미리 들어 있는 파일만 따로 만든다 (download/ 는 건드리지 않음).
      공정.json 은 공정 받아쓰기의 내장 공정과 같은 형식 {title, dday, rows:[{lvl, trade, name, low, s, d}]}
      (lvl = cat/item/det, s = 1970-01-01 부터의 날짜 수, dday = "2027-04-10" 처럼 D-DAY 기준일 — 없어도 됨,
       events = "표시" 로 주면 예시 주요 이벤트·구역 일정도 보임 — 기본은 숨김).
      [시작] 시트에 넣어 두면 처음 열 때 초기 설정이 작업입력으로 옮기고 바차트까지 그린다.
"""
import datetime
import json
import io
import os
import re
import sys

import xlsxwriter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, ".."))
sys.path.insert(0, HERE)
from vba_bin import build_vba_project  # noqa: E402

SRC = os.path.join(ROOT, "src", "BarChart.bas")
SRC_TIME = os.path.join(ROOT, "src", "TimeChart.bas")
DIST = os.path.join(ROOT, "download")
XLSM_BASE = os.path.join(DIST, "바차트_v0.7.7_입력순서유지.xlsm")
XLSM_TIME = os.path.join(DIST, "바차트_v0.8.4_입력순서유지.xlsm")
OLD_FILES = ["바차트_자동작성.xlsm"]      # 예전 이름 (버전 붙은 이름으로 바뀜)
BAS = os.path.join(DIST, "BarChart.bas")
BAS_TIME = os.path.join(DIST, "TimeChart.bas")
TWB = os.path.join(DIST, "ThisWorkbook_코드.txt")
TWB_TIME = os.path.join(DIST, "ThisWorkbook_코드_v0.8.txt")

THISWORKBOOK = """Option Explicit

Private Sub Workbook_Open()
    ' 처음 열었을 때(메인 시트가 없을 때) 초기 설정 자동 실행
    On Error Resume Next
    BarChart.AutoSetupIfNeeded
End Sub

Private Sub Workbook_SheetChange(ByVal Sh As Object, ByVal Target As Range)
    ' 바차트 시트 왼쪽 칸 수정 → 작업입력 반영 후 다시 그림 / 작업입력 수정 → 변경 표시
    BarChart.OnSheetChange Sh, Target
End Sub

Private Sub Workbook_SheetActivate(ByVal Sh As Object)
    ' 작업입력이 바뀐 뒤 바차트 시트를 열면 자동으로 다시 그림
    BarChart.OnSheetActivate Sh
End Sub
"""


THISWORKBOOK_TIME = """Option Explicit

Private Sub Workbook_Open()
    ' 처음 열었을 때(메인 시트가 없을 때) 초기 설정 자동 실행 (바차트 시트 + 시간 시트)
    On Error Resume Next
    TimeChart.AutoSetupAllIfNeeded
End Sub

Private Sub Workbook_SheetChange(ByVal Sh As Object, ByVal Target As Range)
    ' 바차트 시트 왼쪽 칸 수정 → 작업입력 반영 / 작업입력·시간입력 수정 → 변경 표시
    BarChart.OnSheetChange Sh, Target
    TimeChart.OnTimeSheetChange Sh, Target
End Sub

Private Sub Workbook_SheetActivate(ByVal Sh As Object)
    ' 입력이 바뀐 뒤 바차트 / 시간공정표 시트를 열면 자동으로 다시 그림
    BarChart.OnSheetActivate Sh
    TimeChart.OnTimeSheetActivate Sh
End Sub
"""


def module_source(path=SRC):
    text = open(path, encoding="utf-8").read()
    lines = text.splitlines()
    assert lines[0].startswith("Attribute VB_Name")
    return "\r\n".join(lines[1:]) + "\r\n", text


# VBA 는 대소문자를 구분하지 않으므로 mE 같은 이름도 Me 예약어로 인식되어 컴파일 오류가 난다.
# (LibreOffice 는 허용하므로 테스트에서 걸러지지 않음 → 빌드 때 검사)
VBA_RESERVED = set("""and as boolean byref byte byval call case close const currency date debug declare
dim do double each else elseif end enum eqv erase error event exit false for friend function get global
gosub goto if imp implements in input integer is let like lock long loop lset me mod new next not nothing
null on open option optional or paramarray preserve print private public put raiseevent redim rem resume
return rset seek select set single static step stop string sub then to true type typeof until variant
wend while with withevents write xor line name width""".split())


def check_identifiers(text):
    code = "\n".join(l.split("'")[0] for l in text.splitlines())
    names = set()
    for m in re.finditer(r"\b(?:Dim|Const|Private|Public|ReDim(?:\s+Preserve)?)\s+(?!Sub\b|Function\b)(.*)", code):
        for part in m.group(1).split(","):
            mm = re.match(r"\s*(?:Const\s+)?(\w+)", part)
            if mm:
                names.add(mm.group(1))
    for m in re.finditer(r"(?:Sub|Function)\s+\w+\s*\(([^)]*)\)", code):
        for p in m.group(1).split(","):
            mm = re.search(r"(?:ByVal\s+|ByRef\s+|Optional\s+)?(\w+)\s*(?:\(\))?\s+As\b", p)
            if mm:
                names.add(mm.group(1))
    bad = sorted(n for n in names if n.lower() in VBA_RESERVED)
    if bad:
        sys.exit("VBA 예약어와 겹치는 이름: " + ", ".join(bad))


SEED_LVL = {"cat": "대분류", "item": "작업항목", "det": "세부작업"}


def build_xlsm(path, vba_bin, with_time, seed=None):
    wb = xlsxwriter.Workbook(path)
    wb.set_vba_name("ThisWorkbook")
    wb.add_vba_project(io.BytesIO(vba_bin), is_stream=True)
    ws = wb.add_worksheet("시작")
    ws.set_vba_name("Sheet1")
    ws.hide_gridlines(2)

    title = wb.add_format({"bold": True, "font_size": 18, "font_name": "맑은 고딕"})
    body = wb.add_format({"font_size": 11, "font_name": "맑은 고딕"})
    warn = wb.add_format({"font_size": 11, "font_name": "맑은 고딕", "font_color": "#C00000", "bold": True})
    head = "BAR CHART 공정표 자동 작성" + ("  (v0.8.4 : 시간공정표 · 산적표 포함)" if with_time else "")
    macro = "SetupAll" if with_time else "SetupWorkbook"
    if seed:
        seed_start_sheet(wb, ws, seed, head, macro, title, body, warn)
        wb.close()
        return

    ws.set_column("A:A", 2)
    ws.set_column("B:B", 90)
    ws.set_row(1, 32)
    ws.write("B2", head, title)
    done = "초기 설정이 끝나면 [메인] / [작업입력] / [공휴일] 시트가 만들어지고 이 시트는 사라집니다."
    if with_time:
        done = "초기 설정이 끝나면 [메인] / [작업입력] … 과 함께 [시간입력] / [시간공정표] 시트가 만들어지고 이 시트는 사라집니다."
    lines = [
        ("※ 화면 위 노란 줄의 [콘텐츠 사용](매크로 사용)을 누르면 초기 설정이 자동으로 실행됩니다.", warn),
        ("   자동으로 실행되지 않으면 아래 [초기 설정] 버튼을 누르세요.", body),
        ("", body),
        ("※ '이 파일의 원본을 신뢰할 수 없어 매크로를 차단했습니다' 라는 빨간 줄이 보이면", body),
        ("   파일을 닫고 → 파일 오른쪽 클릭 → 속성 → 아래쪽 [차단 해제] 체크 → 확인 후 다시 여세요.", body),
        ("", body),
        (done, body),
    ]
    for i, (text, fmt) in enumerate(lines):
        ws.write(3 + i, 1, text, fmt)
    ws.insert_button("B12", {"macro": macro, "caption": "초기 설정", "width": 160, "height": 40})
    wb.close()


def seed_start_sheet(wb, ws, seed, head, macro, title, body, warn):
    """공정이 미리 들어 있는 파일의 [시작] 시트.

    작업입력과 같은 칸 배치로 넣어 둔다 (4행 머리글, 5행부터 A 구분 / B 공종 / C 작업내용 / D 하단표기 / E 시작일 / F 기간,
    K4 공사명, K5 D-DAY 기준일, K6 주요 이벤트·구역 일정 표시/숨김). 초기 설정(BarChart.LoadSeedAndBuild)이 작업입력으로 옮기고 바차트를 그린 뒤 이 시트를 지운다.
    시트를 하나만 쓰는 것은 일반 배포 파일과 같은 구조(시트 1개 + 버튼)를 유지하기 위함.
    """
    font = {"font_name": "맑은 고딕", "font_size": 10}
    hdr = wb.add_format(dict(font, bold=True, bg_color="#BDD7EE", border=1, align="center"))
    text = wb.add_format(dict(font, border=1))
    date = wb.add_format(dict(font, border=1, num_format="yyyy-mm-dd", align="center"))
    num = wb.add_format(dict(font, border=1, align="center"))
    lbl = wb.add_format(dict(font, bold=True))
    plain = wb.add_format(font)
    pdate = wb.add_format(dict(font, num_format="yyyy-mm-dd", align="left"))
    name = (seed.get("title") or "").strip()
    if name.endswith("공정표"):
        name = name[:-3].strip()            # 바차트 제목에 "공정표" 가 다시 붙음
    ws.set_row(0, 30)
    ws.write("A1", head + "  —  공정 %d줄이 들어 있는 파일" % len(seed["rows"]), title)
    ws.write("A2", "※ 화면 위 노란 줄의 [콘텐츠 사용](매크로 사용)을 누르면 초기 설정이 자동으로 실행되고, "
                   "아래 공정이 [작업입력] 시트로 옮겨져 바차트가 그려집니다. (이 시트는 사라집니다)", warn)
    ws.write("A3", "   자동으로 실행되지 않으면 오른쪽 [초기 설정] 버튼을 누르세요.  빨간 줄(매크로 차단)이 보이면 "
                   "파일을 닫고 → 파일 오른쪽 클릭 → 속성 → [차단 해제] 체크 후 다시 여세요.", body)
    for c, h in enumerate(["구분", "공종", "작업내용 (선 위)", "하단표기", "시작일", "기간"]):
        ws.write(3, c, h, hdr)
    ws.write("J4", "공사명", lbl)
    ws.write("K4", name, plain)
    ws.write("J5", "D-DAY 기준일", lbl)
    if seed.get("dday"):
        ws.write_datetime("K5", datetime.datetime.strptime(seed["dday"], "%Y-%m-%d"), pdate)
    # 예시로 들어 있는 주요 이벤트·구역 일정은 이 공정과 상관없으므로 기본은 숨김 (메인 시트에서 다시 켤 수 있음)
    ws.write("J6", "이벤트·구역 일정", lbl)
    ws.write("K6", seed.get("events") or "숨김", plain)
    epoch = datetime.datetime(1970, 1, 1)
    for i, r in enumerate(seed["rows"]):
        row = 4 + i
        ws.write(row, 0, SEED_LVL.get(r.get("lvl"), "세부작업"), text)
        ws.write(row, 1, r.get("trade") or "", text)
        ws.write(row, 2, r.get("name") or "", text)
        ws.write(row, 3, r.get("low") or "", text)
        if r.get("s") is not None:
            ws.write_datetime(row, 4, epoch + datetime.timedelta(days=int(r["s"])), date)
        else:
            ws.write_blank(row, 4, None, date)
        if r.get("d") is not None:
            ws.write_number(row, 5, int(r["d"]), num)
        else:
            ws.write_blank(row, 5, None, num)
    ws.set_column("A:A", 9)
    ws.set_column("B:B", 7)
    ws.set_column("C:C", 44)
    ws.set_column("D:D", 30)
    ws.set_column("E:E", 11)
    ws.set_column("F:F", 6)
    ws.set_column("G:I", 2)
    ws.set_column("J:J", 14)
    ws.set_column("K:K", 34)
    ws.freeze_panes(4, 0)
    ws.insert_button("J8", {"macro": macro, "caption": "초기 설정", "width": 160, "height": 40})


def cp949(text):
    return text.replace("\r\n", "\n").replace("\n", "\r\n").encode("cp949")


def main():
    os.makedirs(DIST, exist_ok=True)
    for f in OLD_FILES:
        if os.path.exists(os.path.join(DIST, f)):
            os.remove(os.path.join(DIST, f))
    src, full = module_source()
    tsrc, tfull = module_source(SRC_TIME)
    check_identifiers(full)
    check_identifiers(tfull)
    docs = [("Sheet1", "sheet", "")]
    if "--seed" in sys.argv:
        # 공정이 미리 들어 있는 파일만 만들기 (시간공정표판)
        seed = json.load(open(sys.argv[sys.argv.index("--seed") + 1], encoding="utf-8"))
        dst = sys.argv[sys.argv.index("--seed-out") + 1]
        build_xlsm(dst, build_vba_project([("BarChart", src), ("TimeChart", tsrc)],
                                          [("ThisWorkbook", "workbook", THISWORKBOOK_TIME)] + docs),
                   True, seed)
        print("생성:", dst)
        return
    build_xlsm(XLSM_BASE, build_vba_project([("BarChart", src)],
                                            [("ThisWorkbook", "workbook", THISWORKBOOK)] + docs), False)
    build_xlsm(XLSM_TIME, build_vba_project([("BarChart", src), ("TimeChart", tsrc)],
                                            [("ThisWorkbook", "workbook", THISWORKBOOK_TIME)] + docs), True)
    for path, text in ((BAS, full), (BAS_TIME, tfull), (TWB, THISWORKBOOK), (TWB_TIME, THISWORKBOOK_TIME)):
        with open(path, "wb") as f:
            f.write(cp949(text))
    for path in (XLSM_BASE, XLSM_TIME, BAS, BAS_TIME, TWB, TWB_TIME):
        print("생성:", path)


if __name__ == "__main__":
    main()
