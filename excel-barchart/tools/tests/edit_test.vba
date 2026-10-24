    ' 바차트 시트에서 직접 고치는 경우 + 작업입력 양식 테스트 (lo_run.py --script 로 실행, 단위 "일")
    Dim wc As Worksheet, wi As Worksheet, r As Long, ri As Long, mcol As Long, lr As Long
    Set wc = Worksheets("바차트_일")
    Set wi = Worksheets("작업입력")
    ' 0) 작업입력 : 적용 공종(숨김 I열)과 들여쓰기
    WriteLog "0 적용공종: 기계정비창고=" & wi.Cells(6, 9).Value & " 진입로=" & wi.Cells(7, 9).Value & " 2구간=" & wi.Cells(15, 9).Value & " / 들여쓰기 " & wi.Cells(5, 3).IndentLevel & wi.Cells(6, 3).IndentLevel & wi.Cells(7, 3).IndentLevel
    WriteLog "0 바차트: 대분류행=" & wc.Cells(12, 1).Value & " / 진입로행=" & FindRow(wc, "· 진입로") & " / D-DAY행 숨김 " & wc.Rows(4).Hidden & " / 이벤트 " & wc.Cells(8, 1).Value
    ' 1) 진입로 시작일 변경 → 기간 6일 유지, 종료일 이동
    r = FindRow(wc, "· 진입로")
    wc.Cells(r, 2).Value = CDate("2026-10-30")
    OnSheetChange wc, wc.Cells(r, 2)
    WriteLog "1 진입로: " & D2(wi.Cells(7, 5).Value) & "~" & D2(wi.Cells(7, 7).Value) & " " & wi.Cells(7, 6).Value & " 수식 " & wi.Cells(7, 7).HasFormula
    ' 2) 세부작업 이름 변경
    r = FindRow(wc, "· 기초 터파기")
    wc.Cells(r, 1).Value = "      · 기초 파기"
    OnSheetChange wc, wc.Cells(r, 1)
    WriteLog "2 이름: " & wi.Cells(10, 3).Value
    ' 3) 작업항목(자체 날짜) 기간 변경
    r = FindRow(wc, "- 철골 세우기")
    wc.Cells(r, 4).Value = 5
    OnSheetChange wc, wc.Cells(r, 4)
    WriteLog "3 철골: " & D2(wi.Cells(16, 7).Value) & " / " & wi.Cells(16, 6).Value
    ' 4) 세부작업 여러 개인 작업항목 시작일 → 거부
    r = FindRow(wc, "- 전기실")
    wc.Cells(r, 2).Value = CDate("2026-11-01")
    OnSheetChange wc, wc.Cells(r, 2)
    WriteLog "4 거부: " & D2(wc.Cells(r, 2).Value)
    ' 5) 작업항목 이름 변경
    r = FindRow(wc, "- 기계정비창고")
    wc.Cells(r, 1).Value = " - 기계정비동"
    OnSheetChange wc, wc.Cells(r, 1)
    WriteLog "5 항목: " & wi.Cells(6, 3).Value
    ' 6) 종료일을 시작일보다 앞으로 → 거부
    r = FindRow(wc, "· 철근·거푸집")
    wc.Cells(r, 3).Value = CDate("2026-11-01")
    OnSheetChange wc, wc.Cells(r, 3)
    WriteLog "6 철근 종료: " & D2(wi.Cells(11, 7).Value)
    ' 7) 작업입력에서 수정 → 바차트 열 때 다시 그림
    wi.Cells(7, 3).Value = "진입로(포장)"
    OnSheetChange wi, wi.Cells(7, 3)
    OnSheetActivate wc
    WriteLog "7 다시그리기: " & FindRow(wc, "· 진입로(포장)")
    ' 8) 작업입력 종료일 직접 입력(수식 덮어쓰기) → 기간 재계산, 수식 복구
    wi.Cells(12, 7).Value = CDate("2026-11-18")
    OnSheetChange wi, wi.Cells(12, 7)
    WriteLog "8 콘크리트: 기간 " & wi.Cells(12, 6).Value & " / 수식 " & wi.Cells(12, 7).HasFormula & " / 종료 " & D2(wi.Cells(12, 7).Value)
    ' 9) 작업입력 기간 변경 → 종료일 수식
    wi.Cells(15, 6).Value = 20
    OnSheetChange wi, wi.Cells(15, 6)
    WriteLog "9 2구간 종료: " & D2(wi.Cells(15, 7).Value)
    ' 10) 바차트 종료일 칸 수식
    OnSheetActivate wc
    r = FindRow(wc, "· 진입로(포장)")
    WriteLog "10 바차트 종료 수식: " & wc.Cells(r, 3).HasFormula & " " & D2(wc.Cells(r, 3).Value)
    ' 11) 표 아래(안내 행 아래)에 새 세부작업 → 철골 세우기 아래로
    mcol = wc.Cells(3, 4).Value
    lr = wc.Cells(wc.Rows.Count, mcol).End(xlUp).Row
    wc.Cells(lr + 1, 1).Value = "철골 도장"
    wc.Cells(lr + 1, 2).Value = CDate("2026-11-21")
    wc.Cells(lr + 1, 4).Value = 3
    OnSheetChange wc, wc.Range(wc.Cells(lr + 1, 1), wc.Cells(lr + 1, 4))
    ri = FindRow(wi, "철골 도장", 3)
    WriteLog "11 입력" & ri & "행: " & wi.Cells(ri, 1).Value & "|" & D2(wi.Cells(ri, 5).Value) & "|" & wi.Cells(ri, 6).Value & "|" & D2(wi.Cells(ri, 7).Value) & " / 바차트 " & (FindRow(wc, "· 철골 도장") > 0)
    ' 12) 여러 행 한꺼번에 (* 대분류 / - 작업항목 / 세부작업)
    mcol = wc.Cells(3, 4).Value
    lr = wc.Cells(wc.Rows.Count, mcol).End(xlUp).Row
    wc.Cells(lr, 1).Value = "* 배관설비"
    wc.Cells(lr + 1, 1).Value = "- 배관 지지대"
    wc.Cells(lr + 2, 1).Value = "용접"
    wc.Cells(lr + 2, 2).Value = CDate("2026-11-23")
    wc.Cells(lr + 2, 3).Value = CDate("2026-11-26")
    OnSheetChange wc, wc.Range(wc.Cells(lr, 1), wc.Cells(lr + 2, 4))
    ri = FindRow(wi, "용접", 3)
    WriteLog "12 입력: " & wi.Cells(ri - 2, 1).Value & " " & wi.Cells(ri - 2, 3).Value & " | " & wi.Cells(ri - 1, 1).Value & " " & wi.Cells(ri - 1, 3).Value & " | " & wi.Cells(ri, 1).Value & " " & wi.Cells(ri, 6).Value & "일"
    ' 13) 표 중간에 행을 끼워 넣고 입력 → 진입로 다음 세부작업
    r = FindRow(wc, "· 진입로(포장)")
    wc.Rows(r + 2).Insert
    wc.Cells(r + 2, 1).Value = "측구"
    OnSheetChange wc, wc.Cells(r + 2, 1)
    WriteLog "13 입력8행: " & wi.Cells(8, 3).Value & " / 9행: " & wi.Cells(9, 3).Value & " / 바차트 " & wc.Cells(r + 2, 1).Value
    ' 14) 빈 행만 끼워 넣음 → 다시 그리지 않음
    mcol = wc.Cells(3, 4).Value
    wc.Rows(25).Insert
    OnSheetChange wc, wc.Rows(25)
    WriteLog "14 행정보: [" & wc.Cells(25, mcol).Value & "] 다음행 [" & wc.Cells(26, mcol).Value & "]"
    ' 15) 날짜 없는 세부작업 : 기간 먼저 → 시작일
    r = FindRow(wc, "· 측구")
    wc.Cells(r, 4).Value = 4
    OnSheetChange wc, wc.Cells(r, 4)
    r = FindRow(wc, "· 측구")
    WriteLog "15a 측구 기간: " & wc.Cells(r, 4).Value & " 시작" & D2(wc.Cells(r, 2).Value)
    wc.Cells(r, 2).Value = CDate("2026-11-05")
    OnSheetChange wc, wc.Cells(r, 2)
    r = FindRow(wc, "· 측구")
    WriteLog "15b 측구: " & D2(wc.Cells(r, 2).Value) & "~" & D2(wc.Cells(r, 3).Value) & " " & wc.Cells(r, 4).Value
    ' 16) 날짜 없는 작업항목 줄에 시작일 → 작업항목 자체
    mcol = wc.Cells(3, 4).Value
    lr = wc.Cells(wc.Rows.Count, mcol).End(xlUp).Row
    wc.Cells(lr, 1).Value = "- 항목2"
    OnSheetChange wc, wc.Cells(lr, 1)
    r = FindRow(wc, "- 항목2")
    wc.Cells(r, 2).Value = CDate("2026-11-20")
    OnSheetChange wc, wc.Cells(r, 2)
    r = FindRow(wc, "- 항목2")
    WriteLog "16 항목2: " & D2(wc.Cells(r, 2).Value) & " " & wc.Cells(r, 4).Value & "일"
    ' 17) 작업입력 적용 공종 (배관설비에는 공종 없음 → 빈 값) / 새 행 들여쓰기
    ri = FindRow(wi, "용접", 3)
    WriteLog "17 용접: 구분 " & wi.Cells(ri, 1).Value & " 들여쓰기 " & wi.Cells(ri, 3).IndentLevel & " 적용공종[" & wi.Cells(ri, 9).Value & "]"
    ' 18) 작업입력 간트 막대 글자 : 바뀐 행과 요약 행만 다시 씀
    Dim qc As Long, c11 As Long, c6a As Long, c6b As Long, t11 As String
    Set wi = Worksheets("작업입력")
    ri = FindRow(wi, "철근·거푸집", 3)
    wi.Cells(ri, 3).Value = "철근·거푸집 공사"
    OnSheetChange wi, wi.Cells(ri, 3)
    For qc = 12 To 411
        If wi.Cells(ri, qc).Value <> "" Then c11 = qc: t11 = wi.Cells(ri, qc).Value: Exit For
    Next qc
    r = FindRow(wi, "기계정비동", 3)
    For qc = 12 To 411
        If wi.Cells(r, qc).Value <> "" Then c6a = qc: Exit For
    Next qc
    wi.Cells(r + 1, 5).Value = CDate("2026-11-01")          ' 첫 세부작업 시작일을 뒤로 → 작업항목 요약 시작도 뒤로
    OnSheetChange wi, wi.Cells(r + 1, 5)
    For qc = 12 To 411
        If wi.Cells(r, qc).Value <> "" Then c6b = qc: Exit For
    Next qc
    WriteLog "18 글자: [" & t11 & "] 열" & c11 & " / 요약 글자 열 " & c6a & " → " & c6b & " / 요약 시작 " & D2(wi.Cells(r, 5).Value)
