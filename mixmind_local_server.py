"""MixMind local Windows test server.

Serves the current app on localhost with the headers needed for cross-origin
isolation. Localhost is treated as a secure context by modern Edge/Chrome,
so this is the simplest no-account way to test browser audio/WebGPU features.
"""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os

PORT = 8765
ROOT = Path(__file__).resolve().parent

class MixMindHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        self.send_header('Cross-Origin-Resource-Policy', 'same-origin')
        # Avoid stale HTML during iterative local testing.
        if self.path.endswith(('.html', '.json', '.js')):
            self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, format, *args):
        print('[MixMind]', format % args)

if __name__ == '__main__':
    os.chdir(ROOT)
    print('MixMind local server is running.')
    print(f'Open Microsoft Edge at: http://localhost:{PORT}/')
    print('Keep this window open while testing. Press Ctrl+C to stop.')
    ThreadingHTTPServer(('127.0.0.1', PORT), MixMindHandler).serve_forever()
