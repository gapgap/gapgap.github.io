#!/usr/bin/env python3
"""Fake ESP: real HTTP 302 responses to the original iOS and Android OneLinks."""

import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ONELINK = "https://gabios.onelink.me/9hkm?pid=test&deep_link_value=https%3A%2F%2Fexample.com%2Ftest"
ANDROID_ONELINK = "https://lapat123.onelink.me/YJr3?pid=test&deep_link_value=https%3A%2F%2Fexample.com%2Ftest"
REDIRECTS = {
    "/esp2/redirect": ONELINK,
    "/esp2/android/redirect": ANDROID_ONELINK,
}
ROOT = Path(__file__).resolve().parent


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.respond(send_body=True)

    def do_HEAD(self):
        self.respond(send_body=False)

    def respond(self, send_body):
        path = urlsplit(self.path).path
        if path in REDIRECTS:
            self.send_response(302)
            self.send_header("Location", REDIRECTS[path])
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        if path not in ("/", "/esp2", "/esp2/", "/esp2/index.html"):
            self.send_error(404)
            return
        body = (ROOT / "index.html").read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if send_body:
            self.wfile.write(body)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8787)
    args = parser.parse_args()
    with ThreadingHTTPServer((args.host, args.port), Handler) as server:
        print(f"ESP2 page: http://{args.host}:{server.server_port}/esp2/", flush=True)
        print(f"ESP2 HTTP 302: http://{args.host}:{server.server_port}/esp2/redirect", flush=True)
        print(f"iOS Location: {ONELINK}", flush=True)
        print(f"Android HTTP 302: http://{args.host}:{server.server_port}/esp2/android/redirect", flush=True)
        print(f"Android Location: {ANDROID_ONELINK}", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
