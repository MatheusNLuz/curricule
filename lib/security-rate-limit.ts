import { createHmac } from "node:crypto";
import { prisma } from "./db";
import { HttpError } from "./http-error";
export async function consumeRateLimit(scope:string,identity:string,limit:number,windowMs=600_000){
  const secret=[process.env.JWT_SECRET,process.env.NEON_AUTH_COOKIE_SECRET].find(value=>value&&value.length>=32);
  if(!secret||secret.length<32)throw new HttpError(503,"A proteção de acesso precisa ser configurada.");
  const key=createHmac("sha256",secret).update(scope+":"+identity).digest("hex");
  await prisma.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
    const now=new Date();const previous=await tx.securityRateLimit.findUnique({where:{key}});
    if(previous&&previous.expiresAt>now&&previous.count>=limit)throw new HttpError(429,"Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de tentar novamente.","RATE_LIMITED");
    const expiresAt=new Date(now.getTime()+windowMs);
    await tx.securityRateLimit.upsert({where:{key},create:{key,count:1,expiresAt},update:previous&&previous.expiresAt>now?{count:{increment:1}}:{count:1,expiresAt}});
  });
}
export async function reserveCapacity(scope:string,identity:string,maximum:number,leaseMs=90_000){
  const secret=[process.env.JWT_SECRET,process.env.NEON_AUTH_COOKIE_SECRET].find(value=>value&&value.length>=32);if(!secret)throw new HttpError(503,"Configure a proteção de acesso.");
  const key=createHmac("sha256",secret).update("capacity:"+scope+":"+identity).digest("hex");
  const expiresAt=await prisma.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
    const now=new Date(),previous=await tx.securityRateLimit.findUnique({where:{key}});const active=previous&&previous.expiresAt>now;
    if(active&&previous.count>=maximum)throw new HttpError(429,"Há exportações em andamento. Aguarde a conclusão antes de iniciar outra.","EXPORT_BUSY");
    const expiresAt=active?previous.expiresAt:new Date(Date.now()+leaseMs);
    await tx.securityRateLimit.upsert({where:{key},create:{key,count:1,expiresAt},update:active?{count:{increment:1}}:{count:1,expiresAt}});return expiresAt;
  });
  let released=false;
  return async()=>{if(released)return;released=true;await prisma.securityRateLimit.updateMany({where:{key,expiresAt,count:{gt:0}},data:{count:{decrement:1}}});};
}
