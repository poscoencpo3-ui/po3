    ' 공정 받아쓰기(시간 단위 탭)에서 복사한 줄을 시간입력 A15 에 붙여 넣은 것과 같은 상황 (lo_run.py --script)
    Dim wt As Worksheet, wc As Worksheet, q As Long, s As String, data As Variant, i As Long
    SetupTimeSheets
    Set wt = Worksheets("시간입력")
    wt.Range("A15:H25").ClearContents
    wt.Range("J15:Q25").ClearContents
    data = Array( _
        Array("대분류", "공사", "SD 준비", "", "", ""), _
        Array("작업", "건축", "가설 비계 설치", "2026-11-28", "09:00", "10"), _
        Array("작업", "전기", "전원 차단", "2026-11-28", "19:30", "1.5"), _
        Array("대분류", "공사", "본 작업", "", "", ""), _
        Array("작업", "", "노체 냉각", "2026-11-29", "20:00", "14"))
    For i = 0 To 4
        wt.Cells(15 + i, 1).Value = data(i)(0)
        wt.Cells(15 + i, 2).Value = data(i)(1)
        wt.Cells(15 + i, 3).Value = data(i)(2)
        If data(i)(3) <> "" Then
            wt.Cells(15 + i, 5).Value = CDate(data(i)(3))
            wt.Cells(15 + i, 6).Value = CDbl(TimeValue(data(i)(4)))
            wt.Cells(15 + i, 7).Value = CDbl(data(i)(5))
        End If
    Next i
    OnTimeSheetChange wt, wt.Range("A15:H19")
    wt.Calculate
    s = ""
    For q = 15 To 19
        s = s & wt.Cells(q, 3).Value & " → " & Format(wt.Cells(q, 9).Value, "mm-dd hh:mm") & " ; "
    Next q
    WriteLog "Q1 종료 수식: " & s
    BuildTimeChart
    Set wc = Worksheets("시간공정표")
    s = ""
    For q = 7 To 20
        If CStr(wc.Cells(q, 1).Value) <> "" Then s = s & wc.Cells(q, 1).Value & " " & wc.Cells(q, 2).Value & "~" & wc.Cells(q, 3).Value & " (" & wc.Cells(q, 4).Value & ") ; "
    Next q
    WriteLog "Q2 시간공정표: " & s
