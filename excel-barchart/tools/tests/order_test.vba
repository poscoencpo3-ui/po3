    ' 이름이 같은 대분류·작업항목이 떨어져 있어도 작업입력 순서대로 따로 그려지는지 (lo_run.py --script)
    Dim wi As Worksheet, wc As Worksheet, q As Long, s As String, data As Variant, i As Long, mc As Long, lr As Long
    Set wi = Worksheets("작업입력")
    wi.Range("A5:H40").ClearContents
    OnSheetChange wi, wi.Range("A5:H40")
    data = Array("대분류|전기|DX||", "작업항목||전원 차단||", "세부작업||차단|2027-04-10|2", _
                 "대분류|기계|E&C||", "작업항목||철거||", "세부작업||해체|2027-04-12|3", _
                 "대분류|전기|DX||", "작업항목||케이블||", "세부작업||포설|2027-04-15|2", _
                 "대분류|기계|E&C||", "작업항목||철거||", "세부작업||반출|2027-04-17|1", _
                 "작업항목||철거|2027-04-18|2", "작업항목||철거|2027-04-21|1")
    For i = 0 To UBound(data)
        wi.Cells(5 + i, 1).Value = Split(data(i), "|")(0)
        If Split(data(i), "|")(1) <> "" Then wi.Cells(5 + i, 2).Value = Split(data(i), "|")(1)
        wi.Cells(5 + i, 3).Value = Split(data(i), "|")(2)
        If Split(data(i), "|")(3) <> "" Then wi.Cells(5 + i, 5).Value = CDate(Split(data(i), "|")(3))
        If Split(data(i), "|")(4) <> "" Then wi.Cells(5 + i, 6).Value = CLng(Split(data(i), "|")(4))
    Next i
    OnSheetChange wi, wi.Range("A5:F18")
    gLog = ""
    BuildChart
    Set wc = Worksheets("바차트_일")
    mc = Val(CStr(wc.Cells(3, 4).Value))
    lr = wc.Cells(wc.Rows.Count, mc).End(-4162).Row
    For q = 16 To lr
        If CStr(wc.Cells(q, 1).Value) <> "" Then s = s & Trim(wc.Cells(q, 1).Value) & " " & D2(wc.Cells(q, 2).Value) & "~" & D2(wc.Cells(q, 3).Value) & " [" & wc.Cells(q, mc).Value & "] ; "
    Next q
    WriteLog "O1 " & s
    WriteLog "O2 도형 " & wc.Shapes.Count & " / 작업입력 요약 : " & D2(wi.Cells(5, 5).Value) & " " & wi.Cells(5, 6).Value & " | " & D2(wi.Cells(11, 5).Value) & " " & wi.Cells(11, 6).Value
    ' 바차트에서 둘째 DX 이름을 바꾸면 작업입력의 11행(둘째 DX)만 바뀌어야 함
    For q = 16 To lr
        If Left(CStr(wc.Cells(q, mc).Value), 5) = "K|11," Then
            wc.Cells(q, 1).Value = "DX 2차"
            OnSheetChange wc, wc.Cells(q, 1)
            Exit For
        End If
    Next q
    WriteLog "O3 이름 바꾼 뒤 : 5행 " & wi.Cells(5, 3).Value & " / 11행 " & wi.Cells(11, 3).Value
