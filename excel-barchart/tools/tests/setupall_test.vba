    ' 새 파일 초기 설정(SetupAll) + 시간공정표 자동 다시 그리기 (lo_run.py --nosetup --script)
    Dim q As Long, s As String
    gLog = ""
    SetupAll
    For q = 0 To ThisComponent.Sheets.getCount() - 1
        s = s & ThisComponent.Sheets.getByIndex(q).Name & ","
    Next q
    WriteLog "S1 sheets: " & s
    WriteLog "S2 log: " & Replace(Left(gLog, 60), vbCrLf, " ")
    WriteLog "S3 chart A1: " & Worksheets("시간공정표").Cells(1, 1).Value & " / meta " & Worksheets("시간공정표").Cells(3, 1).Value & " " & Worksheets("시간공정표").Cells(3, 2).Value
    Worksheets("시간입력").Cells(19, 7).Value = 4
    OnTimeSheetChange Worksheets("시간입력"), Worksheets("시간입력").Range("G19")
    OnTimeSheetActivate Worksheets("시간공정표")
    q = FindRow(Worksheets("시간공정표"), "가설 비계 설치")
    WriteLog "S4 비계 시간: " & Worksheets("시간공정표").Cells(q, 4).Value & " / ver " & Worksheets("시간공정표").Cells(3, 2).Value
    Worksheets("시간입력").Cells(40, 1).Value = "대분류"
    OnTimeSheetChange Worksheets("시간입력"), Worksheets("시간입력").Range("A40")
    WriteLog "S5 대분류 행 색: " & Worksheets("시간입력").Cells(40, 3).Interior.Color & " bold " & Worksheets("시간입력").Cells(40, 3).Font.Bold
    Worksheets("시간입력").Cells(330, 3).Value = "추가"
    OnTimeSheetChange Worksheets("시간입력"), Worksheets("시간입력").Range("C330")
    WriteLog "S6 330행 수식: " & Worksheets("시간입력").Cells(330, 9).HasFormula
