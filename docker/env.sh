#!/bin/sh
# Writes the runtime configuration that index.html loads before the app bundle.
# Runs on every container start, so the same image works in any environment.
set -e

escaped=$(printf '%s' "${API_URL:-}" | sed 's/\\/\\\\/g; s/"/\\"/g')

cat > /usr/share/nginx/html/env.js <<EOF
// Generated at container start. Empty string = same origin (nginx proxies /api).
window.__DICHTBIJ3D_API_URL__ = "${escaped}";
EOF

echo "dichtbij3d: API base URL = '${API_URL:-<same origin>}', backend upstream = '${BACKEND_URL:-}'"
