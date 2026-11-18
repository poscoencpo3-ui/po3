    ' 같은 양식 파일에서 가져올 때 요약(자동 계산) 줄이 값으로 굳지 않고 수식으로 남는지 (lo_run.py --script)
    Dim wi As Worksheet, ws As Worksheet, q As Long, c As Long, n As Long, s As String
    Set wi = Worksheets("작업입력")
    Set ws = Worksheets.Add
    ws.Name = "SRC"
    For q = 4 To 16
        For c = 1 To 8
            If wi.Cells(q, c).HasFormula Then
                ws.Cells(q, c).Formula = wi.Cells(q, c).Formula
            Else
                ws.Cells(q, c).Value = wi.Cells(q, c).Value
            End If
        Next c
    Next q
    WriteLog "I0 원본 6행 : " & wi.Cells(6, 5).Formula & " | " & wi.Cells(6, 6).Formula & " | J=" & wi.Cells(6, 10).Value
    n = ImportInputFrom(ws, wi)
    RefreshInputSheet
    For q = 5 To 9
        s = s & q & ": " & wi.Cells(q, 1).Value & " E=" & wi.Cells(q, 5).Formula & " F=" & wi.Cells(q, 6).Formula & " J=" & wi.Cells(q, 10).Value & " ; "
    Next q
    WriteLog "I1 가져온 뒤 : " & s
