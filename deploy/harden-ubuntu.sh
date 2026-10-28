#!/usr/bin/env bash
set -euo pipefail
test -f /etc/nginx/sites-available/curricule
backup=$(mktemp -d /root/curricule-hardening.XXXXXX)
cp /etc/nginx/sites-available/curricule "$backup/nginx-site"
install -d /etc/nginx/snippets
python3 - <<'PY'
import ipaddress
import json
from pathlib import Path
from urllib.request import urlopen
with urlopen('https://api.cloudflare.com/client/v4/ips', timeout=20) as response:
    payload = json.loads(response.read(16384))
if payload.get('success') is not True:
    raise SystemExit('A API oficial não confirmou os IPs.')
networks = []
for version in (4, 6):
    entries = payload['result'][f'ipv{version}_cidrs']
    parsed = [ipaddress.ip_network(value) for value in entries]
    if len(parsed) < 5 or any(network.version != version for network in parsed):
        raise SystemExit('Resposta de IPs inesperada; nenhuma confiança aplicada.')
    networks.extend(parsed)
print(f'IP oficial validado: {len(networks)} blocos, etag {payload["result"]["etag"]}.')
config = '\n'.join(f'set_real_ip_from {network};' for network in networks)
config += '\nreal_ip_header CF-Connecting-IP;\nreal_ip_recursive on;\n'
Path('/etc/nginx/conf.d/10-cloudflare-real-ip.conf').write_text(config)
PY
cat > /etc/nginx/conf.d/20-curricule-limits.conf <<'CONF'
map $uri $curricule_api_ip { default ""; ~^/api/ $binary_remote_addr; }
map $uri $curricule_auth_ip { default ""; ~^/api/auth/(login|register)/?$ $binary_remote_addr; }
map $uri $curricule_auth_global { default ""; ~^/api/auth/(login|register)/?$ auth; }
map "$request_method:$uri" $curricule_write_global { default ""; ~^(POST|PUT|PATCH|DELETE):/api/ writes; }
limit_req_zone $curricule_api_ip zone=curricule_api:2m rate=3r/s;
limit_req_zone $curricule_auth_ip zone=curricule_auth:1m rate=6r/m;
limit_req_zone $curricule_auth_global zone=curricule_auth_total:1m rate=30r/m;
limit_req_zone $curricule_write_global zone=curricule_writes:1m rate=120r/m;
limit_conn_zone $curricule_api_ip zone=curricule_connections:1m;
CONF
cat > /etc/nginx/snippets/curricule-request-limits.conf <<'CONF'
limit_req zone=curricule_api burst=30 nodelay;
limit_req zone=curricule_auth burst=8 nodelay;
limit_req zone=curricule_auth_total burst=20 nodelay;
limit_req zone=curricule_writes burst=40 nodelay;
limit_req_status 429;
limit_conn curricule_connections 12;
limit_conn_status 429;
client_header_timeout 10s;
client_body_timeout 20s;
send_timeout 30s;
keepalive_timeout 20s;
CONF
python3 - <<'PY'
from pathlib import Path
file = Path('/etc/nginx/sites-available/curricule')
text = file.read_text()
line = '    include /etc/nginx/snippets/curricule-request-limits.conf;'
if line not in text:
    text = text.replace('    server_name curricule.com.br;\n', '    server_name curricule.com.br;\n' + line + '\n')
file.write_text(text)
PY
if ! nginx -t; then
  cp "$backup/nginx-site" /etc/nginx/sites-available/curricule
  exit 1
fi
systemctl reload nginx

cat > /etc/ssh/sshd_config.d/00-curricule-hardening.conf <<'CONF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
LoginGraceTime 30
MaxStartups 3:30:10
X11Forwarding no
CONF
sshd -t
systemctl reload ssh

# Mirror the existing IPv4 policy: local traffic, established sessions, ICMP,
# SSH and web. In particular, RPC and future unrelated listeners stay closed.
if ! ip6tables -C INPUT -j REJECT --reject-with icmp6-adm-prohibited 2>/dev/null; then
  ip6tables -A INPUT -i lo -j ACCEPT
  ip6tables -A INPUT -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
  ip6tables -A INPUT -p ipv6-icmp -j ACCEPT
  ip6tables -A INPUT -p tcp -m multiport --dports 22,80,443 -m conntrack --ctstate NEW -j ACCEPT
  ip6tables -A INPUT -j REJECT --reject-with icmp6-adm-prohibited
fi
ip6tables-save > /etc/iptables/rules.v6

install -d /etc/systemd/journald.conf.d /etc/systemd/system/curricule.service.d
cat > /etc/systemd/journald.conf.d/60-curricule-budget.conf <<'CONF'
[Journal]
SystemMaxUse=64M
RuntimeMaxUse=32M
SystemMaxFileSize=8M
MaxRetentionSec=7day
CONF
cat > /etc/systemd/system/curricule.service.d/resource-guard.conf <<'CONF'
[Unit]
StartLimitIntervalSec=300
StartLimitBurst=5
[Service]
LimitNOFILE=8192
LogRateLimitIntervalSec=30s
LogRateLimitBurst=100
CONF
systemctl daemon-reload
systemctl restart systemd-journald
systemd-analyze verify /etc/systemd/system/curricule.service
printf 'Nginx, SSH, IPv6 e limites de logs configurados.\n'
