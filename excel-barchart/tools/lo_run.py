"""LibreOffice(헤드리스)에서 BarChart.bas 를 실행해 결과를 확인하는 테스트 도구.

사용: python3 lo_run.py <출력폴더> [--base=YYYY-MM-DD] [--script=파일.vba] [단위 ...]
  - --base=2026-11-05 : 메인 시트 기준일 지정
  - --script=파일.vba  : 바차트 생성 뒤 실행할 VBA 문장 (WriteLog "..." 로 결과 기록)
  - 단위별로 BuildChart 를 실행하고 <출력폴더>/result.xlsx, result.pdf, log.txt 를 만든다.
  - LibreOffice 의 VBA 호환 모드로 실행하므로 Excel 과 화면이 100% 같지는 않다.
"""
import os, subprocess, sys, time
import uno
from com.sun.star.beans import PropertyValue

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "src", "BarChart.bas")


def prop(name, value):
    p = PropertyValue()
    p.Name, p.Value = name, value
    return p


def module_code(path):
    lines = open(path, encoding="utf-8").read().splitlines()
    lines = [l for l in lines if not l.startswith("Attribute ")]
    return "Option VBASupport 1\n" + "\n".join(lines) + "\n"


def main():
    out = os.path.abspath(sys.argv[1])
    args = sys.argv[2:]
    base = ""
    extra = ""
    while args and args[0].startswith("--"):
        opt, _, val = args.pop(0).partition("=")
        if opt == "--base":
            base = val
        elif opt == "--script":
            extra = open(val, encoding="utf-8").read()
    units = args or ["일"]
    os.makedirs(out, exist_ok=True)
    log = os.path.join(out, "log.txt")
    if os.path.exists(log):
        os.remove(log)

    port = 2002
    proc = subprocess.Popen(["soffice", "--headless", "--invisible", "--norestore",
                             f"--accept=socket,host=localhost,port={port};urp;"],
                            stderr=subprocess.DEVNULL)
    local = uno.getComponentContext()
    resolver = local.ServiceManager.createInstanceWithContext(
        "com.sun.star.bridge.UnoUrlResolver", local)
    for _ in range(80):
        try:
            ctx = resolver.resolve(f"uno:socket,host=localhost,port={port};urp;StarOffice.ComponentContext")
            break
        except Exception:
            time.sleep(0.5)
    desktop = ctx.ServiceManager.createInstanceWithContext("com.sun.star.frame.Desktop", ctx)
    doc = desktop.loadComponentFromURL("private:factory/scalc", "_blank", 0, (prop("Hidden", False),))
    try:
        libs = doc.BasicLibraries
        libs.VBACompatibilityMode = True
        libs.ProjectName = "VBAProject"
        lib = libs.createLibrary("VBAProject") if not libs.hasByName("VBAProject") else libs.getByName("VBAProject")
        lib.insertByName("BarChart", module_code(SRC))
        calls = "\n".join(
            f'    Worksheets("메인").Cells(6, 3).Value = "{u}"\n    BuildChart' for u in units)
        base_stmt = (f'    Worksheets("메인").Cells(9, 3).Value = CDate("{base}")' if base else "")
        harness = f'''Option VBASupport 1
Sub WriteLog(ByVal s As String)
    Dim f As Integer
    f = FreeFile
    Open "{log}" For Append As #f
    Print #f, s
    Close #f
End Sub
Function FindRow(ByVal ws As Object, ByVal txt As String, Optional ByVal col As Long = 1) As Long
    Dim q As Long
    For q = 1 To 400
        If Trim(ws.Cells(q, col).Value) = txt Then FindRow = q: Exit Function
    Next q
End Function
Function D2(ByVal v As Variant) As String
    If IsDate(v) Then D2 = Format(v, "mm-dd") Else D2 = "[" & v & "]"
End Function
Sub RunTest()
    On Error GoTo EH
    gQuiet = True
    WriteLog "start"
    SetupWorkbook
    WriteLog "setup done: " & gLog
    gLog = ""
{base_stmt}
{calls}
{extra}
    WriteLog "DONE"
    WriteLog gLog
    Exit Sub
EH:
    WriteLog "ERROR " & Err.Number & " : " & Err.Description & " (line " & Erl & ")"
    WriteLog gLog
End Sub
'''
        lib.insertByName("TestHarness", harness)
        script = doc.ScriptProvider.getScript(
            "vnd.sun.star.script:VBAProject.TestHarness.RunTest?language=Basic&location=document")
        script.invoke((), (), ())
        doc.storeToURL(uno.systemPathToFileUrl(os.path.join(out, "result.xlsx")),
                       (prop("FilterName", "Calc Office Open XML"),))
        doc.storeToURL(uno.systemPathToFileUrl(os.path.join(out, "result.pdf")),
                       (prop("FilterName", "calc_pdf_Export"),))
    finally:
        doc.close(True)
        try:
            desktop.terminate()
        except Exception:
            pass
        proc.wait(timeout=30)
    print(open(log, encoding="utf-8", errors="replace").read() if os.path.exists(log) else "NO LOG (macro aborted)")


if __name__ == "__main__":
    main()
