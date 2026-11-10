    ' 시간공정표 + 직종별 산적표 + 누적 공수 (lo_run.py --script)
    Dim wt As Worksheet, wc As Worksheet, q As Long, s As String, c As Long, rr As Long, k As Long
    SetupTimeSheets
    WriteLog "T0 setup: " & Left(gLog, 0)
    gLog = ""
    Set wt = Worksheets("시간입력")
    WriteLog "T1 종료 수식: " & Format(wt.Cells(16, 9).Value, "yyyy-mm-dd hh:mm") & " / 일수행: " & Format(wt.Cells(23, 9).Value, "yyyy-mm-dd hh:mm") & " / 머리글 " & wt.Cells(14, 10).Value & "," & wt.Cells(14, 14).Value & "," & wt.Cells(14, 15).Value
    BuildTimeChart
    Set wc = Worksheets("시간공정표")
    WriteLog "T2 build: " & gLog & " / shapes " & wc.Shapes.Count
    WriteLog "T3 머리글: " & wc.Cells(4, 5).Value & " | " & wc.Cells(5, 5).Value & " | " & wc.Cells(6, 5).Value & "," & wc.Cells(6, 6).Value
    s = ""
    For q = 7 To 60
        If wc.Cells(q, 1).Value <> "" Then s = s & q & ":" & Replace(wc.Cells(q, 1).Value, vbLf, "/") & " ; "
    Next q
    WriteLog "T4 왼쪽: " & s
    ' 인원 블록 : 숫자 줄 = 블록 첫 행
    For q = 7 To 80
        If Left(wc.Cells(q, 1).Value, 4) = "인원 (" Then rr = q: Exit For
    Next q
    s = ""
    For c = 5 To 52
        If wc.Cells(rr, c).Value <> "" Then s = s & (c - 5) & "=" & wc.Cells(rr, c).Value & " "
    Next c
    WriteLog "T5 인원 숫자(" & rr & "): " & s
    s = ""
    For k = rr + 1 To rr + 10
        s = s & wc.Cells(k, 2).Value & "|"
    Next k
    WriteLog "T6 범례: " & s & " 색(슬롯24 맨아래) " & wc.Cells(rr + 10, 5 + 24).Interior.Color
    For q = rr To 120
        If wc.Cells(q, 1).Value = "누적 공수" Then rr = q: Exit For
    Next q
    s = ""
    For c = 5 To 52
        If wc.Cells(rr + 13, c).Value <> "" Then s = s & (c - 5) & "=" & wc.Cells(rr + 13, c).Value & " "
    Next c
    WriteLog "T7 누적(" & rr & "): " & s & " / " & Replace(wc.Cells(rr, 2).Value, vbLf, " ")
    wt.Cells(16, 6).Value = 14
    wt.Cells(16, 7).ClearContents
    wt.Cells(16, 8).Value = 1
    OnTimeSheetChange wt, wt.Range("F16:H16")
    wt.Calculate
    WriteLog "T8 시각칸 " & Format(wt.Cells(16, 6).Value, "hh:mm") & " → 종료 " & Format(wt.Cells(16, 9).Value, "yyyy-mm-dd hh:mm")
    wt.Cells(6, 3).Value = 1
    BuildTimeChart
    q = FindRow(wc, "가설 비계 설치")
    WriteLog "T9 1h 비계: " & wc.Cells(q, 2).Value & " ~ " & wc.Cells(q, 3).Value & " (" & wc.Cells(q, 4).Value & ") / 칸 " & (wc.Cells(6, 5).End(-4161).Column - 4)
