# Testes, release e implantação automáticos

O workflow `.github/workflows/build-linux.yml` executa em pushes na `master` e em pull requests destinados a ela. Há também execução manual para recuperação, sem necessidade de usá-la na rotina.

Pull requests passam por instalação com lockfile, testes da aplicação, testes do empacotamento/deploy, lint, build Linux e extração real de PDF no standalone. Não recebem a chave de produção nem publicam releases.

## Publicação da master

Após todas as verificações, o workflow empacota o standalone sem `.env`, registra `RELEASE_COMMIT` e `RELEASE_VERSION` e calcula SHA-256. A versão é `v<major>.<minor>.<número da execução>`; os dois primeiros componentes vêm de `package.json`. Números podem ser pulados por execuções de validação.

O GitHub cria uma release com pacote, `SHA256SUMS` e `release.json`. Ela só é marcada como Latest após a implantação concluir. Uma execução antiga não substitui uma master mais recente. Implantações da mesma branch são serializadas e a execução ativa não é cancelada por um novo push.

O servidor usa uma chave exclusiva de GitHub Actions. A entrada em `authorized_keys` aplica `restrict` e um comando fixo protegido, que aceita apenas `status` ou `deploy <SHA> <versão>`. Não permite shell, túnel ou encaminhamento. A identidade SSH do servidor é fixada em `known_hosts`.

O comando confere branch limpa, tag e SHA da master; baixa o checksum independentemente da release pública no repositório oficial e verifica o pacote. A extração rejeita caminhos externos, links inseguros, arquivos de ambiente, dispositivos e pacotes acima do limite. A prova de PDF executa como usuário `curricule`, sem privilégios administrativos.

Somente então ocorre a troca do standalone. Aplicação e Nginx são reiniciados, e são conferidos HTTP local, HTTPS público e acesso negado a uma rota privada sem sessão. Em falha, o artefato anterior é restaurado. O Git só avança após a saúde da nova release ser confirmada.

## Configuração instalada

Ambiente GitHub `production`, permitido apenas para a branch `master`, sem aprovadores nem espera manual:

- Secrets: `CURRICULE_DEPLOY_KEY` e `CURRICULE_SSH_KNOWN_HOSTS`.
- Variáveis: `CURRICULE_DEPLOY_HOST` e `CURRICULE_DEPLOY_USER`.
- Comando no servidor: `/usr/local/bin/curricule-deploy-from-github`.
- Verificador e utilitários protegidos: `/usr/local/lib/curricule-deploy/`.
- Estado local e backups: `/var/www/curricule/.deploy/`, ignorado pelo Git.

A chave pessoal de administração não é compartilhada com o GitHub. Os utilitários de deploy são atualizados por renomeação atômica a partir do mesmo commit verificado da master, depois de uma implantação saudável. São mantidos três backups criados por esse mecanismo; backups manuais anteriores não são removidos.

## Conferência e recuperação

O resumo da execução no GitHub mostra versão e SHA implantados. No servidor, `.deploy/last-success.json` registra versão, commit, checksum e caminho do backup; `.next/standalone/RELEASE_COMMIT` e `RELEASE_VERSION` identificam o build ativo.

Se a falha ocorrer após a publicação do pacote e antes da implantação, a versão não é promovida a Latest. Depois de resolver a causa, use Re-run failed jobs para reutilizar o mesmo pacote. Uma release existente não é sobrescrita por outro conteúdo. Para gerar um novo pacote, uma nova execução recebe outra versão.

O fluxo não executa migrations de banco automaticamente nem altera credenciais da aplicação, limites de pool ou modelos de IA. As verificações de deploy não substituem testes dos provedores reais, que continuam sujeitos a indisponibilidade e rejeições de conteúdo.
