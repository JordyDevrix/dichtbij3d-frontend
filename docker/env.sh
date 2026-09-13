#!/bin/sh
# Writes the runtime configuration that index.html loads before the app bundle.
# Runs on every container start, so the same image works in any environment.
set -e

escaped=$(printf '%s' "${API_URL:-}" | sed 's/\\/\\\\/g; s/"/\\"/g')

cat > /usr/share/nginx/html/env.js <<EOF
// Generated at container start. Empty string = same origin (nginx proxies /api).
window.__DICHTBIJ3D_API_URL__ = "${escaped}";
EOF

# nginx resolves the backend name per request, so it needs an explicit resolver.
# Fall back to the container runtime's DNS servers from /etc/resolv.conf.
resolvers="${DNS_RESOLVERS:-}"
if [ -z "$resolvers" ]; then
  resolvers=$(awk '/^nameserver/ { printf "%s ", $2 }' /etc/resolv.conf)
fi
[ -n "$resolvers" ] || resolvers="127.0.0.11"
sed -i "s|__DNS_RESOLVERS__|${resolvers}|g" /etc/nginx/conf.d/default.conf

echo "dichtbij3d: API base URL = '${API_URL:-<same origin>}', backend upstream = '${BACKEND_URL:-}', dns = '${resolvers}'"
