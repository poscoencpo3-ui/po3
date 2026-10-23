    ' 이전 양식(대분류/작업항목/세부작업 3칸) → 새 양식 변환 테스트 (lo_run.py --script)
    Dim wo As Worksheet, wi As Worksheet, q As Long, n As Long, s As String
    Set wo = Worksheets.Add
    wo.Name = "OLD"
    wo.Cells(4, 1).Value = "대분류": wo.Cells(4, 2).Value = "작업항목": wo.Cells(4, 3).Value = "세부작업 (선 위)"
    wo.Cells(5, 1).Value = "분체설비": wo.Cells(5, 2).Value = "기계정비창고": wo.Cells(5, 3).Value = "진입로"
    wo.Cells(5, 5).Value = CDate("2026-10-28"): wo.Cells(5, 6).Value = CDate("2026-11-02"): wo.Cells(5, 7).Value = 6
    wo.Cells(6, 3).Value = "Anchor": wo.Cells(6, 4).Value = "Padding"
    wo.Cells(6, 5).Value = CDate("2026-11-08"): wo.Cells(6, 6).Value = CDate("2026-11-10")
    wo.Cells(7, 2).Value = "전기실": wo.Cells(7, 3).Value = "기초 터파기": wo.Cells(7, 5).Value = CDate("2026-11-02"): wo.Cells(7, 7).Value = 5
    wo.Cells(8, 1).Value = "HOLDER": wo.Cells(8, 2).Value = "HOLDER": wo.Cells(8, 3).Value = "2구간 FLOOR 포장"
    wo.Cells(8, 5).Value = CDate("2026-11-03"): wo.Cells(8, 6).Value = CDate("2026-11-20")
    wo.Cells(9, 2).Value = "철골 세우기": wo.Cells(9, 5).Value = CDate("2026-11-16"): wo.Cells(9, 7).Value = 10: wo.Cells(9, 8).Value = "비고1"
    wo.Cells(10, 1).Value = "조업"
    Set wi = Worksheets("작업입력")
    n = ImportInputFrom(wo, wi)
    WriteLog "I 행수 " & n
    For q = 5 To 4 + n
        s = wi.Cells(q, 1).Value & "|" & wi.Cells(q, 3).Value & "|" & wi.Cells(q, 4).Value & "|" & D2(wi.Cells(q, 5).Value) & "|" & wi.Cells(q, 6).Value & "|" & wi.Cells(q, 8).Value & "|F수식 " & wi.Cells(q, 7).HasFormula
        WriteLog "I" & q & " " & s
    Next q
    BuildChart
    WriteLog "I 바차트: " & FindRow(Worksheets("바차트_일"), "· Anchor Padding") & " / " & FindRow(Worksheets("바차트_일"), "○ 조업")
