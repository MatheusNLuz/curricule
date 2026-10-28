import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { spawnSync,spawn } from 'node:child_process';
import bcrypt from 'bcryptjs';

// Schema independente: nunca apaga nem copia tabelas do aplicativo existente.
const envFile='scratch/evolution/validation.env';
const mode=process.argv[2]||'setup';
process.on('unhandledRejection',error=>{console.error('Falha na preparação da homologação.',{type:error?.name,code:error?.code||error?.errorCode||'CONNECTION_OR_MIGRATION'});process.exitCode=1;});
function cli(args,env){const result=spawnSync(process.execPath,['node_modules/prisma/build/index.js',...args],{env,encoding:'utf8'});if(result.status)throw new Error('Prisma falhou: '+String(result.stderr||result.stdout).replace(/postgres(?:ql)?:\/\/[^\s]+/g,'[conexão omitida]'));}
if(mode==='setup'){
  const base=new URL(process.env.DATABASE_URL||'');
  base.hostname=base.hostname==='pooled.db.prisma.io'?'db.prisma.io':base.hostname.replace('-pooler.','.');
  const schema='curricule_review_'+randomBytes(5).toString('hex');
  if(!/^curricule_review_[a-f0-9]+$/.test(schema))throw new Error('Schema inválido');
  const connection=new PrismaClient({datasources:{db:{url:base.href}}});
  try{await connection.$executeRawUnsafe('CREATE SCHEMA "'+schema+'"');}finally{await connection.$disconnect();}
  base.searchParams.set('schema',schema);
  mkdirSync('scratch/evolution',{recursive:true});
  const env={DATABASE_URL:base.href,DIRECT_URL:base.href,JWT_SECRET:randomBytes(48).toString('hex'),NEON_AUTH_BASE_URL:'',NEON_AUTH_COOKIE_SECRET:'',APP_URL:'http://localhost:3002',BILLING_ENABLED:'false',VALIDATION_SCHEMA:schema};
  writeFileSync(envFile,Object.entries(env).map(([key,value])=>`${key}=${JSON.stringify(value)}`).join('\n'));
  cli(['migrate','deploy'],{...process.env,...env});
  const db=new PrismaClient({datasources:{db:{url:base.href}}});
  try{const password=await bcrypt.hash('Curricule-Teste-2026!',10);for(const [name,email,role] of [['Ana Validação','resume-a@example.test','USER'],['Bruno Validação','resume-b@example.test','USER'],['Admin Validação','admin-review@example.test','ADMIN']])await db.user.create({data:{name,email,role,password}});}finally{await db.$disconnect();}
  console.info('Homologação preparada com schema isolado e três contas fictícias. Configuração em arquivo ignorado pelo Git.');
}else{
  const env={...process.env,...parseEnv(readFileSync(envFile,'utf8'))};
  env.DIRECT_URL=env.DATABASE_URL;
  if(!/^curricule_review_[a-f0-9]+$/.test(env.VALIDATION_SCHEMA||''))throw new Error('Ambiente de validação não reconhecido');
  if(mode==='serve'||mode==='serve-production'){
    const production=mode==='serve-production';
    const args=production?['--env-file-if-exists=.env','--max-old-space-size=256','.next/standalone/server.js']:['node_modules/next/dist/bin/next','dev','--port','3002','--hostname','127.0.0.1'];
    const child=spawn(process.execPath,args,{env:{...env,PORT:production?'3003':'3002',HOSTNAME:'127.0.0.1',APP_URL:production?'http://localhost:3003':env.APP_URL,CURRICULE_BUILD_DIR:production?'.next':'.next-validation'},stdio:'inherit',windowsHide:true});
    child.on('exit',code=>process.exit(code||0));
  }else if(mode==='migrate')cli(['migrate','deploy'],env);
  else throw new Error('Use setup, serve, serve-production ou migrate');
}
