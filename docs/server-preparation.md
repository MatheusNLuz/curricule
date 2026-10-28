# Preparação da máquina Curricule

Em 27/10/2026, via SSH, foi preparada a instância Ubuntu 24.04.5 LTS x86_64 com 954 MiB de RAM.

## Instalado e validado

- Git 2.43.0, pacote Ubuntu `1:2.43.0-1ubuntu7.4`.
- Nginx 1.24.0, pacote Ubuntu `1.24.0-2ubuntu7.19`, ativo e habilitado no boot. Configuração aprovada por `nginx -t`; HTTP local retornou 200.
- Node.js 24.22.1 LTS com npm 11.19.1, binário oficial instalado em `/opt/node/node-v24.22.1-linux-x64`. Download conferido com o SHA-256 publicado pelo Node.js. Links em `/usr/local/bin` apontam para `/opt/node/current/bin`.
- Certbot 2.9.0 e integração Nginx instalados; certificado ainda não emitido.
- Bibliotecas compartilhadas e fontes para o Chromium de exportação de PDF. O navegador será fornecido pelo pacote `@sparticuz/chromium` no build Linux da aplicação.
- Swap de 2 GiB em `/swapfile`, persistida no `/etc/fstab`, e `vm.swappiness=10`.
- Usuário de serviço `curricule`, sem login, com diretórios `/srv/curricule/releases` e `/etc/curricule`.
- Serviço `/etc/systemd/system/curricule.service` validado pelo systemd, ainda desabilitado. Requer `/srv/curricule/current/server.js` e `/etc/curricule/curricule.env`. Executa um único Node, heap de 256 MiB, escuta em `127.0.0.1:3000`, reinicia em falhas e usa journal para logs.

Fonte da versão de segurança: https://nodejs.org/en/blog/release/v24.22.1 . Não é uma garantia contra vulnerabilidades futuras; manter o runtime atualizado.

## Publicação pendente

1. Gerar artefato standalone em Linux x86_64. O build Windows não substitui os módulos nativos Linux. Preferir CI ou outra máquina para compilar, preservando a memória do servidor.
2. Enviar uma release para `/srv/curricule/releases`, definir o link `current`, e configurar o ambiente de produção com arquivo restrito em `/etc/curricule/curricule.env` (não usar o banco dev por engano).
3. Aplicar migrations no banco de produção quando autorizadas; nenhuma foi aplicada nesta preparação.
4. Configurar domínio/DNS, proxy Nginx, regras HTTP/HTTPS e certificado. O firewall local da Oracle atualmente permite SSH e rejeita as outras conexões de entrada; nenhuma regra foi alterada. Verificar também Security Lists/NSG da Oracle.
5. Testar aplicação e PDFs no servidor antes de habilitar o serviço e publicar.

Apenas a página padrão do Nginx responde localmente. O Curricule ainda não foi enviado nem publicado. Não foi instalado PostgreSQL local; o banco escolhido é Prisma Postgres externo.

O script usado está em `deploy/bootstrap-ubuntu.sh`. Ele foi criado para este servidor novo; revisar antes de reaplicar em uma máquina com serviços existentes.
