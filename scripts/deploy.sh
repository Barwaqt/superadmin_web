#!/usr/bin/env bash
set -euo pipefail
umask 022
archive=${1:?Expected deployment archive}
app_name=${2:?Expected existing admin PM2 process name}
port=${3:?Expected admin port}
revision=${4:?Expected Git revision}
app_dir=/var/www/console.barwaqt.com
[[ "$app_name" =~ ^[a-zA-Z0-9][a-zA-Z0-9_.-]*$ ]]
[[ "$port" =~ ^[0-9]+$ ]] && ((port >= 1 && port <= 65535))
[[ "$revision" =~ ^[0-9a-f]{40}$ ]]
if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  source "$HOME/.nvm/nvm.sh"
  nvm use 24
fi
for tool in node npm pm2 rsync curl flock; do
  command -v "$tool" >/dev/null || { echo "Missing prerequisite: $tool" >&2; exit 1; }
done
[[ -d "$app_dir" ]]
pm2 describe "$app_name" >/dev/null
exec 9>"$app_dir/.deploy.lock"
flock -w 600 9
stage=$(mktemp -d /var/www/.barwaqt-admin-build.XXXXXXXX)
trap 'rm -rf "$stage"; rm -f "$archive"' EXIT
tar -xzf "$archive" -C "$stage"
for env_file in .env .env.local .env.production .env.production.local; do
  if [[ -f "$app_dir/$env_file" ]]; then
    cp "$app_dir/$env_file" "$stage/$env_file"
    chmod 600 "$stage/$env_file"
  fi
done
cd "$stage"
export NEXT_TELEMETRY_DISABLED=1
# Install build-time tooling even when the SSH environment sets NODE_ENV=production.
npm ci --include=dev
NODE_ENV=production npm run build
# Only change the running app after the production build succeeds.
# Retain destination-only assets and runtime files, including production .env files.
rsync -a \
  --exclude='.git/' --exclude='.env' --exclude='.env.*' \
  --exclude='.deploy.lock' --exclude='uploads/' \
  "$stage/" "$app_dir/"
cd "$app_dir"
pm2 restart "$app_name" --update-env
for attempt in {1..12}; do
  if curl --fail --silent --show-error --output /dev/null --max-time 10 "http://127.0.0.1:$port/"; then
    printf '%s\n' "$revision" > .deployed-revision
    pm2 save
    echo "Admin deployment complete: $revision"
    exit 0
  fi
  sleep 5
done
echo "Admin health check failed. Inspect: pm2 logs $app_name --lines 80 --nostream" >&2
exit 1
