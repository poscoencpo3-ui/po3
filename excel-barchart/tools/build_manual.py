"""사용설명서 HTML 만들기.

  python3 tools/build_manual.py [--artifact 출력경로]

  docs/manual/manual_src.html 의 {{img:이름}} 을 docs/manual/img/이름.png 로 채워
  download/바차트_사용설명서.html (그림이 들어 있는 파일 하나) 를 만든다.
  --artifact 를 주면 문서 머리(<html><head>) 없이 본문만 쓴 파일도 만든다 (웹 게시용).
"""
import base64
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, ".."))
SRC = os.path.join(ROOT, "docs", "manual", "manual_src.html")
IMG = os.path.join(ROOT, "docs", "manual", "img")
OUT = os.path.join(ROOT, "download", "바차트_사용설명서.html")


def fill(text):
    def repl(m):
        with open(os.path.join(IMG, m.group(1) + ".png"), "rb") as f:
            return "data:image/png;base64," + base64.b64encode(f.read()).decode("ascii")
    return re.sub(r"\{\{img:([\w-]+)\}\}", repl, text)


def main():
    body = fill(open(SRC, encoding="utf-8").read())
    doc = ('<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n'
           '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
           '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}'
           'body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>\n'
           '</head>\n<body>\n' + body + '\n</body>\n</html>\n')
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(doc)
    print("생성:", OUT, len(doc) // 1024, "KB")
    if "--artifact" in sys.argv:
        path = sys.argv[sys.argv.index("--artifact") + 1]
        with open(path, "w", encoding="utf-8") as f:
            f.write(body)
        print("생성:", path)


if __name__ == "__main__":
    main()
