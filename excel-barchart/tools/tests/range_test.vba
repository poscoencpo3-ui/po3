    ' 메인 차트 시작일·종료일 → 작업입력 간트 날짜 범위 (lo_run.py --script)
    Dim wm As Worksheet, wi As Worksheet, q As Long, nVis As Long
    Set wm = Worksheets("메인")
    Set wi = Worksheets("작업입력")
    WriteLog "R0 자동: 첫날 " & D2(wi.Cells(3, 12).Value)
    wm.Cells(7, 3).Value = CDate("2026-11-02")
    wm.Cells(8, 3).Value = CDate("2026-11-20")
    OnSheetChange wm, wm.Range("C7:C8")
    nVis = 0
    For q = 12 To 411
        If Not wi.Columns(q).Hidden Then nVis = nVis + 1
    Next q
    WriteLog "R1 메인 11/2~11/20: 첫날 " & D2(wi.Cells(3, 12).Value) & " / 보이는 날짜 칸 " & nVis & " / 마지막 " & D2(wi.Cells(3, 11 + nVis).Value)
    wm.Cells(7, 3).ClearContents
    wm.Cells(8, 3).ClearContents
    OnSheetChange wm, wm.Range("C7:C8")
    nVis = 0
    For q = 12 To 411
        If Not wi.Columns(q).Hidden Then nVis = nVis + 1
    Next q
    WriteLog "R2 비움: 첫날 " & D2(wi.Cells(3, 12).Value) & " / 보이는 날짜 칸 " & nVis
