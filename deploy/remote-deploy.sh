#!/bin/bash
# Installed root-owned; invoked only by the dedicated, restricted SSH key.
set -euo pipefail
export PATH=/usr/local/bin:/usr/bin:/bin
umask 077
app=/var/www/curricule
state="$app/.deploy"
library=/usr/local/lib/curricule-deploy
command=${SSH_ORIGINAL_COMMAND:-}

if [[ "$command" == status ]]; then
  printf 'DEPLOY_READY\n'
  git -C "$app" rev-parse HEAD
  cat "$app/.next/standalone/RELEASE_COMMIT"
  systemctl is-active curricule nginx
  exit 0
fi
if [[ ! "$command" =~ ^deploy\ ([0-9a-f]{40})\ (v[0-9]+\.[0-9]+\.[0-9]+)$ ]]; then
  echo 'Only status or deploy COMMIT VERSION is permitted' >&2
  exit 64
fi
expected=${BASH_REMATCH[1]}
version=${BASH_REMATCH[2]}
cd "$app"
exec 9>"$state/deploy.lock"
flock -n 9 || { echo 'Another deployment is active' >&2; exit 75; }
test "$(git branch --show-current)" = master
test -z "$(git status --porcelain)"
previous=$(git rev-parse HEAD)
test "$(cat .next/standalone/RELEASE_COMMIT)" = "$previous"
timeout 60 git fetch origin master "tag" "$version"
test "$(git rev-parse "$version^{commit}")" = "$expected"
if [[ "$(git rev-parse origin/master)" != "$expected" ]]; then
  echo 'Release superseded by a newer master' >&2
  exit 78
fi
git merge-base --is-ancestor HEAD "$expected"
test "$(df -Pk "$app" | awk 'NR==2 {print $4}')" -gt 3145728

incoming=$(mktemp -d "$state/incoming.XXXXXX")
stage=''
backup=''
swapped=0
stopped=0
cleanup() {
  code=$?
  trap - EXIT
  set +e
  rollback_ok=1
  if [[ "$code" != 0 && "$swapped" == 1 ]]; then
    echo 'Deployment failed; restoring previous release' >&2
    sudo systemctl stop curricule
    if [[ -d .next/standalone ]]; then mv .next/standalone "$stage" || rollback_ok=0; fi
    if [[ "$rollback_ok" == 1 ]]; then mv "$backup" .next/standalone || rollback_ok=0; fi
  fi
  if [[ "$code" != 0 && "$stopped" == 1 ]]; then
    sudo systemctl start curricule || rollback_ok=0
    sudo systemctl start nginx || rollback_ok=0
  fi
  if [[ "$rollback_ok" != 1 ]]; then
    echo 'Automatic rollback needs attention; backup preserved' >&2
  elif [[ -n "$stage" && -d "$stage" ]]; then
    python3 - "$stage" "$app/.next" <<'PY'
import shutil, sys
from pathlib import Path
path, root = map(Path, sys.argv[1:])
if not path.is_symlink() and path.resolve().parent == root.resolve() and path.name.startswith('standalone-stage.'):
    shutil.rmtree(path)
PY
  fi
  rm -f -- "$incoming/curricule-linux-x64.tgz" "$incoming/SHA256SUMS"
  rmdir -- "$incoming" 2>/dev/null || true
  exit "$code"
}
trap cleanup EXIT

# The checksum is fetched independently from the trusted public repository;
# possession of the SSH key alone cannot authorize an arbitrary package.
release="https://github.com/MatheusNLuz/curricule/releases/download/$version"
curl --proto '=https' --tlsv1.2 -fLsS --retry 3 --retry-max-time 240 --max-time 180 --max-filesize 4096 "$release/SHA256SUMS" -o "$incoming/SHA256SUMS"
python3 - "$incoming/SHA256SUMS" <<'PY'
import re, sys
from pathlib import Path
if not re.fullmatch(r'[0-9a-f]{64}  curricule-linux-x64\.tgz\n?', Path(sys.argv[1]).read_text()):
    raise SystemExit('Invalid release checksum manifest')
PY
curl --proto '=https' --tlsv1.2 -fLsS --retry 3 --retry-max-time 240 --max-time 180 --max-filesize 314572800 "$release/curricule-linux-x64.tgz" -o "$incoming/curricule-linux-x64.tgz"
(cd "$incoming" && sha256sum -c SHA256SUMS)
digest=$(cut -d ' ' -f 1 "$incoming/SHA256SUMS")
if [[ "$(cat .next/standalone/RELEASE_COMMIT)" == "$expected" && -f .next/standalone/RELEASE_VERSION && "$(cat .next/standalone/RELEASE_VERSION)" == "$version" && -f .next/standalone/DEPLOY_SHA256 && "$(cat .next/standalone/DEPLOY_SHA256)" == "$digest" ]]; then
  systemctl is-active --quiet curricule nginx
  echo "Release already active: $version"
  exit 0
fi

stage=$(mktemp -d "$app/.next/standalone-stage.XXXXXX")
python3 "$library/release_archive.py" extract "$incoming/curricule-linux-x64.tgz" "$stage" "$expected" "$version"
chmod 755 "$stage"
printf '%s\n' "$digest" > "$stage/DEPLOY_SHA256"
chmod 644 "$stage/DEPLOY_SHA256"
# Native modules and the PDF worker execute with the application identity.
sudo -u curricule /usr/local/bin/node "$library/verify-standalone-pdf.mjs" "$stage"
sudo nginx -t
if [[ "$(git ls-remote origin refs/heads/master | cut -f 1)" != "$expected" ]]; then
  echo 'Release superseded before activation' >&2
  exit 78
fi
backup="$state/backups/backup-$(date -u +%Y%m%d%H%M%S)-${previous:0:12}-$$"
test ! -e "$backup"
stopped=1
sudo systemctl stop curricule
mv .next/standalone "$backup"
swapped=1
mv "$stage" .next/standalone
sudo systemctl start curricule
healthy=0
for attempt in $(seq 1 30); do
  if curl -fsS --max-time 3 -o /dev/null http://127.0.0.1:3000/ 2>/dev/null; then healthy=1; break; fi
  sleep 1
done
test "$healthy" = 1
test "$(curl -sS --max-time 10 -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/api/analysis/deploy-health)" = 401
sudo systemctl restart nginx
systemctl is-active --quiet curricule nginx
curl -fsS --max-time 20 -o /dev/null https://curricule.com.br/
test "$(curl -sS --max-time 10 -o /dev/null -w '%{http_code}' https://curricule.com.br/api/analysis/deploy-health)" = 401
git merge --ff-only "$expected" >/dev/null
printf '%s\n' "$previous" > "$backup/DEPLOY_BACKUP"
python3 - "$state/last-success.json" "$expected" "$version" "$previous" "$backup" "$digest" <<'PY'
import datetime, json, sys
from pathlib import Path
path, sha, version, previous, backup, digest = sys.argv[1:]
Path(path).write_text(json.dumps({'commit':sha,'version':version,'previousCommit':previous,'backup':backup,'sha256':digest,'deployedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}))
PY
swapped=0
stopped=0
# Future deployment-helper updates come from the same verified master commit.
# Atomic renames keep the currently executing script's inode intact.
bash -n deploy/remote-deploy.sh
sudo install -o root -g root -m 644 deploy/release_archive.py "$library/release_archive.py.new"
sudo mv -f "$library/release_archive.py.new" "$library/release_archive.py"
sudo install -o root -g root -m 644 scripts/validate-standalone-pdf.mjs "$library/verify-standalone-pdf.mjs.new"
sudo mv -f "$library/verify-standalone-pdf.mjs.new" "$library/verify-standalone-pdf.mjs"
sudo install -o root -g root -m 755 deploy/remote-deploy.sh /usr/local/bin/curricule-deploy-from-github.new
sudo mv -f /usr/local/bin/curricule-deploy-from-github.new /usr/local/bin/curricule-deploy-from-github
python3 "$library/release_archive.py" prune "$state/backups" || echo 'Backup retention needs attention' >&2
printf 'DEPLOYED %s %s\n' "$version" "$expected"
