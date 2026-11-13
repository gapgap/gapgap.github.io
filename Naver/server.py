#!/usr/bin/env python3
"""Run python3 server.py for real 307 redirects; GitHub Pages serves static HTML."""

import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
DESTINATIONS = {
    "1": "https://gabtraining.onelink.me/xfPm/2y3ozi9u",
    "2": "https://onelink-sim.onelink.me/3pPV/onlyuri",
}


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.respond(send_body=True)

    def do_HEAD(self):
        self.respond(send_body=False)

    def respond(self, send_body):
        path = urlsplit(self.path).path
        if path.startswith("/Naver/"):
            path = path[len("/Naver"):]
        redirects = {f"/{key}.html": value for key, value in DESTINATIONS.items()}
        redirects.update({f"/{key}": value for key, value in DESTINATIONS.items()})
        if path in redirects:
            self.send_response(307)
            self.send_header("Location", redirects[path])
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return

        if path not in ("/", "/Naver", "/index.html"):
            self.send_error(404)
            return
        body = (ROOT / "index.html").read_bytes()
        # Keep relative links working when the index is opened without a trailing slash.
        if path == "/Naver":
            body = body.replace(b'<head>', b'<head><base href="/Naver/">', 1)
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if send_body:
            self.wfile.write(body)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8766)
    args = parser.parse_args()
    with ThreadingHTTPServer((args.host, args.port), Handler) as server:
        print(f"Naver HTTP 307 tests: http://{args.host}:{server.server_port}/Naver/", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
