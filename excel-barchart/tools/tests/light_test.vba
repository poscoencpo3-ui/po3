    ' 속도 개선 (v0.7.6) : 날짜 종류 칸(작업입력 1행)과, 고친 줄만 다시 쓰는 간트 막대 글자 (lo_run.py --script)
    Dim wi As Worksheet, wh As Worksheet, wm As Worksheet, q As Long, c As Long, s As String, a As String, b As String, lr As Long
    Set wi = Worksheets("작업입력")
    Set wh = Worksheets("공휴일")
    Set wm = Worksheets("메인")
    ' 1) 날짜 종류 : 예시는 2026-10-26(월)부터 → 월 0, 토(10/31) 1, 일(11/1) 2
    WriteLog "L1 첫날 " & D2(wi.Cells(3, 12).Value) & " : 월 " & wi.Cells(1, 12).Value & " / 토 " & wi.Cells(1, 17).Value & " / 일 " & wi.Cells(1, 18).Value & " / 수(10/28) " & wi.Cells(1, 14).Value
    ' 공휴일 추가 → 그 날짜가 2 로
    lr = wh.Cells(wh.Rows.Count, 1).End(-4162).Row + 1
    wh.Cells(lr, 1).Value = CDate("2026-10-28")
    OnSheetChange wh, wh.Cells(lr, 1)
    WriteLog "L2 10/28 공휴일 추가 뒤 : " & wi.Cells(1, 14).Value
    wh.Cells(lr, 1).ClearContents
    OnSheetChange wh, wh.Cells(lr, 1)
    WriteLog "L3 다시 지운 뒤 : " & wi.Cells(1, 14).Value
    ' 오늘 : 차트 시작일을 어제로 → 둘째 칸이 오늘(+10)
    wm.Cells(7, 3).Value = Date - 1
    OnSheetChange wm, wm.Cells(7, 3)
    WriteLog "L4 오늘 표시 : 첫 칸 " & (wi.Cells(1, 12).Value >= 10) & " / 둘째 칸 " & (wi.Cells(1, 13).Value >= 10) & " / 셋째 칸 " & (wi.Cells(1, 14).Value >= 10)
    wm.Cells(7, 3).ClearContents
    OnSheetChange wm, wm.Cells(7, 3)
    ' 2) 간트 막대 글자 : 여러 번 고친 뒤 상태 = 전체 다시 쓴 상태
    wi.Cells(7, 6).Value = 9: OnSheetChange wi, wi.Cells(7, 6)                 ' 진입로 기간 6 → 9 (대분류·작업항목 요약도 바뀜)
    wi.Cells(10, 5).Value = CDate("2026-11-04"): OnSheetChange wi, wi.Cells(10, 5)
    wi.Cells(12, 3).Value = "타설": OnSheetChange wi, wi.Cells(12, 3)
    wi.Range("A16:H16").ClearContents: OnSheetChange wi, wi.Range("A16:H16")   ' 마지막 줄 지움
    wi.Cells(17, 1).Value = "세부작업": wi.Cells(17, 3).Value = "새 작업": wi.Cells(17, 5).Value = CDate("2026-11-20"): wi.Cells(17, 6).Value = 4
    OnSheetChange wi, wi.Range("A17:F17")
    For q = 5 To 20
        For c = 12 To 80
            If CStr(wi.Cells(q, c).Value) <> "" Then a = a & q & "," & c & "," & wi.Cells(q, c).Value & ";"
        Next c
    Next q
    RefreshInputSheet
    For q = 5 To 20
        For c = 12 To 80
            If CStr(wi.Cells(q, c).Value) <> "" Then b = b & q & "," & c & "," & wi.Cells(q, c).Value & ";"
        Next c
    Next q
    WriteLog "L5 고친 줄만 쓴 결과 = 전체 다시 쓴 결과 : " & (a = b) & " (글자 " & (Len(a) - Len(Replace(a, ";", ""))) & "개)"
    WriteLog "L6 " & a
    WriteLog "L7 요약 : 대분류 " & D2(wi.Cells(5, 5).Value) & "~" & D2(wi.Cells(5, 7).Value) & " / 작업항목 " & D2(wi.Cells(6, 5).Value) & "~" & D2(wi.Cells(6, 7).Value)
