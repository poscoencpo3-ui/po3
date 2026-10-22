"""배포 파일 만들기.

  python3 tools/build.py

  download/바차트_자동작성.xlsm : 매크로 포함 엑셀 파일 (열고 '콘텐츠 사용' → 자동 초기 설정)
  download/BarChart.bas      : 직접 가져오기용 모듈 (한국어 Windows 용 CP949 인코딩)
  download/ThisWorkbook_코드.txt : 직접 가져오기 때 ThisWorkbook 에 붙여 넣을 이벤트 코드
"""
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
DIST = os.path.join(ROOT, "download")
XLSM = os.path.join(DIST, "바차트_자동작성.xlsm")
BAS = os.path.join(DIST, "BarChart.bas")
TWB = os.path.join(DIST, "ThisWorkbook_코드.txt")

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


def module_source():
    text = open(SRC, encoding="utf-8").read()
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


def build_xlsm(vba_bin):
    wb = xlsxwriter.Workbook(XLSM)
    wb.set_vba_name("ThisWorkbook")
    wb.add_vba_project(io.BytesIO(vba_bin), is_stream=True)
    ws = wb.add_worksheet("시작")
    ws.set_vba_name("Sheet1")
    ws.hide_gridlines(2)
    ws.set_column("A:A", 2)
    ws.set_column("B:B", 90)

    title = wb.add_format({"bold": True, "font_size": 18, "font_name": "맑은 고딕"})
    body = wb.add_format({"font_size": 11, "font_name": "맑은 고딕"})
    warn = wb.add_format({"font_size": 11, "font_name": "맑은 고딕", "font_color": "#C00000", "bold": True})
    ws.set_row(1, 32)
    ws.write("B2", "BAR CHART 공정표 자동 작성", title)
    lines = [
        ("※ 화면 위 노란 줄의 [콘텐츠 사용](매크로 사용)을 누르면 초기 설정이 자동으로 실행됩니다.", warn),
        ("   자동으로 실행되지 않으면 아래 [초기 설정] 버튼을 누르세요.", body),
        ("", body),
        ("※ '이 파일의 원본을 신뢰할 수 없어 매크로를 차단했습니다' 라는 빨간 줄이 보이면", body),
        ("   파일을 닫고 → 파일 오른쪽 클릭 → 속성 → 아래쪽 [차단 해제] 체크 → 확인 후 다시 여세요.", body),
        ("", body),
        ("초기 설정이 끝나면 [메인] / [작업입력] / [공휴일] 시트가 만들어지고 이 시트는 사라집니다.", body),
    ]
    for i, (text, fmt) in enumerate(lines):
        ws.write(3 + i, 1, text, fmt)
    ws.insert_button("B12", {"macro": "SetupWorkbook", "caption": "초기 설정", "width": 160, "height": 40})
    wb.close()


def main():
    os.makedirs(DIST, exist_ok=True)
    src, full = module_source()
    check_identifiers(full)
    vba_bin = build_vba_project([("BarChart", src)],
                                [("ThisWorkbook", "workbook", THISWORKBOOK), ("Sheet1", "sheet", "")])
    build_xlsm(vba_bin)
    with open(BAS, "wb") as f:
        f.write(full.replace("\r\n", "\n").replace("\n", "\r\n").encode("cp949"))
    with open(TWB, "wb") as f:
        f.write(THISWORKBOOK.replace("\n", "\r\n").encode("cp949"))
    print("생성:", XLSM)
    print("생성:", BAS)
    print("생성:", TWB)


if __name__ == "__main__":
    main()
