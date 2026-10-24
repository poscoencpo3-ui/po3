    ' 요약 날짜 : 대분류는 MIN/MAX 수식, 작업항목은 직접 입력하면 그대로 (lo_run.py --script)
    Dim wi As Worksheet, ri As Long, rc As Long
    Set wi = Worksheets("작업입력")
    rc = FindRow(wi, "분체설비", 3)
    ri = FindRow(wi, "기계정비창고", 3)
    WriteLog "S0 대분류 수식: " & wi.Cells(rc, 5).Formula & " / " & wi.Cells(rc, 6).Formula
    WriteLog "S0 값: 대분류 " & D2(wi.Cells(rc, 5).Value) & " " & wi.Cells(rc, 6).Value & "일 / 작업항목 " & D2(wi.Cells(ri, 5).Value) & " " & wi.Cells(ri, 6).Value & "일 수식 " & wi.Cells(ri, 5).HasFormula
    ' 1) 작업항목에 자체 일정 입력 (10/23, 31일) → 그대로 유지, 대분류는 더 이른 시작일로
    wi.Cells(ri, 5).Value = CDate("2026-10-23")
    OnSheetChange wi, wi.Cells(ri, 5)
    wi.Cells(ri, 6).Value = 31
    OnSheetChange wi, wi.Cells(ri, 6)
    wi.Calculate
    WriteLog "S1 작업항목: " & D2(wi.Cells(ri, 5).Value) & " " & wi.Cells(ri, 6).Value & "일 수식 " & wi.Cells(ri, 5).HasFormula & " 요약표시[" & wi.Cells(ri, 10).Value & "] / 대분류 " & D2(wi.Cells(rc, 5).Value) & " " & wi.Cells(rc, 6).Value & "일"
    ' 2) 대분류에 직접 입력 → 다시 수식으로
    wi.Cells(rc, 5).Value = CDate("2026-12-01")
    OnSheetChange wi, wi.Cells(rc, 5)
    wi.Calculate
    WriteLog "S2 대분류: " & D2(wi.Cells(rc, 5).Value) & " 수식 " & wi.Cells(rc, 5).HasFormula
    ' 3) 작업항목 시작일 지우기 → 다시 아래 세부작업 범위 수식
    wi.Cells(ri, 5).ClearContents
    wi.Cells(ri, 6).ClearContents
    OnSheetChange wi, wi.Range(wi.Cells(ri, 5), wi.Cells(ri, 6))
    wi.Calculate
    WriteLog "S3 작업항목: " & D2(wi.Cells(ri, 5).Value) & " " & wi.Cells(ri, 6).Value & "일 수식 " & wi.Cells(ri, 5).HasFormula & " / 대분류 " & D2(wi.Cells(rc, 5).Value)
    ' 4) 바차트 : 작업항목 자체 일정이면 그 줄에 바
    wi.Cells(ri, 5).Value = CDate("2026-10-23")
    OnSheetChange wi, wi.Cells(ri, 5)
    wi.Cells(ri, 6).Value = 31
    OnSheetChange wi, wi.Cells(ri, 6)
    BuildChart
    Dim wc As Worksheet: Set wc = Worksheets("바차트_일")
    WriteLog "S4 바차트 작업항목: " & wc.Cells(FindRow(wc, "- 기계정비창고"), 2).Value & " ~ " & wc.Cells(FindRow(wc, "- 기계정비창고"), 3).Value & " / 원 " & wc.Shapes.Count
