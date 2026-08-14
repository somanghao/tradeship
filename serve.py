#!/usr/bin/env python3
"""개발용 정적 서버 — 캐시를 끈다.

`python -m http.server`는 Cache-Control을 보내지 않아서, 브라우저가 .js 모듈을
휴리스틱하게 캐시한다. 이 프로젝트는 빌드도 캐시버스터도 없는 순수 ES 모듈이라
index.html만 새로 받고 state.js는 낡은 것을 쓰는 **섞인 상태**가 생긴다.
그러면 import가 링크 단계에서 실패해 아무것도 안 그려지고 화면이 검게 남는다.

    python serve.py            # 8891
    python serve.py 9000       # 포트 지정
"""
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    # 대시보드가 tools/*.mjs를 그대로 import한다. 파이썬 mimetypes에는 .mjs가 없어서
    # 등록하지 않으면 text/plain으로 나가고 브라우저가 모듈 로드를 거부한다.
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.mjs': 'text/javascript'}

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, fmt, *args):          # 404 favicon 같은 잡음을 줄인다
        # log_error()는 첫 인자로 정수(상태코드)를 넘긴다 — 문자열일 때만 걸러야 한다.
        # 여기서 예외가 나면 응답이 끊겨 브라우저가 ERR_EMPTY_RESPONSE를 본다.
        if args and isinstance(args[0], str) and '/favicon.ico' in args[0]:
            return
        super().log_message(fmt, *args)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8891
    handler = partial(NoCacheHandler, directory='.')
    with ThreadingHTTPServer(('127.0.0.1', port), handler) as httpd:
        print(f'http://localhost:{port}/index.html   (no-store · Ctrl+C로 종료)')
        httpd.serve_forever()


if __name__ == '__main__':
    main()
