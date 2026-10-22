    ' 바차트 시트에서 직접 고치는 경우 테스트 (lo_run.py --script 로 실행, 단위 "일")
    Dim wc As Worksheet, wi As Worksheet, rr As Long
    Set wc = Worksheets("바차트_일")
    Set wi = Worksheets("작업입력")
    ' 1) 진입로(10행) 시작일 변경 → 기간 6일 유지, 종료일 이동
    wc.Cells(10, 2).Value = CDate("2026-10-30")
    OnSheetChange wc, wc.Cells(10, 2)
    WriteLog "1 진입로: " & Format(wi.Cells(5, 5).Value, "yyyy-mm-dd") & " ~ " & Format(wi.Cells(5, 6).Value, "yyyy-mm-dd") & " / " & wi.Cells(5, 7).Value
    ' 2) 기초 터파기(16행) 이름 변경
    wc.Cells(16, 1).Value = "      · 기초 파기"
    OnSheetChange wc, wc.Cells(16, 1)
    WriteLog "2 이름: " & wi.Cells(7, 3).Value
    ' 3) 철골 세우기(작업항목, 27행) 기간 변경 → 종료일 재계산
    wc.Cells(27, 4).Value = 5
    OnSheetChange wc, wc.Cells(27, 4)
    WriteLog "3 철골: " & Format(wi.Cells(11, 6).Value, "yyyy-mm-dd") & " / " & wi.Cells(11, 7).Value
    ' 4) 전기실(작업항목, 세부작업 3개) 시작일 변경 → 거부 메시지
    wc.Cells(14, 2).Value = CDate("2026-11-01")
    OnSheetChange wc, wc.Cells(14, 2)
    WriteLog "4 거부: " & Format(wc.Cells(14, 2).Value, "yyyy-mm-dd")
    ' 5) 작업항목 이름 변경
    wc.Cells(8, 1).Value = " - 기계정비동"
    OnSheetChange wc, wc.Cells(8, 1)
    WriteLog "5 항목: " & wi.Cells(5, 2).Value & " / 차트: " & wc.Cells(8, 1).Value
    ' 6) 종료일을 시작일보다 앞으로 → 거부
    wc.Cells(18, 3).Value = CDate("2026-11-01")
    OnSheetChange wc, wc.Cells(18, 3)
    WriteLog "6 철근 종료: " & Format(wi.Cells(8, 6).Value, "yyyy-mm-dd")
    ' 7) 작업입력에서 수정 → 바차트 열 때 다시 그림
    wi.Cells(5, 3).Value = "진입로(포장)"
    OnSheetChange wi, wi.Cells(5, 3)
    WriteLog "7 다시그리기 전: " & wc.Cells(10, 1).Value
    OnSheetActivate wc
    WriteLog "7 다시그리기 후: " & wc.Cells(10, 1).Value & " / 원 개수 " & wc.Shapes.Count
    ' 8) 작업입력에서 종료일을 직접 입력(수식 덮어쓰기) → 기간 재계산, 종료일 수식 복구
    wi.Cells(9, 6).Value = CDate("2026-11-18")
    OnSheetChange wi, wi.Cells(9, 6)
    WriteLog "8 콘크리트: 기간 " & wi.Cells(9, 7).Value & " / 수식 " & wi.Cells(9, 6).HasFormula & " / 종료 " & Format(wi.Cells(9, 6).Value, "yyyy-mm-dd")
    ' 9) 작업입력 기간 변경 → 종료일 수식이 바로 계산
    wi.Cells(10, 7).Value = 20
    OnSheetChange wi, wi.Cells(10, 7)
    WriteLog "9 HOLDER 종료: " & Format(wi.Cells(10, 6).Value, "yyyy-mm-dd")
    ' 10) 바차트 종료일 칸이 수식인지
    OnSheetActivate wc
    WriteLog "10 바차트 C10 수식: " & wc.Cells(10, 3).HasFormula & " " & Format(wc.Cells(10, 3).Value, "yyyy-mm-dd") & " / 버튼 " & (wc.Shapes.Count > 0)
    ' 11) 표 아래 빈 행에 새 세부작업 입력 → 바로 위 작업항목(철골 세우기)의 세부작업으로 추가
    Dim mcol As Long, lr As Long
    mcol = wc.Cells(3, 4).Value
    lr = wc.Cells(wc.Rows.Count, mcol).End(xlUp).Row
    wc.Cells(lr + 1, 1).Value = "철골 도장"
    wc.Cells(lr + 1, 2).Value = CDate("2026-11-21")
    wc.Cells(lr + 1, 4).Value = 3
    OnSheetChange wc, wc.Range(wc.Cells(lr + 1, 1), wc.Cells(lr + 1, 4))
    WriteLog "11 입력12행: " & wi.Cells(12, 2).Value & "|" & wi.Cells(12, 3).Value & "|" & Format(wi.Cells(12, 5).Value, "mm-dd") & "|" & Format(wi.Cells(12, 6).Value, "mm-dd") & "|" & wi.Cells(12, 7).Value & " / 바차트: " & wc.Cells(lr, 1).Value   ' 새 블록은 안내 행 자리에 들어감
    ' 12) 여러 행 한꺼번에 (대분류 / 작업항목 / 세부작업)
    mcol = wc.Cells(3, 4).Value              ' 바차트 기간이 바뀌면 행정보 열 위치도 바뀜
    lr = wc.Cells(wc.Rows.Count, mcol).End(xlUp).Row
    wc.Cells(lr + 1, 1).Value = "○ 배관설비"
    wc.Cells(lr + 2, 1).Value = "- 배관 지지대"
    wc.Cells(lr + 3, 1).Value = "용접"
    wc.Cells(lr + 3, 2).Value = CDate("2026-11-23")
    wc.Cells(lr + 3, 3).Value = CDate("2026-11-26")
    OnSheetChange wc, wc.Range(wc.Cells(lr + 1, 1), wc.Cells(lr + 3, 4))
    WriteLog "12 입력13~15행: " & wi.Cells(13, 1).Value & "|" & wi.Cells(14, 2).Value & "|" & wi.Cells(15, 3).Value & " " & wi.Cells(15, 7).Value & "일"
    ' 13) 표 중간에 행을 끼워 넣고 입력 → 진입로 다음 세부작업으로 추가
    wc.Rows(12).Insert
    wc.Cells(12, 1).Value = "측구"
    OnSheetChange wc, wc.Cells(12, 1)
    WriteLog "13 입력6행: " & wi.Cells(6, 3).Value & " / 7행: " & wi.Cells(7, 3).Value & " / 바차트12: " & wc.Cells(12, 1).Value & " 14: " & wc.Cells(14, 1).Value
    ' 14) 빈 행만 끼워 넣은 경우 → 다시 그리지 않음 (끼운 행 유지)
    mcol = wc.Cells(3, 4).Value
    wc.Rows(20).Insert
    OnSheetChange wc, wc.Rows(20)
    WriteLog "14 행정보: [" & wc.Cells(20, mcol).Value & "] 다음행 [" & wc.Cells(21, mcol).Value & "]"
    ' 15) 안내 행(N)에 바로 입력 + 그 아래 행들 ('*' = 대분류)
    mcol = wc.Cells(3, 4).Value
    lr = wc.Cells(wc.Rows.Count, mcol).End(xlUp).Row
    WriteLog "15 안내행: [" & wc.Cells(lr, mcol).Value & "] " & Left(wc.Cells(lr, 1).Value, 8)
    wc.Cells(lr, 1).Value = "* 전기설비"
    wc.Cells(lr + 1, 1).Value = "- 케이블"
    wc.Cells(lr + 2, 1).Value = "포설"
    wc.Cells(lr + 2, 2).Value = CDate("2026-11-25")
    wc.Cells(lr + 2, 4).Value = 2
    OnSheetChange wc, wc.Range(wc.Cells(lr, 1), wc.Cells(lr + 2, 4))
    Dim lastIn As Long: lastIn = wi.Cells(wi.Rows.Count, 3).End(xlUp).Row
    WriteLog "15 입력: " & wi.Cells(lastIn - 2, 1).Value & "|" & wi.Cells(lastIn - 1, 2).Value & "|" & wi.Cells(lastIn, 3).Value & " " & Format(wi.Cells(lastIn, 6).Value, "mm-dd")
    ' 16) 안내 행의 시작일만 입력 → '새 작업'
    mcol = wc.Cells(3, 4).Value
    lr = wc.Cells(wc.Rows.Count, mcol).End(xlUp).Row
    wc.Cells(lr, 2).Value = CDate("2026-11-27")
    OnSheetChange wc, wc.Cells(lr, 2)
    lastIn = wi.Cells(wi.Rows.Count, 3).End(xlUp).Row
    WriteLog "16 입력: " & wi.Cells(lastIn, 3).Value & " " & Format(wi.Cells(lastIn, 5).Value, "mm-dd") & " / 새 안내행 " & (wc.Cells(wc.Rows.Count, wc.Cells(3, 4).Value).End(xlUp).Row > lr)
    ' 17) 날짜 없이 추가한 작업에 바차트에서 날짜 입력
    mcol = wc.Cells(3, 4).Value
    lr = wc.Cells(wc.Rows.Count, mcol).End(xlUp).Row
    wc.Cells(lr, 1).Value = "- 신규항목"
    wc.Cells(lr + 1, 1).Value = "세부A"
    wc.Cells(lr + 2, 1).Value = "세부B"
    OnSheetChange wc, wc.Range(wc.Cells(lr, 1), wc.Cells(lr + 2, 4))
    Dim rA As Long, rB As Long, rI As Long, q As Long
    For q = 7 To 300
        If Trim(wc.Cells(q, 1).Value) = "· 세부A" Then rA = q
        If Trim(wc.Cells(q, 1).Value) = "· 세부B" Then rB = q
        If Trim(wc.Cells(q, 1).Value) = "- 신규항목" Then rI = q
    Next q
    ' 17a) 기간 먼저 → 기간만 저장되고 표시
    wc.Cells(rA, 4).Value = 4
    OnSheetChange wc, wc.Cells(rA, 4)
    WriteLog "17a 세부A 기간: " & wc.Cells(rA, 4).Value & " 시작[" & wc.Cells(rA, 2).Value & "]"
    ' 17b) 이어서 시작일 → 종료일 = 시작+기간-1
    wc.Cells(rA, 2).Value = CDate("2026-11-25")
    OnSheetChange wc, wc.Cells(rA, 2)
    WriteLog "17b 세부A: " & Format(wc.Cells(rA, 2).Value, "mm-dd") & "~" & Format(wc.Cells(rA, 3).Value, "mm-dd") & " " & wc.Cells(rA, 4).Value
    ' 17c) 세부B 종료일만 → 1일 작업
    wc.Cells(rB, 3).Value = CDate("2026-11-30")
    OnSheetChange wc, wc.Cells(rB, 3)
    WriteLog "17c 세부B: " & Format(wc.Cells(rB, 2).Value, "mm-dd") & "~" & Format(wc.Cells(rB, 3).Value, "mm-dd") & " " & wc.Cells(rB, 4).Value
    ' 17d) 날짜 없는 작업항목 줄에 시작일 → 작업항목 자체 행에 입력
    mcol = wc.Cells(3, 4).Value
    lr = wc.Cells(wc.Rows.Count, mcol).End(xlUp).Row
    wc.Cells(lr, 1).Value = "- 항목2"
    wc.Cells(lr + 1, 1).Value = "X작업"
    OnSheetChange wc, wc.Range(wc.Cells(lr, 1), wc.Cells(lr + 1, 4))
    For q = 7 To 300
        If Trim(wc.Cells(q, 1).Value) = "- 항목2" Then rI = q
    Next q
    wc.Cells(rI, 2).Value = CDate("2026-11-20")
    OnSheetChange wc, wc.Cells(rI, 2)
    WriteLog "17d 항목2: " & Format(wc.Cells(rI, 2).Value, "mm-dd") & " " & wc.Cells(rI, 4).Value & "일 / 원 " & wc.Shapes.Count
