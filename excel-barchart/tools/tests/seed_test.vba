    ' 공정이 미리 들어 있는 파일 : [시작] 시트의 공정이 초기 설정 때 작업입력으로 옮겨지고 바차트가 그려지는지 (lo_run.py --nosetup --script)
    Dim ws As Worksheet, wi As Worksheet, wc As Worksheet, q As Long, s As String, data As Variant, i As Long
    Set ws = Worksheets.Add
    ws.Name = "시작"
    ws.Cells(1, 1).Value = "BAR CHART 공정표 자동 작성"
    ws.Cells(4, 1).Value = "구분": ws.Cells(4, 2).Value = "공종": ws.Cells(4, 3).Value = "작업내용 (선 위)"
    ws.Cells(4, 10).Value = "공사명": ws.Cells(4, 11).Value = "시험 공사"
    ws.Cells(5, 10).Value = "D-DAY 기준일": ws.Cells(5, 11).Value = CDate("2027-04-10")
    data = Array("대분류||가 설비||", "작업항목||철거||", "세부작업||해체|2027-04-10|3", "세부작업|기계|반출|2027-04-13|2", _
                 "작업항목||설치||", "세부작업||조립|2027-04-12|5", "대분류||나 설비||", "작업항목||시운전|2027-04-20|4")
    For i = 0 To UBound(data)
        ws.Cells(5 + i, 1).Value = Split(data(i), "|")(0)
        If Split(data(i), "|")(1) <> "" Then ws.Cells(5 + i, 2).Value = Split(data(i), "|")(1)
        ws.Cells(5 + i, 3).Value = Split(data(i), "|")(2)
        If Split(data(i), "|")(3) <> "" Then ws.Cells(5 + i, 5).Value = CDate(Split(data(i), "|")(3))
        If Split(data(i), "|")(4) <> "" Then ws.Cells(5 + i, 6).Value = CLng(Split(data(i), "|")(4))
    Next i
    gLog = ""
    SetupAll
    For q = 0 To ThisComponent.Sheets.getCount() - 1
        s = s & ThisComponent.Sheets.getByIndex(q).Name & " / "
    Next q
    WriteLog "S1 시트 : " & s
    WriteLog "S2 안내 : " & Replace(Left(gLog, 60), vbCrLf, " ")
    WriteLog "S3 메인 : 공사명 " & Worksheets("메인").Cells(5, 3).Value & " / D-DAY " & D2(Worksheets("메인").Cells(14, 3).Value)
    Set wi = Worksheets("작업입력")
    s = ""
    For q = 5 To 13
        s = s & wi.Cells(q, 1).Value & "|" & wi.Cells(q, 2).Value & "|" & wi.Cells(q, 3).Value & "|" & D2(wi.Cells(q, 5).Value) & "|" & wi.Cells(q, 6).Value & "|" & D2(wi.Cells(q, 7).Value) & "|" & wi.Cells(q, 3).IndentLevel & " ; "
    Next q
    WriteLog "S4 작업입력 : " & s
    Set wc = Worksheets("바차트_일")
    s = ""
    For q = 16 To 30
        If CStr(wc.Cells(q, 1).Value) <> "" Then s = s & wc.Cells(q, 1).Value & " " & D2(wc.Cells(q, 2).Value) & "~" & D2(wc.Cells(q, 3).Value) & " ; "
    Next q
    WriteLog "S5 바차트 : 제목 " & wc.Cells(1, 1).Value & " / 도형 " & wc.Shapes.Count & " / " & s
