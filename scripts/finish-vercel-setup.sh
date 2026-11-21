#!/usr/bin/env bash
# Finishes the Vercel setup for the Chudiwalas storefront:
#   1. adds every missing env var to Production + Preview
#   2. replaces DATABASE_URL with Neon's POOLED host (serverless needs the pooler)
#   3. copies the Cloudinary credentials into Preview as well
#   4. redeploys production and checks /api/health
# Values come from .env on this machine; nothing is printed.
set -u
cd /Users/ideaind/Desktop/jewellery || exit 1
V="pnpm dlx vercel@latest"
BOTH="production,preview"

val() { grep -E "^$1=" .env | head -1 | cut -d= -f2- | tr -d '"'; }

POOLED=$(python3 -I -c "
import urllib.parse
u = urllib.parse.urlparse('''$(val DATABASE_URL)''')
h = u.hostname if '-pooler' in u.hostname else u.hostname.replace('.', '-pooler.', 1)
print(u._replace(netloc=f'{u.username}:{u.password}@{h}').geturl())
")
[ -z "$POOLED" ] && { echo "Could not derive the pooled URL from .env"; exit 1; }

set_var() { # set_var <name> <value> <config|secret> [--force]
  local flag="--no-sensitive"; [ "$3" = "secret" ] && flag="--sensitive"
  printf '  %-30s ' "$1"
  $V env add "$1" --environment "$BOTH" --value "$2" $flag --yes ${4:-} 2>&1 | tail -1
}

echo "== 1. storefront configuration =="
set_var DEMO_MODE                   "false"                                   config
set_var NEXT_PUBLIC_DEMO_MODE       "false"                                   config
set_var NEXT_PUBLIC_APP_URL         "https://jewellery-zeta-six.vercel.app"   config
set_var NEXT_PUBLIC_STORE_NAME      "Chudiwalas"                              config
set_var HIGH_VALUE_THRESHOLD_PAISE  "10000000"                                config
set_var GST_PERCENTAGE              "3.0"                                     config
set_var CLOUDINARY_FOLDER           "chudiwalas"                              config
set_var AUTH_SECRET                 "$(openssl rand -base64 32)"              secret

echo "== 2. database (pooled host, overwrites the existing value) =="
$V env rm DATABASE_URL --environment production --yes >/dev/null 2>&1
set_var DATABASE_URL "$POOLED" secret

echo "== 3. cloudinary credentials into Preview too =="
set_var CLOUDINARY_CLOUD_NAME "$(val CLOUDINARY_CLOUD_NAME)" secret --force
set_var CLOUDINARY_API_KEY    "$(val CLOUDINARY_API_KEY)"    secret --force
set_var CLOUDINARY_API_SECRET "$(val CLOUDINARY_API_SECRET)" secret --force

echo "== 4. current variables =="
$V env ls 2>&1 | sed -n '3,30p'

echo "== 5. redeploying production so the new values take effect =="
LATEST=$($V ls jewellery 2>/dev/null | grep -oE "https://jewellery-[a-z0-9]+-kt-eam3\.vercel\.app" | head -1)
[ -z "$LATEST" ] && { echo "  could not find the latest deployment; run: pnpm dlx vercel@latest --prod"; exit 0; }
echo "  redeploying $LATEST"
$V redeploy "$LATEST" --yes 2>&1 | tail -3

echo "== 6. health check =="
echo "  (wait for the build to finish, then run:)"
echo "  curl -s https://jewellery-zeta-six.vercel.app/api/health"
