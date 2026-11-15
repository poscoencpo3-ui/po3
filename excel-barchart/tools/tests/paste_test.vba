    ' 공정 받아쓰기에서 복사한 줄을 작업입력 A5 에 붙여 넣은 것과 같은 상황 (lo_run.py --script)
    Dim wi As Worksheet, wc As Worksheet, q As Long, s As String, data As Variant, i As Long
    Set wi = Worksheets("작업입력")
    wi.Range("A5:F16").ClearContents
    OnSheetChange wi, wi.Range("A5:F16")
    data = Array( _
        Array("대분류", "공사", "불기어 교체", "", "", ""), _
        Array("작업항목", "토목", "불기어 기초작업", "", "2026-11-28", "3"), _
        Array("작업항목", "", "패딩작업", "", "2026-11-30", "2"), _
        Array("작업항목", "기계", "불기어 설치", "", "", ""), _
        Array("세부작업", "", "인양 · 가조립", "", "2026-12-02", "2"), _
        Array("세부작업", "", "센터링", "", "2026-12-04", "3"))
    For i = 0 To 5
        wi.Cells(5 + i, 1).Value = data(i)(0)
        wi.Cells(5 + i, 2).Value = data(i)(1)
        wi.Cells(5 + i, 3).Value = data(i)(2)
        If data(i)(4) <> "" Then wi.Cells(5 + i, 5).Value = CDate(data(i)(4))
        If data(i)(5) <> "" Then wi.Cells(5 + i, 6).Value = CLng(data(i)(5))
    Next i
    OnSheetChange wi, wi.Range("A5:F10")
    wi.Calculate
    s = ""
    For q = 5 To 10
        s = s & wi.Cells(q, 3).Value & " " & D2(wi.Cells(q, 5).Value) & "~" & D2(wi.Cells(q, 7).Value) & " (" & wi.Cells(q, 6).Value & ") ; "
    Next q
    WriteLog "P1 작업입력: " & s
    BuildChart
    Set wc = Worksheets("바차트_일")
    s = ""
    For q = 16 To 40
        If CStr(wc.Cells(q, 1).Value) <> "" Then s = s & q & ":" & wc.Cells(q, 1).Value & " " & D2(wc.Cells(q, 2).Value) & "~" & D2(wc.Cells(q, 3).Value) & " ; "
    Next q
    WriteLog "P2 바차트: " & s
