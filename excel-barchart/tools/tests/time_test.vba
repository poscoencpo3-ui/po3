    ' 시간공정표 + 산적표 (lo_run.py --script)
    Dim wt As Worksheet, wc As Worksheet, q As Long, s As String, c As Long, rr As Long
    SetupTimeSheets
    WriteLog "T0 setup: " & gLog
    gLog = ""
    Set wt = Worksheets("시간입력")
    WriteLog "T1 종료 수식: " & Format(wt.Cells(19, 9).Value, "yyyy-mm-dd hh:mm") & " / 일수행: " & Format(wt.Cells(26, 9).Value, "yyyy-mm-dd hh:mm") & " / 머리글 " & wt.Cells(17, 11).Value
    BuildTimeChart
    Set wc = Worksheets("시간공정표")
    WriteLog "T2 build: " & gLog & " / shapes " & wc.Shapes.Count
    WriteLog "T3 머리글: " & wc.Cells(4, 5).Value & " | " & wc.Cells(5, 5).Value & " | " & wc.Cells(6, 5).Value & "," & wc.Cells(6, 6).Value & " | 마지막열 " & wc.Cells(6, 5 + 36 - 1).Value & " / 다음열 [" & wc.Cells(6, 5 + 36).Value & "]"
    s = ""
    For q = 7 To 30
        s = s & q & ":" & wc.Cells(q, 1).Value & "/" & wc.Cells(q, 2).Value & "/" & wc.Cells(q, 4).Value & " ; "
    Next q
    WriteLog "T4 본문: " & s
    rr = FindRow(wc, "인원")
    s = ""
    For c = 5 To 40
        If wc.Cells(rr + 6, c).Value <> "" Then s = s & wc.Cells(6, c).Value & "h=" & wc.Cells(rr + 6, c).Value & " "
    Next c
    WriteLog "T5 인원 산적(" & rr & "): " & s & " / " & wc.Cells(rr, 2).Value
    rr = FindRow(wc, "25t 크레인")
    s = ""
    For c = 5 To 40
        If wc.Cells(rr + 6, c).Value <> "" Then s = s & (c - 5) & "=" & wc.Cells(rr + 6, c).Value & IIf(wc.Cells(rr + 6, c).Font.Color = 255, "!", "") & " "
    Next c
    WriteLog "T6 25t 산적: " & s
    ' 1시간 칸
    wt.Cells(6, 3).Value = 1
    BuildTimeChart
    WriteLog "T7 1h: 마지막 시각 " & wc.Cells(6, 5 + 72 - 1).Value & " / 칸 수 " & (wc.Cells(6, 5).End(-4161).Column - 4)
    ' 시각 숫자 입력 "14" → 14시, 작업시간 비우고 일수
    wt.Cells(19, 6).Value = 14
    wt.Cells(19, 7).ClearContents
    wt.Cells(19, 8).Value = 1
    OnTimeSheetChange wt, wt.Range("F19:H19")
    wt.Calculate
    WriteLog "T8a 시각칸 값 " & Format(wt.Cells(19, 6).Value, "hh:mm")
    WriteLog "T8 14 입력 → 종료 " & Format(wt.Cells(19, 9).Value, "yyyy-mm-dd hh:mm")
    BuildTimeChart
    q = FindRow(wc, "가설 비계 설치")
    WriteLog "T9 비계: " & wc.Cells(q, 2).Value & " ~ " & wc.Cells(q, 3).Value & " (" & wc.Cells(q, 4).Value & ")"
