Attribute VB_Name = "TimeChart"
'===================================================================
'  시간 단위 공정표 (SD·정비) + 인원·장비 산적표 모듈       v0.8.1 (초안)
'-------------------------------------------------------------------
'  기존 바차트(BarChart 모듈)와 따로 동작하는 추가 기능.
'  기존 메인 / 작업입력 / 바차트 시트는 건드리지 않음.
'
'  [시트]
'    시간입력   : 설정(시간 칸, 기간, D-DAY, 바 색상, 공수 기준) + 작업 목록
'                 구분 / 공종 / 작업내용 / 하단표기 / 시작일 / 시작시각 / 작업시간(h) / 일수(일)
'                 / 종료(수식) / 인원 직종 5칸(관리·제관·비계·기계·배관) / 장비 3칸 / 비고
'                 (직종·장비 이름 = 머리글 칸, 바꾸면 산적표 이름도 바뀜)
'    시간공정표 : D+n · 날짜 · 시각 머리글, 시간 단위 바, 아래쪽 산적표
'                 (직종별 쌓은 막대 / 장비별 막대 / 누적 공수 선그래프)
'
'  [매크로]
'    SetupTimeSheets : 시간입력 / 시간공정표 시트 추가 (기존 파일에 모듈만 가져온 뒤 1회 실행)
'    BuildTimeChart  : 시간입력 내용으로 시간공정표 그리기
'    SetupAll        : 새 파일 초기 설정 (바차트 시트 + 시간 시트)
'    OnTimeSheetChange / OnTimeSheetActivate : ThisWorkbook 이벤트에서 호출 (자동 다시 그리기)
'===================================================================
Option Explicit

Private tBusy As Boolean

'--- 시트 이름 ---
Private Const TS_INPUT As String = "시간입력"
Private Const TS_CHART As String = "시간공정표"
Private Const TS_MAIN As String = "메인"
Private Const TS_HOL As String = "공휴일"
Private Const TS_TRADE As String = "공종"
Private Const TS_META As String = "TCMETA"

'--- 시간입력 : 설정 (C열) ---
Private Const TI_VAL As Long = 3
Private Const TI_TITLE As Long = 5
Private Const TI_SLOT As Long = 6
Private Const TI_FROM As Long = 7
Private Const TI_TO As Long = 8
Private Const TI_DDAY As Long = 9
Private Const TI_BARCLR As Long = 10
Private Const TI_GONGSU As Long = 11   ' 1공수 = n시간 (누적 공수 그래프)
Private Const TI_GRP As Long = 13      ' 머리글 위 묶음 줄 (인원 / 장비)
Private Const TI_HDR As Long = 14
Private Const TI_FIRST As Long = 15
Private Const TI_ROWS As Long = 300
Private Const TI_VER_COL As Long = 26  ' Z1 : 시간입력 변경 횟수 (시간공정표 자동 다시 그리기)

'--- 시간입력 : 작업 목록 열 ---
Private Const TC_LVL As Long = 1      ' A 구분 (대분류 / 작업)
Private Const TC_TRADE As Long = 2    ' B 공종
Private Const TC_TEXT As Long = 3     ' C 작업내용 (선 위)
Private Const TC_LOW As Long = 4      ' D 하단표기 (선 아래, 비우면 인원·장비 표시)
Private Const TC_DATE As Long = 5     ' E 시작일
Private Const TC_TIME As Long = 6     ' F 시작시각 (비우면 0시)
Private Const TC_HOURS As Long = 7    ' G 작업시간(h)
Private Const TC_DAYS As Long = 8     ' H 일수(일) : 작업시간이 비었을 때
Private Const TC_END As Long = 9      ' I 종료 (수식)
Private Const TC_CREW0 As Long = 10   ' J~N 인원 직종 5칸 (관리 / 제관 / 비계 / 기계 / 배관)
Private Const TC_EQ0 As Long = 15     ' O~Q 장비 3칸
Private Const TC_NOTE As Long = 18    ' R 비고
Private Const N_CREW As Long = 5
Private Const N_EQ As Long = 3
Private Const N_RES As Long = 8       ' 1~5 직종, 6~8 장비
Private Const TC_END_FORMULA As String = _
    "=IF(OR(RC5="""",AND(RC7="""",RC8="""")),"""",INT(RC5)+IF(RC6="""",RC5-INT(RC5),IF(RC6>=1,RC6/24,RC6))+IF(RC7<>"""",RC7/24,RC8))"

'--- 시간공정표 배치 ---
Private Const TR_TITLE As Long = 1
Private Const TR_INFO As Long = 2
Private Const TR_META As Long = 3     ' 숨김 : TCMETA / 그릴 때의 변경 횟수
Private Const TR_DDAY As Long = 4     ' D+n
Private Const TR_DATE As Long = 5     ' 날짜 (요일)
Private Const TR_HOUR As Long = 6     ' 시각
Private Const TR_BODY As Long = 7
Private Const TK_LABEL As Long = 1    ' A 작업
Private Const TK_S As Long = 2        ' B 시작
Private Const TK_E As Long = 3        ' C 종료
Private Const TK_H As Long = 4        ' D 시간
Private Const TK_CHART0 As Long = 5   ' E~ 시간 칸
Private Const CREW_ROWS As Long = 10  ' 산적표 : 인원 막대 높이(행 수)
Private Const EQ_ROWS As Long = 4     '          장비 막대 높이
Private Const CUM_ROWS As Long = 12   '          누적 공수 그래프 높이
Private Const LOAD_ROW_H As Single = 6
Private Const MAX_SLOTS As Long = 2000
Private Const DOT_D As Single = 7     ' 시작/종료 원 지름

'--- 색상 ---
Private Const C_SAT As Long = 12611584        ' RGB(0,112,192)
Private Const C_SUN As Long = 255             ' RGB(255,0,0)
Private Const C_HOL_BG As Long = 13431551     ' RGB(255,242,204)
Private Const C_HDR As Long = 15652797        ' RGB(189,215,238)
Private Const C_GRID As Long = 12566463       ' RGB(191,191,191)
Private Const C_GRID_DARK As Long = 8421504   ' RGB(128,128,128)
Private Const C_CAT_ROW As Long = 16247773    ' RGB(221,235,247)
Private Const C_INPUT_BG As Long = 13434879   ' RGB(255,255,204)
Private Const C_CALC_BG As Long = 15921906    ' RGB(242,242,242)
Private Const C_NIGHT_HDR As Long = 14277081  ' RGB(217,217,217)
Private Const C_NIGHT_BODY As Long = 16250871 ' RGB(247,247,247)
Private Const C_LOAD_HDR As Long = 14083324   ' RGB(252,228,214)

'--- 작업 데이터 ---
Private tN As Long
Private tLvl() As Integer          ' 1 대분류 / 2 작업
Private tText() As String
Private tLow() As String
Private tTrade() As String
Private tHasBar() As Boolean
Private tSD() As Double            ' 시작 일시
Private tED() As Double            ' 종료 일시
Private tRes() As Double           ' (작업, 1~8) 직종별 인원·장비 수
Private tOutRow() As Long          ' 시간공정표 행

Private tResName(1 To 8) As String
Private tGongsuH As Double         ' 1공수 시간

Private tDay0 As Date
Private tDays As Long
Private tSlotH As Long
Private tSlotMin As Long
Private tSpd As Long               ' 하루 칸 수
Private tSlots As Long
Private tLastCol As Long
Private tShapeN As Long

Private tHolN As Long
Private tHol() As Date
Private tTrN As Long
Private tTrName() As String
Private tTrColor() As Long


'===================================================================
'  1. 설정 / 시트 추가
'===================================================================
' 새 파일 (배포용 xlsm) 최초 실행 : 바차트 시트 + 시간 시트
Public Sub AutoSetupAllIfNeeded()
    If Not TSheetExists(TS_MAIN) Then SetupAll
End Sub

Public Sub SetupAll()
    Dim q As Boolean
    q = gQuiet
    gQuiet = True
    gLog = ""
    BarChart.SetupWorkbook
    gQuiet = q
    If Not TSheetExists(TS_MAIN) Or InStr(gLog, "오류") > 0 Then
        TNotify "초기 설정 중 문제가 있었습니다." & vbCrLf & gLog
        Exit Sub
    End If
    If Not TSetupSheets() Then Exit Sub
    ThisWorkbook.Worksheets(TS_MAIN).Activate
    TNotify "초기 설정이 끝났습니다." & vbCrLf & vbCrLf & _
            "1) [작업입력] 시트 : 일 단위 작업 입력 → [바차트 생성]" & vbCrLf & _
            "2) [시간입력] 시트 : 시간 단위(SD 등) 작업과 인원·장비 입력 → [시간공정표 생성]" & vbCrLf & vbCrLf & _
            "※ 파일은 'Excel 매크로 사용 통합 문서(*.xlsm)'로 저장해야 합니다."
End Sub

' 기존 파일에 시간 시트만 추가 (TimeChart 모듈을 가져온 뒤 Alt+F8 로 1회 실행)
Public Sub SetupTimeSheets()
    If TSheetExists(TS_INPUT) And Not gQuiet Then
        If MsgBox("시간입력 / 시간공정표 시트를 새로 만듭니다." & vbCrLf & _
                  "기존 시간입력 내용은 지워집니다. 계속할까요?", vbYesNo + vbExclamation, "시간공정표") <> vbYes Then Exit Sub
    End If
    If Not TSetupSheets() Then Exit Sub
    ThisWorkbook.Worksheets(TS_INPUT).Activate
    TNotify "시간입력 / 시간공정표 시트를 추가했습니다." & vbCrLf & vbCrLf & _
            "[시간입력] 시트에 작업(시작일·시작시각·작업시간)과 인원·장비 수를 넣고" & vbCrLf & _
            "[시간공정표 생성]을 누르면 시간 단위 공정표와 산적표가 그려집니다." & vbCrLf & _
            "(예시 작업이 들어 있습니다. 지우고 입력하세요.)"
End Sub

Private Function TSetupSheets() As Boolean
    Dim ws As Worksheet, ok As Boolean
    On Error GoTo EH
    tBusy = True
    Application.EnableEvents = False
    Application.ScreenUpdating = False
    Application.DisplayAlerts = False
    If TSheetExists(TS_CHART) Then ThisWorkbook.Worksheets(TS_CHART).Delete
    If TSheetExists(TS_INPUT) Then ThisWorkbook.Worksheets(TS_INPUT).Delete
    Application.DisplayAlerts = True
    Set ws = ThisWorkbook.Worksheets.Add(After:=ThisWorkbook.Worksheets(ThisWorkbook.Worksheets.Count))
    ws.Name = TS_INPUT
    TBuildInputSheet ws
    Set ws = ThisWorkbook.Worksheets.Add(After:=ThisWorkbook.Worksheets(TS_INPUT))
    ws.Name = TS_CHART
    ws.Cells.Font.Name = "맑은 고딕"
    TSetTabColor ws, RGB(197, 90, 17)
    ok = TRender(ws, False)
    Application.ScreenUpdating = True
    Application.EnableEvents = True
    tBusy = False
    TSetupSheets = True
    Exit Function
EH:
    Application.DisplayAlerts = True
    Application.ScreenUpdating = True
    Application.EnableEvents = True
    tBusy = False
    TNotify "시간 시트를 만드는 중 오류가 발생했습니다." & vbCrLf & Err.Number & " : " & Err.Description
End Function

Private Sub TBuildInputSheet(ByVal ws As Worksheet)
    Dim hdr As Variant, wid As Variant, i As Long, k As Long, r As Long, lastFmt As Long, data As Variant

    ws.Cells.Font.Name = "맑은 고딕"
    ws.Cells.Font.Size = 10
    TSetText ws.Range("A1"), "시간 단위 공정 입력 (SD · 정비)"
    ws.Range("A1").Font.Size = 14
    ws.Range("A1").Font.Bold = True
    ws.Rows(1).RowHeight = 26
    TSetText ws.Range("A2"), "※ 시작일 + 시작시각 + 작업시간(h) → 종료 자동.  시작시각을 비우면 0시부터, 작업시간 대신 일수(일)로도 입력.  " & _
                             "직종별 인원·장비 칸의 숫자는 시간공정표 아래 산적표와 누적 공수 그래프로 집계됩니다."
    ws.Range("A2").Font.Color = C_GRID_DARK
    ws.Range("A2").Font.Size = 9

    TSetText ws.Cells(4, 1), "■ 설정"
    ws.Cells(4, 1).Font.Bold = True
    TCfgRow ws, TI_TITLE, "공정표 제목", "전로 SD", "시간공정표 맨 위 제목"
    TCfgRow ws, TI_SLOT, "시간 칸 (시간)", "2", "한 칸 = n시간 : 1 · 2 · 3 · 4 · 6 · 12 중 선택"
    TCfgRow ws, TI_FROM, "표시 시작일", "", "비우면 첫 작업 날짜부터"
    TCfgRow ws, TI_TO, "표시 종료일", "", "비우면 마지막 작업 날짜까지"
    TCfgRow ws, TI_DDAY, "D-DAY 기준일", "", "이 날 = D+1 (비우면 메인 시트의 D-DAY, 그것도 없으면 첫날)"
    TCfgRow ws, TI_BARCLR, "바 색상", "검정", "검정 / 공종색"
    TCfgRow ws, TI_GONGSU, "공수 기준 (시간)", "8", "누적 공수 = 투입 인원 × 시간 ÷ 이 값 (8시간 = 1공수)"
    ws.Cells(TI_SLOT, TI_VAL).Value = 2
    ws.Cells(TI_GONGSU, TI_VAL).Value = 8
    ws.Cells(TI_DDAY, TI_VAL).Value = DateSerial(2026, 11, 13)
    ws.Range(ws.Cells(TI_FROM, TI_VAL), ws.Cells(TI_DDAY, TI_VAL)).NumberFormat = "yyyy-mm-dd"
    TAddList ws.Cells(TI_SLOT, TI_VAL), "1,2,3,4,6,12"
    TAddList ws.Cells(TI_BARCLR, TI_VAL), "검정,공종색"

    ' 작업 목록 머리글 (인원 직종·장비 이름은 머리글 칸을 바꾸면 됨)
    hdr = Array("구분", "공종", "작업내용 (선 위)", "하단표기", "시작일", "시작시각", "작업시간(h)", "일수(일)", _
                "종료 (자동)", "관리", "제관", "비계", "기계", "배관", "50t 크레인", "25t 크레인", "고소작업차", "비고")
    wid = Array(8, 7, 28, 12, 10.5, 7.5, 8, 6.5, 11.5, 5.5, 5.5, 5.5, 5.5, 5.5, 8.5, 8.5, 8.5, 14)
    For i = 0 To 17
        TSetText ws.Cells(TI_HDR, i + 1), CStr(hdr(i))
        ws.Columns(i + 1).ColumnWidth = wid(i)
    Next i
    With ws.Range(ws.Cells(TI_HDR, 1), ws.Cells(TI_HDR, TC_NOTE))
        .Font.Bold = True
        .Interior.Color = C_HDR
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
        .WrapText = True
    End With
    ' 직종·장비 머리글 = 산적표 색
    For i = 1 To N_RES
        With ws.Cells(TI_HDR, TResCol(i))
            .Interior.Color = TResColor(i)
            .Font.Color = RGB(255, 255, 255)
        End With
    Next i
    ws.Rows(TI_HDR).RowHeight = 30
    With ws.Range(ws.Cells(TI_GRP, TC_CREW0), ws.Cells(TI_GRP, TC_CREW0 + N_CREW - 1))
        .Merge
        .Interior.Color = C_LOAD_HDR
    End With
    TSetText ws.Cells(TI_GRP, TC_CREW0), "인원 (명)"
    With ws.Range(ws.Cells(TI_GRP, TC_EQ0), ws.Cells(TI_GRP, TC_EQ0 + N_EQ - 1))
        .Merge
        .Interior.Color = C_LOAD_HDR
    End With
    TSetText ws.Cells(TI_GRP, TC_EQ0), "장비 (대)"
    With ws.Range(ws.Cells(TI_GRP, TC_CREW0), ws.Cells(TI_GRP, TC_EQ0 + N_EQ - 1))
        .Font.Bold = True
        .HorizontalAlignment = xlCenter
        .Borders.LineStyle = xlContinuous
        .Borders.Color = C_GRID
    End With
    TSetText ws.Cells(TI_GRP - 1, TC_CREW0), "※ 직종·장비 이름은 아래 머리글 칸을 고치면 됩니다 (산적표 이름도 같이 바뀜)"
    ws.Cells(TI_GRP - 1, TC_CREW0).Font.Size = 9
    ws.Cells(TI_GRP - 1, TC_CREW0).Font.Color = C_GRID_DARK

    lastFmt = TI_FIRST + TI_ROWS - 1
    ws.Range(ws.Cells(TI_FIRST, TC_LVL), ws.Cells(lastFmt, TC_LOW)).NumberFormat = "@"
    ws.Range(ws.Cells(TI_FIRST, TC_DATE), ws.Cells(lastFmt, TC_DATE)).NumberFormat = "yyyy-mm-dd"
    ws.Range(ws.Cells(TI_FIRST, TC_TIME), ws.Cells(lastFmt, TC_TIME)).NumberFormat = "hh:mm"
    ws.Range(ws.Cells(TI_FIRST, TC_END), ws.Cells(lastFmt, TC_END)).NumberFormat = "m\/d hh:mm"
    ws.Range(ws.Cells(TI_FIRST, TC_END), ws.Cells(lastFmt, TC_END)).FormulaR1C1 = TC_END_FORMULA
    ws.Range(ws.Cells(TI_FIRST, TC_END), ws.Cells(lastFmt, TC_END)).Interior.Color = C_CALC_BG
    ws.Range(ws.Cells(TI_FIRST, TC_LVL), ws.Cells(lastFmt, TC_TRADE)).HorizontalAlignment = xlCenter
    ws.Range(ws.Cells(TI_FIRST, TC_DATE), ws.Cells(lastFmt, TC_EQ0 + N_EQ - 1)).HorizontalAlignment = xlCenter
    With ws.Range(ws.Cells(TI_HDR, 1), ws.Cells(lastFmt, TC_NOTE)).Borders
        .LineStyle = xlContinuous
        .Color = C_GRID
    End With
    TAddList ws.Range(ws.Cells(TI_FIRST, TC_LVL), ws.Cells(lastFmt, TC_LVL)), "대분류,작업"
    If TSheetExists(TS_TRADE) Then
        TAddList ws.Range(ws.Cells(TI_FIRST, TC_TRADE), ws.Cells(lastFmt, TC_TRADE)), "='" & TS_TRADE & "'!$A$3:$A$60"
    End If

    ' 예시 (구분|공종|작업내용|시작일|시작시각|작업시간|일수|관리|제관|비계|기계|배관|장비1|장비2|장비3)
    data = Array( _
        Array("대분류", "", "SD 준비", "", "", "", "", "", "", "", "", "", "", "", ""), _
        Array("작업", "기계", "가설 비계 설치", "2026-11-13", "8:00", "10", "", "1", "", "6", "", "", "", "", "1"), _
        Array("작업", "기계", "전원 차단 · LOTO", "2026-11-13", "18:00", "2", "", "1", "", "", "2", "", "", "", ""), _
        Array("대분류", "", "본 작업", "", "", "", "", "", "", "", "", "", "", "", ""), _
        Array("작업", "기계", "노체 냉각", "2026-11-13", "20:00", "14", "", "", "", "", "2", "", "", "", ""), _
        Array("작업", "기계", "트러니언 베어링 교체", "2026-11-14", "10:00", "20", "", "1", "2", "", "5", "", "1", "1", ""), _
        Array("작업", "기계", "랜스 교체", "2026-11-14", "14:00", "8", "", "", "", "", "3", "2", "", "1", ""), _
        Array("작업", "배관", "냉각수 배관 교체", "2026-11-14", "22:00", "12", "", "", "", "", "", "4", "", "", "1"), _
        Array("작업", "토목", "기초 보수", "2026-11-15", "", "", "1", "1", "3", "2", "", "", "", "", ""), _
        Array("대분류", "", "시운전", "", "", "", "", "", "", "", "", "", "", "", ""), _
        Array("작업", "기계", "시운전 · 승온", "2026-11-15", "16:00", "18", "", "1", "", "", "4", "1", "", "", ""))
    For i = LBound(data) To UBound(data)
        r = TI_FIRST + i
        ws.Cells(r, TC_LVL).Value = data(i)(0)
        If data(i)(1) <> "" Then ws.Cells(r, TC_TRADE).Value = data(i)(1)
        ws.Cells(r, TC_TEXT).Value = data(i)(2)
        If data(i)(3) <> "" Then ws.Cells(r, TC_DATE).Value = CDate(data(i)(3))
        If data(i)(4) <> "" Then ws.Cells(r, TC_TIME).Value = CDbl(TimeValue(data(i)(4)))
        If data(i)(5) <> "" Then ws.Cells(r, TC_HOURS).Value = CDbl(data(i)(5))
        If data(i)(6) <> "" Then ws.Cells(r, TC_DAYS).Value = CDbl(data(i)(6))
        For k = 1 To N_RES
            If data(i)(6 + k) <> "" Then ws.Cells(r, TResCol(k)).Value = CDbl(data(i)(6 + k))
        Next k
        If data(i)(0) = "대분류" Then
            ws.Range(ws.Cells(r, TC_LVL), ws.Cells(r, TC_LOW)).Interior.Color = C_CAT_ROW
            ws.Cells(r, TC_TEXT).Font.Bold = True
        Else
            ws.Cells(r, TC_TEXT).IndentLevel = 1
        End If
    Next i

    ws.Cells(1, TI_VER_COL).Value = 1
    ws.Cells(1, TI_VER_COL).Font.Color = RGB(255, 255, 255)

    TDeleteButtons ws
    TAddButton ws, "시간공정표 생성", "BuildTimeChart", ws.Range("E1:G1")
    TAddButton ws, "메인으로", "GoToMain", ws.Range("H1:I1")

    ws.Activate
    ActiveWindow.DisplayGridlines = False
    ActiveWindow.FreezePanes = False
    ws.Cells(TI_FIRST, TC_LOW).Select
    ActiveWindow.FreezePanes = True
    TSetTabColor ws, RGB(197, 90, 17)
End Sub

Private Sub TCfgRow(ByVal ws As Worksheet, ByVal r As Long, ByVal lbl As String, ByVal v As String, ByVal note As String)
    With ws.Range(ws.Cells(r, 1), ws.Cells(r, 2))
        .Merge
        .Interior.Color = C_HDR
        .Font.Bold = True
        .HorizontalAlignment = xlLeft
    End With
    TSetText ws.Cells(r, 1), lbl
    If v <> "" Then ws.Cells(r, TI_VAL).Value = v
    ws.Cells(r, TI_VAL).Interior.Color = C_INPUT_BG
    ws.Cells(r, TI_VAL).HorizontalAlignment = xlCenter
    With ws.Range(ws.Cells(r, 1), ws.Cells(r, TI_VAL)).Borders
        .LineStyle = xlContinuous
        .Color = C_GRID
    End With
    If note <> "" Then
        TSetText ws.Cells(r, 4), note
        ws.Cells(r, 4).Font.Color = C_GRID_DARK
        ws.Cells(r, 4).Font.Size = 9
    End If
End Sub

Public Sub GoToTimeInput()
    If TSheetExists(TS_INPUT) Then ThisWorkbook.Worksheets(TS_INPUT).Activate
End Sub


'===================================================================
'  2. 시간공정표 그리기
'===================================================================
Public Sub BuildTimeChart()
    Dim ws As Worksheet
    If Not TSheetExists(TS_INPUT) Then
        TNotify "[시간입력] 시트가 없습니다. 먼저 SetupTimeSheets 를 실행하세요."
        Exit Sub
    End If
    On Error GoTo EH
    tBusy = True
    Application.EnableEvents = False
    Application.ScreenUpdating = False
    If Not TSheetExists(TS_CHART) Then
        Set ws = ThisWorkbook.Worksheets.Add(After:=ThisWorkbook.Worksheets(TS_INPUT))
        ws.Name = TS_CHART
        TSetTabColor ws, RGB(197, 90, 17)
    End If
    Set ws = ThisWorkbook.Worksheets(TS_CHART)
    ws.Activate
    If TRender(ws, True) Then ws.Range("A1").Select
    Application.ScreenUpdating = True
    Application.EnableEvents = True
    tBusy = False
    Exit Sub
EH:
    Application.ScreenUpdating = True
    Application.EnableEvents = True
    tBusy = False
    TNotify "시간공정표를 그리는 중 오류가 발생했습니다." & vbCrLf & Err.Number & " : " & Err.Description
End Sub

Private Function TRender(ByVal ws As Worksheet, ByVal interactive As Boolean) As Boolean
    Dim wsIn As Worksheet, nWarn As Long, r As Long, i As Long, lastBody As Long, lastRow As Long
    Dim title As String, dDay As Date, hasDDay As Boolean

    Set wsIn = ThisWorkbook.Worksheets(TS_INPUT)
    If TCellText(wsIn.Cells(TI_HDR, TC_LVL)) <> "구분" Or TCellText(wsIn.Cells(TI_HDR, TC_NOTE)) <> "비고" Then
        If interactive Then TNotify "[시간입력] 시트가 이전 양식(v0.8)입니다." & vbCrLf & _
            "내용을 따로 적어 두고 Alt+F8 → SetupTimeSheets 로 시간 시트를 새로 만든 뒤 다시 입력하세요."
        Exit Function
    End If
    TLoadHolidays
    TLoadTrades
    TReadSettings wsIn
    TReadTasks wsIn, nWarn
    If Not TSetRange(wsIn) Then
        TClearSheet ws
        TSetText ws.Range("A1"), "시간공정표"
        TSetText ws.Range("A2"), "※ [시간입력] 시트에 시작일과 작업시간(또는 일수)이 있는 작업이 없습니다."
        If interactive Then TNotify "그릴 작업이 없습니다." & vbCrLf & "[시간입력]에 시작일과 작업시간(또는 일수)을 입력하세요."
        TWriteMeta ws
        Exit Function
    End If
    If tSlots > MAX_SLOTS Then
        If interactive Then TNotify "표시 기간이 너무 깁니다 (" & tSlots & "칸)." & vbCrLf & _
                                   "[시간입력]의 '시간 칸'을 키우거나 표시 시작일·종료일을 지정하세요."
        Exit Function
    End If

    TClearSheet ws
    ws.Cells.Font.Name = "맑은 고딕"
    ws.Cells.Font.Size = 9
    tLastCol = TK_CHART0 + tSlots - 1

    ' 제목 / 정보
    title = Trim$(TCellText(wsIn.Cells(TI_TITLE, TI_VAL)))
    If title = "" Then title = "시간 공정표" Else title = title & " 시간 공정표"
    TSetText ws.Cells(TR_TITLE, 1), title
    ws.Cells(TR_TITLE, 1).Font.Size = 16
    ws.Cells(TR_TITLE, 1).Font.Bold = True
    ws.Rows(TR_TITLE).RowHeight = 28
    TSetText ws.Cells(TR_INFO, 1), "시간 칸 : " & tSlotH & "시간    기간 : " & Format(tDay0, "yyyy-mm-dd") & " ~ " & _
             Format(tDay0 + tDays - 1, "yyyy-mm-dd") & "    작성 : " & Format(Now, "yyyy-mm-dd hh:mm") & _
             "    (회색 칸 = 야간 18~06시)"
    ws.Cells(TR_INFO, 1).Font.Color = C_GRID_DARK
    TWriteMeta ws

    ' 열 너비
    ws.Columns(TK_LABEL).ColumnWidth = 26
    ws.Columns(TK_S).ColumnWidth = 10.5
    ws.Columns(TK_E).ColumnWidth = 10.5
    ws.Columns(TK_H).ColumnWidth = 6
    If tSlotH <= 2 Then
        ws.Range(ws.Columns(TK_CHART0), ws.Columns(tLastCol)).ColumnWidth = 2.9
    Else
        ws.Range(ws.Columns(TK_CHART0), ws.Columns(tLastCol)).ColumnWidth = 4
    End If

    hasDDay = TGetDDay(wsIn, dDay)
    TWriteHeader ws, dDay

    ' 본문
    r = TR_BODY
    For i = 1 To tN
        tOutRow(i) = r
        If tLvl(i) = 1 Then
            ws.Rows(r).RowHeight = 18
            TSetText ws.Cells(r, TK_LABEL), tText(i)
            With ws.Range(ws.Cells(r, TK_LABEL), ws.Cells(r, tLastCol))
                .Interior.Color = C_CAT_ROW
                .Font.Bold = True
                .VerticalAlignment = xlCenter
                .Borders(xlEdgeBottom).LineStyle = xlContinuous
                .Borders(xlEdgeBottom).Color = C_GRID_DARK
            End With
            r = r + 1
        Else
            ws.Rows(r).RowHeight = 16.5
            ws.Rows(r + 1).RowHeight = 12.75
            TMergeLeft ws, r, TK_LABEL, tText(i)
            ws.Cells(r, TK_LABEL).IndentLevel = 1
            ws.Cells(r, TK_LABEL).HorizontalAlignment = xlLeft
            If tHasBar(i) Then
                TMergeLeft ws, r, TK_S, TDateTimeText(tSD(i))
                TMergeLeft ws, r, TK_E, TDateTimeText(tED(i))
                TMergeLeft ws, r, TK_H, TDurText(tED(i) - tSD(i))
            Else
                TMergeLeft ws, r, TK_S, ""
                TMergeLeft ws, r, TK_E, ""
                TMergeLeft ws, r, TK_H, ""
            End If
            With ws.Range(ws.Cells(r + 1, TK_LABEL), ws.Cells(r + 1, tLastCol)).Borders(xlEdgeBottom)
                .LineStyle = xlContinuous
                .Color = C_GRID
            End With
            r = r + 2
        End If
    Next i
    lastBody = r - 1
    If lastBody < TR_BODY Then lastBody = TR_BODY

    TShadeNight ws, TR_BODY, lastBody
    ' 대분류 행은 야간 음영 위에 다시 칠함
    For i = 1 To tN
        If tLvl(i) = 1 Then ws.Range(ws.Cells(tOutRow(i), TK_LABEL), ws.Cells(tOutRow(i), tLastCol)).Interior.Color = C_CAT_ROW
    Next i

    lastRow = TDrawLoad(ws, lastBody + 2)
    TFormatGrid ws, lastBody, lastRow

    ' 바 (행 높이가 정해진 뒤 위치 계산)
    tShapeN = 0
    For i = 1 To tN
        If tLvl(i) = 2 And tHasBar(i) Then TDrawBar ws, i
    Next i

    TFinish ws, lastRow
    If interactive And nWarn > 0 Then
        TNotify "시간공정표를 그렸습니다." & vbCrLf & _
                "시작일 또는 작업시간(일수)이 없어 바를 그리지 못한 작업 : " & nWarn & "개"
    End If
    TRender = True
End Function

Private Sub TWriteMeta(ByVal ws As Worksheet)
    TSetText ws.Cells(TR_META, 1), TS_META
    ws.Cells(TR_META, 2).Value = TGetVersion()
    ws.Rows(TR_META).Hidden = True
End Sub

Private Sub TMergeLeft(ByVal ws As Worksheet, ByVal r As Long, ByVal c As Long, ByVal txt As String)
    With ws.Range(ws.Cells(r, c), ws.Cells(r + 1, c))
        .Merge
        .VerticalAlignment = xlCenter
        .HorizontalAlignment = xlCenter
        .ShrinkToFit = True
    End With
    TSetText ws.Cells(r, c), txt
End Sub

Private Sub TClearSheet(ByVal ws As Worksheet)
    Dim i As Long, lr As Long, lc As Long
    On Error Resume Next
    For i = ws.Shapes.Count To 1 Step -1
        ws.Shapes(i).Delete
    Next i
    On Error GoTo 0
    lr = ws.UsedRange.Row + ws.UsedRange.Rows.Count
    lc = ws.UsedRange.Column + ws.UsedRange.Columns.Count
    If lr < 60 Then lr = 60
    If lc < 60 Then lc = 60
    ws.Cells.UnMerge
    ws.Cells.Clear
    ws.Range(ws.Rows(1), ws.Rows(lr)).Hidden = False
    ws.Range(ws.Rows(1), ws.Rows(lr)).RowHeight = 15
    ws.Range(ws.Columns(1), ws.Columns(lc)).ColumnWidth = 8.43
End Sub

'--- 머리글 : D+n / 날짜(요일) / 시각 ---
Private Sub TWriteHeader(ByVal ws As Worksheet, ByVal dDay As Date)
    Dim k As Long, j As Long, c1 As Long, c2 As Long, dd As Date, n As Long, txt As String, kind As Integer
    Dim hh As Long, wd As Variant

    wd = Array("일", "월", "화", "수", "목", "금", "토")
    ws.Rows(TR_DDAY).RowHeight = 15
    ws.Rows(TR_DATE).RowHeight = 16.5
    ws.Rows(TR_HOUR).RowHeight = 14

    With ws.Range(ws.Cells(TR_DDAY, TK_LABEL), ws.Cells(TR_DDAY, TK_H))
        .Merge
        .HorizontalAlignment = xlRight
        .Font.Bold = True
        .Font.Color = C_SUN
    End With
    TSetText ws.Cells(TR_DDAY, TK_LABEL), "D-DAY (" & Month(dDay) & "/" & Day(dDay) & " = D+1) "
    TSetText ws.Cells(TR_DATE, TK_LABEL), "작업 내용"
    TSetText ws.Cells(TR_DATE, TK_S), "시작"
    TSetText ws.Cells(TR_DATE, TK_E), "종료"
    TSetText ws.Cells(TR_DATE, TK_H), "시간"
    For k = TK_LABEL To TK_H
        ws.Range(ws.Cells(TR_DATE, k), ws.Cells(TR_HOUR, k)).Merge
    Next k
    With ws.Range(ws.Cells(TR_DDAY, TK_LABEL), ws.Cells(TR_HOUR, TK_H))
        .Interior.Color = C_HDR
        .VerticalAlignment = xlCenter
    End With
    With ws.Range(ws.Cells(TR_DATE, TK_LABEL), ws.Cells(TR_HOUR, TK_H))
        .HorizontalAlignment = xlCenter
        .Font.Bold = True
    End With

    For k = 0 To tDays - 1
        dd = tDay0 + k
        c1 = TK_CHART0 + k * tSpd
        c2 = c1 + tSpd - 1
        ' D+n
        n = CLng(dd - dDay)
        If n >= 0 Then txt = "D+" & (n + 1) Else txt = "D" & n
        If c2 > c1 Then ws.Range(ws.Cells(TR_DDAY, c1), ws.Cells(TR_DDAY, c2)).Merge
        TSetText ws.Cells(TR_DDAY, c1), txt
        If dd = dDay Then ws.Cells(TR_DDAY, c1).Interior.Color = RGB(255, 255, 0)
        ' 날짜 (요일)
        If c2 > c1 Then ws.Range(ws.Cells(TR_DATE, c1), ws.Cells(TR_DATE, c2)).Merge
        TSetText ws.Cells(TR_DATE, c1), Month(dd) & "/" & Day(dd) & " (" & wd(Weekday(dd, vbSunday) - 1) & ")"
        kind = TDayKind(dd)
        If kind = 1 Then
            ws.Cells(TR_DATE, c1).Font.Color = C_SAT
        ElseIf kind = 2 Then
            ws.Cells(TR_DATE, c1).Font.Color = C_SUN
        End If
        If kind > 0 Then ws.Range(ws.Cells(TR_DATE, c1), ws.Cells(TR_DATE, c2)).Interior.Color = C_HOL_BG
        ' 시각
        For j = 0 To tSpd - 1
            hh = j * tSlotH
            TSetText ws.Cells(TR_HOUR, c1 + j), Format(hh, "00")
            If hh < 6 Or hh >= 18 Then ws.Cells(TR_HOUR, c1 + j).Interior.Color = C_NIGHT_HDR
        Next j
    Next k

    With ws.Range(ws.Cells(TR_DDAY, TK_CHART0), ws.Cells(TR_DDAY, tLastCol))
        .HorizontalAlignment = xlCenter
        .Font.Color = C_SUN
        .Font.Bold = True
        .Font.Size = 9
    End With
    With ws.Range(ws.Cells(TR_DATE, TK_CHART0), ws.Cells(TR_DATE, tLastCol))
        .HorizontalAlignment = xlCenter
        .Font.Bold = True
        .Font.Size = 10
    End With
    With ws.Range(ws.Cells(TR_HOUR, TK_CHART0), ws.Cells(TR_HOUR, tLastCol))
        .HorizontalAlignment = xlCenter
        .Font.Size = 7
        .Font.Color = RGB(64, 64, 64)
    End With
End Sub

' 야간(18~06시) 칸 옅은 회색
Private Sub TShadeNight(ByVal ws As Worksheet, ByVal r1 As Long, ByVal r2 As Long)
    Dim k As Long, j As Long, c As Long, hh As Long, runS As Long
    For k = 0 To tDays - 1
        runS = 0
        For j = 0 To tSpd
            If j < tSpd Then hh = j * tSlotH Else hh = 12
            c = TK_CHART0 + k * tSpd + j
            If hh < 6 Or hh >= 18 Then
                If runS = 0 Then runS = c
            ElseIf runS > 0 Then
                ws.Range(ws.Cells(r1, runS), ws.Cells(r2, c - 1)).Interior.Color = C_NIGHT_BODY
                runS = 0
            End If
        Next j
    Next k
End Sub

' 격자 : 시간 칸 점선, 날짜 경계 진한 실선
Private Sub TFormatGrid(ByVal ws As Worksheet, ByVal lastBody As Long, ByVal lastRow As Long)
    Dim k As Long, c1 As Long
    With ws.Range(ws.Cells(TR_HOUR, TK_CHART0), ws.Cells(lastBody, tLastCol)).Borders(xlInsideVertical)
        .LineStyle = xlDot
        .Color = C_GRID
    End With
    With ws.Range(ws.Cells(TR_DDAY, TK_LABEL), ws.Cells(TR_HOUR, tLastCol))
        .Borders(xlEdgeTop).LineStyle = xlContinuous
        .Borders(xlEdgeTop).Color = C_GRID_DARK
        .Borders(xlEdgeBottom).LineStyle = xlContinuous
        .Borders(xlEdgeBottom).Color = C_GRID_DARK
        .Borders(xlInsideHorizontal).LineStyle = xlContinuous
        .Borders(xlInsideHorizontal).Color = C_GRID
    End With
    With ws.Range(ws.Cells(TR_DDAY, TK_LABEL), ws.Cells(lastBody, TK_H))
        .Borders(xlInsideVertical).LineStyle = xlContinuous
        .Borders(xlInsideVertical).Color = C_GRID
        .Borders(xlEdgeLeft).LineStyle = xlContinuous
        .Borders(xlEdgeLeft).Color = C_GRID_DARK
    End With
    For k = 0 To tDays
        c1 = TK_CHART0 + k * tSpd
        If k = tDays Then
            With ws.Range(ws.Cells(TR_DDAY, c1 - 1), ws.Cells(lastRow, c1 - 1)).Borders(xlEdgeRight)
                .LineStyle = xlContinuous
                .Color = C_GRID_DARK
            End With
        Else
            With ws.Range(ws.Cells(TR_DDAY, c1), ws.Cells(lastRow, c1)).Borders(xlEdgeLeft)
                .LineStyle = xlContinuous
                .Color = C_GRID_DARK
            End With
        End If
    Next k
    With ws.Range(ws.Cells(lastBody, TK_LABEL), ws.Cells(lastBody, tLastCol)).Borders(xlEdgeBottom)
        .LineStyle = xlContinuous
        .Weight = xlMedium
        .Color = RGB(0, 0, 0)
    End With
End Sub

'--- 바 : 시작~종료를 분 단위로 정확히 (선 + 양 끝 원) ---
Private Sub TDrawBar(ByVal ws As Worksheet, ByVal i As Long)
    Dim r As Long, m1 As Long, m2 As Long, total As Long, clipL As Boolean, clipR As Boolean
    Dim x1 As Double, x2 As Double, y As Double, clr As Long, c1 As Long, shp As Shape, ok As Boolean

    r = tOutRow(i)
    total = tDays * 1440
    m1 = CLng((tSD(i) - CDbl(tDay0)) * 1440)
    m2 = CLng((tED(i) - CDbl(tDay0)) * 1440)
    If m2 <= 0 Or m1 >= total Then Exit Sub
    If m1 < 0 Then m1 = 0: clipL = True
    If m2 > total Then m2 = total: clipR = True

    clr = RGB(0, 0, 0)
    If LCase$(Trim$(TCellText(ThisWorkbook.Worksheets(TS_INPUT).Cells(TI_BARCLR, TI_VAL)))) = "공종색" Then
        clr = TTradeColor(tTrade(i))
    End If

    x1 = TMinuteX(ws, r, m1)
    x2 = TMinuteX(ws, r, m2)
    y = ws.Cells(r + 1, TK_CHART0).Top

    On Error Resume Next
    Set shp = ws.Shapes.AddLine(x1, y, x2, y)
    ok = (Err.Number = 0 And Not shp Is Nothing)
    On Error GoTo 0
    If ok Then
        tShapeN = tShapeN + 1
        On Error Resume Next
        shp.Name = "TC_L" & tShapeN
        shp.Line.ForeColor.RGB = clr
        shp.Line.Weight = 2.25
        shp.Placement = xlMoveAndSize
        On Error GoTo 0
    Else
        ' 선 도형을 못 그리면 칸 아래 테두리로
        With ws.Range(ws.Cells(r, TMinuteCol(m1)), ws.Cells(r, TMinuteCol(m2 - 1))).Borders(xlEdgeBottom)
            .LineStyle = xlContinuous
            .Weight = xlMedium
            .Color = clr
        End With
    End If
    If Not clipL Then TAddDot ws, x1, y, clr
    If Not clipR Then TAddDot ws, x2, y, clr

    ' 글자 : 바 시작 칸에서 오른쪽으로 (빈 칸으로 넘쳐 보임)
    c1 = TMinuteCol(m1)
    If tText(i) <> "" Then
        TSetText ws.Cells(r, c1), tText(i)
        With ws.Cells(r, c1)
            .HorizontalAlignment = xlLeft
            .IndentLevel = 1
            .VerticalAlignment = xlBottom
            .Font.Size = 9
            .WrapText = False
        End With
    End If
    If tLow(i) <> "" Then
        TSetText ws.Cells(r + 1, c1), tLow(i)
        With ws.Cells(r + 1, c1)
            .HorizontalAlignment = xlLeft
            .IndentLevel = 1
            .VerticalAlignment = xlTop
            .Font.Size = 8
            .Font.Color = RGB(89, 89, 89)
            .WrapText = False
        End With
    End If
End Sub

Private Function TMinuteCol(ByVal m As Long) As Long
    Dim c As Long
    c = TK_CHART0 + m \ tSlotMin
    If c > tLastCol Then c = tLastCol
    If c < TK_CHART0 Then c = TK_CHART0
    TMinuteCol = c
End Function

Private Function TMinuteX(ByVal ws As Worksheet, ByVal r As Long, ByVal m As Long) As Double
    Dim c As Long, frac As Double
    c = TK_CHART0 + m \ tSlotMin
    If c > tLastCol Then
        TMinuteX = ws.Cells(r, tLastCol).Left + ws.Cells(r, tLastCol).Width
        Exit Function
    End If
    frac = (m Mod tSlotMin) / tSlotMin
    TMinuteX = ws.Cells(r, c).Left + frac * ws.Cells(r, c).Width
End Function

Private Sub TAddDot(ByVal ws As Worksheet, ByVal x As Double, ByVal y As Double, ByVal clr As Long)
    Dim shp As Shape
    Set shp = ws.Shapes.AddShape(9, x - DOT_D / 2, y - DOT_D / 2, DOT_D, DOT_D)
    tShapeN = tShapeN + 1
    With shp
        .Name = "TC_O" & tShapeN
        .Fill.Visible = -1
        .Fill.Solid
        .Fill.ForeColor.RGB = RGB(255, 255, 255)
        .Line.Visible = -1
        .Line.ForeColor.RGB = clr
        .Line.Weight = 1.25
    End With
    On Error Resume Next
    shp.Placement = xlMoveAndSize
    shp.Shadow.Visible = 0
    On Error GoTo 0
End Sub


'===================================================================
'  3. 인원·장비 산적표 : 시간 칸마다 '동시에' 투입되는 최대 수
'===================================================================
Private Function TDrawLoad(ByVal ws As Worksheet, ByVal r0 As Long) As Long
    Dim pk() As Double, mh() As Double, j As Long, k As Long, r As Long, tot As Double
    Dim crewPk As Double, crewPkJ As Long, anyRes As Boolean, peak As Double, peakJ As Long

    ReDim pk(0 To N_RES, 0 To tSlots - 1)     ' 0 = 인원 합계
    ReDim mh(0 To tSlots - 1)                 ' 칸별 투입 인·시
    For j = 0 To tSlots - 1
        TSlotLoad j, pk, mh
    Next j

    ws.Rows(r0 - 1).RowHeight = 9
    r = r0
    TSetText ws.Cells(r, TK_LABEL), "인원·장비 투입 산적표"
    With ws.Range(ws.Cells(r, TK_LABEL), ws.Cells(r, tLastCol))
        .Interior.Color = C_LOAD_HDR
        .Font.Bold = True
        .VerticalAlignment = xlCenter
        .Borders(xlEdgeTop).LineStyle = xlContinuous
        .Borders(xlEdgeTop).Color = C_GRID_DARK
        .Borders(xlEdgeBottom).LineStyle = xlContinuous
        .Borders(xlEdgeBottom).Color = C_GRID_DARK
    End With
    TSetText ws.Cells(r, TK_S), "같은 시간에 투입되는 인원·장비 (막대 위 숫자 = 바뀌는 시점의 투입 수)"
    ws.Cells(r, TK_S).Font.Bold = False
    ws.Cells(r, TK_S).Font.Size = 8
    ws.Cells(r, TK_S).Font.Color = C_GRID_DARK
    ws.Rows(r).RowHeight = 18
    r = r + 1

    ' 1) 인원 : 직종별 쌓은 막대
    crewPk = 0: crewPkJ = -1
    For j = 0 To tSlots - 1
        If pk(0, j) > crewPk Then crewPk = pk(0, j): crewPkJ = j
    Next j
    If crewPk > 0 Then
        anyRes = True
        r = TDrawCrew(ws, r, pk, crewPk, crewPkJ) + 1
    End If

    ' 2) 장비별 막대
    For k = N_CREW + 1 To N_RES
        peak = 0: peakJ = -1
        For j = 0 To tSlots - 1
            If pk(k, j) > peak Then peak = pk(k, j): peakJ = j
        Next j
        If tResName(k) <> "" And peak > 0 Then
            anyRes = True
            r = TDrawEquip(ws, r, k, pk, peak, peakJ) + 1
        End If
    Next k

    ' 3) 누적 공수 선그래프
    tot = 0
    For j = 0 To tSlots - 1
        tot = tot + mh(j)
    Next j
    If tot > 0 Then r = TDrawCumulative(ws, r, mh, tot) + 1

    If Not anyRes Then
        TSetText ws.Cells(r, TK_LABEL), "※ [시간입력]의 직종별 인원·장비 칸에 숫자를 넣으면 산적표가 그려집니다."
        ws.Cells(r, TK_LABEL).Font.Color = C_GRID_DARK
        r = r + 1
    End If
    TDrawLoad = r - 1
End Function

' 왼쪽 제목 칸 (A) 과 설명 칸 (B~D)
Private Sub TLoadLeft(ByVal ws As Worksheet, ByVal r1 As Long, ByVal r2 As Long, ByVal title As String, _
                      ByVal info As String)
    With ws.Range(ws.Cells(r1, TK_LABEL), ws.Cells(r2, TK_LABEL))
        .Merge
        .VerticalAlignment = xlCenter
        .HorizontalAlignment = xlLeft
        .IndentLevel = 1
        .WrapText = True
        .Font.Bold = True
        .Font.Size = 10
    End With
    TSetText ws.Cells(r1, TK_LABEL), title
    If info <> "" Then
        With ws.Range(ws.Cells(r1, TK_S), ws.Cells(r2, TK_H))
            .Merge
            .VerticalAlignment = xlCenter
            .HorizontalAlignment = xlLeft
            .WrapText = True
            .Font.Size = 8
        End With
        TSetText ws.Cells(r1, TK_S), info
    End If
End Sub

' 블록 아래 기준선 + 왼쪽 칸 테두리
Private Sub TLoadFrame(ByVal ws As Worksheet, ByVal r1 As Long, ByVal r2 As Long)
    With ws.Range(ws.Cells(r2, TK_CHART0), ws.Cells(r2, tLastCol)).Borders(xlEdgeBottom)
        .LineStyle = xlContinuous
        .Color = C_GRID_DARK
    End With
    With ws.Range(ws.Cells(r1, TK_LABEL), ws.Cells(r2, TK_H)).Borders
        .LineStyle = xlContinuous
        .Color = C_GRID
    End With
End Sub

' 막대 위 숫자 : 막대 위 빈칸을 세로로 합쳐 아래쪽에 표시
Private Sub TBarLabel(ByVal ws As Worksheet, ByVal rTop As Long, ByVal rBarTop As Long, ByVal c As Long, _
                      ByVal v As Double)
    Dim rr As Long
    rr = rBarTop - 1
    If rr < rTop Then rr = rTop
    If rr > rTop Then ws.Range(ws.Cells(rTop, c), ws.Cells(rr, c)).Merge
    ws.Cells(rTop, c).Value = v
    With ws.Range(ws.Cells(rTop, c), ws.Cells(rr, c))
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlBottom
        .Font.Size = 7
        .Font.Bold = True
        .NumberFormat = "General"
    End With
End Sub

Private Function TDrawCrew(ByVal ws As Worksheet, ByVal rb As Long, ByRef pk() As Double, _
                           ByVal crewPk As Double, ByVal crewPkJ As Long) As Long
    Dim rEnd As Long, j As Long, k As Long, c As Long, acc As Double, hPrev As Long, hNow As Long
    Dim used() As Boolean, nUsed As Long, idx As Long, rl As Long, kPk As Double, prevTot As Double

    rEnd = rb + CREW_ROWS                     ' rb = 숫자 줄, rb+1 ~ rEnd = 막대
    ws.Rows(rb).RowHeight = 12
    ws.Range(ws.Rows(rb + 1), ws.Rows(rEnd)).RowHeight = LOAD_ROW_H
    TLoadLeft ws, rb, rEnd, "인원 (명)" & vbLf & "최대 " & TNumText(crewPk) & "명" & vbLf & _
              "(" & TDateTimeText(CDbl(tDay0) + crewPkJ * tSlotMin / 1440#) & ")", ""

    ' 범례 : 직종 색 칸 + 최대
    ReDim used(1 To N_CREW)
    For k = 1 To N_CREW
        For j = 0 To tSlots - 1
            If tTypeUsed(k, pk, j) Then used(k) = True: Exit For
        Next j
    Next k
    With ws.Range(ws.Cells(rb, TK_S), ws.Cells(rb, TK_H))
        .Merge
        .HorizontalAlignment = xlLeft
        .Font.Size = 8
        .Font.Color = C_GRID_DARK
    End With
    TSetText ws.Cells(rb, TK_S), "직종 (칸별 최대)"
    idx = 0
    For k = 1 To N_CREW
        If used(k) Then
            rl = rb + 1 + idx * 2
            If rl + 1 <= rEnd Then
                kPk = 0
                For j = 0 To tSlots - 1
                    If pk(k, j) > kPk Then kPk = pk(k, j)
                Next j
                With ws.Range(ws.Cells(rl, TK_S), ws.Cells(rl + 1, TK_S))
                    .Merge
                    .Interior.Color = TResColor(k)
                    .Font.Color = RGB(255, 255, 255)
                    .Font.Bold = True
                    .Font.Size = 8
                    .HorizontalAlignment = xlCenter
                    .VerticalAlignment = xlCenter
                End With
                TSetText ws.Cells(rl, TK_S), tResName(k)
                With ws.Range(ws.Cells(rl, TK_E), ws.Cells(rl + 1, TK_H))
                    .Merge
                    .Font.Size = 8
                    .HorizontalAlignment = xlLeft
                    .VerticalAlignment = xlCenter
                End With
                TSetText ws.Cells(rl, TK_E), " " & TNumText(kPk) & "명"
            End If
            idx = idx + 1
        End If
    Next k

    ' 쌓은 막대 (아래부터 관리 → 제관 → 비계 → 기계 → 배관)
    prevTot = -1
    For j = 0 To tSlots - 1
        c = TK_CHART0 + j
        If pk(0, j) > 0 Then
            acc = 0: hPrev = 0
            For k = 1 To N_CREW
                If pk(k, j) > 0 Then
                    acc = acc + pk(k, j)
                    hNow = CLng(acc / crewPk * CREW_ROWS + 0.4999)
                    If hNow <= hPrev Then hNow = hPrev + 1
                    If hNow > CREW_ROWS Then hNow = CREW_ROWS
                    If hNow > hPrev Then
                        ws.Range(ws.Cells(rEnd - hNow + 1, c), ws.Cells(rEnd - hPrev, c)).Interior.Color = TResColor(k)
                        hPrev = hNow
                    End If
                End If
            Next k
            If pk(0, j) <> prevTot Then TBarLabel ws, rb, rEnd - hPrev + 1, c, pk(0, j)
        End If
        prevTot = pk(0, j)
    Next j
    TLoadFrame ws, rb, rEnd
    TDrawCrew = rEnd
End Function

Private Function tTypeUsed(ByVal k As Long, ByRef pk() As Double, ByVal j As Long) As Boolean
    tTypeUsed = (pk(k, j) > 0)
End Function

Private Function TDrawEquip(ByVal ws As Worksheet, ByVal rb As Long, ByVal k As Long, ByRef pk() As Double, _
                            ByVal peak As Double, ByVal peakJ As Long) As Long
    Dim rEnd As Long, j As Long, c As Long, h As Long, prevV As Double
    rEnd = rb + EQ_ROWS
    ws.Rows(rb).RowHeight = 12
    ws.Range(ws.Rows(rb + 1), ws.Rows(rEnd)).RowHeight = LOAD_ROW_H
    TLoadLeft ws, rb, rEnd, tResName(k) & " (대)", _
              "최대 " & TNumText(peak) & "대" & vbLf & "(" & TDateTimeText(CDbl(tDay0) + peakJ * tSlotMin / 1440#) & ")"
    ws.Cells(rb, TK_LABEL).Font.Color = TResColor(k)
    prevV = -1
    For j = 0 To tSlots - 1
        c = TK_CHART0 + j
        If pk(k, j) > 0 Then
            h = CLng(pk(k, j) / peak * EQ_ROWS + 0.4999)
            If h < 1 Then h = 1
            ws.Range(ws.Cells(rEnd - h + 1, c), ws.Cells(rEnd, c)).Interior.Color = TResColor(k)
            If pk(k, j) <> prevV Then TBarLabel ws, rb, rEnd - h + 1, c, pk(k, j)
        End If
        prevV = pk(k, j)
    Next j
    TLoadFrame ws, rb, rEnd
    TDrawEquip = rEnd
End Function

' 누적 공수 선그래프 : 칸 끝마다 누적값, 하루 끝마다 점 + 숫자
Private Function TDrawCumulative(ByVal ws As Worksheet, ByVal rb As Long, ByRef mh() As Double, _
                                 ByVal tot As Double) As Long
    Dim rEnd As Long, rAx As Long, j As Long, c As Long, cum As Double, totG As Double
    Dim yTop As Double, yBot As Double, x0 As Double, y0 As Double, x1 As Double, y1 As Double
    Dim px() As Double, py() As Double, nP As Long, i As Long, shp As Shape, clr As Long, slope0 As Double, slope1 As Double

    rEnd = rb + CUM_ROWS
    rAx = rEnd + 1
    totG = tot / tGongsuH
    clr = RGB(192, 0, 0)
    ws.Rows(rb).RowHeight = 8
    ws.Range(ws.Rows(rb + 1), ws.Rows(rEnd)).RowHeight = LOAD_ROW_H
    ws.Rows(rAx).RowHeight = 13
    TLoadLeft ws, rb, rAx, "누적 공수", "총 " & TNumText(Round(totG, 1)) & "공수" & vbLf & _
              "(" & TNumText(Round(tot, 1)) & " 인·시 ÷ " & TNumText(tGongsuH) & "h)"
    ws.Cells(rb, TK_LABEL).Font.Color = clr
    ' 50% / 100% 보조선
    With ws.Range(ws.Cells(rb + 1, TK_CHART0), ws.Cells(rb + 1, tLastCol)).Borders(xlEdgeTop)
        .LineStyle = xlDot
        .Color = C_GRID
    End With
    With ws.Range(ws.Cells(rb + 1 + CUM_ROWS \ 2, TK_CHART0), ws.Cells(rb + 1 + CUM_ROWS \ 2, tLastCol)).Borders(xlEdgeTop)
        .LineStyle = xlDot
        .Color = C_GRID
    End With
    With ws.Range(ws.Cells(rAx, TK_CHART0), ws.Cells(rAx, tLastCol))
        .Font.Size = 7
        .Font.Color = clr
        .Font.Bold = True
    End With

    yTop = ws.Cells(rb + 1, TK_CHART0).Top
    yBot = ws.Cells(rAx, TK_CHART0).Top
    ' 점 목록 (기울기가 같은 구간은 합침)
    ReDim px(0 To tSlots): ReDim py(0 To tSlots)
    nP = 0
    px(0) = ws.Cells(rb, TK_CHART0).Left: py(0) = yBot
    cum = 0
    slope0 = -1
    For j = 0 To tSlots - 1
        c = TK_CHART0 + j
        cum = cum + mh(j)
        slope1 = mh(j)
        x1 = ws.Cells(rb, c).Left + ws.Cells(rb, c).Width
        y1 = yBot - (cum / tot) * (yBot - yTop)
        If slope1 = slope0 And nP > 0 Then
            px(nP) = x1: py(nP) = y1
        Else
            nP = nP + 1
            px(nP) = x1: py(nP) = y1
        End If
        slope0 = slope1
        ' 하루 끝 : 점 + 누적 공수
        If (j + 1) Mod tSpd = 0 And cum > 0 Then
            TSetText ws.Cells(rAx, c), TNumText(Round(cum / tGongsuH, 1))
            ws.Cells(rAx, c).HorizontalAlignment = xlRight
            TAddMark ws, x1, y1, clr
            ' 다음 칸부터 다시 시작 (점 위치를 꺾임점으로 남김)
            slope0 = -1
        End If
    Next j
    For i = 1 To nP
        On Error Resume Next
        Set shp = Nothing
        Set shp = ws.Shapes.AddLine(px(i - 1), py(i - 1), px(i), py(i))
        If Not shp Is Nothing Then
            tShapeN = tShapeN + 1
            shp.Name = "TC_C" & tShapeN
            shp.Line.ForeColor.RGB = clr
            shp.Line.Weight = 2
            shp.Placement = xlMoveAndSize
        End If
        On Error GoTo 0
    Next i
    TLoadFrame ws, rb, rEnd
    With ws.Range(ws.Cells(rb, TK_LABEL), ws.Cells(rAx, TK_H)).Borders
        .LineStyle = xlContinuous
        .Color = C_GRID
    End With
    TDrawCumulative = rAx
End Function

Private Sub TAddMark(ByVal ws As Worksheet, ByVal x As Double, ByVal y As Double, ByVal clr As Long)
    Dim shp As Shape
    On Error Resume Next
    Set shp = ws.Shapes.AddShape(9, x - 2.5, y - 2.5, 5, 5)
    If shp Is Nothing Then Exit Sub
    tShapeN = tShapeN + 1
    shp.Name = "TC_M" & tShapeN
    shp.Fill.Visible = -1
    shp.Fill.Solid
    shp.Fill.ForeColor.RGB = clr
    shp.Line.Visible = 0
    shp.Placement = xlMoveAndSize
    shp.Shadow.Visible = 0
    On Error GoTo 0
End Sub

' 한 시간 칸 안에서 동시에 투입되는 최대 수 (칸 시작 + 칸 안에서 시작하는 작업 시점마다 합계)
' 시간 칸 하나 : 인원(직종별)은 합계가 가장 많은 시점의 구성, 장비는 각각 최대, 투입 인·시
Private Sub TSlotLoad(ByVal j As Long, ByRef pk() As Double, ByRef mh() As Double)
    Dim a As Double, b As Double, i As Long, p As Long, k As Long, nP As Long
    Dim pts() As Double, s As Double, sm(0 To 8) As Double, ov As Double, crew As Double
    a = CDbl(tDay0) + j * tSlotMin / 1440#
    b = a + tSlotMin / 1440#
    ReDim pts(1 To tN + 1)
    nP = 1
    pts(1) = a
    For i = 1 To tN
        If tLvl(i) = 2 And tHasBar(i) Then
            If tSD(i) > a + 0.0000001 And tSD(i) < b - 0.0000001 Then
                nP = nP + 1
                pts(nP) = tSD(i)
            End If
            ' 칸 안에서 겹치는 시간 × 인원 = 인·시
            ov = TMinD(tED(i), b) - TMaxD(tSD(i), a)
            If ov > 0 Then
                crew = 0
                For k = 1 To N_CREW
                    crew = crew + tRes(i, k)
                Next k
                mh(j) = mh(j) + crew * ov * 24#
            End If
        End If
    Next i
    For p = 1 To nP
        For k = 0 To N_RES
            sm(k) = 0
        Next k
        s = pts(p)
        For i = 1 To tN
            If tLvl(i) = 2 And tHasBar(i) Then
                If tSD(i) <= s + 0.0000001 And tED(i) > s + 0.0000001 Then
                    For k = 1 To N_RES
                        sm(k) = sm(k) + tRes(i, k)
                    Next k
                End If
            End If
        Next i
        For k = 1 To N_CREW
            sm(0) = sm(0) + sm(k)
        Next k
        If sm(0) > pk(0, j) Then
            For k = 0 To N_CREW
                pk(k, j) = sm(k)
            Next k
        End If
        For k = N_CREW + 1 To N_RES
            If sm(k) > pk(k, j) Then pk(k, j) = sm(k)
        Next k
    Next p
End Sub

Private Function TMinD(ByVal x As Double, ByVal y As Double) As Double
    If x < y Then TMinD = x Else TMinD = y
End Function

Private Function TMaxD(ByVal x As Double, ByVal y As Double) As Double
    If x > y Then TMaxD = x Else TMaxD = y
End Function

Private Sub TFinish(ByVal ws As Worksheet, ByVal lastRow As Long)
    ws.Activate
    ActiveWindow.DisplayGridlines = False
    ActiveWindow.FreezePanes = False
    ws.Cells(TR_BODY, TK_CHART0).Select
    ActiveWindow.FreezePanes = True
    TDeleteButtons ws
    TAddButton ws, "시간입력으로", "GoToTimeInput", ws.Range(ws.Cells(TR_INFO, TK_E), ws.Cells(TR_INFO, TK_H))

    On Error Resume Next
    Application.PrintCommunication = False
    With ws.PageSetup
        .PrintArea = ws.Range(ws.Cells(TR_TITLE, TK_LABEL), ws.Cells(lastRow, tLastCol)).Address
        .Orientation = xlLandscape
        .PaperSize = xlPaperA3
        .Zoom = False
        .FitToPagesWide = 1
        .FitToPagesTall = False
        .PrintTitleRows = "$" & TR_DDAY & ":$" & TR_HOUR
        .PrintTitleColumns = "$A:$D"
        .LeftMargin = Application.InchesToPoints(0.3)
        .RightMargin = Application.InchesToPoints(0.3)
        .TopMargin = Application.InchesToPoints(0.4)
        .BottomMargin = Application.InchesToPoints(0.4)
        .CenterHorizontally = True
    End With
    Application.PrintCommunication = True
    On Error GoTo 0
End Sub


'===================================================================
'  4. 시간입력 읽기
'===================================================================
Private Sub TReadSettings(ByVal wsIn As Worksheet)
    Dim k As Long
    tSlotH = CLng(Val(TCellText(wsIn.Cells(TI_SLOT, TI_VAL))))
    Select Case tSlotH
        Case 1, 2, 3, 4, 6, 8, 12
        Case Else: tSlotH = 2
    End Select
    tSlotMin = tSlotH * 60
    tSpd = 24 \ tSlotH
    For k = 1 To N_RES
        tResName(k) = Trim$(TCellText(wsIn.Cells(TI_HDR, TResCol(k))))
    Next k
    If Not TToNum(wsIn.Cells(TI_GONGSU, TI_VAL).Value, tGongsuH) Then tGongsuH = 8
End Sub

' 인원·장비 k (1~5 직종, 6~8 장비) 의 시간입력 열
Private Function TResCol(ByVal k As Long) As Long
    If k <= N_CREW Then TResCol = TC_CREW0 + k - 1 Else TResCol = TC_EQ0 + k - N_CREW - 1
End Function

' 산적표 색 : 관리 회색 / 제관 주황 / 비계 초록 / 기계 파랑 / 배관 보라 / 장비 노랑·청록·갈색
Private Function TResColor(ByVal k As Long) As Long
    Select Case k
        Case 1: TResColor = RGB(127, 127, 127)
        Case 2: TResColor = RGB(237, 125, 49)
        Case 3: TResColor = RGB(112, 173, 71)
        Case 4: TResColor = RGB(68, 114, 196)
        Case 5: TResColor = RGB(153, 102, 204)
        Case 6: TResColor = RGB(214, 160, 0)
        Case 7: TResColor = RGB(0, 150, 170)
        Case Else: TResColor = RGB(166, 90, 50)
    End Select
End Function

Private Sub TReadTasks(ByVal wsIn As Worksheet, ByRef nWarn As Long)
    Dim lastRow As Long, r As Long, cap As Long, lv As String, txt As String, k As Long
    Dim d As Double, t As Double, hrs As Double, dys As Double, hasD As Boolean, hasT As Boolean
    Dim st As Double, en As Double, ok As Boolean, v As Double

    lastRow = TLastInputRow(wsIn)
    cap = lastRow - TI_FIRST + 1
    If cap < 1 Then cap = 1
    tN = 0
    ReDim tLvl(1 To cap): ReDim tText(1 To cap): ReDim tLow(1 To cap): ReDim tTrade(1 To cap)
    ReDim tHasBar(1 To cap): ReDim tSD(1 To cap): ReDim tED(1 To cap)
    ReDim tRes(1 To cap, 1 To N_RES): ReDim tOutRow(1 To cap)
    nWarn = 0

    For r = TI_FIRST To lastRow
        lv = Replace(Trim$(TCellText(wsIn.Cells(r, TC_LVL))), " ", "")
        txt = Trim$(TCellText(wsIn.Cells(r, TC_TEXT)))
        hasD = TToDateTime(wsIn.Cells(r, TC_DATE).Value, d)
        If txt = "" And Not hasD And lv = "" Then GoTo NextRow
        tN = tN + 1
        tText(tN) = txt
        tTrade(tN) = Trim$(TCellText(wsIn.Cells(r, TC_TRADE)))
        If lv = "대분류" Then
            tLvl(tN) = 1
            GoTo NextRow
        End If
        tLvl(tN) = 2
        tLow(tN) = Trim$(TCellText(wsIn.Cells(r, TC_LOW)))
        For k = 1 To N_RES
            If TToNum(wsIn.Cells(r, TResCol(k)).Value, v) Then tRes(tN, k) = v
        Next k
        If tLow(tN) = "" Then tLow(tN) = TResText(tN)

        ok = False
        If hasD Then
            hasT = TToTime(wsIn.Cells(r, TC_TIME).Value, t)
            If hasT Then st = Int(d) + t Else st = d
            If TToNum(wsIn.Cells(r, TC_HOURS).Value, hrs) Then
                en = st + hrs / 24#
                ok = (hrs > 0)
            ElseIf TToNum(wsIn.Cells(r, TC_DAYS).Value, dys) Then
                en = st + dys
                ok = (dys > 0)
            End If
        End If
        If ok Then
            tHasBar(tN) = True
            tSD(tN) = TRoundMin(st)
            tED(tN) = TRoundMin(en)
        Else
            nWarn = nWarn + 1
        End If
NextRow:
    Next r
End Sub

' 하단표기가 비었을 때 : "6명 · 50t 크레인 1"
' 하단표기가 비었을 때 : "7명 · 고소작업차 1"
Private Function TResText(ByVal i As Long) As String
    Dim k As Long, s As String, crew As Double
    For k = 1 To N_CREW
        crew = crew + tRes(i, k)
    Next k
    If crew > 0 Then s = TNumText(crew) & "명"
    For k = N_CREW + 1 To N_RES
        If tRes(i, k) > 0 And tResName(k) <> "" Then
            If s <> "" Then s = s & " · "
            s = s & tResName(k) & " " & TNumText(tRes(i, k))
        End If
    Next k
    TResText = s
End Function

' 표시 기간 (하루 단위로 맞춤)
Private Function TSetRange(ByVal wsIn As Worksheet) As Boolean
    Dim i As Long, mn As Double, mx As Double, found As Boolean, d As Double, lastDay As Double
    For i = 1 To tN
        If tLvl(i) = 2 And tHasBar(i) Then
            If Not found Then
                mn = tSD(i): mx = tED(i): found = True
            Else
                If tSD(i) < mn Then mn = tSD(i)
                If tED(i) > mx Then mx = tED(i)
            End If
        End If
    Next i
    If Not found Then Exit Function
    If TToDateTime(wsIn.Cells(TI_FROM, TI_VAL).Value, d) Then tDay0 = CDate(Int(d)) Else tDay0 = CDate(Int(mn))
    If TToDateTime(wsIn.Cells(TI_TO, TI_VAL).Value, d) Then
        lastDay = Int(d)
    Else
        lastDay = Int(mx - 0.0000001)
    End If
    If lastDay < CDbl(tDay0) Then lastDay = CDbl(tDay0)
    tDays = CLng(lastDay - CDbl(tDay0)) + 1
    tSlots = tDays * tSpd
    TSetRange = True
End Function

Private Function TGetDDay(ByVal wsIn As Worksheet, ByRef dDay As Date) As Boolean
    Dim d As Double
    If TToDateTime(wsIn.Cells(TI_DDAY, TI_VAL).Value, d) Then
        dDay = CDate(Int(d)): TGetDDay = True: Exit Function
    End If
    If TSheetExists(TS_MAIN) Then
        If TToDateTime(ThisWorkbook.Worksheets(TS_MAIN).Cells(14, 3).Value, d) Then
            dDay = CDate(Int(d)): TGetDDay = True: Exit Function
        End If
    End If
    dDay = tDay0
End Function

Private Function TLastInputRow(ByVal wsIn As Worksheet) As Long
    Dim c As Variant, r As Long, mx As Long
    mx = TI_FIRST - 1
    For Each c In Array(TC_LVL, TC_TEXT, TC_DATE)
        r = wsIn.Cells(wsIn.Rows.Count, CLng(c)).End(xlUp).Row
        If r > mx Then mx = r
    Next c
    TLastInputRow = mx
End Function


'===================================================================
'  5. 자동 다시 그리기 (ThisWorkbook 이벤트)
'===================================================================
Public Sub OnTimeSheetChange(ByVal Sh As Object, ByVal Target As Range)
    Dim r As Long, lastFmt As Long
    If tBusy Then Exit Sub
    On Error GoTo EH
    If Sh.Name = TS_INPUT Then
        ' 미리 넣어 둔 행보다 아래에 입력하면 종료 수식 추가
        lastFmt = TI_FIRST + TI_ROWS - 1
        For r = Target.Row To Target.Row + Target.Rows.Count - 1
            If r > lastFmt And r < lastFmt + 2000 Then
                If Not wsHasFormula(Sh.Cells(r, TC_END)) Then
                    tBusy = True
                    Application.EnableEvents = False
                    Sh.Cells(r, TC_END).FormulaR1C1 = TC_END_FORMULA
                    Sh.Cells(r, TC_END).NumberFormat = "m\/d hh:mm"
                    Application.EnableEvents = True
                    tBusy = False
                End If
            End If
        Next r
        TFixTimeCells Sh, Target
        TFormatLevelRows Sh, Target
        TBumpVersion
    ElseIf Sh.Name = TS_HOL Or Sh.Name = TS_TRADE Then
        If TSheetExists(TS_INPUT) Then TBumpVersion
    End If
    Exit Sub
EH:
    tBusy = False
    Application.EnableEvents = True
End Sub

Public Sub OnTimeSheetActivate(ByVal Sh As Object)
    If tBusy Then Exit Sub
    On Error GoTo EH
    If Sh.Name <> TS_CHART Then Exit Sub
    If Not TSheetExists(TS_INPUT) Then Exit Sub
    If TCellText(Sh.Cells(TR_META, 1)) <> TS_META Then Exit Sub
    If Val(TCellText(Sh.Cells(TR_META, 2))) = TGetVersion() Then Exit Sub
    tBusy = True
    Application.EnableEvents = False
    Application.ScreenUpdating = False
    TRender Sh, False
    Application.ScreenUpdating = True
    Application.EnableEvents = True
    tBusy = False
    Exit Sub
EH:
    Application.ScreenUpdating = True
    Application.EnableEvents = True
    tBusy = False
    TNotify "시간공정표 자동 반영 중 오류가 발생했습니다." & vbCrLf & Err.Number & " : " & Err.Description
End Sub

' 구분 칸을 바꾸면 그 행 모양 : 대분류 = 파란 바탕 굵게 / 작업 = 들여쓰기
Private Sub TFormatLevelRows(ByVal Sh As Object, ByVal Target As Range)
    Dim rng As Range, cell As Range, r As Long
    Set rng = Intersect(Target, Sh.Columns(TC_LVL))
    If rng Is Nothing Then Exit Sub
    If rng.Cells.Count > 500 Then Exit Sub
    tBusy = True
    Application.EnableEvents = False
    For Each cell In rng.Cells
        r = cell.Row
        If r >= TI_FIRST Then
            If Replace(Trim$(TCellText(cell)), " ", "") = "대분류" Then
                Sh.Range(Sh.Cells(r, TC_LVL), Sh.Cells(r, TC_LOW)).Interior.Color = C_CAT_ROW
                Sh.Cells(r, TC_TEXT).Font.Bold = True
                Sh.Cells(r, TC_TEXT).IndentLevel = 0
            Else
                Sh.Range(Sh.Cells(r, TC_LVL), Sh.Cells(r, TC_LOW)).Interior.ColorIndex = xlNone
                Sh.Cells(r, TC_TEXT).Font.Bold = False
                Sh.Cells(r, TC_TEXT).IndentLevel = 1
            End If
        End If
    Next cell
    Application.EnableEvents = True
    tBusy = False
End Sub

' 시작시각 칸에 14 / 8.5 처럼 숫자로 넣으면 14:00 / 08:30 으로 바꿈
Private Sub TFixTimeCells(ByVal Sh As Object, ByVal Target As Range)
    Dim rng As Range, cell As Range, v As Variant
    Set rng = Intersect(Target, Sh.Columns(TC_TIME))
    If rng Is Nothing Then Exit Sub
    If rng.Cells.Count > 500 Then Exit Sub
    For Each cell In rng.Cells
        If cell.Row >= TI_FIRST Then
            v = cell.Value
            If Not IsError(v) And Not IsEmpty(v) Then
                If VarType(v) <> vbString Then
                    If CDbl(v) >= 1 And CDbl(v) <= 24 Then
                        tBusy = True
                        Application.EnableEvents = False
                        cell.Value = CDbl(v) / 24#
                        Application.EnableEvents = True
                        tBusy = False
                    End If
                End If
            End If
        End If
    Next cell
End Sub

Private Function wsHasFormula(ByVal cell As Range) As Boolean
    On Error Resume Next
    wsHasFormula = cell.HasFormula
End Function

Private Function TGetVersion() As Long
    If Not TSheetExists(TS_INPUT) Then Exit Function
    TGetVersion = CLng(Val(TCellText(ThisWorkbook.Worksheets(TS_INPUT).Cells(1, TI_VER_COL))))
End Function

Private Sub TBumpVersion()
    Dim ws As Worksheet, wasBusy As Boolean
    Set ws = ThisWorkbook.Worksheets(TS_INPUT)
    wasBusy = tBusy
    tBusy = True
    Application.EnableEvents = False
    ws.Cells(1, TI_VER_COL).Value = TGetVersion() + 1
    Application.EnableEvents = True
    tBusy = wasBusy
End Sub


'===================================================================
'  6. 공휴일 / 공종
'===================================================================
Private Sub TLoadHolidays()
    Dim ws As Worksheet, r As Long, lastRow As Long, d As Double
    tHolN = 0
    ReDim tHol(1 To 1)
    If Not TSheetExists(TS_HOL) Then Exit Sub
    Set ws = ThisWorkbook.Worksheets(TS_HOL)
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
    If lastRow < 3 Then Exit Sub
    ReDim tHol(1 To lastRow)
    For r = 3 To lastRow
        If TToDateTime(ws.Cells(r, 1).Value, d) Then
            tHolN = tHolN + 1
            tHol(tHolN) = CDate(Int(d))
        End If
    Next r
End Sub

Private Function TDayKind(ByVal d As Date) As Integer
    Dim i As Long
    For i = 1 To tHolN
        If tHol(i) = d Then TDayKind = 2: Exit Function
    Next i
    Select Case Weekday(d, vbSunday)
        Case vbSunday: TDayKind = 2
        Case vbSaturday: TDayKind = 1
    End Select
End Function

Private Sub TLoadTrades()
    Dim ws As Worksheet, r As Long, lastRow As Long, nm As String
    tTrN = 0
    ReDim tTrName(1 To 1): ReDim tTrColor(1 To 1)
    If Not TSheetExists(TS_TRADE) Then Exit Sub
    Set ws = ThisWorkbook.Worksheets(TS_TRADE)
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
    If lastRow < 3 Then Exit Sub
    ReDim tTrName(1 To lastRow): ReDim tTrColor(1 To lastRow)
    For r = 3 To lastRow
        nm = Trim$(TCellText(ws.Cells(r, 1)))
        If nm <> "" Then
            tTrN = tTrN + 1
            tTrName(tTrN) = nm
            tTrColor(tTrN) = ws.Cells(r, 2).Interior.Color
        End If
    Next r
End Sub

Private Function TTradeColor(ByVal nm As String) As Long
    Dim i As Long
    For i = 1 To tTrN
        If tTrName(i) = nm Then TTradeColor = tTrColor(i): Exit Function
    Next i
End Function


'===================================================================
'  7. 도우미
'===================================================================
Private Sub TNotify(ByVal msg As String)
    If gQuiet Then
        gLog = gLog & msg & vbCrLf
    Else
        MsgBox msg, vbInformation, "시간공정표"
    End If
End Sub

Private Function TSheetExists(ByVal nm As String) As Boolean
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = ThisWorkbook.Worksheets(nm)
    On Error GoTo 0
    TSheetExists = Not ws Is Nothing
End Function

Private Function TCellText(ByVal cell As Range) As String
    Dim v As Variant
    v = cell.Value
    If IsError(v) Or IsEmpty(v) Then Exit Function
    TCellText = CStr(v)
End Function

Private Sub TSetText(ByVal cell As Range, ByVal txt As String)
    cell.NumberFormat = "@"
    cell.Value = txt
End Sub

' 날짜(+시각) : 날짜 / 일련번호 / "2026-11-13" / "2026.11.13 08:00"
Private Function TToDateTime(ByVal v As Variant, ByRef d As Double) As Boolean
    Dim s As String
    If IsError(v) Or IsEmpty(v) Then Exit Function
    If VarType(v) = vbString Then
        s = Replace(Trim$(v), ".", "-")
        If s = "" Or Not IsDate(s) Then Exit Function
        d = CDbl(CDate(s))
    ElseIf IsDate(v) Then
        d = CDbl(CDate(v))
    ElseIf IsNumeric(v) Then
        d = CDbl(v)
    Else
        Exit Function
    End If
    If d < 32874 Or d > 73051 Then Exit Function   ' 1990 ~ 2100
    TToDateTime = True
End Function

' 시각 : 11:00 (시간 값) / 11 (시) / "11:30" / "1130"
Private Function TToTime(ByVal v As Variant, ByRef t As Double) As Boolean
    Dim s As String, x As Double
    If IsError(v) Or IsEmpty(v) Then Exit Function
    If VarType(v) = vbString Then
        s = Trim$(v)
        If s = "" Then Exit Function
        If InStr(s, ":") > 0 Then
            If Not IsDate(s) Then Exit Function
            t = CDbl(TimeValue(s))
            TToTime = True
            Exit Function
        End If
        If Not IsNumeric(s) Then Exit Function
        x = CDbl(s)
        If x >= 100 And x <= 2400 Then x = (x \ 100) + (x Mod 100) / 60
    ElseIf VarType(v) = vbDate Or IsNumeric(v) Then
        x = CDbl(v)                      ' 시각 서식 칸에 14 를 넣으면 날짜형 14 로 읽힘
    Else
        Exit Function
    End If
    If x < 0 Then Exit Function
    If x < 1 Then
        t = x
    ElseIf x <= 24 Then
        t = x / 24#                      ' 14 → 14시
    Else
        t = x - Int(x)                   ' 날짜+시각
    End If
    TToTime = True
End Function

Private Function TToNum(ByVal v As Variant, ByRef x As Double) As Boolean
    If IsError(v) Or IsEmpty(v) Then Exit Function
    If VarType(v) = vbString Then
        If Trim$(v) = "" Or Not IsNumeric(Trim$(v)) Then Exit Function
        x = CDbl(Trim$(v))
    ElseIf IsNumeric(v) Then
        x = CDbl(v)
    Else
        Exit Function
    End If
    TToNum = (x > 0)
End Function

Private Function TRoundMin(ByVal d As Double) As Double
    TRoundMin = CDbl(CLng(d * 1440#)) / 1440#
End Function

Private Function TDateTimeText(ByVal d As Double) As String
    Dim m As Long, dd As Date
    m = CLng((d - Int(d)) * 1440#)
    dd = CDate(Int(d))
    If m >= 1440 Then dd = dd + 1: m = m - 1440
    TDateTimeText = Month(dd) & "/" & Day(dd) & " " & Format(m \ 60, "00") & ":" & Format(m Mod 60, "00")
End Function

Private Function TDurText(ByVal x As Double) As String
    Dim h As Double
    h = CDbl(CLng(x * 1440#)) / 60#
    If h >= 24 And (h - 24 * Int(h / 24)) = 0 Then
        TDurText = CStr(CLng(h / 24)) & "일"
    Else
        TDurText = TNumText(h) & "h"
    End If
End Function

Private Function TNumText(ByVal x As Double) As String
    If x = Int(x) Then
        TNumText = CStr(CLng(x))
    Else
        TNumText = Format(x, "0.0")
    End If
End Function

Private Sub TSetTabColor(ByVal ws As Worksheet, ByVal clr As Long)
    On Error Resume Next
    ws.Tab.Color = clr
    On Error GoTo 0
End Sub

Private Sub TAddList(ByVal cell As Range, ByVal list As String)
    On Error Resume Next
    With cell.Validation
        .Delete
        .Add Type:=xlValidateList, AlertStyle:=xlValidAlertStop, Operator:=xlBetween, Formula1:=list
        .InCellDropdown = True
    End With
    On Error GoTo 0
End Sub

Private Sub TAddButton(ByVal ws As Worksheet, ByVal caption As String, ByVal macro As String, ByVal rng As Range)
    Dim b As Object
    On Error Resume Next
    Set b = ws.Buttons.Add(rng.Left, rng.Top, rng.Width, rng.Height)
    If b Is Nothing Then Exit Sub
    b.Name = "btn_" & macro
    b.OnAction = macro
    b.Caption = caption
    b.Font.Size = 11
    b.Font.Bold = True
    b.PrintObject = False
    On Error GoTo 0
End Sub

Private Sub TDeleteButtons(ByVal ws As Worksheet)
    Dim i As Long
    On Error Resume Next
    For i = ws.Shapes.Count To 1 Step -1
        If Left$(ws.Shapes(i).Name, 4) = "btn_" Then ws.Shapes(i).Delete
    Next i
    On Error GoTo 0
End Sub
