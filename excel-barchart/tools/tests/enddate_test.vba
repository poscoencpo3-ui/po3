    ' 바차트에서 날짜를 고친 뒤 작업입력의 종료일 수식 (v0.7.8) + 예전에 잘못 들어간 수식 바로잡기 (lo_run.py --script)
    Dim wc As Worksheet, wi As Worksheet, r As Long, mcol As Long, q As Long
    Set wc = Worksheets("바차트_일")
    Set wi = Worksheets("작업입력")
    mcol = Val(CStr(wc.Cells(3, 4).Value))
    ' 진입로(작업입력 7행) : 바차트에서 기간 6 → 3
    For q = 16 To 80
        If CStr(wc.Cells(q, mcol).Value) = "D|7" Then r = q: Exit For
    Next q
    wc.Cells(r, 4).Value = 3
    OnSheetChange wc, wc.Cells(r, 4)
    WriteLog "E1 기간 3 : " & D2(wi.Cells(7, 5).Value) & " " & wi.Cells(7, 6).Value & " 종료 " & Format(wi.Cells(7, 7).Value, "mm-dd") & " / 수식 " & wi.Cells(7, 7).Formula
    WriteLog "E2 작업항목 요약 : " & Format(wi.Cells(6, 5).Value, "mm-dd") & " 기간 " & wi.Cells(6, 6).Value & " 종료 " & Format(wi.Cells(6, 7).Value, "mm-dd") & " / 대분류 기간 " & wi.Cells(5, 6).Value
    ' 바차트에서 종료일을 11-05 로
    For q = 16 To 80
        If CStr(wc.Cells(q, mcol).Value) = "D|7" Then r = q: Exit For
    Next q
    wc.Cells(r, 3).Value = CDate("2026-11-05")
    OnSheetChange wc, wc.Cells(r, 3)
    WriteLog "E3 종료일 11-05 : 기간 " & wi.Cells(7, 6).Value & " 종료 " & Format(wi.Cells(7, 7).Value, "mm-dd") & " / 바차트 " & D2(wc.Cells(r, 2).Value) & " " & wc.Cells(r, 4).Value
    ' 예전 버전이 남긴 잘못된 수식 (기간 + 비고) → 다음에 고칠 때 바로잡힘
    wi.Cells(8, 7).Formula = "=IF(OR(F8="""",H8=""""),"""",F8+H8-1)"
    WriteLog "E4 잘못된 수식 : [" & wi.Cells(8, 7).Value & "]"
    wi.Cells(10, 6).Value = wi.Cells(10, 6).Value
    OnSheetChange wi, wi.Cells(10, 6)
    WriteLog "E5 바로잡은 뒤 : " & Format(wi.Cells(8, 7).Value, "mm-dd") & " / " & wi.Cells(8, 7).Formula
