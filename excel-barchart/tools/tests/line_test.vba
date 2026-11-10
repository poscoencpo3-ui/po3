    ' 월 경계를 지나는 바 글자 위치 : 진입로(10/28~11/2) 는 가운데 칸(10/30), 기초 터파기(11/2~6) 는 시작 칸(가운데로)
    Dim wc As Worksheet, c As Long, q As Long, s As String, v As String
    Set wc = Worksheets("바차트_일")
    For q = 16 To 60
        For c = 5 To 120
            v = CStr(wc.Cells(q, c).Value)
            If v = "진입로" Or v = "기초 터파기" Then s = s & v & " col " & c & " (날짜칸 " & wc.Cells(6, c).Value & "일) ; "
        Next c
    Next q
    WriteLog "L1 " & s
