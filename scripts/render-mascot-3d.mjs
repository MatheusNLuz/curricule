import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';

const poses=['welcome','explain','read','think','verify','celebrate'];
const selected=process.argv[2]?process.argv[2].split(','):poses;
if(selected.some(pose=>!poses.includes(pose)))throw Error('Unknown mascot action');
const fps=25,frames=120,size=512,target='public/mascot/motion';
const threeRoot=process.env.MASCOT_THREE_BUILD||path.dirname(fileURLToPath(import.meta.resolve('three')));
const addonRoot=path.resolve(threeRoot,'../examples/jsm');
const chrome=process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ffmpeg=process.env.FFMPEG_PATH||'ffmpeg';
fs.mkdirSync(target,{recursive:true});
const html=`<!doctype html><script type="importmap">{"imports":{"three":"/three/three.module.js","three/addons/":"/addons/"}}</script><canvas></canvas><script type="module">import{createMascot}from'/scene.mjs';window.actor=createMascot(document.querySelector('canvas'),{size:${size}});</script>`;
const server=http.createServer((request,response)=>{
  if(request.url==='/'){response.writeHead(200,{'content-type':'text/html'});return response.end(html)}
  let file;
  if(request.url==='/scene.mjs')file=path.resolve('design/mascot/3d/scene.mjs');
  else if(request.url.startsWith('/three/'))file=path.resolve(threeRoot,request.url.slice(7));
  else if(request.url.startsWith('/addons/'))file=path.resolve(addonRoot,request.url.slice(8));
  if(!file||![path.resolve('design/mascot/3d'),threeRoot,addonRoot].some(root=>file.startsWith(root+path.sep))||!fs.existsSync(file)){response.writeHead(404);return response.end()}
  response.writeHead(200,{'content-type':'text/javascript','cache-control':'no-store'});response.end(fs.readFileSync(file));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try {
  browser=await puppeteer.launch({executablePath:chrome,headless:true,args:['--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
  const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForFunction(()=>window.actor);
  for(const pose of selected) {
    const directory=path.resolve('scratch/mascot-3d-frames',pose);fs.mkdirSync(directory,{recursive:true});
    for(let frame=0;frame<frames;frame++) {
      const encoded=await page.evaluate(({pose,time})=>{window.actor.setFrame(pose,time);return document.querySelector('canvas').toDataURL('image/png').split(',')[1]},{pose,time:frame/fps});
      fs.writeFileSync(path.join(directory,String(frame).padStart(3,'0')+'.png'),Buffer.from(encoded,'base64'));
      if(frame%30===0)console.log(pose,frame+'/'+frames);
    }
    const result=spawnSync(ffmpeg,['-y','-framerate',String(fps),'-i',path.join(directory,'%03d.png'),'-c:v','libvpx-vp9','-pix_fmt','yuva420p','-b:v','0','-crf','32','-auto-alt-ref','0','-row-mt','1','-threads','2',`${target}/${pose}.webm`],{encoding:'utf8',windowsHide:true});
    if(result.status)throw Error(result.stderr?.slice(-1200)||'FFmpeg failed');
    await sharp(path.join(directory,'045.png')).webp({quality:92,alphaQuality:100}).toFile(`${target}/${pose}.webp`);
    console.log('Encoded',pose,fs.statSync(`${target}/${pose}.webm`).size);
  }
  fs.writeFileSync(`${target}/manifest.json`,JSON.stringify({renderer:'Three.js 0.187.0',fps,frames,duration:4.8,size,alpha:true,poses},null,2)+'\n');
} finally {await browser?.close();server.close();}
