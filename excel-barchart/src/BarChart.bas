Attribute VB_Name = "BarChart"
'===================================================================
'  BAR CHART(바차트) 공정표 자동 작성 모듈            v0.6.2 (초안)
'-------------------------------------------------------------------
'  [시트 구성]
'    메인      : 표시 단위(일/주/10일/월), 기간, 기준일, D-DAY, 바 색상 등 설정 + 버튼
'    작업입력  : 구분(대분류/작업항목/세부작업) / 공종 / 작업내용 / 시작일 / 기간 / 종료일(수식)
'                + 오른쪽 공종색 간트차트 (조건부 서식)
'    공종      : 공종 이름과 색
'    주요일정  : 바차트 날짜 아래 ▼ 로 표시할 주요 이벤트
'    공휴일    : 빨간 날짜로 표시할 공휴일 목록
'    바차트_X  : [바차트 생성] 시 그려지는 보고용 시트 (X = 단위)
'
'  [매크로]
'    SetupWorkbook   : 최초 1회 - 위 시트와 버튼 생성
'    BuildChart      : 작업입력 내용으로 바차트 시트 생성
'    CollapseDetails : 세부작업 행 숨기기 (작업항목 줄에 바만 남김)
'    ExpandDetails   : 세부작업 행 펼치기
'    AddEvent        : 주요 이벤트 추가 (날짜 / 내용 / 색상)
'    RefreshInputSheet : 작업입력 간트 색·들여쓰기 다시 적용
'    ImportFromOldFile : 이전 버전 파일의 작업입력·설정 가져오기 (이전 양식 자동 변환)
'    OnSheetChange / OnSheetActivate : ThisWorkbook 이벤트에서 호출
'                      (바차트 왼쪽 칸 수정 → 작업입력 반영 후 다시 그림)
'===================================================================
Option Explicit

' 테스트 등 메시지 상자를 띄우지 않을 때 True (메시지는 gLog 에 쌓임)
Public gQuiet As Boolean
Public gLog As String

' 매크로가 시트를 고치는 중이면 True (변경 이벤트 무시)
Private gBusy As Boolean
' 요약 날짜가 다시 계산된 작업입력 행 (",5,9,") : 간트 막대 글자 갱신 대상
Private mLblDirty As String

'--- 시트 이름 ---
Private Const SH_MAIN As String = "메인"
Private Const SH_INPUT As String = "작업입력"
Private Const SH_HOL As String = "공휴일"
Private Const SH_CHART_PREFIX As String = "바차트_"
Private Const SH_START As String = "시작"   ' 배포용 xlsm 의 안내 시트 (초기 설정 후 삭제)
Private Const SH_TRADE As String = "공종"   ' 공종 이름과 색
Private Const SH_EVT As String = "주요일정" ' 주요 이벤트 (날짜 아래 ▼ 표시)

'--- 표시 단위 ---
Private Const UNIT_DAY As String = "일"
Private Const UNIT_WEEK As String = "주"
Private Const UNIT_10D As String = "10일"
Private Const UNIT_MONTH As String = "월"

'--- 메인 시트 설정 셀 (C열) ---
Private Const CFG_COL As Long = 3
Private Const CFG_TITLE As Long = 5
Private Const CFG_UNIT As Long = 6
Private Const CFG_START As Long = 7
Private Const CFG_END As Long = 8
Private Const CFG_BASE As Long = 9
Private Const CFG_DETAIL As Long = 10
Private Const CFG_DATECOLS As Long = 11
Private Const CFG_COLWIDTH As Long = 12
Private Const CFG_LABELSIZE As Long = 13
Private Const CFG_DDAY As Long = 14     ' D-DAY 기준일 (SD 착수일 등)
Private Const CFG_BARCOLOR As Long = 15 ' 바 색상 : 검정 / 공종색
Private Const CFG_EVENTS As Long = 16   ' 주요 이벤트 : 표시 / 숨김
Private Const CFG_LAST As Long = 16     ' 마지막 설정 행

'--- 작업입력 시트 열 ---
Private Const IN_HDR_ROW As Long = 4
Private Const IN_FIRST_ROW As Long = 5
Private Const IN_LVL As Long = 1      ' A 구분 (대분류 / 작업항목 / 세부작업)
Private Const IN_TRADE As Long = 2    ' B 공종
Private Const IN_TEXT As Long = 3     ' C 작업내용 (선 위 표기)
Private Const IN_LOW As Long = 4      ' D 하단표기 (선 아래 표기)
Private Const IN_S As Long = 5        ' E 시작일
Private Const IN_DUR As Long = 6      ' F 기간(일)
Private Const IN_E As Long = 7        ' G 종료일 (수식)
Private Const IN_NOTE As Long = 8     ' H 비고
Private Const IN_TRADE_EFF As Long = 9 ' I 적용 공종 (숨김, 위 단계에서 물려받은 공종)
Private Const IN_SUMFLAG As Long = 10  ' J 요약 표시 (숨김, "S" = 아래 작업 범위로 날짜 자동 계산된 행)
Private Const IN_GANTT0 As Long = 12  ' L~ 작업입력 간트차트 (1일 = 1열, K열은 간격)
Private Const IN_GANTT_DAYS As Long = 400
Private Const IN_MONTH_ROW As Long = 2 ' 간트 머리글 : 월
Private Const IN_DAY_ROW As Long = 3   '               일 (날짜 값)
Private Const IN_WD_ROW As Long = 4    '               요일 (작업입력 표 머리글과 같은 행)
Private Const LVL_CAT As String = "대분류"
Private Const LVL_ITEM As String = "작업항목"
Private Const LVL_DET As String = "세부작업"
Private Const IN_FORMULA_ROWS As Long = 500   ' 종료일 수식을 미리 넣어 둘 행 수
Private Const NEW_ROWS_MAX As Long = 500      ' 바차트 표 아래에 새 작업을 입력할 수 있는 행 수
Private Const NEW_HINT As String = "↓ 새 작업 입력 :  이름 → 세부작업,  - 이름 → 작업항목,  * 이름 → 대분류   (시작일·기간도 함께 입력)"

' 종료일 = 시작일 + 기간 - 1
'   작업입력 : E 시작일, F 기간, G 종료일      바차트 : B 시작일, C 종료일, D 기간
Private Const IN_END_FORMULA As String = "=IF(OR(RC[-2]="""",RC[-1]=""""),"""",RC[-2]+RC[-1]-1)"
Private Const END_FORMULA As String = "=IF(OR(RC[-1]="""",RC[1]=""""),"""",RC[-1]+RC[1]-1)"

'--- 공휴일 시트 ---
Private Const HOL_FIRST_ROW As Long = 3

'--- 바차트 시트 배치 ---
Private Const CH_TITLE As Long = 1
Private Const CH_INFO As Long = 2
Private Const META_ROW As Long = 3    ' 숨김 행: 시트 정보 (태그/단위/버전/행정보 열)
Private Const META_TAG As String = "BCMETA"
Private Const VER_ROW As Long = 1     ' 메인 시트의 숨김 칸(Z1) : 입력 변경 횟수
Private Const VER_COL As Long = 26
Private Const CH_DDAY As Long = 4     ' D-DAY (기준일 없으면 숨김)
Private Const CH_HDR1 As Long = 5     ' 년/월
Private Const CH_HDR2 As Long = 6     ' 일 / 주 시작일 / 상중하순 / 월
Private Const CH_HDR3 As Long = 7     ' 요일 / n주 / 날짜범위
Private Const CH_EV1L As Long = 8     ' 주요 이벤트 윗단 : 내용
Private Const CH_EV1A As Long = 9     '                  : ▼ + 날짜
Private Const CH_EV2L As Long = 10    ' 주요 이벤트 아랫단 : 내용
Private Const CH_EV2A As Long = 11    '                    : ▼ + 날짜
Private Const CH_BODY As Long = 12
Private Const COL_LABEL As Long = 1   ' A 구분
Private Const COL_S As Long = 2       ' B 시작일
Private Const COL_E As Long = 3       ' C 종료일
Private Const COL_D As Long = 4       ' D 기간
Private Const COL_CHART0 As Long = 5  ' E~ 날짜 칸

Private Const ROW_CAT_H As Single = 20     ' 대분류 행 높이
Private Const ROW_UP_H As Single = 16.5    ' 바 윗줄(선 위) 행 높이
Private Const ROW_LOW_H As Single = 12.75  ' 바 아랫줄(선 아래) 행 높이
Private Const CIRCLE_D As Single = 8       ' 시작/종료 원 지름(pt)
Private Const MIN_LABEL_FONT As Single = 6 ' 바 글자 최소 크기
Private Const LABEL_PAD As Single = 10     ' 왼쪽 정렬 글자의 원/들여쓰기 여유(pt)
Private Const SHAPE_OVAL As Long = 9       ' msoShapeOval (Office 참조 없이 쓰기 위해 숫자로)
Private Const MSO_TRUE As Long = -1
Private Const MSO_FALSE As Long = 0
Private Const MAX_DAYS As Long = 4000      ' 날짜 칸 최대 (약 11년)

'--- 색상 ---
Private Const CLR_SAT As Long = 12611584       ' RGB(0,112,192)  토요일 파랑
Private Const CLR_SUN As Long = 255            ' RGB(255,0,0)    일요일/공휴일 빨강
Private Const CLR_HOLIDAY_BG As Long = 13431551 ' RGB(255,242,204) 주말/공휴일 배경
Private Const CLR_HDR_LEFT As Long = 15652797  ' RGB(189,215,238) 구분 머리글
Private Const CLR_BAND1 As Long = 14348258     ' RGB(226,239,218) 월 구분 띠(연두)
Private Const CLR_BAND2 As Long = 15917529     ' RGB(217,225,242) 월 구분 띠(하늘)
Private Const CLR_GRID As Long = 12566463      ' RGB(191,191,191)
Private Const CLR_GRID_DARK As Long = 8421504  ' RGB(128,128,128)
Private Const CLR_DETAIL_TXT As Long = 5855577 ' RGB(89,89,89)
Private Const CLR_INPUT_BG As Long = 13434879  ' RGB(255,255,204)
Private Const CLR_ERR_BG As Long = 13421823    ' RGB(255,204,204)
Private Const CLR_EVENT_BG As Long = 14281213  ' RGB(253,233,217) 주요 이벤트 칸
Private Const CLR_CAT_ROW As Long = 16247773   ' RGB(221,235,247) 작업입력 대분류 행
Private Const CLR_NO_TRADE As Long = 10921638  ' RGB(166,166,166) 공종 없는 간트 막대

'--- 작업 데이터 ---
Private mN As Long
Private mCat() As String
Private mItem() As String
Private mDet() As String
Private mLow() As String
Private mStart() As Date
Private mEnd() As Date
Private mHas() As Boolean
Private mRow() As Long                ' 작업입력 시트의 행 번호
Private mDurV() As Long               ' 기간만 입력된 경우의 기간 (시작일 없을 때 표시용)
Private mTrade() As String            ' 적용 공종 (비어 있으면 위 단계 공종)

'--- 공종 (이름 / 색) ---
Private mTrN As Long
Private mTrName() As String
Private mTrColor() As Long

'--- 날짜 칸 : 단위와 관계없이 1일 = 1열, 머리글만 주/10일/월로 묶음 ---
Private mUnit As String
Private mDay0 As Date                 ' 첫 날짜 칸
Private mDays As Long                 ' 날짜 칸 수
Private mPN As Long                   ' 머리글 기간(주/10일/월) 수
Private mPS() As Date
Private mPE() As Date

'--- 공휴일 ---
Private mHolN As Long
Private mHol() As Date

'--- 바(선) 목록: 행 배치가 끝난 뒤 한꺼번에 그림 ---
Private mSegN As Long
Private mSegR() As Long
Private mSegS() As Date
Private mSegE() As Date
Private mSegTop() As String
Private mSegBot() As String
Private mSegClr() As Long             ' 선/원 색 (검정 또는 공종색)

'--- 행 블록(구분선용) ---
Private mBlkN As Long
Private mBlkR() As Long

Private mCircleN As Long
Private mBarByTrade As Boolean        ' 바 선 색을 공종색으로
Private mHdrFirst As Long             ' 보이는 머리글 첫 행 (D-DAY 있으면 4행)
Private mHdrLast As Long              ' 보이는 머리글 마지막 행 (주요 이벤트 포함)
Private Const LAYOUT_VER As String = "2"  ' 바차트 시트 배치 버전 (바뀌면 틀 고정/인쇄 설정 다시)


'===================================================================
'  1. 바차트 생성
'===================================================================
Public Sub BuildChart()
    If Not SheetExists(SH_MAIN) Or Not SheetExists(SH_INPUT) Then
        Notify "메인/작업입력 시트가 없습니다." & vbCrLf & _
               "먼저 매크로 [SetupWorkbook] 을 실행해 주세요."
        Exit Sub
    End If
    Application.EnableEvents = True          ' 혹시 꺼져 있던 자동 반영 다시 켜기
    RefreshInputSheet                        ' 작업입력 간트 색 규칙도 최신 공종으로
    RenderChart NormalizeUnit(CfgText(CFG_UNIT)), True
End Sub

' unit 단위의 바차트 시트를 그림. 시트가 이미 있으면 그 자리에서 다시 그림
' (화면 위치, 선택 셀, 세부작업 접힘 상태 유지)
Private Function RenderChart(ByVal unit As String, ByVal interactive As Boolean) As Boolean
    Dim wsMain As Worksheet, wsIn As Worksheet, ws As Worksheet
    Dim chartS As Date, chartE As Date, baseD As Date
    Dim hasBase As Boolean, autoS As Boolean, autoE As Boolean
    Dim minD As Date, maxD As Date, anyDate As Boolean
    Dim nWarn As Long, i As Long, lastRow As Long, lastCol As Long
    Dim title As String, colW As Double, nm As String
    Dim isNew As Boolean, wasActive As Boolean, collapsed As Boolean
    Dim scrRow As Long, scrCol As Long, selAddr As String
    Dim evOld As Boolean, hasDDay As Boolean, dDay As Date, needFinish As Boolean

    If Not SheetExists(SH_MAIN) Or Not SheetExists(SH_INPUT) Then Exit Function
    Set wsMain = ThisWorkbook.Worksheets(SH_MAIN)
    Set wsIn = ThisWorkbook.Worksheets(SH_INPUT)

    evOld = Application.EnableEvents
    gBusy = True
    Application.EnableEvents = False
    On Error GoTo EH
    Application.ScreenUpdating = False          ' 작업입력 보완 계산부터 화면·계산 멈춤
    Application.Calculation = xlCalculationManual

    '--- 설정 읽기 ---
    mUnit = unit
    title = CfgText(CFG_TITLE)
    autoS = Not ToDate(wsMain.Cells(CFG_START, CFG_COL).Value, chartS)
    autoE = Not ToDate(wsMain.Cells(CFG_END, CFG_COL).Value, chartE)
    hasBase = ToDate(wsMain.Cells(CFG_BASE, CFG_COL).Value, baseD)
    colW = Val(CfgText(CFG_COLWIDTH))

    LoadHolidays
    LoadTrades
    mBarByTrade = (CfgText(CFG_BARCOLOR) = "공종색")
    hasDDay = ToDate(wsMain.Cells(CFG_DDAY, CFG_COL).Value, dDay)
    If Not LoadTasks(wsIn, nWarn) Then
        If interactive Then Notify "작업입력 시트에 입력된 작업이 없습니다."
        GoTo Done
    End If
    ' 바차트에서 고친 날짜가 작업입력 간트 글자에도 반영되도록
    If Not interactive Then
        If Not RefreshInputGantt(wsIn, False) Then RefreshGanttLabels wsIn
    End If

    '--- 차트 기간 결정 ---
    For i = 1 To mN
        If mHas(i) Then
            If Not anyDate Then
                minD = mStart(i): maxD = mEnd(i): anyDate = True
            Else
                If mStart(i) < minD Then minD = mStart(i)
                If mEnd(i) > maxD Then maxD = mEnd(i)
            End If
        End If
    Next i
    If Not anyDate Then
        minD = Date: maxD = Date + 30
    End If
    If autoS Then
        chartS = minD
        If mUnit = UNIT_DAY Then chartS = chartS - (Weekday(chartS, vbMonday) - 1)
    End If
    If autoE Then
        chartE = maxD
        If mUnit = UNIT_DAY Then chartE = chartE + (7 - Weekday(chartE, vbMonday))
    End If
    If chartE < chartS Then
        Notify "차트 종료일이 시작일보다 빠릅니다. 메인 시트 설정을 확인해 주세요."
        GoTo Done
    End If
    If Not BuildPeriods(chartS, chartE) Then
        Notify "표시 기간이 너무 깁니다(" & MAX_DAYS & "일 초과)." & vbCrLf & _
               "메인 시트의 차트 시작일/종료일을 확인해 주세요."
        GoTo Done
    End If

    Application.ScreenUpdating = False
    Application.Calculation = xlCalculationManual

    '--- 시트 준비 (있으면 비우고, 없으면 새로) ---
    nm = SH_CHART_PREFIX & mUnit
    If SheetExists(nm) Then
        Set ws = ThisWorkbook.Worksheets(nm)
        wasActive = (ActiveSheet.Name = ws.Name)
        If wasActive Then
            On Error Resume Next
            scrRow = ActiveWindow.ScrollRow
            scrCol = ActiveWindow.ScrollColumn
            selAddr = ActiveCell.Address
            On Error GoTo EH
        End If
        collapsed = IsCollapsed(ws)
        needFinish = (CStr(ws.Cells(META_ROW, 5).Value) <> LAYOUT_VER)   ' 이전 버전 배치
        ClearChartSheet ws
    Else
        Set ws = ThisWorkbook.Worksheets.Add(After:=ThisWorkbook.Worksheets(ThisWorkbook.Worksheets.Count))
        ws.Name = nm
        isNew = True
        collapsed = (CfgText(CFG_DETAIL) = "접힘")
    End If

    mSegN = 0: mBlkN = 0: mCircleN = 0
    lastCol = COL_CHART0 + mDays - 1

    ws.Cells.Font.Name = "맑은 고딕"
    ws.Cells.Font.Size = 9
    ws.Cells.VerticalAlignment = xlCenter

    '--- 열 너비 ---
    ws.Columns(COL_LABEL).ColumnWidth = 24
    ws.Columns(COL_S).ColumnWidth = 8
    ws.Columns(COL_E).ColumnWidth = 8
    ws.Columns(COL_D).ColumnWidth = 5.5
    If colW <= 0 Then colW = DefaultColWidth()
    ws.Range(ws.Columns(COL_CHART0), ws.Columns(lastCol)).ColumnWidth = colW / UnitDays()

    '--- 제목 / 머리글 / 본문 행 배치 ---
    WriteTitle ws, title, hasBase, baseD
    WriteHeader ws, lastCol
    WriteDDay ws, hasDDay, dDay
    DrawEvents ws, lastCol, (CfgText(CFG_EVENTS) <> "숨김")
    If mBarByTrade Then WriteLegend ws
    lastRow = LayoutBody(ws, lastCol + 2)
    If lastRow < CH_BODY Then lastRow = CH_BODY
    ' 표 바로 아래 : 마감 행(아주 낮은 행, 굵은 아래 테두리) → 세부작업을 접어도 표 아래 굵은 선 유지
    ws.Rows(lastRow + 1).RowHeight = 2
    ' 그 아래 : 새 작업 입력 안내 행 (이 행이나 그 아래 빈 행에 입력하면 작업 추가, 인쇄 안 됨)
    SetText ws.Cells(lastRow + 2, COL_LABEL), NEW_HINT
    With ws.Cells(lastRow + 2, COL_LABEL).Font
        .Color = CLR_GRID_DARK
        .Italic = True
    End With
    ws.Cells(lastRow + 2, lastCol + 2).Value = "N"
    WriteMeta ws, lastCol + 2

    '--- 서식 → 바 → 기준선 순서 (바가 점선 위에 덮이도록) ---
    FormatGrid ws, lastRow, lastCol
    For i = 1 To mSegN
        DrawSegment ws, mSegR(i), mSegS(i), mSegE(i), mSegClr(i)
    Next i
    DrawLabels ws, lastCol, LabelFontSize()
    If hasBase Then DrawBaseLine ws, baseD, lastRow

    If CfgText(CFG_DATECOLS) = "숨김" Then
        ws.Range(ws.Columns(COL_S), ws.Columns(COL_D)).Hidden = True
    End If
    On Error Resume Next
    ws.PageSetup.PrintArea = ws.Range(ws.Cells(CH_TITLE, COL_LABEL), ws.Cells(lastRow + 1, lastCol)).Address
    On Error GoTo EH

    If isNew Or needFinish Then
        FinishSheet ws
        ws.Range("A1").Select
    ElseIf wasActive Then
        On Error Resume Next
        ws.Range(selAddr).Select
        ActiveWindow.ScrollRow = scrRow
        ActiveWindow.ScrollColumn = scrCol
        On Error GoTo EH
    End If
    If collapsed Then ShowLevel ws, 1

    If interactive Then ws.Activate
    RenderChart = True

    If nWarn > 0 And interactive Then
        Notify "바차트를 생성했습니다." & vbCrLf & vbCrLf & _
               "※ 종료일이 시작일보다 빠른 작업 " & nWarn & "건은 제외했습니다." & vbCrLf & _
               "   (작업입력 시트에 빨간 배경으로 표시)"
    End If

Done:
    Application.Calculation = xlCalculationAutomatic
    Application.ScreenUpdating = True
    Application.EnableEvents = evOld
    gBusy = False
    Exit Function

EH:
    Application.Calculation = xlCalculationAutomatic
    Application.ScreenUpdating = True
    Application.EnableEvents = evOld
    gBusy = False
    Notify "바차트 생성 중 오류가 발생했습니다." & vbCrLf & Err.Number & " : " & Err.Description
End Function

' 기존 바차트 시트 비우기 (시트는 그대로 두어 위치/틀 고정/인쇄 설정 유지)
Private Sub ClearChartSheet(ByVal ws As Worksheet)
    Dim i As Long
    On Error Resume Next
    ws.Cells.ClearOutline
    On Error GoTo 0
    ws.Rows.Hidden = False
    ws.Columns.Hidden = False
    For i = ws.Shapes.Count To 1 Step -1
        ws.Shapes(i).Delete
    Next i
    ws.Cells.UnMerge
    ws.Cells.Clear
    ws.Rows.RowHeight = 15
    ws.Columns.ColumnWidth = 8.38
End Sub

' 세부작업 행이 접혀 있는지 (첫 세부작업 행이 숨겨져 있으면 접힘)
Private Function IsCollapsed(ByVal ws As Worksheet) As Boolean
    Dim mc As Long, r As Long, lastRow As Long
    mc = MetaCol(ws)
    If mc = 0 Then Exit Function
    lastRow = ws.Cells(ws.Rows.Count, mc).End(xlUp).Row
    For r = CH_BODY To lastRow
        If Left$(CStr(ws.Cells(r, mc).Value), 2) = "D|" Then
            IsCollapsed = ws.Rows(r).Hidden
            Exit Function
        End If
    Next r
End Function


'===================================================================
'  2. 세부작업 접기 / 펼치기
'===================================================================
Public Sub CollapseDetails()
    SetDetailLevel 1
End Sub

Public Sub ExpandDetails()
    SetDetailLevel 2
End Sub

Private Sub SetDetailLevel(ByVal lv As Integer)
    Dim ws As Worksheet, found As Boolean
    If IsChartSheet(ActiveSheet.Name) Then
        ShowLevel ActiveSheet, lv
        Exit Sub
    End If
    For Each ws In ThisWorkbook.Worksheets
        If IsChartSheet(ws.Name) Then
            ShowLevel ws, lv
            found = True
        End If
    Next ws
    If Not found Then Notify "바차트 시트가 없습니다. 먼저 [바차트 생성]을 눌러 주세요."
End Sub

Private Sub ShowLevel(ByVal ws As Worksheet, ByVal lv As Integer)
    On Error Resume Next
    ws.Outline.ShowLevels RowLevels:=lv
    On Error GoTo 0
End Sub

Public Sub GoToInput()
    ThisWorkbook.Worksheets(SH_INPUT).Activate
End Sub

Public Sub GoToMain()
    ThisWorkbook.Worksheets(SH_MAIN).Activate
End Sub


'===================================================================
'  작업입력 읽기
'   - 한 행 = 한 작업. 구분(대분류/작업항목/세부작업)과 작업내용 한 칸으로 계층을 표현
'     (세부작업은 바로 위 작업항목, 작업항목은 바로 위 대분류에 속함)
'   - 공종이 비어 있으면 위 단계(작업항목 → 대분류)의 공종을 물려받음
'   - 시작일·기간 → 종료일(수식). 종료일을 직접 넣으면 기간을 다시 계산
'===================================================================
Private Function LoadTasks(ByVal wsIn As Worksheet, ByRef nWarn As Long) As Boolean
    Dim lastRow As Long, r As Long, cnt As Long, lvl As Integer
    Dim curCat As String, curItem As String, catTrade As String, itemTrade As String
    Dim vTxt As String, vLow As String, vTrade As String, effTrade As String
    Dim dS As Date, dE As Date, nDur As Long, ok As Boolean, res As Integer

    nWarn = 0
    mN = 0
    lastRow = LastInputRow(wsIn)
    If lastRow < IN_FIRST_ROW Then Exit Function
    RecalcInputHelpers wsIn

    cnt = lastRow - IN_FIRST_ROW + 1
    ReDim mCat(1 To cnt): ReDim mItem(1 To cnt): ReDim mDet(1 To cnt)
    ReDim mLow(1 To cnt): ReDim mStart(1 To cnt): ReDim mEnd(1 To cnt)
    ReDim mHas(1 To cnt): ReDim mRow(1 To cnt): ReDim mDurV(1 To cnt)
    ReDim mTrade(1 To cnt)

    For r = IN_FIRST_ROW To lastRow
        vTxt = Trim$(CellText(wsIn.Cells(r, IN_TEXT)))
        vLow = Trim$(CellText(wsIn.Cells(r, IN_LOW)))
        vTrade = Trim$(CellText(wsIn.Cells(r, IN_TRADE)))
        lvl = InputLevel(wsIn, r)

        If lvl > 0 Then
            '--- 날짜 보완 계산 (종료일은 수식으로 다시 넣음) ---
            res = FixInputDates(wsIn, r, dS, dE)
            ok = (res = 1)
            With wsIn.Range(wsIn.Cells(r, IN_LVL), wsIn.Cells(r, IN_NOTE)).Interior
                If res = -1 Then
                    .Color = CLR_ERR_BG
                    nWarn = nWarn + 1
                ElseIf .Color = CLR_ERR_BG Then
                    .Pattern = xlNone
                End If
            End With

            mN = mN + 1
            mLow(mN) = vLow
            mRow(mN) = r
            mHas(mN) = ok
            If ok Then mStart(mN) = dS: mEnd(mN) = dE
            If ToDuration(wsIn.Cells(r, IN_DUR).Value, nDur) Then mDurV(mN) = nDur

            Select Case lvl
                Case 1      ' 대분류 (자체 날짜는 바차트에 그리지 않음 : 아래 작업들의 범위를 표시)
                    If vTxt = "" Then vTxt = "(대분류)"
                    curCat = vTxt
                    curItem = ""
                    catTrade = vTrade
                    itemTrade = vTrade
                    effTrade = vTrade
                    mItem(mN) = ""
                    mDet(mN) = ""
                    mHas(mN) = False
                Case 2      ' 작업항목 (자체 날짜가 있으면 작업항목 줄에 직접 바, 요약 날짜면 바 없음)
                    If vTxt = "" Then vTxt = "(작업항목)"
                    If IsSummaryRow(wsIn, r) Then mHas(mN) = False: mDurV(mN) = 0
                    curItem = vTxt
                    If vTrade <> "" Then itemTrade = vTrade Else itemTrade = catTrade
                    effTrade = itemTrade
                    mItem(mN) = vTxt
                    mDet(mN) = ""
                Case Else   ' 세부작업
                    If vTxt = "" Then vTxt = "(세부작업)"
                    If vTrade <> "" Then effTrade = vTrade Else effTrade = itemTrade
                    If curItem = "" Then
                        ' 작업항목 없이 바로 세부작업 → 그 자체를 작업항목으로 표시
                        mItem(mN) = vTxt
                        mDet(mN) = ""
                    Else
                        mItem(mN) = curItem
                        mDet(mN) = vTxt
                    End If
            End Select
            If curCat = "" Then curCat = "(대분류 미입력)"
            mCat(mN) = curCat
            mTrade(mN) = effTrade
        End If
    Next r
    LoadTasks = (mN > 0)
End Function

' 행의 단계 : 1 대분류, 2 작업항목, 3 세부작업, 0 빈 행
' (구분이 비어 있어도 작업내용이나 날짜가 있으면 세부작업으로 봄)
Private Function InputLevel(ByVal wsIn As Worksheet, ByVal r As Long) As Integer
    Dim t As String, d As Date, n As Long
    t = Replace(Trim$(CellText(wsIn.Cells(r, IN_LVL))), " ", "")
    Select Case t
        Case LVL_CAT, "대", "1": InputLevel = 1
        Case LVL_ITEM, "중", "항목", "2": InputLevel = 2
        Case LVL_DET, "소", "세부", "3": InputLevel = 3
        Case Else
            If t <> "" Or Trim$(CellText(wsIn.Cells(r, IN_TEXT))) <> "" _
               Or ToDate(wsIn.Cells(r, IN_S).Value, d) Or ToDuration(wsIn.Cells(r, IN_DUR).Value, n) Then
                InputLevel = 3
            End If
    End Select
End Function

'작업입력 한 행의 시작일/종료일/기간을 맞춤
'   - 시작일 + 기간 → 종료일 (수식)
'   - 종료일을 직접 입력한 경우(수식 대신 값) → 기간을 다시 계산하고 종료일은 수식으로 되돌림
'   - 시작일만 있으면 기간 1일, 종료일+기간만 있으면 시작일 계산
' 반환 : 1 정상, 0 날짜 없음, -1 종료일이 시작일보다 빠름
Private Function FixInputDates(ByVal wsIn As Worksheet, ByVal r As Long, _
                               ByRef dS As Date, ByRef dE As Date) As Integer
    Dim hasS As Boolean, hasE As Boolean, hasDur As Boolean, nDur As Long
    Dim cE As Range
    Set cE = wsIn.Cells(r, IN_E)
    hasS = ToDate(wsIn.Cells(r, IN_S).Value, dS)
    hasDur = ToDuration(wsIn.Cells(r, IN_DUR).Value, nDur)
    If Not cE.HasFormula Then hasE = ToDate(cE.Value, dE)

    If hasS And hasE Then
        nDur = CLng(dE - dS) + 1
        If nDur < 1 Then
            FixInputDates = -1                    ' 사용자가 넣은 값을 그대로 둠
            Exit Function
        End If
    ElseIf hasS And hasDur Then
        ' 그대로
    ElseIf hasE And hasDur Then
        dS = dE - nDur + 1
        wsIn.Cells(r, IN_S).Value = dS
    ElseIf hasS Then
        nDur = 1
    ElseIf hasE Then
        dS = dE
        nDur = 1
        wsIn.Cells(r, IN_S).Value = dS
    Else
        If Not cE.HasFormula And IsEmpty(cE.Value) Then cE.FormulaR1C1 = IN_END_FORMULA
        Exit Function
    End If

    dE = dS + nDur - 1
    If CellText(wsIn.Cells(r, IN_DUR)) <> CStr(nDur) Then wsIn.Cells(r, IN_DUR).Value = nDur
    If Not cE.HasFormula Then cE.FormulaR1C1 = IN_END_FORMULA
    FixInputDates = 1
End Function

Private Sub LoadHolidays()
    Dim ws As Worksheet, r As Long, lastRow As Long, d As Date
    mHolN = 0
    ReDim mHol(1 To 1)
    If Not SheetExists(SH_HOL) Then Exit Sub
    Set ws = ThisWorkbook.Worksheets(SH_HOL)
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
    If lastRow < HOL_FIRST_ROW Then Exit Sub
    ReDim mHol(1 To lastRow - HOL_FIRST_ROW + 1)
    For r = HOL_FIRST_ROW To lastRow
        If ToDate(ws.Cells(r, 1).Value, d) Then
            mHolN = mHolN + 1
            mHol(mHolN) = d
        End If
    Next r
End Sub


'===================================================================
'  기간 칸(열) 만들기
'===================================================================
Private Function BuildPeriods(ByVal chartS As Date, ByVal chartE As Date) As Boolean
    Dim d As Date
    mPN = 0
    ReDim mPS(1 To 64): ReDim mPE(1 To 64)
    d = PeriodStart(chartS)
    Do While d <= chartE
        mPN = mPN + 1
        If mPN > MAX_DAYS Then Exit Function
        If mPN > UBound(mPS) Then
            ReDim Preserve mPS(1 To UBound(mPS) * 2)
            ReDim Preserve mPE(1 To UBound(mPE) * 2)
        End If
        mPS(mPN) = d
        mPE(mPN) = PeriodEnd(d)
        d = mPE(mPN) + 1
    Loop
    If mPN = 0 Then Exit Function
    mDay0 = mPS(1)
    mDays = CLng(mPE(mPN) - mDay0) + 1
    BuildPeriods = (mDays <= MAX_DAYS)
End Function

Private Function PeriodStart(ByVal d As Date) As Date
    Select Case mUnit
        Case UNIT_WEEK
            PeriodStart = d - (Weekday(d, vbMonday) - 1)
        Case UNIT_10D
            If Day(d) <= 10 Then
                PeriodStart = DateSerial(Year(d), Month(d), 1)
            ElseIf Day(d) <= 20 Then
                PeriodStart = DateSerial(Year(d), Month(d), 11)
            Else
                PeriodStart = DateSerial(Year(d), Month(d), 21)
            End If
        Case UNIT_MONTH
            PeriodStart = DateSerial(Year(d), Month(d), 1)
        Case Else
            PeriodStart = d
    End Select
End Function

Private Function PeriodEnd(ByVal ps As Date) As Date
    Select Case mUnit
        Case UNIT_WEEK
            PeriodEnd = ps + 6
        Case UNIT_10D
            If Day(ps) = 21 Then
                PeriodEnd = DateSerial(Year(ps), Month(ps) + 1, 0)
            Else
                PeriodEnd = ps + 9
            End If
        Case UNIT_MONTH
            PeriodEnd = DateSerial(Year(ps), Month(ps) + 1, 0)
        Case Else
            PeriodEnd = ps
    End Select
End Function

' 날짜의 열 번호
Private Function DateToCol(ByVal d As Date) As Long
    DateToCol = COL_CHART0 + CLng(d - mDay0)
End Function

' 머리글 윗줄 묶음 키 : 년*100+월 (월 단위는 년). 주는 목요일이 속한 월 기준
Private Function GroupKey(ByVal ps As Date) As Long
    Select Case mUnit
        Case UNIT_MONTH: GroupKey = Year(ps)
        Case UNIT_WEEK: GroupKey = Year(ps + 3) * 100 + Month(ps + 3)
        Case Else: GroupKey = Year(ps) * 100 + Month(ps)
    End Select
End Function

' 기간 한 칸의 기준 일수 (날짜 열 너비 = 칸 너비 / 일수)
Private Function UnitDays() As Double
    Select Case mUnit
        Case UNIT_WEEK: UnitDays = 7
        Case UNIT_10D: UnitDays = 10
        Case UNIT_MONTH: UnitDays = 30.4
        Case Else: UnitDays = 1
    End Select
End Function

' 기간 한 칸(일/주/10일/월)의 기본 너비
Private Function DefaultColWidth() As Double
    Select Case mUnit
        Case UNIT_DAY: DefaultColWidth = 3.6
        Case UNIT_WEEK: DefaultColWidth = 6.3
        Case UNIT_10D: DefaultColWidth = 7
        Case UNIT_MONTH: DefaultColWidth = 9
    End Select
End Function

' 0 = 평일, 1 = 토요일, 2 = 일요일/공휴일
Private Function DayKind(ByVal d As Date) As Integer
    Dim i As Long
    For i = 1 To mHolN
        If mHol(i) = d Then DayKind = 2: Exit Function
    Next i
    Select Case Weekday(d, vbSunday)
        Case vbSunday: DayKind = 2
        Case vbSaturday: DayKind = 1
        Case Else: DayKind = 0
    End Select
End Function


'===================================================================
'  제목 / 머리글
'===================================================================
Private Sub WriteTitle(ByVal ws As Worksheet, ByVal title As String, _
                       ByVal hasBase As Boolean, ByVal baseD As Date)
    Dim info As String
    If title = "" Then title = "공정표" Else title = title & " 공정표"
    SetText ws.Cells(CH_TITLE, COL_LABEL), title
    With ws.Cells(CH_TITLE, COL_LABEL).Font
        .Size = 16
        .Bold = True
    End With
    ws.Rows(CH_TITLE).RowHeight = 28

    info = "표시 단위 : " & mUnit & "    기간 : " & Format(mPS(1), "yyyy-mm-dd") & _
           " ~ " & Format(mPE(mPN), "yyyy-mm-dd")
    If hasBase Then info = info & "    기준일 : " & Format(baseD, "yyyy-mm-dd")
    info = info & "    작성 : " & Format(Now, "yyyy-mm-dd hh:mm")
    SetText ws.Cells(CH_INFO, COL_LABEL), info
    ws.Cells(CH_INFO, COL_LABEL).Font.Color = CLR_GRID_DARK
End Sub

Private Sub WriteHeader(ByVal ws As Worksheet, ByVal lastCol As Long)
    Dim i As Long, c As Long, c2 As Long, key As Long, prevKey As Long, grpStart As Long
    Dim band As Long, nInGrp As Long, kind As Integer, d As Date
    Dim names As Variant

    ' 왼쪽 머리글
    MergeHeader ws, COL_LABEL, "구          분"
    MergeHeader ws, COL_S, "시작일"
    MergeHeader ws, COL_E, "종료일"
    MergeHeader ws, COL_D, "기간"

    ws.Rows(CH_HDR1).RowHeight = 15
    ws.Rows(CH_HDR2).RowHeight = 15
    ws.Rows(CH_HDR3).RowHeight = 13.5
    If mUnit = UNIT_MONTH Then ws.Rows(CH_HDR3).Hidden = True

    names = Array("상순", "중순", "하순")
    prevKey = -1
    band = 0
    For i = 1 To mPN
        d = mPS(i)
        c = DateToCol(d)
        c2 = DateToCol(mPE(i))
        If c2 > c Then
            ws.Range(ws.Cells(CH_HDR2, c), ws.Cells(CH_HDR2, c2)).Merge
            ws.Range(ws.Cells(CH_HDR3, c), ws.Cells(CH_HDR3, c2)).Merge
        End If

        ' 윗줄 묶음(월 또는 년)
        key = GroupKey(d)
        If key <> prevKey Then
            If prevKey <> -1 Then CloseGroup ws, grpStart, c - 1, prevKey, band
            grpStart = c
            prevKey = key
            band = 1 - band
            nInGrp = 0
        End If
        nInGrp = nInGrp + 1

        Select Case mUnit
            Case UNIT_DAY
                ws.Cells(CH_HDR2, c).Value = Day(d)
                SetText ws.Cells(CH_HDR3, c), Mid$("일월화수목금토", Weekday(d, vbSunday), 1)
                kind = DayKind(d)
                If kind > 0 Then
                    With ws.Range(ws.Cells(CH_HDR2, c), ws.Cells(CH_HDR3, c))
                        .Font.Color = IIf(kind = 1, CLR_SAT, CLR_SUN)
                        .Interior.Color = CLR_HOLIDAY_BG
                    End With
                End If
            Case UNIT_WEEK
                SetText ws.Cells(CH_HDR2, c), Month(d) & "/" & Day(d)
                SetText ws.Cells(CH_HDR3, c), nInGrp & "주"
            Case UNIT_10D
                SetText ws.Cells(CH_HDR2, c), names((Day(d) - 1) \ 10)
                SetText ws.Cells(CH_HDR3, c), Day(d) & "~" & Day(mPE(i))
            Case UNIT_MONTH
                SetText ws.Cells(CH_HDR2, c), Month(d) & "월"
        End Select
    Next i
    CloseGroup ws, grpStart, lastCol, prevKey, band

    With ws.Range(ws.Cells(CH_HDR1, COL_CHART0), ws.Cells(CH_HDR3, lastCol))
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
    End With
    ws.Range(ws.Cells(CH_HDR1, COL_CHART0), ws.Cells(CH_HDR1, lastCol)).Font.Bold = True
    If mUnit <> UNIT_DAY Then
        ws.Range(ws.Cells(CH_HDR3, COL_CHART0), ws.Cells(CH_HDR3, lastCol)).Font.Size = 8
    End If
End Sub

Private Sub MergeHeader(ByVal ws As Worksheet, ByVal c As Long, ByVal txt As String)
    With ws.Range(ws.Cells(CH_HDR1, c), ws.Cells(CH_HDR3, c))
        .Merge
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
        .Interior.Color = CLR_HDR_LEFT
        .Font.Bold = True
        .Font.Size = 10
    End With
    SetText ws.Cells(CH_HDR1, c), txt
End Sub

Private Sub CloseGroup(ByVal ws As Worksheet, ByVal c1 As Long, ByVal c2 As Long, _
                       ByVal key As Long, ByVal band As Long)
    Dim txt As String, w As Double
    With ws.Range(ws.Cells(CH_HDR1, c1), ws.Cells(CH_HDR1, c2))
        w = .Width
        If c2 > c1 Then .Merge
        .Interior.Color = IIf(band = 1, CLR_BAND1, CLR_BAND2)
    End With
    ' 칸 폭이 좁으면 짧게 표시
    If mUnit = UNIT_MONTH Then
        If w >= 34 Then txt = key & "년" Else txt = Right$(CStr(key), 2)
    Else
        If w >= 62 Then
            txt = (key \ 100) & "년 " & (key Mod 100) & "월"
        ElseIf w >= 20 Then
            txt = (key Mod 100) & "월"
        Else
            txt = CStr(key Mod 100)
        End If
    End If
    SetText ws.Cells(CH_HDR1, c1), txt
End Sub


'===================================================================
'  본문 행 배치
'   대분류  : 1행   "○ 대분류"
'   작업항목 : 2행   "- 작업항목"  → 세부작업 바를 모두 이 줄에 표시(요약)
'   세부작업 : 2행   "· 세부작업"  → 작업항목 아래에 그룹(접기/펼치기)
'===================================================================
Private Function LayoutBody(ByVal ws As Worksheet, ByVal mc As Long) As Long
    Dim cats() As String, nCat As Long, items() As String, nItem As Long
    Dim ci As Long, ii As Long, k As Long, r As Long, rItem As Long, rDetail As Long
    Dim cMin As Date, cMax As Date, cHas As Boolean
    Dim iMin As Date, iMax As Date, iHas As Boolean
    Dim lbl As String

    nCat = 0
    ReDim cats(1 To mN)
    For k = 1 To mN
        AddUnique cats, nCat, mCat(k)
    Next k

    r = CH_BODY
    For ci = 1 To nCat
        ' --- 대분류 행 ---
        cHas = RangeOf(cats(ci), "", False, cMin, cMax)
        AddBlock r
        SetText ws.Cells(r, COL_LABEL), "○ " & cats(ci)
        ws.Range(ws.Cells(r, COL_LABEL), ws.Cells(r, COL_D)).Font.Bold = True
        ws.Cells(r, COL_LABEL).Font.Size = 10
        If cHas Then WriteDates ws, r, cMin, cMax
        ws.Rows(r).RowHeight = ROW_CAT_H
        ws.Cells(r, mc).Value = "K|" & RowsOf(cats(ci), "", False) & "|" & cats(ci)
        r = r + 1

        ' --- 작업항목 ---
        nItem = 0
        ReDim items(1 To mN)
        For k = 1 To mN
            If mCat(k) = cats(ci) And mItem(k) <> "" Then AddUnique items, nItem, mItem(k)
        Next k

        For ii = 1 To nItem
            rItem = r
            iHas = RangeOf(cats(ci), items(ii), True, iMin, iMax)
            WriteBlock ws, rItem, " - " & items(ii), iHas, iMin, iMax, False
            If Not iHas Then
                For k = 1 To mN
                    If mCat(k) = cats(ci) And mItem(k) = items(ii) And mDet(k) = "" And mDurV(k) > 0 Then
                        ws.Cells(rItem, COL_D).Value = mDurV(k)      ' 시작일 없이 기간만 입력된 작업항목
                        Exit For
                    End If
                Next k
            End If
            ws.Cells(rItem, mc).Value = "I|" & RowsOf(cats(ci), items(ii), True) & "|" & items(ii)
            ws.Cells(rItem + 1, mc).Value = "L"
            r = r + 2
            rDetail = r

            For k = 1 To mN
                If mCat(k) = cats(ci) And mItem(k) = items(ii) Then
                    If mDet(k) <> "" Then
                        lbl = "      · " & mDet(k)
                        If mLow(k) <> "" Then lbl = lbl & " " & mLow(k)
                        WriteBlock ws, r, lbl, mHas(k), mStart(k), mEnd(k), True
                        If Not mHas(k) And mDurV(k) > 0 Then ws.Cells(r, COL_D).Value = mDurV(k)
                        ws.Cells(r, mc).Value = "D|" & mRow(k)
                        ws.Cells(r + 1, mc).Value = "L"
                        If mHas(k) Then
                            AddSegment r, mStart(k), mEnd(k), mDet(k), mLow(k), SegColor(k)      ' 세부작업 행
                            AddSegment rItem, mStart(k), mEnd(k), mDet(k), mLow(k), SegColor(k)  ' 작업항목 요약 행
                        End If
                        r = r + 2
                    ElseIf mHas(k) Then
                        ' 세부작업명 없이 날짜만 있으면 작업항목 줄에 직접 표시
                        AddSegment rItem, mStart(k), mEnd(k), "", mLow(k), SegColor(k)
                    End If
                End If
            Next k

            If r > rDetail Then
                ws.Rows(rDetail & ":" & (r - 1)).Group
            End If
        Next ii
    Next ci

    On Error Resume Next
    ws.Outline.SummaryRow = xlSummaryAbove   ' [+]/[-] 버튼을 작업항목 줄에 표시
    On Error GoTo 0
    LayoutBody = r - 1
End Function

Private Sub WriteBlock(ByVal ws As Worksheet, ByVal r As Long, ByVal lbl As String, _
                       ByVal hasDate As Boolean, ByVal dS As Date, ByVal dE As Date, _
                       ByVal isDetail As Boolean)
    Dim c As Long
    AddBlock r
    ws.Rows(r).RowHeight = ROW_UP_H
    ws.Rows(r + 1).RowHeight = ROW_LOW_H
    For c = COL_LABEL To COL_D
        ws.Range(ws.Cells(r, c), ws.Cells(r + 1, c)).Merge
    Next c
    SetText ws.Cells(r, COL_LABEL), lbl
    If hasDate Then WriteDates ws, r, dS, dE
    If isDetail Then
        ws.Range(ws.Cells(r, COL_LABEL), ws.Cells(r + 1, COL_D)).Font.Color = CLR_DETAIL_TXT
    Else
        ws.Cells(r, COL_LABEL).Font.Size = 10
    End If
End Sub

Private Sub WriteDates(ByVal ws As Worksheet, ByVal r As Long, ByVal dS As Date, ByVal dE As Date)
    ws.Cells(r, COL_S).Value = dS
    ws.Cells(r, COL_D).Value = CLng(dE - dS) + 1
    ws.Cells(r, COL_E).FormulaR1C1 = END_FORMULA      ' 종료일 = 시작일 + 기간 - 1
    ws.Range(ws.Cells(r, COL_S), ws.Cells(r, COL_E)).NumberFormat = "yy-mm-dd"
End Sub

' 대분류(item="") 또는 작업항목의 최초 시작일 ~ 최종 종료일
Private Function RangeOf(ByVal cat As String, ByVal item As String, ByVal byItem As Boolean, _
                         ByRef dMin As Date, ByRef dMax As Date) As Boolean
    Dim k As Long, found As Boolean
    For k = 1 To mN
        If mHas(k) And mCat(k) = cat And (Not byItem Or mItem(k) = item) Then
            If Not found Then
                dMin = mStart(k): dMax = mEnd(k): found = True
            Else
                If mStart(k) < dMin Then dMin = mStart(k)
                If mEnd(k) > dMax Then dMax = mEnd(k)
            End If
        End If
    Next k
    RangeOf = found
End Function

' 바 선/원 색 : 검정 또는 공종색
Private Function SegColor(ByVal k As Long) As Long
    If mBarByTrade Then SegColor = TradeColor(mTrade(k)) Else SegColor = 0
End Function

' 대분류/작업항목에 속한 작업입력 행 번호 목록 "5,6,7"
Private Function RowsOf(ByVal cat As String, ByVal item As String, ByVal byItem As Boolean) As String
    Dim k As Long, s As String
    For k = 1 To mN
        If mCat(k) = cat And (Not byItem Or mItem(k) = item) Then
            If s <> "" Then s = s & ","
            s = s & mRow(k)
        End If
    Next k
    RowsOf = s
End Function

Private Sub AddUnique(ByRef arr() As String, ByRef n As Long, ByVal v As String)
    Dim i As Long
    For i = 1 To n
        If arr(i) = v Then Exit Sub
    Next i
    n = n + 1
    arr(n) = v
End Sub

' 행 정보(숨김 열)와 시트 정보(숨김 3행) 기록 → 바차트에서 직접 수정할 때 사용
Private Sub WriteMeta(ByVal ws As Worksheet, ByVal mc As Long)
    ws.Cells(META_ROW, 1).Value = META_TAG
    ws.Cells(META_ROW, 2).Value = mUnit
    ws.Cells(META_ROW, 3).Value = GetVersion()
    ws.Cells(META_ROW, 4).Value = mc
    ws.Cells(META_ROW, 5).Value = LAYOUT_VER
    ws.Rows(META_ROW).Hidden = True
    ws.Columns(mc).Hidden = True
End Sub

' 바차트 시트의 행 정보 열 번호 (이 프로그램이 만든 시트가 아니면 0)
Private Function MetaCol(ByVal ws As Worksheet) As Long
    If CStr(ws.Cells(META_ROW, 1).Value) = META_TAG Then MetaCol = Val(CStr(ws.Cells(META_ROW, 4).Value))
End Function

Private Sub AddSegment(ByVal r As Long, ByVal dS As Date, ByVal dE As Date, _
                       ByVal txtTop As String, ByVal txtBot As String, ByVal clr As Long)
    mSegN = mSegN + 1
    If mSegN = 1 Then
        ReDim mSegR(1 To 64): ReDim mSegS(1 To 64): ReDim mSegE(1 To 64)
        ReDim mSegTop(1 To 64): ReDim mSegBot(1 To 64): ReDim mSegClr(1 To 64)
    ElseIf mSegN > UBound(mSegR) Then
        ReDim Preserve mSegClr(1 To UBound(mSegR) * 2)
        ReDim Preserve mSegR(1 To UBound(mSegR) * 2)
        ReDim Preserve mSegS(1 To UBound(mSegS) * 2)
        ReDim Preserve mSegE(1 To UBound(mSegE) * 2)
        ReDim Preserve mSegTop(1 To UBound(mSegTop) * 2)
        ReDim Preserve mSegBot(1 To UBound(mSegBot) * 2)
    End If
    mSegR(mSegN) = r
    mSegS(mSegN) = dS
    mSegE(mSegN) = dE
    mSegTop(mSegN) = txtTop
    mSegBot(mSegN) = txtBot
    mSegClr(mSegN) = clr
End Sub

Private Sub AddBlock(ByVal r As Long)
    mBlkN = mBlkN + 1
    If mBlkN = 1 Then
        ReDim mBlkR(1 To 64)
    ElseIf mBlkN > UBound(mBlkR) Then
        ReDim Preserve mBlkR(1 To UBound(mBlkR) * 2)
    End If
    mBlkR(mBlkN) = r
End Sub


'===================================================================
'  격자 서식
'===================================================================
Private Sub FormatGrid(ByVal ws As Worksheet, ByVal lastRow As Long, ByVal lastCol As Long)
    Dim i As Long, c As Long, key As Long, prevKey As Long

    ' 날짜/기간 표시 형식
    With ws.Range(ws.Cells(CH_BODY, COL_S), ws.Cells(lastRow, COL_E))
        .NumberFormat = "yy-mm-dd"
        .HorizontalAlignment = xlCenter
    End With
    With ws.Range(ws.Cells(CH_BODY, COL_D), ws.Cells(lastRow, COL_D))
        .NumberFormat = "0""일"""
        .HorizontalAlignment = xlCenter
    End With
    ws.Range(ws.Cells(CH_BODY, COL_LABEL), ws.Cells(lastRow, COL_LABEL)).HorizontalAlignment = xlLeft

    ' 주말/공휴일 배경 (일 단위)
    If mUnit = UNIT_DAY Then
        For i = 1 To mDays
            If DayKind(mDay0 + i - 1) > 0 Then
                c = COL_CHART0 + i - 1
                ws.Range(ws.Cells(CH_BODY, c), ws.Cells(lastRow, c)).Interior.Color = CLR_HOLIDAY_BG
            End If
        Next i
    End If

    ' 세로선: 기간 칸 경계 점선 (일 단위는 모든 날짜), 왼쪽 구분 칸 실선
    If mUnit = UNIT_DAY Then
        With ws.Range(ws.Cells(CH_HDR2, COL_CHART0), ws.Cells(lastRow, lastCol)).Borders(xlInsideVertical)
            .LineStyle = xlDot
            .Weight = xlThin
            .Color = CLR_GRID
        End With
    Else
        For i = 2 To mPN
            c = DateToCol(mPS(i))
            With ws.Range(ws.Cells(CH_HDR2, c), ws.Cells(lastRow, c)).Borders(xlEdgeLeft)
                .LineStyle = xlDot
                .Weight = xlThin
                .Color = CLR_GRID
            End With
        Next i
    End If
    With ws.Range(ws.Cells(CH_HDR1, COL_LABEL), ws.Cells(lastRow, COL_D)).Borders(xlInsideVertical)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .Color = CLR_GRID
    End With

    ' 가로선: 블록(대분류/작업항목/세부작업) 경계만
    For i = 1 To mBlkN
        If mBlkR(i) > CH_BODY Then
            With ws.Range(ws.Cells(mBlkR(i), COL_LABEL), ws.Cells(mBlkR(i), COL_D)).Borders(xlEdgeTop)
                .LineStyle = xlContinuous
                .Weight = xlThin
                .Color = CLR_GRID
            End With
            With ws.Range(ws.Cells(mBlkR(i), COL_CHART0), ws.Cells(mBlkR(i), lastCol)).Borders(xlEdgeTop)
                .LineStyle = xlDot
                .Weight = xlThin
                .Color = CLR_GRID
            End With
        End If
    Next i

    ' 머리글 가로선
    With ws.Range(ws.Cells(CH_HDR1, COL_CHART0), ws.Cells(CH_HDR3, lastCol)).Borders(xlInsideHorizontal)
        .LineStyle = xlContinuous
        .Weight = xlThin
        .Color = CLR_GRID
    End With

    ' 월(월 단위는 년) 경계 실선
    prevKey = -1
    For i = 1 To mPN
        key = GroupKey(mPS(i))
        If key <> prevKey And prevKey <> -1 Then
            c = DateToCol(mPS(i))
            With ws.Range(ws.Cells(CH_HDR1, c), ws.Cells(lastRow, c)).Borders(xlEdgeLeft)
                .LineStyle = xlContinuous
                .Weight = xlThin
                .Color = CLR_GRID_DARK
            End With
        End If
        prevKey = key
    Next i

    ' 머리글 아래 / 구분-날짜 사이 / 바깥 테두리
    With ws.Range(ws.Cells(CH_HDR3, COL_LABEL), ws.Cells(CH_HDR3, lastCol)).Borders(xlEdgeBottom)
        .LineStyle = xlContinuous
        .Weight = xlMedium
        .Color = 0
    End With
    If mHdrLast > CH_HDR3 Then
        With ws.Range(ws.Cells(mHdrLast, COL_LABEL), ws.Cells(mHdrLast, lastCol)).Borders(xlEdgeBottom)
            .LineStyle = xlContinuous
            .Weight = xlMedium
            .Color = 0
        End With
    End If
    If mUnit = UNIT_MONTH Then
        With ws.Range(ws.Cells(CH_HDR2, COL_LABEL), ws.Cells(CH_HDR2, lastCol)).Borders(xlEdgeBottom)
            .LineStyle = xlContinuous
            .Weight = xlMedium
            .Color = 0
        End With
    End If
    With ws.Range(ws.Cells(mHdrFirst, COL_CHART0), ws.Cells(lastRow + 1, COL_CHART0)).Borders(xlEdgeLeft)
        .LineStyle = xlContinuous
        .Weight = xlMedium
        .Color = 0
    End With
    ' 바깥 테두리는 마감 행(lastRow + 1)까지 : 아래 굵은 선이 접기/펼치기와 상관없이 보이도록
    ws.Range(ws.Cells(mHdrFirst, COL_LABEL), ws.Cells(lastRow + 1, lastCol)).BorderAround _
        LineStyle:=xlContinuous, Weight:=xlMedium, Color:=0
End Sub


'===================================================================
'  바 그리기 : 칸 아래선(굵게) + 시작/종료 원
'===================================================================
Private Sub DrawSegment(ByVal ws As Worksheet, ByVal r As Long, ByVal dS As Date, ByVal dE As Date, _
                        ByVal clr As Long)
    Dim c1 As Long, c2 As Long, y As Double
    Dim clipL As Boolean, clipR As Boolean

    If dE < mPS(1) Or dS > mPE(mPN) Then Exit Sub   ' 표시 기간 밖
    If dS < mPS(1) Then dS = mPS(1): clipL = True
    If dE > mPE(mPN) Then dE = mPE(mPN): clipR = True
    c1 = DateToCol(dS)
    c2 = DateToCol(dE)

    With ws.Range(ws.Cells(r, c1), ws.Cells(r, c2)).Borders(xlEdgeBottom)
        .LineStyle = xlContinuous
        .Weight = xlMedium
        .Color = clr
    End With

    y = ws.Cells(r + 1, c1).Top
    If Not clipL Then AddCircle ws, ws.Cells(r, c1).Left, y, clr
    If Not clipR Then AddCircle ws, ws.Cells(r, c2).Left + ws.Cells(r, c2).Width, y, clr
End Sub

' 바 위/아래 글자 배치 (같은 줄의 다음 바와 겹치지 않게)
'   글자가 바 안에 들어가면     → 바 가운데 정렬
'   바보다 길면                 → 바 시작점부터 다음 바 앞까지 왼쪽 정렬로 쓰고,
'                                 그래도 넘치면 최소 크기까지 줄임 (남는 부분은 다음 글자 앞에서 잘림)
Private Sub DrawLabels(ByVal ws As Worksheet, ByVal lastCol As Long, ByVal fontSize As Double)
    Dim i As Long, j As Long, c1 As Long, c2 As Long, d1 As Long, d2 As Long, lim As Long
    For i = 1 To mSegN
        If SegCols(i, c1, c2) Then
            lim = lastCol
            For j = 1 To mSegN
                If j <> i And mSegR(j) = mSegR(i) Then
                    If SegCols(j, d1, d2) Then
                        If d1 > c1 And d1 - 1 < lim Then lim = d1 - 1
                    End If
                End If
            Next j
            PutLabel ws, mSegR(i), c1, c2, lim, mSegTop(i), xlBottom, fontSize
            PutLabel ws, mSegR(i) + 1, c1, c2, lim, mSegBot(i), xlTop, fontSize
        End If
    Next i
End Sub

' 바의 표시 열 (표시 기간 밖이면 False)
Private Function SegCols(ByVal i As Long, ByRef c1 As Long, ByRef c2 As Long) As Boolean
    Dim dS As Date, dE As Date
    dS = mSegS(i)
    dE = mSegE(i)
    If dE < mDay0 Or dS > mPE(mPN) Then Exit Function
    If dS < mDay0 Then dS = mDay0
    If dE > mPE(mPN) Then dE = mPE(mPN)
    c1 = DateToCol(dS)
    c2 = DateToCol(dE)
    SegCols = True
End Function

Private Sub PutLabel(ByVal ws As Worksheet, ByVal r As Long, ByVal c1 As Long, ByVal c2 As Long, _
                     ByVal cLim As Long, ByVal txt As String, ByVal vAlign As Long, ByVal fontSize As Double)
    Dim c As Long, cStart As Long, wBar As Double, wAvail As Double, sz As Double
    If txt = "" Then Exit Sub
    For c = c1 To c2
        If IsEmpty(ws.Cells(r, c).Value) Then
            cStart = c
            Exit For
        End If
    Next c
    If cStart = 0 Then Exit Sub        ' 다른 바 글자와 완전히 겹치면 생략
    If cLim < c2 Then cLim = c2
    wBar = ColsWidth(ws, cStart, c2)
    wAvail = ColsWidth(ws, cStart, cLim) - LABEL_PAD

    SetText ws.Cells(r, cStart), txt
    If TextWidthPt(txt, fontSize) <= wBar - CIRCLE_D Then
        ws.Cells(r, cStart).Font.Size = fontSize
        With ws.Range(ws.Cells(r, cStart), ws.Cells(r, c2))
            .HorizontalAlignment = xlCenterAcrossSelection
            .VerticalAlignment = vAlign
        End With
    Else
        sz = fontSize
        Do While sz > MIN_LABEL_FONT And TextWidthPt(txt, sz) > wAvail
            sz = sz - 0.5
        Loop
        With ws.Cells(r, cStart)
            .Font.Size = sz
            .HorizontalAlignment = xlLeft
            .IndentLevel = 1              ' 시작 원과 겹치지 않게
            .VerticalAlignment = vAlign
        End With
    End If
End Sub

' 열 c1~c2 의 폭(pt)
Private Function ColsWidth(ByVal ws As Worksheet, ByVal c1 As Long, ByVal c2 As Long) As Double
    ColsWidth = ws.Cells(1, c2).Left + ws.Cells(1, c2).Width - ws.Cells(1, c1).Left
End Function

' 글자 폭 어림값(pt) : 한글·전각 1글자 ≒ 글자 크기, 영문/숫자는 약 0.55~0.65
Private Function TextWidthPt(ByVal s As String, ByVal sz As Double) As Double
    Dim i As Long, ch As Long, w As Double
    For i = 1 To Len(s)
        ch = AscW(Mid$(s, i, 1))
        If ch < 0 Or ch > 255 Then
            w = w + 0.95
        ElseIf ch = 32 Then
            w = w + 0.3
        ElseIf ch >= 65 And ch <= 90 Then
            w = w + 0.65
        Else
            w = w + 0.55
        End If
    Next i
    TextWidthPt = w * sz
End Function

Private Function LabelFontSize() As Double
    LabelFontSize = Val(CfgText(CFG_LABELSIZE))
    If LabelFontSize <= 0 Then LabelFontSize = 9
    If LabelFontSize < MIN_LABEL_FONT Then LabelFontSize = MIN_LABEL_FONT
    If LabelFontSize > 16 Then LabelFontSize = 16
End Function

Private Sub AddCircle(ByVal ws As Worksheet, ByVal x As Double, ByVal y As Double, ByVal clr As Long)
    Dim shp As Shape
    Set shp = ws.Shapes.AddShape(SHAPE_OVAL, x - CIRCLE_D / 2, y - CIRCLE_D / 2, CIRCLE_D, CIRCLE_D)
    mCircleN = mCircleN + 1
    With shp
        .Name = "BC_O" & mCircleN
        .Fill.Visible = MSO_TRUE
        .Fill.Solid
        .Fill.ForeColor.RGB = RGB(255, 255, 255)
        .Line.Visible = MSO_TRUE
        .Line.ForeColor.RGB = clr
        .Line.Weight = 1.25
    End With
    On Error Resume Next
    shp.Placement = xlMoveAndSize   ' 행 숨기기(접기) 시 원도 함께 숨겨짐
    shp.Shadow.Visible = MSO_FALSE
    On Error GoTo 0
End Sub

' D-DAY 행 : 기준일(SD 착수일 등) = D+1, 다음날 D+2 … , 그 전날은 D-1, D-2 …
Private Sub WriteDDay(ByVal ws As Worksheet, ByVal hasDDay As Boolean, ByVal dDay As Date)
    Dim i As Long, c1 As Long, c2 As Long, n As Long, txt As String
    mHdrFirst = CH_HDR1
    If Not hasDDay Then
        ws.Rows(CH_DDAY).Hidden = True
        Exit Sub
    End If
    mHdrFirst = CH_DDAY
    ws.Rows(CH_DDAY).RowHeight = 15
    With ws.Range(ws.Cells(CH_DDAY, COL_LABEL), ws.Cells(CH_DDAY, COL_D))
        .Merge
        .HorizontalAlignment = xlRight
        .Interior.Color = CLR_HDR_LEFT
        .Font.Bold = True
        .Font.Color = CLR_SUN
    End With
    SetText ws.Cells(CH_DDAY, COL_LABEL), "D-DAY (" & Month(dDay) & "/" & Day(dDay) & " = D+1) "
    For i = 1 To mPN
        c1 = DateToCol(mPS(i))
        c2 = DateToCol(mPE(i))
        If c2 > c1 Then ws.Range(ws.Cells(CH_DDAY, c1), ws.Cells(CH_DDAY, c2)).Merge
        If dDay >= mPS(i) And dDay <= mPE(i) Then
            txt = "D+1"
        Else
            n = CLng(mPS(i) - dDay)
            If n >= 0 Then txt = "D+" & (n + 1) Else txt = "D" & n
        End If
        SetText ws.Cells(CH_DDAY, c1), txt
        If dDay >= mPS(i) And dDay <= mPE(i) Then ws.Cells(CH_DDAY, c1).Interior.Color = RGB(255, 255, 0)
    Next i
    With ws.Range(ws.Cells(CH_DDAY, COL_CHART0), ws.Cells(CH_DDAY, COL_CHART0 + mDays - 1))
        .HorizontalAlignment = xlCenter
        .Font.Color = CLR_SUN
        .Font.Bold = True
        .Font.Size = 8
        .ShrinkToFit = True
        .Borders(xlInsideVertical).LineStyle = xlContinuous
        .Borders(xlInsideVertical).Color = CLR_GRID
        .Borders(xlEdgeBottom).LineStyle = xlContinuous
        .Borders(xlEdgeBottom).Color = CLR_GRID_DARK
    End With
End Sub

' 주요 이벤트 : 날짜 아래 ▼ 화살표 + 날짜, 그 위에 내용. 글자가 겹치면 아랫단으로
Private Sub DrawEvents(ByVal ws As Worksheet, ByVal lastCol As Long, ByVal show As Boolean)
    Dim we As Worksheet, n As Long, r As Long, lastRow As Long, i As Long, j As Long
    Dim eD() As Date, eT() As String, eC() As Long, d As Date, tD As Date, tT As String, tC As Long
    Dim c As Long, cd As Long, x As Double, lw As Double, dw As Double, x1 As Double, x2 As Double
    Dim tierEnd(1 To 2) As Double, used(1 To 2) As Boolean, tier As Integer, rowL As Long, rowA As Long
    Dim txt As String, chartL As Double, chartR As Double, cl As Long, lblAlign As Long, lblSize As Double

    mHdrLast = CH_HDR3
    ws.Rows(CH_EV1L & ":" & CH_EV2A).Hidden = True
    If Not show Or Not SheetExists(SH_EVT) Then Exit Sub
    Set we = ThisWorkbook.Worksheets(SH_EVT)
    lastRow = we.Cells(we.Rows.Count, 1).End(xlUp).Row
    If lastRow < 3 Then Exit Sub
    ReDim eD(1 To lastRow): ReDim eT(1 To lastRow): ReDim eC(1 To lastRow)
    For r = 3 To lastRow
        If ToDate(we.Cells(r, 1).Value, d) Then
            If d >= mDay0 And d <= mPE(mPN) Then
                n = n + 1
                eD(n) = d
                eT(n) = Trim$(CellText(we.Cells(r, 2)))
                eC(n) = EventColor(CellText(we.Cells(r, 3)))
            End If
        End If
    Next r
    If n = 0 Then Exit Sub

    ' 날짜 순 정렬
    For i = 2 To n
        tD = eD(i): tT = eT(i): tC = eC(i)
        j = i - 1
        Do While j >= 1
            If eD(j) <= tD Then Exit Do
            eD(j + 1) = eD(j): eT(j + 1) = eT(j): eC(j + 1) = eC(j)
            j = j - 1
        Loop
        eD(j + 1) = tD: eT(j + 1) = tT: eC(j + 1) = tC
    Next i

    ws.Rows(CH_EV1L).RowHeight = 13
    ws.Rows(CH_EV1A).RowHeight = 15
    ws.Rows(CH_EV2L).RowHeight = 13
    ws.Rows(CH_EV2A).RowHeight = 15
    ws.Rows(CH_EV1L & ":" & CH_EV2A).Hidden = False
    ws.Range(ws.Cells(CH_EV1L, COL_CHART0), ws.Cells(CH_EV2A, lastCol)).Interior.Color = CLR_EVENT_BG
    tierEnd(1) = -100000#
    tierEnd(2) = -100000#
    chartL = ws.Cells(1, COL_CHART0).Left
    chartR = ws.Cells(1, lastCol).Left + ws.Cells(1, lastCol).Width

    For i = 1 To n
        c = DateToCol(eD(i))
        x = ws.Cells(1, c).Left + ws.Cells(1, c).Width / 2
        txt = Month(eD(i)) & "/" & Day(eD(i))
        lw = TextWidthPt(eT(i), 9) * 1.05
        dw = TextWidthPt(txt, 8) + 8
        ' 내용 위치 : 날짜 칸 가운데. 차트 왼쪽/오른쪽 끝을 넘으면 안쪽으로 붙임
        lblAlign = xlCenter
        cl = c
        x1 = x - lw / 2
        x2 = x + lw / 2
        If x1 < chartL + 2 Then
            lblAlign = xlLeft: cl = COL_CHART0: x1 = chartL: x2 = chartL + lw
        ElseIf x2 > chartR - 2 Then
            lblAlign = xlRight: cl = lastCol: x1 = chartR - lw: x2 = chartR
        End If
        If x + 6 + dw > x2 Then x2 = x + 6 + dw
        lblSize = 9
        If x1 > tierEnd(1) + 4 Then
            tier = 1
        ElseIf x1 > tierEnd(2) + 4 Then
            tier = 2
        Else
            ' 두 단 모두 겹치면 덜 겹치는 단에 작은 글자로
            If tierEnd(1) <= tierEnd(2) Then tier = 1 Else tier = 2
            lblSize = 7
        End If
        tierEnd(tier) = x2
        used(tier) = True
        If tier = 1 Then rowL = CH_EV1L Else rowL = CH_EV2L
        rowA = rowL + 1

        ' 내용
        If eT(i) <> "" Then
            If CellText(ws.Cells(rowL, cl)) <> "" Then eT(i) = CellText(ws.Cells(rowL, cl)) & " / " & eT(i)
            SetText ws.Cells(rowL, cl), eT(i)
            With ws.Cells(rowL, cl)
                .HorizontalAlignment = lblAlign
                .VerticalAlignment = xlBottom
                .Font.Bold = True
                .Font.Size = lblSize
                .Font.Color = eC(i)
            End With
        End If
        ' ▼ (글자로 표시 : 칸 가운데, 좁은 칸이면 양옆으로 넘쳐 보임)
        SetText ws.Cells(rowA, c), "▼"
        With ws.Cells(rowA, c)
            .HorizontalAlignment = xlCenter
            .VerticalAlignment = xlCenter
            .Font.Size = 11
            .Font.Color = eC(i)
        End With
        ' 날짜 (▼ 오른쪽)
        cd = c + 1
        Do While cd < lastCol
            If ws.Cells(1, cd).Left >= x + 6 Then Exit Do
            cd = cd + 1
        Loop
        If IsEmpty(ws.Cells(rowA, cd).Value) Then
            SetText ws.Cells(rowA, cd), txt
            With ws.Cells(rowA, cd)
                .HorizontalAlignment = xlLeft
                .Font.Size = 8
                .Font.Bold = True
                .Font.Color = eC(i)
            End With
        End If
    Next i

    If Not used(2) Then ws.Rows(CH_EV2L & ":" & CH_EV2A).Hidden = True
    If used(2) Then mHdrLast = CH_EV2A Else mHdrLast = CH_EV1A
    With ws.Range(ws.Cells(CH_EV1L, COL_LABEL), ws.Cells(mHdrLast, COL_D))
        .Merge
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
        .Interior.Color = CLR_EVENT_BG
        .Font.Bold = True
    End With
    SetText ws.Cells(CH_EV1L, COL_LABEL), "주요 EVENT"
End Sub

Private Function EventColor(ByVal s As String) As Long
    s = LCase$(Trim$(s))
    Select Case True
        Case InStr(s, "파") > 0 Or InStr(s, "blue") > 0: EventColor = RGB(0, 112, 192)
        Case InStr(s, "초") > 0 Or InStr(s, "녹") > 0 Or InStr(s, "green") > 0: EventColor = RGB(0, 150, 70)
        Case InStr(s, "검") > 0 Or InStr(s, "black") > 0: EventColor = 0
        Case InStr(s, "주황") > 0 Or InStr(s, "orange") > 0: EventColor = RGB(237, 125, 49)
        Case Else: EventColor = RGB(230, 0, 0)
    End Select
End Function

' 공종색 범례 (제목 줄 오른쪽) : 바차트에 쓰인 공종만
Private Sub WriteLegend(ByVal ws As Worksheet)
    Dim i As Long, k As Long, c As Long, w As Double, usedT As Boolean
    c = COL_CHART0 + 1
    For i = 1 To mTrN
        usedT = False
        For k = 1 To mN
            If mTrade(k) = mTrName(i) And mHas(k) Then usedT = True: Exit For
        Next k
        If usedT Then
            SetText ws.Cells(CH_TITLE, c), "■ " & mTrName(i)
            With ws.Cells(CH_TITLE, c)
                .Font.Color = mTrColor(i)
                .Font.Bold = True
                .Font.Size = 10
                .HorizontalAlignment = xlLeft
            End With
            w = TextWidthPt("■ " & mTrName(i), 10) + 10
            Do While w > 0
                w = w - ws.Cells(CH_TITLE, c).Width
                c = c + 1
            Loop
        End If
    Next i
End Sub

' 기준일 빨간 세로선 (기준일 칸의 오른쪽 경계)
Private Sub DrawBaseLine(ByVal ws As Worksheet, ByVal baseD As Date, ByVal lastRow As Long)
    Dim c As Long
    If baseD < mPS(1) Or baseD > mPE(mPN) Then Exit Sub
    c = DateToCol(baseD)
    With ws.Range(ws.Cells(CH_HDR2, c), ws.Cells(lastRow, c)).Borders(xlEdgeRight)
        .LineStyle = xlContinuous
        .Weight = xlThick
        .Color = CLR_SUN
    End With
End Sub

' 틀 고정, 눈금선 숨김, 인쇄 설정
Private Sub FinishSheet(ByVal ws As Worksheet)
    ws.Activate
    ActiveWindow.DisplayGridlines = False
    ActiveWindow.FreezePanes = False
    ws.Cells(CH_BODY, COL_CHART0).Select
    ActiveWindow.FreezePanes = True
    SetTabColor ws, CLR_SAT

    On Error Resume Next
    Application.PrintCommunication = False
    With ws.PageSetup
        .Orientation = xlLandscape
        .PaperSize = xlPaperA3
        .Zoom = False
        .FitToPagesWide = 1
        .FitToPagesTall = False
        .PrintTitleRows = "$" & CH_DDAY & ":$" & (CH_BODY - 1)
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
'  4. 자동 반영 : ThisWorkbook 의 이벤트에서 호출
'   - 바차트 시트 왼쪽 칸(구분/시작일/종료일/기간)을 고치면
'     작업입력 시트에 반영하고 바로 다시 그림
'   - 작업입력/공휴일/메인 설정을 고치면, 바차트 시트를 열 때 자동으로 다시 그림
'===================================================================
Public Sub OnSheetChange(ByVal Sh As Object, ByVal Target As Range)
    If gBusy Then Exit Sub
    On Error GoTo EH
    If Sh.Name = SH_INPUT Then
        FixChangedInputRows Sh, Target
        BumpVersion
    ElseIf Sh.Name = SH_HOL Or Sh.Name = SH_EVT Then
        BumpVersion
    ElseIf Sh.Name = SH_TRADE Then
        RefreshInputSheet                    ' 공종 이름이 바뀌면 간트 색 규칙 다시 만들기
    ElseIf Sh.Name = SH_MAIN Then
        If Not Intersect(Target, Sh.Range(Sh.Cells(CFG_TITLE, CFG_COL), Sh.Cells(CFG_LAST, CFG_COL))) Is Nothing Then
            BumpVersion
        End If
        If Not Intersect(Target, Sh.Cells(CFG_START, CFG_COL)) Is Nothing And SheetExists(SH_INPUT) Then
            gBusy = True
            Application.EnableEvents = False
            If Not RefreshInputGantt(ThisWorkbook.Worksheets(SH_INPUT), False) Then RefreshGanttLabels ThisWorkbook.Worksheets(SH_INPUT)
            Application.EnableEvents = True
            gBusy = False
        End If
    ElseIf IsChartSheet(Sh.Name) Then
        If MetaCol(Sh) = 0 Then
            ' 이전 버전에서 만든 바차트 (행 정보가 없어 반영 불가)
            If Not Intersect(Target, Sh.Range("A" & CH_BODY & ":D10000")) Is Nothing Then
                Notify "이 바차트 시트는 이전 버전에서 만들어져 수정 내용을 반영할 수 없습니다." & vbCrLf & _
                       "메인 시트에서 [바차트 생성]을 한 번 눌러 다시 만들어 주세요."
            End If
        Else
            HandleChartEdit Sh, Target
        End If
    End If
    Exit Sub
EH:
    gBusy = False
    Application.EnableEvents = True
    Notify "자동 반영 중 오류가 발생했습니다." & vbCrLf & Err.Number & " : " & Err.Description
End Sub

Public Sub OnSheetActivate(ByVal Sh As Object)
    If gBusy Then Exit Sub
    On Error GoTo EH
    If Not IsChartSheet(Sh.Name) Then Exit Sub
    If MetaCol(Sh) = 0 Then Exit Sub
    If Val(CStr(Sh.Cells(META_ROW, 3).Value)) <> GetVersion() Then
        RenderChart NormalizeUnit(CStr(Sh.Cells(META_ROW, 2).Value)), False
    End If
    Exit Sub
EH:
    gBusy = False
    Application.EnableEvents = True
    Notify "자동 반영 중 오류가 발생했습니다." & vbCrLf & Err.Number & " : " & Err.Description
End Sub

' 작업입력에서 시작일/종료일/기간을 고치면 그 행을 바로 맞춤 (종료일 수식 복구 등)
Private Sub FixChangedInputRows(ByVal wsIn As Worksheet, ByVal Target As Range)
    Dim rng As Range, cell As Range, lastR As Long, dS As Date, dE As Date
    Dim suOld As Boolean, calcOld As Long, r1 As Long, r2 As Long
    gBusy = True
    Application.EnableEvents = False
    ' 화면 갱신·자동 계산을 잠시 끄고 한 번에 반영 (칸마다 화면을 다시 그리면 느림)
    suOld = Application.ScreenUpdating
    calcOld = Application.Calculation
    Application.ScreenUpdating = False
    Application.Calculation = xlCalculationManual
    On Error GoTo EH
    Set rng = Intersect(Target, wsIn.Range(wsIn.Cells(IN_FIRST_ROW, IN_S), wsIn.Cells(wsIn.Rows.Count, IN_E)))
    If Not rng Is Nothing Then
        If rng.Rows.Count <= 2000 Then            ' 열 전체 지우기 등은 바차트 생성 때 처리
            For Each cell In rng.Columns(1).Cells
                If cell.Row <> lastR Then
                    FixInputDates wsIn, cell.Row, dS, dE
                    lastR = cell.Row
                End If
            Next cell
        End If
    End If
    ' 구분/공종/작업내용이 바뀌면 들여쓰기·적용 공종 다시 계산, 날짜가 바뀌면 간트 시작일 확인
    If Not Intersect(Target, wsIn.Range(wsIn.Cells(IN_FIRST_ROW, IN_LVL), wsIn.Cells(wsIn.Rows.Count, IN_E))) Is Nothing Then
        r1 = Target.Row
        r2 = Target.Row + Target.Rows.Count - 1
        mLblDirty = ""
        RecalcInputHelpers wsIn, r1, r2
        ' 간트 시작일이 바뀌면 전체를, 아니면 바뀐 행과 날짜가 다시 계산된 요약 행만 막대 글자 갱신
        If Not RefreshInputGantt(wsIn, False) Then
            If r2 - r1 > 300 Then
                RefreshGanttLabels wsIn
            Else
                RefreshGanttLabelRows wsIn, r1, r2, mLblDirty
            End If
        End If
    End If

Done:
    Application.Calculation = calcOld
    Application.ScreenUpdating = suOld
    Application.EnableEvents = True
    gBusy = False
    Exit Sub
EH:
    Resume Done
End Sub

' 바차트 다시 그리기 (주요 이벤트 추가 후 등)
Public Sub RedrawChart()
    Application.EnableEvents = True
    If MetaCol(ActiveSheet) = 0 Then
        BuildChart
    Else
        RenderChart NormalizeUnit(CStr(ActiveSheet.Cells(META_ROW, 2).Value)), False
    End If
End Sub

' 바차트 시트에서 고친 내용을 작업입력에 반영한 뒤 다시 그림
' (반영할 수 없는 수정은 다시 그리면서 원래 값으로 되돌아감)
' 행 정보가 없는 행(표 아래 빈 행, 끼워 넣은 행)에 입력하면 새 작업으로 추가
Private Sub HandleChartEdit(ByVal ws As Worksheet, ByVal Target As Range)
    Dim mc As Long, lastRow As Long, rng As Range, cell As Range
    Dim meta As String, msg As String, unit As String, r As Long, prevR As Long
    Dim newRows As String, parts As Variant, i As Long
    Dim needRender As Boolean, ctxKind As String, ctxRow As Long

    mc = MetaCol(ws)
    If mc = 0 Then Exit Sub
    lastRow = ws.Cells(ws.Rows.Count, mc).End(xlUp).Row
    If lastRow < CH_BODY Then Exit Sub
    Set rng = Intersect(Target, ws.Range(ws.Cells(CH_BODY, COL_LABEL), ws.Cells(lastRow + NEW_ROWS_MAX, COL_D)))
    If rng Is Nothing Then Exit Sub          ' 바(날짜 칸) 영역 수정은 그대로 둠
    If rng.Rows.Count > 2000 Then Exit Sub

    unit = NormalizeUnit(CStr(ws.Cells(META_ROW, 2).Value))
    gBusy = True
    Application.EnableEvents = False

    ' 1) 기존 행 수정 (새 행 추가로 작업입력 행 번호가 바뀌기 전에 먼저 처리)
    For Each cell In rng.Cells
        meta = CStr(ws.Cells(cell.Row, mc).Value)
        If meta = "L" Then
            needRender = True                 ' 2행 블록의 아랫줄 : 되돌림
        ElseIf meta <> "" And meta <> "N" Then
            ApplyChartEdit cell.Column, cell.Value, meta, msg
            needRender = True
        ElseIf cell.Row <> prevR Then
            newRows = newRows & "," & cell.Row
            prevR = cell.Row
        End If
    Next cell

    ' 2) 새 작업 행 (위에서부터 차례로, 앞에서 추가한 작업을 다음 행의 기준으로 사용)
    If newRows <> "" Then
        parts = Split(Mid$(newRows, 2), ",")
        For i = LBound(parts) To UBound(parts)
            r = CLng(parts(i))
            If AddTaskFromChartRow(ws, r, mc, ctxKind, ctxRow) Then needRender = True
        Next i
    End If

    Application.EnableEvents = True
    gBusy = False

    If needRender Then
        BumpVersion                           ' 다른 단위 바차트는 열 때 다시 그림
        RenderChart unit, False
    End If
    If msg <> "" Then Notify msg
End Sub

' 바차트의 빈 행에 입력한 내용을 작업입력에 새 작업으로 추가
'   구분 칸 : "○ 이름" → 대분류,  "- 이름" → 작업항목,  그냥 이름 → 바로 위 작업항목의 세부작업
'             (바로 위가 대분류 줄이면 그 대분류의 작업항목)
'   시작일/기간(또는 종료일)도 함께 입력 가능
' ctxKind/ctxRow : 같은 번에 여러 행을 붙여 넣은 경우 직전에 추가한 작업 (다음 행의 기준)
Private Function AddTaskFromChartRow(ByVal ws As Worksheet, ByVal r As Long, ByVal mc As Long, _
                                     ByRef ctxKind As String, ByRef ctxRow As Long) As Boolean
    Dim wsIn As Worksheet, raw As String, lbl As String, kind As String
    Dim vS As Variant, vE As Variant, vD As Variant, dTmp As Date, nTmp As Long
    Dim rr As Long, meta As String, parts As Variant, rowList As Variant
    Dim pos As Long, lastIn As Long, c As Long, dS As Date, dE As Date

    raw = Trim$(CellText(ws.Cells(r, COL_LABEL)))
    If raw = NEW_HINT Then raw = ""                ' 안내 문구는 이름이 아님
    vS = ws.Cells(r, COL_S).Value
    vE = ws.Cells(r, COL_E).Value
    vD = ws.Cells(r, COL_D).Value
    If raw = "" And Not ToDate(vS, dTmp) And Not ToDate(vE, dTmp) And Not ToDuration(vD, nTmp) Then Exit Function

    ' 입력한 이름의 앞 기호로 종류 결정
    If InStr("○●◎*＊", Left$(raw, 1)) > 0 And raw <> "" Then
        kind = "K"
    ElseIf Left$(raw, 1) = "-" Then
        kind = "I"
    End If
    lbl = CleanLabel(raw)
    If lbl = "" Then lbl = "새 작업"

    ' 기준 : 같은 번에 직전에 추가한 작업, 없으면 위쪽으로 가장 가까운 행
    If ctxKind = "" Then
        For rr = r - 1 To CH_BODY Step -1
            meta = CStr(ws.Cells(rr, mc).Value)
            If meta <> "" And meta <> "L" And meta <> "N" Then
                parts = Split(meta, "|", 3)
                ctxKind = parts(0)
                rowList = Split(parts(1), ",")
                If ctxKind = "D" Then
                    ctxRow = CLng(parts(1))
                Else
                    ctxRow = CLng(rowList(UBound(rowList)))   ' 그 묶음의 마지막 작업입력 행
                End If
                Exit For
            End If
        Next rr
    End If
    If kind = "" Then
        If ctxKind = "K" Then kind = "I" Else kind = "D"
    End If

    Set wsIn = ThisWorkbook.Worksheets(SH_INPUT)
    lastIn = LastInputRow(wsIn)
    If ctxKind = "" Or kind = "K" Then
        pos = lastIn + 1                                   ' 맨 끝에 추가
    ElseIf kind = "I" Then
        pos = GroupEnd(wsIn, ctxRow, lastIn, 1) + 1       ' 그 대분류의 끝
    Else
        If ctxKind = "D" Then
            pos = ctxRow + 1                               ' 바로 위 세부작업 다음
        Else
            pos = GroupEnd(wsIn, ctxRow, lastIn, 2) + 1    ' 그 작업항목의 끝
        End If
    End If

    If pos <= lastIn Then
        wsIn.Rows(pos).Insert
        lastIn = lastIn + 1
    End If
    wsIn.Range(wsIn.Cells(pos, IN_LVL), wsIn.Cells(pos, IN_NOTE)).Interior.Pattern = xlNone
    wsIn.Range(wsIn.Cells(pos, IN_LVL), wsIn.Cells(pos, IN_LOW)).NumberFormat = "@"
    wsIn.Cells(pos, IN_S).NumberFormat = "yyyy-mm-dd"
    wsIn.Cells(pos, IN_E).NumberFormat = "yyyy-mm-dd"
    wsIn.Cells(pos, IN_E).Interior.Color = RGB(242, 242, 242)
    For c = IN_LVL To IN_SUMFLAG
        wsIn.Cells(pos, c).ClearContents
    Next c

    Select Case kind
        Case "K": wsIn.Cells(pos, IN_LVL).Value = LVL_CAT
        Case "I": wsIn.Cells(pos, IN_LVL).Value = LVL_ITEM
        Case Else: wsIn.Cells(pos, IN_LVL).Value = LVL_DET
    End Select
    wsIn.Cells(pos, IN_TEXT).Value = lbl
    If ToDate(vS, dTmp) Then wsIn.Cells(pos, IN_S).Value = dTmp
    If ToDuration(vD, nTmp) Then
        wsIn.Cells(pos, IN_DUR).Value = nTmp
    ElseIf ToDate(vE, dTmp) Then
        wsIn.Cells(pos, IN_E).Value = dTmp                 ' 기간 없이 종료일만 → 기간 계산
    End If
    If CellText(wsIn.Cells(pos, IN_E)) = "" Then wsIn.Cells(pos, IN_E).FormulaR1C1 = IN_END_FORMULA
    FixInputDates wsIn, pos, dS, dE

    ctxKind = kind
    ctxRow = pos
    AddTaskFromChartRow = True
End Function

' 작업입력의 마지막 데이터 행 (종료일 수식 열 제외)
Private Function LastInputRow(ByVal wsIn As Worksheet) As Long
    Dim c As Long, lr As Long
    LastInputRow = IN_FIRST_ROW - 1
    For c = IN_LVL To IN_NOTE
        If c <> IN_E Then                         ' 종료일 열은 수식이 미리 들어 있으므로 제외
            lr = wsIn.Cells(wsIn.Rows.Count, c).End(xlUp).Row
            If lr > LastInputRow Then LastInputRow = lr
        End If
    Next c
End Function

' fromRow 가 속한 묶음의 마지막 행 : 아래로 내려가며 대분류(level=1) 또는 대분류·작업항목(level=2)이 나오기 직전까지
Private Function GroupEnd(ByVal wsIn As Worksheet, ByVal fromRow As Long, ByVal lastIn As Long, _
                          ByVal level As Integer) As Long
    Dim r As Long, lv As Integer
    GroupEnd = fromRow
    For r = fromRow + 1 To lastIn
        lv = InputLevel(wsIn, r)
        If lv = 1 Then Exit Function
        If level = 2 And lv = 2 Then Exit Function
        GroupEnd = r
    Next r
End Function

' meta : "K|행,행|대분류" / "I|행,행|작업항목" / "D|행"
Private Function ApplyChartEdit(ByVal c As Long, ByVal v As Variant, ByVal meta As String, _
                                ByRef msg As String) As Boolean
    Dim wsIn As Worksheet, parts As Variant, rowList As Variant
    Dim i As Long, n As Long, inRow As Long, tgt As Long, col As Long, own As Long
    Dim txt As String, oldName As String

    Set wsIn = ThisWorkbook.Worksheets(SH_INPUT)
    parts = Split(meta, "|", 3)
    If parts(0) = "D" Then
        inRow = CLng(parts(1))
        If c = COL_LABEL Then
            ApplyChartEdit = SetDetailName(wsIn, inRow, CleanLabel(VarText(v)))
        Else
            ApplyChartEdit = SetTaskDate(wsIn, inRow, c, v, msg)
        End If
        Exit Function
    End If

    If UBound(parts) < 2 Then Exit Function
    rowList = Split(parts(1), ",")
    oldName = parts(2)
    If c = COL_LABEL Then
        ' 대분류/작업항목 이름 바꾸기 : 그 대분류(작업항목) 행의 작업내용 변경
        txt = CleanLabel(VarText(v))
        If txt = "" Or txt = oldName Then Exit Function
        If parts(0) = "K" Then col = 1 Else col = 2
        For i = LBound(rowList) To UBound(rowList)
            inRow = CLng(rowList(i))
            If InputLevel(wsIn, inRow) = col And Trim$(CellText(wsIn.Cells(inRow, IN_TEXT))) = oldName Then
                wsIn.Cells(inRow, IN_TEXT).Value = txt
                ApplyChartEdit = True
                Exit For
            End If
        Next i
        If Not ApplyChartEdit And parts(0) = "I" Then
            ' 작업항목 없이 입력된 세부작업이 작업항목으로 표시된 경우
            wsIn.Cells(CLng(rowList(0)), IN_TEXT).Value = txt
            ApplyChartEdit = True
        End If
    Else
        ' 날짜 (작업항목 줄)
        '   날짜가 있는 작업이 하나뿐 → 그 작업을 변경
        '   날짜가 있는 작업이 없음   → 작업항목 자체 행(세부작업명 없는 행)에 입력, 없으면 세부작업이 1개일 때 그 작업
        '   여러 개                  → 합친 값이라 바꿀 수 없음
        For i = LBound(rowList) To UBound(rowList)
            inRow = CLng(rowList(i))
            If HasAnyDate(wsIn, inRow) And Not IsSummaryRow(wsIn, inRow) Then
                n = n + 1
                tgt = inRow
            End If
            If own = 0 And InputLevel(wsIn, inRow) = 2 Then own = inRow
        Next i
        If parts(0) = "I" And n = 0 Then
            If own = 0 And UBound(rowList) = LBound(rowList) Then own = CLng(rowList(0))
            If own > 0 Then
                ApplyChartEdit = SetTaskDate(wsIn, own, c, v, msg)
            ElseIf Not IsEmpty(v) Then
                msg = "이 작업항목에는 세부작업이 여러 개 있습니다." & vbCrLf & "날짜는 각 세부작업 줄에 입력하세요."
            End If
        ElseIf parts(0) = "I" And n = 1 Then
            ApplyChartEdit = SetTaskDate(wsIn, tgt, c, v, msg)
        ElseIf Not IsEmpty(v) Then
            If parts(0) = "K" Then
                msg = "대분류 줄의 날짜는 아래 작업들을 합친 값이라 직접 입력할 수 없습니다." & vbCrLf & _
                      "작업항목이나 세부작업 줄에 입력하세요."
            Else
                msg = "이 작업항목의 날짜는 세부작업들을 합친 값이라 직접 바꿀 수 없습니다." & vbCrLf & _
                      "세부작업 줄이나 작업입력 시트에서 수정하세요."
            End If
        End If
    End If
End Function

' 날짜 수정 규칙 (빈 칸이 있어도 입력한 순서대로 채워짐)
'   시작일 입력 → 기간이 있으면 기간 유지(일정 이동), 없으면 1일
'   종료일 입력 → 시작일이 있으면 기간 다시 계산, 없으면 기간으로 시작일 계산
'   기간 입력   → 시작일이 있으면 종료일 다시 계산, 없으면 기간만 저장 (시작일 입력 때 사용)
Private Function SetTaskDate(ByVal wsIn As Worksheet, ByVal inRow As Long, ByVal c As Long, _
                             ByVal v As Variant, ByRef msg As String) As Boolean
    Dim dS As Date, newD As Date, nDur As Long
    Dim hasS As Boolean, hasDur As Boolean

    If IsEmpty(v) Then Exit Function            ' 지우기(Delete)는 원래대로
    hasS = ToDate(wsIn.Cells(inRow, IN_S).Value, dS)
    hasDur = ToDuration(wsIn.Cells(inRow, IN_DUR).Value, nDur)

    Select Case c
        Case COL_S
            If Not ToDate(v, newD) Then
                msg = "시작일은 날짜로 입력하세요. (예: 2026-11-09)"
                Exit Function
            End If
            dS = newD
            hasS = True
            If Not hasDur Then nDur = 1
        Case COL_E
            If Not ToDate(v, newD) Then
                msg = "종료일은 날짜로 입력하세요. (예: 2026-11-09)"
                Exit Function
            End If
            If hasS Then
                If newD < dS Then
                    msg = "종료일이 시작일(" & Format(dS, "yyyy-mm-dd") & ")보다 빠릅니다."
                    Exit Function
                End If
                nDur = CLng(newD - dS) + 1
            Else
                If Not hasDur Then nDur = 1
                dS = newD - nDur + 1
                hasS = True
            End If
        Case COL_D
            If Not ToDuration(v, nDur) Then
                msg = "기간은 1 이상의 숫자(일)로 입력하세요."
                Exit Function
            End If
        Case Else
            Exit Function
    End Select

    If hasS Then wsIn.Cells(inRow, IN_S).Value = dS
    wsIn.Cells(inRow, IN_DUR).Value = nDur
    wsIn.Cells(inRow, IN_E).FormulaR1C1 = END_FORMULA
    SetTaskDate = True
End Function

' 세부작업 이름 변경 (왼쪽 표시는 "세부작업 하단표기" 를 붙여 보여 줌)
Private Function SetDetailName(ByVal wsIn As Worksheet, ByVal inRow As Long, ByVal txt As String) As Boolean
    Dim det As String, low As String
    If txt = "" Then Exit Function
    det = Trim$(CellText(wsIn.Cells(inRow, IN_TEXT)))
    low = Trim$(CellText(wsIn.Cells(inRow, IN_LOW)))
    If low <> "" Then
        If txt = det & " " & low Then Exit Function
        If Len(txt) > Len(low) + 1 And Right$(txt, Len(low) + 1) = " " & low Then
            txt = Trim$(Left$(txt, Len(txt) - Len(low) - 1))
        Else
            wsIn.Cells(inRow, IN_LOW).ClearContents
        End If
    ElseIf txt = det Then
        Exit Function
    End If
    wsIn.Cells(inRow, IN_TEXT).Value = txt
    SetDetailName = True
End Function

Private Function HasAnyDate(ByVal wsIn As Worksheet, ByVal inRow As Long) As Boolean
    Dim d As Date
    HasAnyDate = ToDate(wsIn.Cells(inRow, IN_S).Value, d) Or ToDate(wsIn.Cells(inRow, IN_E).Value, d)
End Function

' 왼쪽 표시용 기호(○ - ·) 떼기
Private Function CleanLabel(ByVal s As String) As String
    s = Trim$(s)
    Do While Len(s) > 0
        Select Case Left$(s, 1)
            Case "○", "●", "◎", "*", "＊", "-", "·", "ㆍ"
                s = Trim$(Mid$(s, 2))
            Case Else
                Exit Do
        End Select
    Loop
    CleanLabel = s
End Function

' 입력이 바뀐 횟수 : 바차트 시트에 기록된 값과 다르면 다시 그려야 함
Private Function GetVersion() As Long
    If Not SheetExists(SH_MAIN) Then Exit Function
    GetVersion = Val(CellText(ThisWorkbook.Worksheets(SH_MAIN).Cells(VER_ROW, VER_COL)))
End Function

Private Sub BumpVersion()
    Dim evOld As Boolean
    If Not SheetExists(SH_MAIN) Then Exit Sub
    evOld = Application.EnableEvents
    Application.EnableEvents = False
    ThisWorkbook.Worksheets(SH_MAIN).Cells(VER_ROW, VER_COL).Value = GetVersion() + 1
    Application.EnableEvents = evOld
End Sub


'===================================================================
'  5. 이전 파일에서 가져오기 : 새 버전 파일로 옮길 때 작업입력/메인 설정/공휴일 복사
'===================================================================
Public Sub ImportFromOldFile()
    Dim f As Variant
    If Not SheetExists(SH_INPUT) Or Not SheetExists(SH_MAIN) Then
        Notify "먼저 [SetupWorkbook]으로 초기 설정을 해 주세요."
        Exit Sub
    End If
    f = Application.GetOpenFilename("Excel 파일 (*.xlsm;*.xlsx;*.xls),*.xlsm;*.xlsx;*.xls", , _
                                    "가져올 이전 바차트 파일을 선택하세요")
    If VarType(f) = vbBoolean Then Exit Sub
    ImportFromFile CStr(f)
End Sub

Public Sub ImportFromFile(ByVal f As String)
    Dim nm As String, wb As Workbook, opened As Boolean
    Dim src As Worksheet, dst As Worksheet, srcMain As Worksheet, srcHol As Worksheet, dstHol As Worksheet
    Dim lr As Long, r As Long, n As Long, secOld As Long
    Dim srcSh As Worksheet, dstSh As Worksheet

    If LCase$(f) = LCase$(ThisWorkbook.FullName) Then
        Notify "지금 열려 있는 이 파일입니다. 이전 버전 파일을 선택해 주세요."
        Exit Sub
    End If
    nm = Mid$(f, InStrRev(f, Application.PathSeparator) + 1)
    If LCase$(nm) = LCase$(ThisWorkbook.Name) Then
        Notify "지금 파일과 이름이 같은 파일은 엑셀에서 동시에 열 수 없습니다." & vbCrLf & _
               "이전 파일의 이름을 바꾼 뒤 (예: 바차트_이전.xlsm) 다시 선택해 주세요."
        Exit Sub
    End If
    If Not gQuiet Then
        If MsgBox("작업입력 시트의 현재 내용을 지우고 선택한 파일의 작업입력 / 메인 설정 / 공휴일을 가져옵니다." & _
                  vbCrLf & "계속할까요?", vbYesNo + vbQuestion, "바차트") <> vbYes Then Exit Sub
    End If

    secOld = GetAutoSecurity()
    gBusy = True
    Application.EnableEvents = False
    Application.ScreenUpdating = False
    On Error GoTo EH

    ' 이미 열려 있으면 그대로 쓰고, 아니면 매크로를 끈 채 읽기 전용으로 열기
    On Error Resume Next
    Set wb = Workbooks(nm)
    On Error GoTo EH
    If wb Is Nothing Then
        SetAutoSecurity 3                         ' msoAutomationSecurityForceDisable
        Set wb = Workbooks.Open(Filename:=f, ReadOnly:=True, UpdateLinks:=0)
        SetAutoSecurity secOld
        opened = True
    End If

    On Error Resume Next
    Set src = wb.Worksheets(SH_INPUT)
    Set srcMain = wb.Worksheets(SH_MAIN)
    Set srcHol = wb.Worksheets(SH_HOL)
    On Error GoTo EH
    If src Is Nothing Then
        If opened Then wb.Close SaveChanges:=False
        Application.ScreenUpdating = True
        Application.EnableEvents = True
        gBusy = False
        Notify "선택한 파일에 [" & SH_INPUT & "] 시트가 없습니다."
        Exit Sub
    End If

    '--- 작업입력 ---
    Set dst = ThisWorkbook.Worksheets(SH_INPUT)
    n = ImportInputFrom(src, dst)

    '--- 메인 설정 (같은 이름의 설정 항목만) ---
    If Not srcMain Is Nothing Then
        For r = CFG_TITLE To CFG_LAST
            If CellText(srcMain.Cells(r, 2)) = CellText(ThisWorkbook.Worksheets(SH_MAIN).Cells(r, 2)) Then
                ThisWorkbook.Worksheets(SH_MAIN).Cells(r, CFG_COL).Value = srcMain.Cells(r, CFG_COL).Value
            End If
        Next r
    End If

    '--- 공종 / 주요일정 (새 양식 파일에 있을 때) ---
    On Error Resume Next
    Set srcSh = Nothing
    Set srcSh = wb.Worksheets(SH_TRADE)
    On Error GoTo EH
    If Not srcSh Is Nothing And SheetExists(SH_TRADE) Then
        Set dstSh = ThisWorkbook.Worksheets(SH_TRADE)
        dstSh.Range("A3:C200").ClearContents
        dstSh.Range("B3:B200").Interior.Pattern = xlNone
        lr = srcSh.Cells(srcSh.Rows.Count, 1).End(xlUp).Row
        For r = 3 To lr
            dstSh.Cells(r, 1).Value = srcSh.Cells(r, 1).Value
            dstSh.Cells(r, 3).Value = srcSh.Cells(r, 3).Value
            If CellText(srcSh.Cells(r, 1)) <> "" Then dstSh.Cells(r, 2).Interior.Color = srcSh.Cells(r, 2).Interior.Color
        Next r
    End If
    On Error Resume Next
    Set srcSh = Nothing
    Set srcSh = wb.Worksheets(SH_EVT)
    On Error GoTo EH
    If Not srcSh Is Nothing And SheetExists(SH_EVT) Then
        Set dstSh = ThisWorkbook.Worksheets(SH_EVT)
        dstSh.Range("A3:C500").ClearContents
        lr = srcSh.Cells(srcSh.Rows.Count, 1).End(xlUp).Row
        For r = 3 To lr
            dstSh.Cells(r, 1).Value = srcSh.Cells(r, 1).Value
            dstSh.Cells(r, 2).Value = srcSh.Cells(r, 2).Value
            dstSh.Cells(r, 3).Value = srcSh.Cells(r, 3).Value
        Next r
    End If

    '--- 공휴일 ---
    If Not srcHol Is Nothing Then
        Set dstHol = ThisWorkbook.Worksheets(SH_HOL)
        lr = srcHol.Cells(srcHol.Rows.Count, 1).End(xlUp).Row
        dstHol.Range(dstHol.Cells(HOL_FIRST_ROW, 1), dstHol.Cells(dstHol.Rows.Count, 2)).ClearContents
        For r = HOL_FIRST_ROW To lr
            dstHol.Cells(r, 1).Value = srcHol.Cells(r, 1).Value
            dstHol.Cells(r, 2).Value = srcHol.Cells(r, 2).Value
        Next r
    End If

    If opened Then wb.Close SaveChanges:=False
    ApplyInputFormats dst
    RecalcInputHelpers dst
    RefreshInputGantt dst, True
    Application.ScreenUpdating = True
    Application.EnableEvents = True
    gBusy = False
    BumpVersion
    dst.Activate
    Notify n & "개 행을 가져왔습니다." & vbCrLf & "메인 시트에서 [바차트 생성]을 눌러 주세요."
    Exit Sub

EH:
    nm = Err.Number & " : " & Err.Description
    SetAutoSecurity secOld
    On Error Resume Next
    If opened Then wb.Close SaveChanges:=False
    Application.ScreenUpdating = True
    Application.EnableEvents = True
    gBusy = False
    Notify "가져오는 중 오류가 발생했습니다." & vbCrLf & nm
End Sub


'===================================================================
'  6. 작업입력 간트차트 (조건부 서식) / 공종 / 주요 이벤트
'===================================================================
' [색상 다시 적용] 버튼 : 들여쓰기·적용 공종·간트 날짜·조건부 서식을 다시 맞춤
Public Sub RefreshInputSheet()
    Dim wsIn As Worksheet, evOld As Boolean
    If Not SheetExists(SH_INPUT) Then Exit Sub
    Set wsIn = ThisWorkbook.Worksheets(SH_INPUT)
    evOld = Application.EnableEvents
    gBusy = True
    Application.EnableEvents = False
    Application.ScreenUpdating = False
    Application.Calculation = xlCalculationManual
    RecalcInputHelpers wsIn
    RefreshInputGantt wsIn, True
    ApplyInputFormats wsIn
    Application.Calculation = xlCalculationAutomatic
    Application.ScreenUpdating = True
    Application.EnableEvents = evOld
    gBusy = False
    BumpVersion
End Sub

Public Sub GoToTrades()
    If SheetExists(SH_TRADE) Then ThisWorkbook.Worksheets(SH_TRADE).Activate
End Sub

' [주요 이벤트 추가] : 날짜 / 내용 / 색상을 물어보고 주요일정 시트에 추가
Public Sub AddEvent()
    Dim sD As String, d As Date, txt As String, clr As String, we As Worksheet, r As Long
    If Not SheetExists(SH_EVT) Then
        Notify "[" & SH_EVT & "] 시트가 없습니다. 초기 설정(SetupWorkbook)을 다시 실행해 주세요."
        Exit Sub
    End If
    sD = InputBox("이벤트 날짜를 입력하세요. (예: 2026-11-05)", "주요 이벤트 추가", Format(Date, "yyyy-mm-dd"))
    If Trim$(sD) = "" Then Exit Sub
    If Not ToDate(sD, d) Then
        Notify "날짜 형식이 아닙니다. (예: 2026-11-05)"
        Exit Sub
    End If
    txt = InputBox("이벤트 내용을 입력하세요. (예: Shut-Down 착수)", "주요 이벤트 추가")
    If Trim$(txt) = "" Then Exit Sub
    clr = InputBox("색상을 입력하세요. (빨강 / 파랑 / 초록 / 주황 / 검정)", "주요 이벤트 추가", "빨강")
    If Trim$(clr) = "" Then clr = "빨강"

    Set we = ThisWorkbook.Worksheets(SH_EVT)
    r = we.Cells(we.Rows.Count, 1).End(xlUp).Row + 1
    If r < 3 Then r = 3
    gBusy = True
    Application.EnableEvents = False
    we.Cells(r, 1).Value = d
    SetText we.Cells(r, 2), Trim$(txt)
    SetText we.Cells(r, 3), Trim$(clr)
    Application.EnableEvents = True
    gBusy = False
    BumpVersion
    If IsChartSheet(ActiveSheet.Name) Then
        RedrawChart
    Else
        Notify "주요 이벤트를 추가했습니다. (" & Format(d, "yyyy-mm-dd") & "  " & txt & ")" & vbCrLf & _
               "바차트 시트를 열면 날짜 아래 ▼ 로 표시됩니다."
    End If
End Sub

Private Sub LoadTrades()
    Dim ws As Worksheet, r As Long, lastRow As Long, nm As String
    mTrN = 0
    ReDim mTrName(1 To 1): ReDim mTrColor(1 To 1)
    If Not SheetExists(SH_TRADE) Then Exit Sub
    Set ws = ThisWorkbook.Worksheets(SH_TRADE)
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
    If lastRow < 3 Then Exit Sub
    ReDim mTrName(1 To lastRow): ReDim mTrColor(1 To lastRow)
    For r = 3 To lastRow
        nm = Trim$(CellText(ws.Cells(r, 1)))
        If nm <> "" Then
            mTrN = mTrN + 1
            mTrName(mTrN) = nm
            mTrColor(mTrN) = ws.Cells(r, 2).Interior.Color
        End If
    Next r
End Sub

' 공종 색 (목록에 없으면 검정)
Private Function TradeColor(ByVal nm As String) As Long
    Dim i As Long
    For i = 1 To mTrN
        If mTrName(i) = nm Then TradeColor = mTrColor(i): Exit Function
    Next i
End Function

Private Function IsDarkColor(ByVal clr As Long) As Boolean
    IsDarkColor = ((clr Mod 256) * 0.299 + ((clr \ 256) Mod 256) * 0.587 + ((clr \ 65536) Mod 256) * 0.114) < 150
End Function

' 단계 글자 → 1 대분류 / 2 작업항목 / 3 세부작업 / 0 없음
Private Function LevelOfText(ByVal t As String) As Integer
    Select Case Replace(Trim$(t), " ", "")
        Case LVL_CAT, "대", "1": LevelOfText = 1
        Case LVL_ITEM, "중", "항목", "2": LevelOfText = 2
        Case LVL_DET, "소", "세부", "3": LevelOfText = 3
    End Select
End Function

' 작업입력 : 단계별 들여쓰기 + 적용 공종(숨김 I열, 비어 있으면 위 단계 공종) +
'            대분류·작업항목 요약 날짜 (아래 작업들의 최초 시작일 ~ 최종 종료일, 숨김 J열 = "S")
Private Sub RecalcInputHelpers(ByVal wsIn As Worksheet, Optional ByVal indentFrom As Long = 0, _
                               Optional ByVal indentTo As Long = 0)
    Dim lastRow As Long, n As Long, v As Variant, fl As Variant, outv() As Variant, i As Long, j As Long
    Dim lv() As Integer, rs() As Double, re() As Double, sm() As Boolean, smS() As Double, smE() As Double
    Dim catT As String, itemT As String, t As String, txt As String, d As Date, nd As Long
    Dim r As Long, a As Double, b As Double

    lastRow = LastInputRow(wsIn)
    If lastRow < IN_FIRST_ROW Then Exit Sub
    n = lastRow - IN_FIRST_ROW + 1
    v = wsIn.Range(wsIn.Cells(IN_FIRST_ROW, IN_LVL), wsIn.Cells(lastRow, IN_DUR)).Value
    fl = wsIn.Range(wsIn.Cells(IN_FIRST_ROW, IN_SUMFLAG), wsIn.Cells(lastRow + 1, IN_SUMFLAG)).Value
    ReDim outv(1 To n, 1 To 1)
    ReDim lv(1 To n): ReDim rs(1 To n): ReDim re(1 To n)
    ReDim sm(1 To n): ReDim smS(1 To n): ReDim smE(1 To n)

    ' 단계, 적용 공종, 각 행 자체 날짜
    For i = 1 To n
        lv(i) = LevelOfText(VarText(v(i, IN_LVL)))
        t = Trim$(VarText(v(i, IN_TRADE)))
        txt = Trim$(VarText(v(i, IN_TEXT)))
        If ToDate(v(i, IN_S), d) Then
            rs(i) = CDbl(d)
            If ToDuration(v(i, IN_DUR), nd) Then re(i) = rs(i) + nd - 1 Else re(i) = rs(i)
        End If
        If lv(i) = 0 And (txt <> "" Or rs(i) > 0) Then lv(i) = 3
        Select Case lv(i)
            Case 1
                catT = t
                itemT = t
                outv(i, 1) = t
            Case 2
                If t <> "" Then itemT = t Else itemT = catT
                outv(i, 1) = itemT
            Case 3
                If t <> "" Then outv(i, 1) = t Else outv(i, 1) = itemT
            Case Else
                outv(i, 1) = ""
        End Select
        If lv(i) > 0 Then
            r = IN_FIRST_ROW + i - 1
            If indentFrom = 0 Or (r >= indentFrom And r <= indentTo) Then wsIn.Cells(r, IN_TEXT).IndentLevel = lv(i) - 1
        End If
    Next i
    wsIn.Range(wsIn.Cells(IN_FIRST_ROW, IN_TRADE_EFF), wsIn.Cells(lastRow, IN_TRADE_EFF)).Value = outv

    ' 작업항목 요약 : 바로 아래 세부작업들의 범위
    For i = 1 To n
        If lv(i) = 2 Then
            For j = i + 1 To n
                If lv(j) = 1 Or lv(j) = 2 Then Exit For
                If lv(j) = 3 And rs(j) > 0 Then AddRange sm(i), smS(i), smE(i), rs(j), re(j)
            Next j
        End If
    Next i
    ' 대분류 요약 : 아래 세부작업 + (요약이 아닌) 작업항목 자체 날짜
    For i = 1 To n
        If lv(i) = 1 Then
            For j = i + 1 To n
                If lv(j) = 1 Then Exit For
                If lv(j) = 3 And rs(j) > 0 Then AddRange sm(i), smS(i), smE(i), rs(j), re(j)
                If lv(j) = 2 And Not sm(j) And rs(j) > 0 And VarText(fl(j, 1)) <> "S" Then AddRange sm(i), smS(i), smE(i), rs(j), re(j)
            Next j
        End If
    Next i
    ' 쓰기 (바뀐 칸만)
    For i = 1 To n
        r = IN_FIRST_ROW + i - 1
        If sm(i) Then
            If rs(i) <> smS(i) Or re(i) <> smE(i) Then mLblDirty = mLblDirty & "," & r
            If rs(i) <> smS(i) Then wsIn.Cells(r, IN_S).Value = CDate(smS(i))
            If VarText(v(i, IN_DUR)) <> CStr(smE(i) - smS(i) + 1) Then wsIn.Cells(r, IN_DUR).Value = smE(i) - smS(i) + 1
            If Not wsIn.Cells(r, IN_E).HasFormula Then wsIn.Cells(r, IN_E).FormulaR1C1 = IN_END_FORMULA
            If VarText(fl(i, 1)) <> "S" Then wsIn.Cells(r, IN_SUMFLAG).Value = "S"
        ElseIf VarText(fl(i, 1)) = "S" Then
            ' 아래 작업 날짜가 없어짐 → 자동으로 넣었던 날짜 지움
            mLblDirty = mLblDirty & "," & r
            wsIn.Cells(r, IN_S).ClearContents
            wsIn.Cells(r, IN_DUR).ClearContents
            wsIn.Cells(r, IN_SUMFLAG).ClearContents
        End If
    Next i
End Sub

Private Sub AddRange(ByRef has As Boolean, ByRef mn As Double, ByRef mx As Double, ByVal a As Double, ByVal b As Double)
    If Not has Then
        has = True: mn = a: mx = b
    Else
        If a < mn Then mn = a
        If b > mx Then mx = b
    End If
End Sub

' 요약(자동 날짜) 행인지
Private Function IsSummaryRow(ByVal wsIn As Worksheet, ByVal r As Long) As Boolean
    IsSummaryRow = (CellText(wsIn.Cells(r, IN_SUMFLAG)) = "S")
End Function

' 작업입력 간트 날짜 머리글 (월 / 일 / 요일) : 메인의 차트 시작일, 없으면 최초 시작일이 있는 주 월요일부터 IN_GANTT_DAYS 일
' 시작일이 바뀌었을 때만 머리글을 다시 만들고, 막대 안 글자는 항상 다시 씀
Private Function RefreshInputGantt(ByVal wsIn As Worksheet, ByVal force As Boolean) As Boolean
    Dim d0 As Date, mn As Double, i As Long, dts() As Variant, wds() As Variant, d As Date, cur As Variant
    Dim g1 As Long, g2 As Long, lastFmt As Long, c As Long, band As Long, c1 As Long, newGrp As Boolean

    If SheetExists(SH_MAIN) Then
        If Not ToDate(ThisWorkbook.Worksheets(SH_MAIN).Cells(CFG_START, CFG_COL).Value, d0) Then d0 = 0
    End If
    If d0 = 0 Then
        mn = Application.WorksheetFunction.Min(wsIn.Range(wsIn.Cells(IN_FIRST_ROW, IN_S), _
                                                          wsIn.Cells(IN_FIRST_ROW + IN_FORMULA_ROWS * 2, IN_S)))
        If mn > 0 Then d0 = CDate(mn) Else d0 = Date
        d0 = d0 - (Weekday(d0, vbMonday) - 1)
    End If
    g1 = IN_GANTT0
    g2 = IN_GANTT0 + IN_GANTT_DAYS - 1
    cur = wsIn.Cells(IN_DAY_ROW, g1).Value
    If force Or Not IsDate(cur) Then
        GoTo Build
    ElseIf CDate(cur) <> d0 Then
        GoTo Build
    End If
    Exit Function                    ' 시작일 그대로 : 머리글 유지 (막대 글자는 호출한 쪽에서)

Build:
    lastFmt = LastInputRow(wsIn)
    If lastFmt < IN_FIRST_ROW + IN_FORMULA_ROWS - 1 Then lastFmt = IN_FIRST_ROW + IN_FORMULA_ROWS - 1
    ReDim dts(1 To 1, 1 To IN_GANTT_DAYS)
    ReDim wds(1 To 1, 1 To IN_GANTT_DAYS)
    For i = 1 To IN_GANTT_DAYS
        d = d0 + i - 1
        dts(1, i) = d
        wds(1, i) = Mid$("일월화수목금토", Weekday(d, vbSunday), 1)
    Next i
    With wsIn.Range(wsIn.Cells(IN_MONTH_ROW, g1), wsIn.Cells(IN_WD_ROW, g2))
        .UnMerge
        .ClearContents
        .Interior.Pattern = xlNone
        .Borders.LineStyle = xlContinuous
        .Borders.Color = CLR_GRID
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
        .Font.Size = 8
    End With
    wsIn.Range(wsIn.Cells(IN_DAY_ROW, g1), wsIn.Cells(IN_DAY_ROW, g2)).NumberFormat = "d"
    wsIn.Range(wsIn.Cells(IN_DAY_ROW, g1), wsIn.Cells(IN_DAY_ROW, g2)).Value = dts
    wsIn.Range(wsIn.Cells(IN_WD_ROW, g1), wsIn.Cells(IN_WD_ROW, g2)).NumberFormat = "@"
    wsIn.Range(wsIn.Cells(IN_WD_ROW, g1), wsIn.Cells(IN_WD_ROW, g2)).Value = wds

    ' 본문 세로선 : 날짜 점선, 월 경계 실선
    With wsIn.Range(wsIn.Cells(IN_FIRST_ROW, g1), wsIn.Cells(lastFmt, g2)).Borders(xlInsideVertical)
        .LineStyle = xlDot
        .Weight = xlThin
        .Color = CLR_GRID
    End With

    ' 월 (같은 달끼리 병합, 색 띠 번갈아)
    c1 = g1
    band = 0
    For c = g1 + 1 To g2 + 1
        If c > g2 Then
            newGrp = True
        Else
            newGrp = (Day(dts(1, c - g1 + 1)) = 1)
        End If
        If newGrp Then
            With wsIn.Range(wsIn.Cells(IN_MONTH_ROW, c1), wsIn.Cells(IN_MONTH_ROW, c - 1))
                If c - 1 > c1 Then .Merge
                .Interior.Color = IIf(band = 0, CLR_BAND1, CLR_BAND2)
                .Font.Bold = True
                .Font.Size = 9
            End With
            d = dts(1, c1 - g1 + 1)
            If c - c1 >= 6 Then
                SetText wsIn.Cells(IN_MONTH_ROW, c1), Year(d) & "년 " & Month(d) & "월"
            Else
                SetText wsIn.Cells(IN_MONTH_ROW, c1), Month(d) & "월"
            End If
            If c <= g2 Then
                With wsIn.Range(wsIn.Cells(IN_MONTH_ROW, c), wsIn.Cells(lastFmt, c)).Borders(xlEdgeLeft)
                    .LineStyle = xlContinuous
                    .Weight = xlThin
                    .Color = CLR_GRID_DARK
                End With
            End If
            band = 1 - band
            c1 = c
        End If
    Next c
    With wsIn.Range(wsIn.Cells(IN_WD_ROW, g1), wsIn.Cells(IN_WD_ROW, g2)).Borders(xlEdgeBottom)
        .LineStyle = xlContinuous
        .Weight = xlMedium
        .Color = 0
    End With
    wsIn.Range(wsIn.Cells(IN_MONTH_ROW, g1), wsIn.Cells(IN_WD_ROW, g2)).BorderAround _
        LineStyle:=xlContinuous, Weight:=xlMedium, Color:=0
    RefreshGanttLabels wsIn
    RefreshInputGantt = True
End Function

' 작업입력 간트 막대 안 글자 : 작업내용을 막대 가운데에 (막대보다 길면 막대 오른쪽에) - 전체 행
Private Sub RefreshGanttLabels(ByVal wsIn As Worksheet)
    Dim lastRow As Long, r As Long, d0 As Date
    If Not GanttStart(wsIn, d0) Then Exit Sub
    lastRow = LastInputRow(wsIn)
    If lastRow < IN_FIRST_ROW Then Exit Sub
    With wsIn.Range(wsIn.Cells(IN_FIRST_ROW, IN_GANTT0), wsIn.Cells(lastRow + 20, IN_GANTT0 + IN_GANTT_DAYS - 1))
        .ClearContents
        .HorizontalAlignment = xlGeneral
    End With
    For r = IN_FIRST_ROW To lastRow
        WriteGanttLabel wsIn, r, d0, False
    Next r
End Sub

' 지정한 행들만 : r1~r2 와 extra(",5,9") 목록
Private Sub RefreshGanttLabelRows(ByVal wsIn As Worksheet, ByVal r1 As Long, ByVal r2 As Long, ByVal extra As String)
    Dim r As Long, d0 As Date, parts As Variant, i As Long
    If Not GanttStart(wsIn, d0) Then Exit Sub
    If r1 < IN_FIRST_ROW Then r1 = IN_FIRST_ROW
    For r = r1 To r2
        WriteGanttLabel wsIn, r, d0, True
    Next r
    If extra <> "" Then
        parts = Split(Mid$(extra, 2), ",")
        For i = LBound(parts) To UBound(parts)
            r = CLng(parts(i))
            If r < r1 Or r > r2 Then WriteGanttLabel wsIn, r, d0, True
        Next i
    End If
End Sub

Private Function GanttStart(ByVal wsIn As Worksheet, ByRef d0 As Date) As Boolean
    Dim cur As Variant
    cur = wsIn.Cells(IN_DAY_ROW, IN_GANTT0).Value
    If Not IsDate(cur) Then Exit Function
    d0 = CDate(cur)
    GanttStart = True
End Function

' 한 행의 막대 글자 쓰기 (clearFirst = 그 행의 간트 칸을 먼저 비움)
Private Sub WriteGanttLabel(ByVal wsIn As Worksheet, ByVal r As Long, ByVal d0 As Date, ByVal clearFirst As Boolean)
    Dim g1 As Long, g2 As Long, c1 As Long, c2 As Long, dS As Date, nd As Long, txt As String
    g1 = IN_GANTT0
    g2 = IN_GANTT0 + IN_GANTT_DAYS - 1
    If clearFirst Then
        With wsIn.Range(wsIn.Cells(r, g1), wsIn.Cells(r, g2))
            .ClearContents
            .HorizontalAlignment = xlGeneral
        End With
    End If
    txt = Trim$(CellText(wsIn.Cells(r, IN_TEXT)))
    If txt = "" Or Not ToDate(wsIn.Cells(r, IN_S).Value, dS) Then Exit Sub
    If Not ToDuration(wsIn.Cells(r, IN_DUR).Value, nd) Then nd = 1
    c1 = g1 + CLng(dS - d0)
    c2 = c1 + nd - 1
    If c2 < g1 Or c1 > g2 Then Exit Sub
    If c1 < g1 Then c1 = g1
    If c2 > g2 Then c2 = g2
    If TextWidthPt(txt, 8) <= ColsWidth(wsIn, c1, c2) - 2 Then
        SetText wsIn.Cells(r, c1), txt
        wsIn.Range(wsIn.Cells(r, c1), wsIn.Cells(r, c2)).HorizontalAlignment = xlCenterAcrossSelection
    ElseIf c2 < g2 Then
        SetText wsIn.Cells(r, c2 + 1), txt          ' 막대가 짧으면 오른쪽에
        wsIn.Cells(r, c2 + 1).HorizontalAlignment = xlLeft
    End If
End Sub

' 작업입력 조건부 서식
'   간트 : 시작일~종료일 칸을 공종색으로 (공종 없으면 회색), 주말·공휴일 연노랑, 오늘 연분홍
'   머리글 : 토 파랑 / 일·공휴일 빨강,  표 : 대분류 행 강조, 작업항목 굵게, 공종 칸 공종색
Private Sub ApplyInputFormats(ByVal wsIn As Worksheet)
    Dim prev As Object, lastFmt As Long, g1 As Long, g2 As Long, i As Long
    Dim rngG As Range, sS As String, sE As String, sF As String, sT As String, hd As String, bar As String, hol As String

    LoadTrades
    lastFmt = LastInputRow(wsIn)
    If lastFmt < IN_FIRST_ROW + IN_FORMULA_ROWS - 1 Then lastFmt = IN_FIRST_ROW + IN_FORMULA_ROWS - 1
    g1 = IN_GANTT0
    g2 = IN_GANTT0 + IN_GANTT_DAYS - 1
    Set prev = ActiveSheet
    On Error Resume Next
    wsIn.Cells.FormatConditions.Delete
    On Error GoTo 0
    wsIn.Activate                    ' 조건부 서식 수식의 상대 참조는 선택한 칸 기준

    sS = "$" & ColLetter(IN_S) & IN_FIRST_ROW
    sE = "$" & ColLetter(IN_E) & IN_FIRST_ROW
    sF = "$" & ColLetter(IN_DUR) & IN_FIRST_ROW
    sT = "$" & ColLetter(IN_TRADE_EFF) & IN_FIRST_ROW
    hd = ColLetter(g1) & "$" & IN_DAY_ROW
    ' 막대 = 시작일 ~ 시작일+기간-1 (종료일 칸이 지워져도 그려지도록 시작일·기간으로)
    bar = "ISNUMBER(" & sS & "),ISNUMBER(" & sF & ")," & hd & ">=" & sS & "," & hd & "<=" & sS & "+" & sF & "-1"
    hol = "COUNTIF('" & SH_HOL & "'!$A$" & HOL_FIRST_ROW & ":$A$400," & hd & ")>0"

    ' 간트 막대
    Set rngG = wsIn.Range(wsIn.Cells(IN_FIRST_ROW, g1), wsIn.Cells(lastFmt, g2))
    wsIn.Cells(IN_FIRST_ROW, g1).Select
    For i = 1 To mTrN
        AddCF rngG, "=AND(" & bar & "," & sT & "=""" & mTrName(i) & """)", mTrColor(i), _
              IIf(IsDarkColor(mTrColor(i)), RGB(255, 255, 255), 0), True
    Next i
    AddCF rngG, "=AND(" & bar & ")", CLR_NO_TRADE
    AddCF rngG, "=" & hd & "=TODAY()", RGB(255, 228, 228)
    AddCF rngG, "=OR(WEEKDAY(" & hd & ",2)>5," & hol & ")", CLR_HOLIDAY_BG

    ' 날짜 머리글 (일·요일 2줄)
    wsIn.Cells(IN_DAY_ROW, g1).Select
    With wsIn.Range(wsIn.Cells(IN_DAY_ROW, g1), wsIn.Cells(IN_WD_ROW, g2))
        AddCF .Cells, "=" & hd & "=TODAY()", RGB(255, 255, 0), -1, True
        AddCF .Cells, "=WEEKDAY(" & hd & ")=7", CLR_HOLIDAY_BG, CLR_SAT
        AddCF .Cells, "=OR(WEEKDAY(" & hd & ")=1," & hol & ")", CLR_HOLIDAY_BG, CLR_SUN
    End With

    ' 공종 칸 (대분류 행 강조보다 먼저)
    wsIn.Cells(IN_FIRST_ROW, IN_TRADE).Select
    With wsIn.Range(wsIn.Cells(IN_FIRST_ROW, IN_TRADE), wsIn.Cells(lastFmt, IN_TRADE))
        For i = 1 To mTrN
            AddCF .Cells, "=$B" & IN_FIRST_ROW & "=""" & mTrName(i) & """", mTrColor(i), _
                  IIf(IsDarkColor(mTrColor(i)), RGB(255, 255, 255), 0), True
        Next i
    End With
    ' 요약(자동 계산) 날짜 : 남색 글자
    wsIn.Cells(IN_FIRST_ROW, IN_S).Select
    AddCF wsIn.Range(wsIn.Cells(IN_FIRST_ROW, IN_S), wsIn.Cells(lastFmt, IN_E)), _
          "=$" & ColLetter(IN_SUMFLAG) & IN_FIRST_ROW & "=""S""", -1, RGB(31, 56, 100), False
    ' 왼쪽 표 : 단계별 강조
    wsIn.Cells(IN_FIRST_ROW, IN_LVL).Select
    With wsIn.Range(wsIn.Cells(IN_FIRST_ROW, IN_LVL), wsIn.Cells(lastFmt, IN_NOTE))
        AddCF .Cells, "=$A" & IN_FIRST_ROW & "=""" & LVL_CAT & """", CLR_CAT_ROW, -1, True
        AddCF .Cells, "=$A" & IN_FIRST_ROW & "=""" & LVL_ITEM & """", -1, -1, True
    End With

    wsIn.Cells(IN_FIRST_ROW, IN_TEXT).Select
    On Error Resume Next
    prev.Activate
    On Error GoTo 0
End Sub

Private Sub AddCF(ByVal rng As Range, ByVal f As String, ByVal fillClr As Long, _
                  Optional ByVal fontClr As Long = -1, Optional ByVal isBold As Boolean = False)
    Dim fc As Object
    On Error Resume Next
    Set fc = rng.FormatConditions.Add(Type:=2, Formula1:=f)     ' 2 = xlExpression
    If fc Is Nothing Then
        gLog = gLog & "조건부 서식 추가 실패: " & f & vbCrLf
        Exit Sub
    End If
    fc.SetLastPriority                                          ' 추가한 순서대로 우선순위
    If fillClr >= 0 Then fc.Interior.Color = fillClr
    If fontClr >= 0 Then fc.Font.Color = fontClr
    If isBold Then fc.Font.Bold = True
    On Error GoTo 0
End Sub

Private Function ColLetter(ByVal c As Long) As String
    Dim s As String
    Do While c > 0
        s = Chr$(65 + (c - 1) Mod 26) & s
        c = (c - 1) \ 26
    Loop
    ColLetter = s
End Function


'===================================================================
'  3. 최초 설정 : 메인 / 작업입력 / 공휴일 시트 만들기
'===================================================================
' 파일을 열 때(ThisWorkbook.Workbook_Open) 메인 시트가 없으면 자동 실행
Public Sub AutoSetupIfNeeded()
    If Not SheetExists(SH_MAIN) Then SetupWorkbook
End Sub

Public Sub SetupWorkbook()
    Dim exists As Boolean, ws As Worksheet, i As Long

    exists = SheetExists(SH_MAIN) Or SheetExists(SH_INPUT) Or SheetExists(SH_HOL)
    If exists And Not gQuiet Then
        If MsgBox("메인 / 작업입력 / 공종 / 주요일정 / 공휴일 시트를 새로 만듭니다." & vbCrLf & _
                  "기존 내용은 지워집니다. 계속할까요?", vbYesNo + vbExclamation) <> vbYes Then Exit Sub
    End If

    On Error GoTo EH
    gBusy = True
    Application.EnableEvents = False
    Application.ScreenUpdating = False
    BuildHolidaySheet RecreateSheet(SH_HOL)
    BuildEventSheet RecreateSheet(SH_EVT)
    BuildTradeSheet RecreateSheet(SH_TRADE)
    BuildMainSheet RecreateSheet(SH_MAIN)
    BuildInputSheet RecreateSheet(SH_INPUT)

    ' 시트 순서: 메인 → 작업입력 → 공종 → 주요일정 → 공휴일 (빈 기본 시트와 '시작' 안내 시트는 삭제)
    ThisWorkbook.Worksheets(SH_MAIN).Move Before:=ThisWorkbook.Worksheets(1)
    ThisWorkbook.Worksheets(SH_INPUT).Move After:=ThisWorkbook.Worksheets(SH_MAIN)
    ThisWorkbook.Worksheets(SH_TRADE).Move After:=ThisWorkbook.Worksheets(SH_INPUT)
    ThisWorkbook.Worksheets(SH_EVT).Move After:=ThisWorkbook.Worksheets(SH_TRADE)
    ThisWorkbook.Worksheets(SH_HOL).Move After:=ThisWorkbook.Worksheets(SH_EVT)
    Application.DisplayAlerts = False
    For i = ThisWorkbook.Worksheets.Count To 1 Step -1
        Set ws = ThisWorkbook.Worksheets(i)
        If ws.Name <> SH_MAIN And ws.Name <> SH_INPUT And ws.Name <> SH_HOL _
           And ws.Name <> SH_TRADE And ws.Name <> SH_EVT And Not IsChartSheet(ws.Name) Then
            If ws.Name = SH_START Then
                ws.Delete
            ElseIf Application.WorksheetFunction.CountA(ws.Cells) = 0 And ws.Shapes.Count = 0 Then
                ws.Delete
            End If
        End If
    Next i
    Application.DisplayAlerts = True
    Application.ScreenUpdating = True
    Application.EnableEvents = True
    gBusy = False
    BumpVersion
    ThisWorkbook.Worksheets(SH_MAIN).Activate

    Notify "초기 설정이 끝났습니다." & vbCrLf & vbCrLf & _
           "1) [작업입력] 시트에 작업을 입력하면 오른쪽에 공종색 간트차트가 바로 그려집니다." & vbCrLf & _
           "2) 일정을 조정한 뒤 [바차트 생성]을 누르면 보고용 바차트가 만들어집니다." & vbCrLf & vbCrLf & _
           "※ 파일은 'Excel 매크로 사용 통합 문서(*.xlsm)'로 저장해야 합니다."
    Exit Sub

EH:
    Application.DisplayAlerts = True
    Application.ScreenUpdating = True
    Application.EnableEvents = True
    gBusy = False
    Notify "초기 설정 중 오류가 발생했습니다." & vbCrLf & Err.Number & " : " & Err.Description
End Sub

Private Sub BuildMainSheet(ByVal ws As Worksheet)
    Dim r As Long, notes As Variant, i As Long

    ws.Cells.Font.Name = "맑은 고딕"
    ws.Cells.Font.Size = 10
    ws.Columns("A").ColumnWidth = 2
    ws.Columns("B").ColumnWidth = 24
    ws.Columns("C").ColumnWidth = 18
    ws.Columns("D").ColumnWidth = 52
    ws.Columns("E").ColumnWidth = 3
    ws.Columns("F").ColumnWidth = 22
    ws.Columns(VER_COL).Hidden = True

    SetText ws.Range("B2"), "BAR CHART 공정표 자동 작성"
    ws.Range("B2").Font.Size = 18
    ws.Range("B2").Font.Bold = True
    ws.Rows(2).RowHeight = 30
    SetText ws.Range("B3"), "작업입력 시트에 작업을 입력하고, 아래에서 표시 단위를 고른 뒤 [바차트 생성]을 누르세요."
    ws.Range("B3").Font.Color = CLR_GRID_DARK

    SetText ws.Cells(4, 2), "설정 항목"
    SetText ws.Cells(4, 3), "값"
    SetText ws.Cells(4, 4), "설명"
    With ws.Range("B4:D4")
        .Font.Bold = True
        .Interior.Color = CLR_HDR_LEFT
        .HorizontalAlignment = xlCenter
    End With

    CfgRow ws, CFG_TITLE, "공사명", "○○ 공사", "바차트 시트 제목에 표시 (예: ○○ 공사 공정표)"
    CfgRow ws, CFG_UNIT, "표시 단위", UNIT_DAY, "일 / 주 / 10일 / 월 중 선택 (단위별로 시트가 따로 생성)"
    CfgRow ws, CFG_START, "차트 시작일", "", "비워 두면 작업 최초 시작일 기준 자동"
    CfgRow ws, CFG_END, "차트 종료일", "", "비워 두면 작업 최종 종료일 기준 자동"
    CfgRow ws, CFG_BASE, "기준일 (빨간 세로선)", "", "입력하면 해당 날짜에 빨간 세로선 표시 (비우면 없음)"
    CfgRow ws, CFG_DETAIL, "세부작업 행", "펼침", "펼침 / 접힘 - 접힘이면 작업항목 줄에 바만 표시"
    CfgRow ws, CFG_DATECOLS, "시작·종료·기간 열", "표시", "표시 / 숨김"
    CfgRow ws, CFG_COLWIDTH, "기간 칸 너비", "", "일/주/10일/월 한 칸의 너비. 비워 두면 자동 (일 3.6 / 주 6.3 / 10일 7 / 월 9)"
    CfgRow ws, CFG_LABELSIZE, "바 글자 크기", "9", "바 위/아래 글자 크기. 공간이 좁으면 자동으로 줄어듦 (최소 6)"
    CfgRow ws, CFG_DDAY, "D-DAY 기준일", "", "SD 착수일 등. 입력하면 날짜 위에 D+1, D+2 … 줄 표시 (기준일 = D+1, 비우면 없음)"
    CfgRow ws, CFG_BARCOLOR, "바 색상", "검정", "검정 / 공종색 - 공종색이면 바 선과 원을 공종 색으로 표시하고 범례 추가"
    CfgRow ws, CFG_EVENTS, "주요 이벤트", "표시", "표시 / 숨김 - [주요일정] 시트의 일정을 날짜 아래 ▼ 화살표로 표시"

    ws.Range(ws.Cells(CFG_START, CFG_COL), ws.Cells(CFG_BASE, CFG_COL)).NumberFormat = "yyyy-mm-dd"
    ws.Cells(CFG_DDAY, CFG_COL).NumberFormat = "yyyy-mm-dd"
    AddListValidation ws.Cells(CFG_BARCOLOR, CFG_COL), "검정,공종색"
    AddListValidation ws.Cells(CFG_EVENTS, CFG_COL), "표시,숨김"
    AddListValidation ws.Cells(CFG_UNIT, CFG_COL), UNIT_DAY & "," & UNIT_WEEK & "," & UNIT_10D & "," & UNIT_MONTH
    AddListValidation ws.Cells(CFG_DETAIL, CFG_COL), "펼침,접힘"
    AddListValidation ws.Cells(CFG_DATECOLS, CFG_COL), "표시,숨김"

    With ws.Range(ws.Cells(4, 2), ws.Cells(CFG_LAST, 4))
        .Borders.LineStyle = xlContinuous
        .Borders.Color = CLR_GRID
    End With

    r = CFG_LAST + 3
    SetText ws.Cells(r, 2), "사용 방법"
    ws.Cells(r, 2).Font.Bold = True
    notes = Array( _
        "1. [작업입력] 시트에서 한 줄에 하나씩 구분(대분류/작업항목/세부작업) · 공종 · 작업내용 · 시작일 · 기간을 입력합니다.", _
        "   - 세부작업은 바로 위 작업항목, 작업항목은 바로 위 대분류에 속합니다. 공종을 비우면 위 단계 공종을 따릅니다.", _
        "   - 종료일은 수식(시작일+기간-1)으로 자동 계산되고, 오른쪽 간트차트에 공종색으로 바로 표시됩니다.", _
        "   - 작업내용은 선 위에, 하단표기는 선 아래에 표시됩니다. 공종과 색은 [공종] 시트에서 바꿉니다.", _
        "2. 위 설정에서 표시 단위(일/주/10일/월)를 고르고 [바차트 생성]을 누르면 보고용 바차트가 만들어집니다.", _
        "3. 바차트 시트 왼쪽의 [-]/[+] 또는 [세부작업 접기/펼치기] 버튼으로 세부작업 행을 숨기면", _
        "   작업항목 줄에 세부작업 바만 가로로 남습니다.", _
        "4. 바차트 시트 왼쪽의 구분·시작일·종료일·기간을 고치면 작업입력에 반영되고 바로 다시 그려집니다.", _
        "   (작업입력을 고친 경우에는 바차트 시트를 열 때 자동으로 다시 그려짐 / 바 영역에 직접 그린 것은 지워짐)", _
        "5. 공휴일은 [공휴일] 시트에서 추가/삭제하세요 (빨간 날짜로 표시).", _
        "6. 주요 이벤트는 [주요 이벤트 추가] 버튼이나 [주요일정] 시트에 날짜·내용을 넣으면 바차트에 ▼로 표시됩니다.", _
        "7. 새 버전 파일을 받으면 [이전 파일에서 가져오기]로 기존 작업입력·설정을 옮길 수 있습니다.")
    For i = LBound(notes) To UBound(notes)
        SetText ws.Cells(r + 1 + i, 2), notes(i)
    Next i

    ' 버튼
    DeleteButtons ws
    AddButton ws, "바차트 생성", "BuildChart", ws.Range("F5:F6")
    AddButton ws, "세부작업 접기", "CollapseDetails", ws.Range("F8:F8")
    AddButton ws, "세부작업 펼치기", "ExpandDetails", ws.Range("F9:F9")
    AddButton ws, "작업입력 시트로", "GoToInput", ws.Range("F11:F11")
    AddButton ws, "주요 이벤트 추가", "AddEvent", ws.Range("F13:F13")
    AddButton ws, "공종·색상 설정", "GoToTrades", ws.Range("F14:F14")
    AddButton ws, "이전 파일에서 가져오기", "ImportFromOldFile", ws.Range("F16:F16")

    ws.Activate
    ActiveWindow.DisplayGridlines = False
    SetTabColor ws, RGB(255, 192, 0)
End Sub

Private Sub CfgRow(ByVal ws As Worksheet, ByVal r As Long, ByVal lbl As String, _
                   ByVal v As String, ByVal desc As String)
    SetText ws.Cells(r, 2), lbl
    ws.Cells(r, 2).Font.Bold = True
    If v <> "" Then SetText ws.Cells(r, CFG_COL), v
    ws.Cells(r, CFG_COL).Interior.Color = CLR_INPUT_BG
    ws.Cells(r, CFG_COL).HorizontalAlignment = xlCenter
    SetText ws.Cells(r, 4), desc
    ws.Cells(r, 4).Font.Color = CLR_GRID_DARK
    ws.Rows(r).RowHeight = 20
End Sub

Private Sub BuildInputSheet(ByVal ws As Worksheet)
    Dim hdr As Variant, wid As Variant, i As Long, data As Variant, r As Long, lastFmt As Long

    ws.Cells.Font.Name = "맑은 고딕"
    ws.Cells.Font.Size = 10

    SetText ws.Range("A1"), "작업 입력"
    ws.Range("A1").Font.Size = 14
    ws.Range("A1").Font.Bold = True
    ws.Rows(1).RowHeight = 24
    SetText ws.Range("A2"), "※ 한 줄에 하나씩 구분·작업내용·시작일·기간 입력 → 종료일 자동.  대분류·작업항목 날짜는 아래 작업 범위로 자동 계산"
    ws.Range("A2").Font.Color = CLR_GRID_DARK
    ws.Range("A2").Font.Size = 9

    hdr = Array("구분", "공종", "작업내용 (선 위)", "하단표기", "시작일", "기간", "종료일", "비고", "적용공종", "요약")
    wid = Array(9, 7, 32, 10, 10.5, 5.5, 10.5, 10, 6, 4)
    For i = 0 To 9
        SetText ws.Cells(IN_HDR_ROW, i + 1), hdr(i)
        ws.Columns(i + 1).ColumnWidth = wid(i)
    Next i
    ws.Columns(IN_TRADE_EFF).Hidden = True
    ws.Columns(IN_SUMFLAG).Hidden = True
    ws.Columns(IN_GANTT0 - 1).ColumnWidth = 1
    With ws.Range(ws.Cells(IN_HDR_ROW, 1), ws.Cells(IN_HDR_ROW, IN_NOTE))
        .Font.Bold = True
        .Interior.Color = CLR_HDR_LEFT
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
    End With
    ws.Rows(IN_HDR_ROW).RowHeight = 22

    lastFmt = IN_FIRST_ROW + IN_FORMULA_ROWS - 1
    ws.Range(ws.Cells(IN_FIRST_ROW, IN_S), ws.Cells(lastFmt, IN_S)).NumberFormat = "yyyy-mm-dd"
    ws.Range(ws.Cells(IN_FIRST_ROW, IN_E), ws.Cells(lastFmt, IN_E)).NumberFormat = "yyyy-mm-dd"
    ws.Range(ws.Cells(IN_FIRST_ROW, IN_S), ws.Cells(lastFmt, IN_E)).HorizontalAlignment = xlCenter
    ws.Range(ws.Cells(IN_FIRST_ROW, IN_LVL), ws.Cells(lastFmt, IN_TRADE)).HorizontalAlignment = xlCenter
    ws.Range(ws.Cells(IN_FIRST_ROW, IN_LVL), ws.Cells(lastFmt, IN_LOW)).NumberFormat = "@"
    ws.Range(ws.Cells(IN_FIRST_ROW, IN_E), ws.Cells(lastFmt, IN_E)).FormulaR1C1 = IN_END_FORMULA
    ws.Range(ws.Cells(IN_FIRST_ROW, IN_E), ws.Cells(lastFmt, IN_E)).Interior.Color = RGB(242, 242, 242)
    With ws.Range(ws.Cells(IN_HDR_ROW, 1), ws.Cells(lastFmt, IN_NOTE)).Borders
        .LineStyle = xlContinuous
        .Color = CLR_GRID
    End With
    AddListValidation ws.Range(ws.Cells(IN_FIRST_ROW, IN_LVL), ws.Cells(lastFmt, IN_LVL)), _
                      LVL_CAT & "," & LVL_ITEM & "," & LVL_DET
    AddListValidation ws.Range(ws.Cells(IN_FIRST_ROW, IN_TRADE), ws.Cells(lastFmt, IN_TRADE)), _
                      "='" & SH_TRADE & "'!$A$3:$A$60"

    ' 예시 데이터 (구분|공종|작업내용|하단표기|시작일|기간)
    data = Array( _
        Array(LVL_CAT, "공사", "분체설비", "", "", ""), _
        Array(LVL_ITEM, "", "기계정비창고", "", "", ""), _
        Array(LVL_DET, "토목", "진입로", "", "2026-10-28", "6"), _
        Array(LVL_DET, "기계", "Anchor", "Padding", "2026-11-08", "3"), _
        Array(LVL_ITEM, "", "전기실", "", "", ""), _
        Array(LVL_DET, "토목", "기초 터파기", "", "2026-11-02", "5"), _
        Array(LVL_DET, "건축", "철근·거푸집", "", "2026-11-09", "6"), _
        Array(LVL_DET, "건축", "콘크리트 타설", "", "2026-11-16", "1"), _
        Array(LVL_CAT, "공사", "HOLDER", "", "", ""), _
        Array(LVL_ITEM, "", "HOLDER", "", "", ""), _
        Array(LVL_DET, "토목", "2구간 FLOOR 포장", "", "2026-11-03", "18"), _
        Array(LVL_ITEM, "철골", "철골 세우기", "", "2026-11-16", "10"))
    For i = LBound(data) To UBound(data)
        r = IN_FIRST_ROW + i
        ws.Cells(r, IN_LVL).Value = data(i)(0)
        If data(i)(1) <> "" Then ws.Cells(r, IN_TRADE).Value = data(i)(1)
        ws.Cells(r, IN_TEXT).Value = data(i)(2)
        If data(i)(3) <> "" Then ws.Cells(r, IN_LOW).Value = data(i)(3)
        If data(i)(4) <> "" Then ws.Cells(r, IN_S).Value = CDate(data(i)(4))
        If data(i)(5) <> "" Then ws.Cells(r, IN_DUR).Value = CLng(data(i)(5))
    Next i

    ' 오른쪽 간트차트 (머리글은 RefreshInputGantt 에서)
    ws.Range(ws.Columns(IN_GANTT0), ws.Columns(IN_GANTT0 + IN_GANTT_DAYS - 1)).ColumnWidth = 2.6
    ws.Range(ws.Cells(IN_FIRST_ROW, IN_GANTT0), ws.Cells(lastFmt, IN_GANTT0 + IN_GANTT_DAYS - 1)).Font.Size = 8
    ws.Rows(IN_MONTH_ROW).RowHeight = 15
    ws.Rows(IN_DAY_ROW).RowHeight = 13.5
    With ws.Range(ws.Cells(IN_FIRST_ROW, IN_GANTT0), ws.Cells(lastFmt, IN_GANTT0 + IN_GANTT_DAYS - 1)).Borders(xlInsideVertical)
        .LineStyle = xlDot
        .Color = CLR_GRID
    End With
    With ws.Range(ws.Cells(IN_FIRST_ROW, IN_GANTT0), ws.Cells(lastFmt, IN_GANTT0 + IN_GANTT_DAYS - 1)).Borders(xlInsideHorizontal)
        .LineStyle = xlDot
        .Color = CLR_GRID
    End With

    DeleteButtons ws
    AddButton ws, "바차트 생성", "BuildChart", ws.Range("C1:C1")
    AddButton ws, "색상 다시 적용", "RefreshInputSheet", ws.Range("D1:E1")
    AddButton ws, "메인으로", "GoToMain", ws.Range("F1:H1")

    RecalcInputHelpers ws
    RefreshInputGantt ws, True
    ApplyInputFormats ws

    ws.Activate
    ActiveWindow.FreezePanes = False
    ActiveWindow.DisplayGridlines = False
    ws.Cells(IN_FIRST_ROW, IN_GANTT0).Select
    ActiveWindow.FreezePanes = True
    SetTabColor ws, RGB(112, 173, 71)
End Sub

' 공종 시트 : 공종 이름과 색 (B열 칸 색을 바꾸면 그 색으로 표시)
Private Sub BuildTradeSheet(ByVal ws As Worksheet)
    Dim t As Variant, i As Long, p As Long, q As Long
    ws.Cells.Font.Name = "맑은 고딕"
    ws.Cells.Font.Size = 10
    SetText ws.Range("A1"), "공종 목록 - 이름을 바꾸거나 추가하고, B열 칸의 채우기 색을 바꾸면 그 색으로 표시됩니다. 바꾼 뒤 [색상 적용]을 누르세요."
    ws.Range("A1").Font.Bold = True
    SetText ws.Range("A2"), "공종"
    SetText ws.Range("B2"), "색"
    SetText ws.Range("C2"), "설명"
    With ws.Range("A2:C2")
        .Font.Bold = True
        .Interior.Color = CLR_HDR_LEFT
        .HorizontalAlignment = xlCenter
    End With
    ws.Columns("A").ColumnWidth = 14
    ws.Columns("B").ColumnWidth = 10
    ws.Columns("C").ColumnWidth = 40
    t = Array("공사|31,56,100|전체 공사·대분류", "조업|255,0,0|조업·정수 일정", "토목|0,176,80|", _
              "건축|191,143,0|", "기계|0,112,192|", "전기|255,192,0|", "배관|112,48,160|", _
              "철골|237,125,49|", "기타|166,166,166|")
    For i = LBound(t) To UBound(t)
        p = InStr(t(i), "|")
        q = InStr(p + 1, t(i), "|")
        SetText ws.Cells(3 + i, 1), Left$(t(i), p - 1)
        ws.Cells(3 + i, 2).Interior.Color = RgbText(Mid$(t(i), p + 1, q - p - 1))
        SetText ws.Cells(3 + i, 3), Mid$(t(i), q + 1)
    Next i
    ws.Range("A3:A60").NumberFormat = "@"
    With ws.Range("A2:C30").Borders
        .LineStyle = xlContinuous
        .Color = CLR_GRID
    End With
    DeleteButtons ws
    AddButton ws, "색상 적용", "RefreshInputSheet", ws.Range("E2:F3")
    SetTabColor ws, RGB(237, 125, 49)
End Sub

' 주요일정 시트 : 바차트 날짜 아래 ▼ 로 표시할 이벤트
Private Sub BuildEventSheet(ByVal ws As Worksheet)
    ws.Cells.Font.Name = "맑은 고딕"
    ws.Cells.Font.Size = 10
    SetText ws.Range("A1"), "주요 이벤트 - 바차트의 날짜 아래에 ▼ 화살표와 내용으로 표시됩니다. (색상 : 빨강 / 파랑 / 초록 / 주황 / 검정)"
    ws.Range("A1").Font.Bold = True
    SetText ws.Range("A2"), "날짜"
    SetText ws.Range("B2"), "내용"
    SetText ws.Range("C2"), "색상"
    With ws.Range("A2:C2")
        .Font.Bold = True
        .Interior.Color = CLR_HDR_LEFT
        .HorizontalAlignment = xlCenter
    End With
    ws.Columns("A").ColumnWidth = 12
    ws.Columns("B").ColumnWidth = 30
    ws.Columns("C").ColumnWidth = 8
    ws.Range("A3:A500").NumberFormat = "yyyy-mm-dd"
    ws.Range("B3:C500").NumberFormat = "@"
    ws.Range("A3:A500").HorizontalAlignment = xlCenter
    ws.Range("C3:C500").HorizontalAlignment = xlCenter
    AddListValidation ws.Range("C3:C500"), "빨강,파랑,초록,주황,검정"
    ws.Cells(3, 1).Value = CDate("2026-10-28")
    SetText ws.Cells(3, 2), "Shut-Down 착수"
    SetText ws.Cells(3, 3), "빨강"
    ws.Cells(4, 1).Value = CDate("2026-11-16")
    SetText ws.Cells(4, 2), "철골 반입"
    SetText ws.Cells(4, 3), "파랑"
    With ws.Range("A2:C40").Borders
        .LineStyle = xlContinuous
        .Color = CLR_GRID
    End With
    DeleteButtons ws
    AddButton ws, "이벤트 추가", "AddEvent", ws.Range("E2:F3")
    SetTabColor ws, RGB(255, 0, 0)
End Sub

Private Function RgbText(ByVal s As String) As Long
    Dim p As Variant
    p = Split(s, ",")
    RgbText = RGB(CLng(p(0)), CLng(p(1)), CLng(p(2)))
End Function

Private Sub BuildHolidaySheet(ByVal ws As Worksheet)
    Dim h As Variant, i As Long, p As Long

    ws.Cells.Font.Name = "맑은 고딕"
    ws.Cells.Font.Size = 10
    SetText ws.Range("A1"), "공휴일 목록 (바차트에서 빨간 날짜로 표시 / 매년 확인 후 추가·수정)"
    ws.Range("A1").Font.Bold = True
    SetText ws.Range("A2"), "날짜"
    SetText ws.Range("B2"), "명칭"
    With ws.Range("A2:B2")
        .Font.Bold = True
        .Interior.Color = CLR_HDR_LEFT
        .HorizontalAlignment = xlCenter
    End With
    ws.Columns("A").ColumnWidth = 14
    ws.Columns("B").ColumnWidth = 28

    h = Array( _
        "2026-01-01|신정", "2026-02-16|설날 연휴", "2026-02-17|설날", "2026-02-18|설날 연휴", _
        "2026-03-01|삼일절", "2026-03-02|대체공휴일(삼일절)", "2026-05-05|어린이날", _
        "2026-05-24|부처님오신날", "2026-05-25|대체공휴일(부처님오신날)", "2026-06-03|전국동시지방선거", _
        "2026-06-06|현충일", "2026-08-15|광복절", "2026-08-17|대체공휴일(광복절)", _
        "2026-09-24|추석 연휴", "2026-09-25|추석", "2026-09-26|추석 연휴", _
        "2026-10-03|개천절", "2026-10-05|대체공휴일(개천절)", "2026-10-09|한글날", "2026-12-25|성탄절", _
        "2027-01-01|신정", "2027-02-05|설날 연휴", "2027-02-06|설날", "2027-02-07|설날 연휴", _
        "2027-02-08|대체공휴일(설날)", "2027-03-01|삼일절", "2027-05-05|어린이날", _
        "2027-05-13|부처님오신날", "2027-06-06|현충일", "2027-08-15|광복절", "2027-08-16|대체공휴일(광복절)", _
        "2027-09-14|추석 연휴", "2027-09-15|추석", "2027-09-16|추석 연휴", _
        "2027-10-03|개천절", "2027-10-04|대체공휴일(개천절)", "2027-10-09|한글날", _
        "2027-10-11|대체공휴일(한글날)", "2027-12-25|성탄절", "2027-12-27|대체공휴일(성탄절)")
    For i = LBound(h) To UBound(h)
        p = InStr(h(i), "|")
        ws.Cells(HOL_FIRST_ROW + i, 1).Value = CDate(Left$(h(i), p - 1))
        SetText ws.Cells(HOL_FIRST_ROW + i, 2), Mid$(h(i), p + 1)
    Next i
    ws.Range(ws.Cells(HOL_FIRST_ROW, 1), ws.Cells(HOL_FIRST_ROW + 200, 1)).NumberFormat = "yyyy-mm-dd"
    ws.Range(ws.Cells(HOL_FIRST_ROW, 1), ws.Cells(HOL_FIRST_ROW + 200, 1)).HorizontalAlignment = xlCenter
    SetTabColor ws, CLR_SUN
End Sub


'===================================================================
'  공통 도우미
'===================================================================
Private Sub Notify(ByVal msg As String)
    If gQuiet Then
        gLog = gLog & msg & vbCrLf
    Else
        MsgBox msg, vbInformation, "바차트"
    End If
End Sub

Private Function SheetExists(ByVal nm As String) As Boolean
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = ThisWorkbook.Worksheets(nm)
    On Error GoTo 0
    SheetExists = Not ws Is Nothing
End Function

Private Function IsChartSheet(ByVal nm As String) As Boolean
    IsChartSheet = (Left$(nm, Len(SH_CHART_PREFIX)) = SH_CHART_PREFIX)
End Function

Private Function RecreateSheet(ByVal nm As String) As Worksheet
    Dim ws As Worksheet
    If SheetExists(nm) Then
        Application.DisplayAlerts = False
        ThisWorkbook.Worksheets(nm).Delete
        Application.DisplayAlerts = True
    End If
    Set ws = ThisWorkbook.Worksheets.Add(After:=ThisWorkbook.Worksheets(ThisWorkbook.Worksheets.Count))
    ws.Name = nm
    Set RecreateSheet = ws
End Function

Private Function CfgText(ByVal r As Long) As String
    CfgText = Trim$(CellText(ThisWorkbook.Worksheets(SH_MAIN).Cells(r, CFG_COL)))
End Function

Private Function NormalizeUnit(ByVal s As String) As String
    s = Replace(s, " ", "")
    If InStr(s, "10") > 0 Or InStr(s, "순") > 0 Then
        NormalizeUnit = UNIT_10D
    ElseIf InStr(s, "주") > 0 Then
        NormalizeUnit = UNIT_WEEK
    ElseIf InStr(s, "월") > 0 Then
        NormalizeUnit = UNIT_MONTH
    Else
        NormalizeUnit = UNIT_DAY
    End If
End Function

Private Function CellText(ByVal cell As Range) As String
    Dim v As Variant
    v = cell.Value
    If IsError(v) Or IsEmpty(v) Then
        CellText = ""
    Else
        CellText = CStr(v)
    End If
End Function

Private Function VarText(ByVal v As Variant) As String
    If IsError(v) Or IsEmpty(v) Then Exit Function
    VarText = CStr(v)
End Function

' 셀 값을 날짜로 변환 (날짜 / 날짜 일련번호 / "2026-10-28" / "2026.10.28")
Private Function ToDate(ByVal v As Variant, ByRef d As Date) As Boolean
    Dim s As String
    If IsError(v) Or IsEmpty(v) Then Exit Function
    If VarType(v) = vbString Then
        s = Replace(Trim$(v), ".", "-")
        If s = "" Or Not IsDate(s) Then Exit Function
        d = CDate(s)
    ElseIf IsDate(v) Then
        d = CDate(v)
    ElseIf IsNumeric(v) Then
        d = CDate(v)
    Else
        Exit Function
    End If
    If Year(d) < 1990 Or Year(d) > 2100 Then Exit Function
    d = DateSerial(Year(d), Month(d), Day(d))
    ToDate = True
End Function

Private Function ToDuration(ByVal v As Variant, ByRef n As Long) As Boolean
    If IsError(v) Or IsEmpty(v) Then Exit Function
    If VarType(v) = vbString Then v = Val(v)
    If Not IsNumeric(v) Then Exit Function
    If v < 1 Then Exit Function
    n = CLng(v)
    ToDuration = True
End Function

' 문자열을 그대로 표시 ("- 작업" 이 수식으로 바뀌는 것 방지)
Private Sub SetText(ByVal cell As Range, ByVal txt As String)
    cell.NumberFormat = "@"
    cell.Value = txt
End Sub

' 다른 파일(또는 시트)의 작업입력을 이 파일 작업입력으로 복사. 이전 양식(대분류/작업항목/세부작업 3칸)은 새 양식으로 변환
Public Function ImportInputFrom(ByVal src As Worksheet, ByVal dst As Worksheet) As Long
    Dim lastRow As Long, lr As Long, r As Long, c As Long, w As Long
    Dim oldFmt As Boolean, hasDt As Boolean, vA As String, vB As String, vC As String, vEnd As Variant
    ClearInputData dst
    oldFmt = (Trim$(CellText(src.Cells(IN_HDR_ROW, 1))) = "대분류")   ' v0.4 이전 양식 (대분류/작업항목/세부작업 3칸)
    lastRow = IN_FIRST_ROW - 1
    For c = 1 To 8
        lr = src.Cells(src.Rows.Count, c).End(xlUp).Row
        If src.Cells(lr, c).HasFormula Then lr = IN_FIRST_ROW - 1   ' 종료일 수식 열
        If lr > lastRow Then lastRow = lr
    Next c
    w = IN_FIRST_ROW
    For r = IN_FIRST_ROW To lastRow
        If oldFmt Then
            ' 이전 양식 : A 대분류 / B 작업항목 / C 세부작업 / D 하단 / E 시작 / F 종료 / G 기간 / H 비고
            vA = Trim$(CellText(src.Cells(r, 1)))
            vB = Trim$(CellText(src.Cells(r, 2)))
            vC = Trim$(CellText(src.Cells(r, 3)))
            vEnd = Empty
            If Not src.Cells(r, 6).HasFormula Then vEnd = src.Cells(r, 6).Value
            hasDt = Not IsEmpty(src.Cells(r, 5).Value) Or Not IsEmpty(vEnd) Or Not IsEmpty(src.Cells(r, 7).Value)
            If vA <> "" Then ImportPut dst, w, LVL_CAT, vA, "", Empty, Empty, Empty, ""
            If vB <> "" Then
                If vC = "" Then
                    ImportPut dst, w, LVL_ITEM, vB, CellText(src.Cells(r, 4)), src.Cells(r, 5).Value, vEnd, _
                              src.Cells(r, 7).Value, CellText(src.Cells(r, 8))
                Else
                    ImportPut dst, w, LVL_ITEM, vB, "", Empty, Empty, Empty, ""
                End If
            End If
            If vC <> "" Then
                ImportPut dst, w, LVL_DET, vC, CellText(src.Cells(r, 4)), src.Cells(r, 5).Value, vEnd, _
                          src.Cells(r, 7).Value, CellText(src.Cells(r, 8))
            ElseIf vB = "" And hasDt Then
                ImportPut dst, w, LVL_DET, "(일정)", CellText(src.Cells(r, 4)), src.Cells(r, 5).Value, vEnd, _
                          src.Cells(r, 7).Value, CellText(src.Cells(r, 8))
            End If
        Else
            ' 새 양식 : 그대로 복사 (종료일은 기간이 없을 때만 값으로)
            vEnd = Empty
            If Not src.Cells(r, IN_E).HasFormula Then vEnd = src.Cells(r, IN_E).Value
            hasDt = Not IsEmpty(src.Cells(r, IN_S).Value) Or Not IsEmpty(vEnd) Or Not IsEmpty(src.Cells(r, IN_DUR).Value)
            If CellText(src.Cells(r, IN_LVL)) & CellText(src.Cells(r, IN_TEXT)) <> "" Or hasDt Then
                ImportPut dst, w, CellText(src.Cells(r, IN_LVL)), CellText(src.Cells(r, IN_TEXT)), _
                          CellText(src.Cells(r, IN_LOW)), src.Cells(r, IN_S).Value, vEnd, _
                          src.Cells(r, IN_DUR).Value, CellText(src.Cells(r, IN_NOTE))
                dst.Cells(w - 1, IN_TRADE).Value = CellText(src.Cells(r, IN_TRADE))
            Else
                w = w + 1                         ' 빈 행 유지
            End If
        End If
    Next r
    ImportInputFrom = w - IN_FIRST_ROW
End Function

' 가져오기 : 작업입력 한 행 쓰기 (w 는 다음 행으로 이동)
Private Sub ImportPut(ByVal dst As Worksheet, ByRef w As Long, ByVal lvl As String, ByVal txt As String, _
                      ByVal low As String, ByVal vS As Variant, ByVal vEnd As Variant, ByVal vDur As Variant, _
                      ByVal note As String)
    Dim d As Date, nd As Long, dS As Date, dE As Date
    dst.Cells(w, IN_LVL).Value = lvl
    dst.Cells(w, IN_TEXT).Value = Trim$(txt)
    If Trim$(low) <> "" Then dst.Cells(w, IN_LOW).Value = Trim$(low)
    If note <> "" Then dst.Cells(w, IN_NOTE).Value = note
    If ToDate(vS, d) Then dst.Cells(w, IN_S).Value = d
    If ToDuration(vDur, nd) Then
        dst.Cells(w, IN_DUR).Value = nd
    ElseIf ToDate(vEnd, d) Then
        dst.Cells(w, IN_E).Value = d               ' 기간 없이 종료일만 → 기간 계산
    End If
    FixInputDates dst, w, dS, dE
    w = w + 1
End Sub

' 작업입력 데이터 지우기 (서식·종료일 수식은 다시 채움)
Private Sub ClearInputData(ByVal dst As Worksheet)
    Dim lr As Long
    lr = LastInputRow(dst)
    If lr < IN_FIRST_ROW + IN_FORMULA_ROWS - 1 Then lr = IN_FIRST_ROW + IN_FORMULA_ROWS - 1
    dst.Range(dst.Cells(IN_FIRST_ROW, IN_LVL), dst.Cells(lr, IN_SUMFLAG)).ClearContents
    dst.Range(dst.Cells(IN_FIRST_ROW, IN_LVL), dst.Cells(lr, IN_NOTE)).Interior.Pattern = xlNone
    dst.Range(dst.Cells(IN_FIRST_ROW, IN_TEXT), dst.Cells(lr, IN_TEXT)).IndentLevel = 0
    dst.Range(dst.Cells(IN_FIRST_ROW, IN_E), dst.Cells(lr, IN_E)).Interior.Color = RGB(242, 242, 242)
    dst.Range(dst.Cells(IN_FIRST_ROW, IN_E), dst.Cells(lr, IN_E)).FormulaR1C1 = IN_END_FORMULA
End Sub

' 다른 파일을 열 때 그 파일의 매크로가 실행되지 않도록 (매크로 보안 설정)
Private Function GetAutoSecurity() As Long
    GetAutoSecurity = 1
    On Error Resume Next
    GetAutoSecurity = Application.AutomationSecurity
    On Error GoTo 0
End Function

Private Sub SetAutoSecurity(ByVal v As Long)
    On Error Resume Next
    Application.AutomationSecurity = v
    On Error GoTo 0
End Sub

Private Sub SetTabColor(ByVal ws As Worksheet, ByVal clr As Long)
    On Error Resume Next
    ws.Tab.Color = clr
    On Error GoTo 0
End Sub

Private Sub AddListValidation(ByVal cell As Range, ByVal list As String)
    On Error Resume Next
    With cell.Validation
        .Delete
        .Add Type:=xlValidateList, AlertStyle:=xlValidAlertStop, Operator:=xlBetween, Formula1:=list
        .InCellDropdown = True
    End With
    On Error GoTo 0
End Sub

Private Sub AddButton(ByVal ws As Worksheet, ByVal caption As String, ByVal macro As String, _
                      ByVal rng As Range)
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

Private Sub DeleteButtons(ByVal ws As Worksheet)
    Dim i As Long
    On Error Resume Next
    For i = ws.Shapes.Count To 1 Step -1
        If Left$(ws.Shapes(i).Name, 4) = "btn_" Then ws.Shapes(i).Delete
    Next i
    On Error GoTo 0
End Sub
