#!/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends git nginx curl ca-certificates xz-utils unzip \
  certbot python3-certbot-nginx fonts-dejavu-core fontconfig \
  libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libatspi2.0-0 \
  libcups2 libdbus-1-3 libdrm2 libgbm1 libasound2t64 libcairo2 \
  libpango-1.0-0 libx11-6 libxcb1 libxcomposite1 libxdamage1 libxext6 \
  libxfixes3 libxrandr2 libxrender1 libxkbcommon0

node_version=v24.22.1
archive="node-${node_version}-linux-x64.tar.xz"
download_dir=$(mktemp -d /var/tmp/curricule-node.XXXXXX)
cd "$download_dir"
curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 \
  -O "https://nodejs.org/dist/${node_version}/${archive}"
curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 \
  -O "https://nodejs.org/dist/${node_version}/SHASUMS256.txt"
grep " ${archive}$" SHASUMS256.txt | sha256sum --check --strict -
install -d /opt/node
tar -xJf "$archive" -C /opt/node
ln -sfn "/opt/node/node-${node_version}-linux-x64" /opt/node/current
for binary in node npm npx; do
  ln -sfn "/opt/node/current/bin/${binary}" "/usr/local/bin/${binary}"
done

if ! swapon --show --noheadings | grep -q .; then
  if [ ! -e /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    grep -q '^/swapfile ' /etc/fstab || printf '\n/swapfile none swap sw 0 0\n' >> /etc/fstab
  else
    echo 'Arquivo /swapfile já existe; revisar manualmente antes de ativar.' >&2
    exit 1
  fi
fi
printf 'vm.swappiness=10\n' > /etc/sysctl.d/90-curricule-memory.conf
sysctl --load /etc/sysctl.d/90-curricule-memory.conf

if ! id curricule >/dev/null 2>&1; then
  useradd --system --user-group --home-dir /srv/curricule --shell /usr/sbin/nologin curricule
fi
install -d -o curricule -g curricule -m 750 /srv/curricule /srv/curricule/releases
install -d -o root -g curricule -m 750 /etc/curricule

# The service stays disabled until a Linux build and real production env exist.
cat > /etc/systemd/system/curricule.service <<'UNIT'
[Unit]
Description=Curricule Next.js
After=network-online.target
Wants=network-online.target
ConditionPathExists=/srv/curricule/current/server.js
ConditionPathExists=/etc/curricule/curricule.env

[Service]
Type=simple
User=curricule
Group=curricule
WorkingDirectory=/srv/curricule/current
Environment=NODE_ENV=production
Environment=HOSTNAME=127.0.0.1
Environment=PORT=3000
Environment=DB_CONNECTION_LIMIT=3
Environment=DOCUMENT_CONCURRENCY=1
Environment=ANALYSIS_CONCURRENCY=2
EnvironmentFile=/etc/curricule/curricule.env
ExecStart=/usr/local/bin/node --max-old-space-size=256 server.js
Restart=on-failure
RestartSec=5
TimeoutStopSec=30
KillMode=control-group
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
MemoryAccounting=true
MemoryHigh=650M
MemoryMax=800M
MemorySwapMax=1G
TasksMax=256

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
nginx -t
systemctl enable --now nginx
node --version
npm --version
git --version
nginx -v
free -h
df -h /
systemctl is-active nginx
systemd-analyze verify /etc/systemd/system/curricule.service
