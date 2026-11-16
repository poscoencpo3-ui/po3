"""공정 받아쓰기(음성 → 공정 초안) HTML 만들기.

  python3 tools/build_voice.py [--artifact 출력경로]

  voice/app_src.html (본문만 있는 원본) 을 문서 머리와 함께 감싸
  download/공정받아쓰기_v<버전>_<내용>.html (파일 하나로 동작) 을 만든다.
  --artifact 를 주면 원본을 그대로 복사한다 (웹 게시용).
"""
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, ".."))
SRC = os.path.join(ROOT, "voice", "app_src.html")
OUT = os.path.join(ROOT, "download", "공정받아쓰기_v0.4_엑셀가져오기.html")


def main():
    body = open(SRC, encoding="utf-8").read()
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
        shutil.copyfile(SRC, path)
        print("생성:", path)


if __name__ == "__main__":
    main()
