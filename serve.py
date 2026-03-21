import http.server
from functools import partial

HandlerClass = partial(http.server.SimpleHTTPRequestHandler, directory="dist/")
# Run the server (like `python -m http.server` does)
http.server.test(HandlerClass, port=8000)

