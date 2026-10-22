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
