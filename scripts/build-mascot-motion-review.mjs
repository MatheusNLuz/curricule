// node --import ./tests/register.mjs scripts/build-mascot-motion-review.mjs
import fs from 'node:fs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MascotFilm} from '../components/mascot/mascot-film';

const poses=['welcome','explain','read','think','verify','celebrate'],media={};
for(const pose of poses) {
  let markup=renderToStaticMarkup(createElement(MascotFilm,{pose,repeat:true}));
  markup=markup.replace(/ srcSet="[^"]*"/g,'').replace(/src="[^"]*url=%2Fmascot%2Fmotion%2F([^&]+)[^"]*"/g,(_,name)=>`src="data:image/webp;base64,${fs.readFileSync('public/mascot/motion/'+decodeURIComponent(name)).toString('base64')}"`);
  markup=markup.replace(/src="\/mascot\/motion\/([^"]+)"/g,(_,name)=>`src="data:video/webm;base64,${fs.readFileSync('public/mascot/motion/'+name).toString('base64')}"`);media[pose]=markup;
}
const script=String.raw`
const films=${JSON.stringify(media)},$=s=>document.querySelector(s),root=$('#character'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
const actions={welcome:['Receber','Um aceno para receber você.'],explain:['Explicar','O indicador acompanha dois trechos do documento enquanto cada trecho recebe destaque.'],read:['Analisar','A lupa e a mão percorrem o documento juntas. O olhar acompanha a leitura.'],think:['Pensar','O dedo toca o queixo e a cabeça se inclina. Após a pausa, surge uma ideia.'],verify:['Conferir','A caneta marca três itens da lista, um de cada vez.'],celebrate:['Concluir','Um joinha e um pequeno salto celebram a conclusão com confetes.']};
let paused=reduced.matches,visible=true,clip;
function sync(){if(!clip)return;clip.playbackRate=Number($('#speed').value);if(paused||reduced.matches||document.hidden||!visible)clip.pause();else clip.play().catch(()=>{paused=true;$('#play').textContent='Reproduzir'});$('#play').textContent=paused?'Reproduzir':'Pausar'}
function choose(name){clip?.pause();root.dataset.pose=name;root.innerHTML=films[name];clip=root.querySelector('video');clip.muted=true;clip.playsInline=true;const current=clip;clip.addEventListener('loadeddata',()=>current.parentElement.dataset.ready='true');$('#title').textContent=actions[name][0];$('#description').textContent=actions[name][1];document.querySelectorAll('[data-action]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.action===name)));sync()}
$('#actions').innerHTML=Object.entries(actions).map(([id,[label]])=>'<button data-action="'+id+'" aria-pressed="false">'+label+'</button>').join('');document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>choose(b.dataset.action));$('#play').onclick=()=>{paused=!paused;sync()};$('#restart').onclick=()=>{clip.currentTime=0;paused=reduced.matches;sync()};$('#speed').onchange=sync;$('#timeline').oninput=()=>{paused=true;sync();const time=Number($('#timeline').value)/1000;if(clip.readyState>=1)clip.currentTime=time;else{clip.preload='auto';clip.load();clip.addEventListener('loadedmetadata',()=>clip.currentTime=time,{once:true})}};$('#theme').onclick=()=>document.body.classList.toggle('dark');reduced.addEventListener('change',()=>{paused=reduced.matches;sync()});new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync()}).observe(root);document.addEventListener('visibilitychange',sync);function tick(){const t=clip?.currentTime||0;if(document.activeElement!==$('#timeline'))$('#timeline').value=t*1000;$('#time').textContent=t.toFixed(2).replace('.',',')+' s';requestAnimationFrame(tick)}choose('welcome');tick();`;
const html=fs.readFileSync('design/mascot/3d/review-template.html','utf8').replace('@@MASCOT@@',media.welcome).replace('@@SCRIPT@@',script).replace('@@CSS@@',fs.readFileSync('components/mascot/motion.module.css','utf8'));
const directory='docs/mascot-review-2026-10-30';fs.mkdirSync(directory,{recursive:true});
for(const file of ['design/mascot/rig/review.html',directory+'/index.html',directory+'/motion.html',directory+'/motion-v4.html'])fs.writeFileSync(file,html);
console.log('3D motion review:',Math.round(html.length/1024),'KiB');
