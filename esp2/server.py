#!/usr/bin/env python3
"""Fake ESP: a fixed HTTP 302 to the original, once-encoded Gab iOS OneLink."""

import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ONELINK = "https://gabios.onelink.me/9hkm?pid=test&deep_link_value=https%3A%2F%2Fexample.com%2Ftest"
ROOT = Path(__file__).resolve().parent


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.respond(send_body=True)

    def do_HEAD(self):
        self.respond(send_body=False)

    def respond(self, send_body):
        path = urlsplit(self.path).path
        if path == "/esp2/redirect":
            self.send_response(302)
            self.send_header("Location", ONELINK)
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
        print(f"Location: {ONELINK}", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
