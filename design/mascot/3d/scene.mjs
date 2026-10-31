import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const smooth=x=>{const v=THREE.MathUtils.clamp(x,0,1);return v*v*(3-2*v)};
const beat=(t,a,b,c,d)=>smooth((t-a)/(b-a))*(1-smooth((t-c)/(d-c)));

export function createMascot(canvas,{size=640}={}) {
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,preserveDrawingBuffer:true});
  renderer.setPixelRatio(1);renderer.setSize(size,size);renderer.setClearColor(0,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
  const scene=new THREE.Scene();const pmrem=new THREE.PMREMGenerator(renderer);
  const room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.04).texture;room.dispose();
  const camera=new THREE.PerspectiveCamera(32,1,.1,40);camera.position.set(.2,.2,8.5);camera.lookAt(0,-.15,0);
  scene.add(new THREE.HemisphereLight(0xffffff,0x777198,.8));
  const key=new THREE.DirectionalLight(0xffffff,2);key.position.set(-3,5,6);scene.add(key);
  const rim=new THREE.DirectionalLight(0xaca0ff,.8);rim.position.set(3,2,-2);scene.add(rim);
  const violet=new THREE.MeshStandardMaterial({color:0x3b29d8,roughness:.62,metalness:0,envMapIntensity:.15});
  const light=new THREE.MeshStandardMaterial({color:0xa391fa,roughness:.4});
  const dark=new THREE.MeshStandardMaterial({color:0x28213d,roughness:.48});
  const white=new THREE.MeshStandardMaterial({color:0xfff9ec,roughness:.7});
  const ink=new THREE.MeshStandardMaterial({color:0x8a70e9,roughness:.6});
  const mint=new THREE.MeshStandardMaterial({color:0x379e80,roughness:.45});
  const actor=new THREE.Group();scene.add(actor);
  const sphereGeometry=new THREE.SphereGeometry(1,32,20);
  function ellipsoid(parent,material,position,scale) {const mesh=new THREE.Mesh(sphereGeometry,material);mesh.position.copy(position);mesh.scale.copy(scale);parent.add(mesh);return mesh}
  function tube(parent,material,points,radius=.045) {const curve=new THREE.CatmullRomCurve3(points);const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,24,radius,10,false),material);parent.add(mesh);return mesh}
  function capsule(parent,material,a,b,radius) {
    const group=new THREE.Group();parent.add(group);
    const shaft=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,1,20),material);group.add(shaft);
    const ends=[ellipsoid(group,material,V(),V(radius,radius,radius)),ellipsoid(group,material,V(),V(radius,radius,radius))];
    return {group,set(start,end){const delta=end.clone().sub(start);shaft.position.copy(start).add(end).multiplyScalar(.5);shaft.scale.y=delta.length();shaft.quaternion.setFromUnitVectors(V(0,1,0),delta.normalize());ends[0].position.copy(start);ends[1].position.copy(end)}};
  }
  const outer=1.24,inner=.56,start=.9,end=Math.PI*2-.9,mid=(outer+inner)/2,radius=(outer-inner)/2;
  const silhouette=new THREE.Shape();silhouette.absarc(0,0,outer,start,end,false);silhouette.absarc(mid*Math.cos(end),mid*Math.sin(end),radius,end,end+Math.PI,false);silhouette.absarc(0,0,inner,end,start,true);silhouette.absarc(mid*Math.cos(start),mid*Math.sin(start),radius,start+Math.PI,start+Math.PI*2,false);silhouette.closePath();
  const rawBody=new THREE.ExtrudeGeometry(silhouette,{depth:.22,bevelEnabled:true,bevelSize:.115,bevelThickness:.13,bevelSegments:12,steps:1,curveSegments:64});rawBody.deleteAttribute('normal');rawBody.deleteAttribute('uv');const smoothBody=mergeVertices(rawBody);smoothBody.computeVertexNormals();
  const body=new THREE.Mesh(smoothBody,violet);body.position.z=-.11;body.scale.y=1.1;actor.add(body);
  for(const y of [.13,-.19]) {const bar=capsule(actor,light,V(.46,y,.06),V(.94,y,.06),.115);bar.set(V(.46,y,.06),V(.94,y,.06));}
  for(const x of [-.47,.45]) {const leg=capsule(actor,violet,V(x,-1.09,0),V(x,-1.49,.03),.15);leg.set(V(x,-1.09,0),V(x,-1.49,.03));ellipsoid(actor,violet,V(x,-1.62,.12),V(.36,.2,.39));}
  const face=new THREE.Group();actor.add(face);const eyes=[];
  for(const x of [-.46,.12]) {
    const eye=ellipsoid(face,dark,V(x,.86,.31),V(.095,.145,.06));eyes.push(eye);
    ellipsoid(eye,new THREE.MeshBasicMaterial({color:0xffffff}),V(-.2,.36,.83),V(.24,.22,.16));
    tube(face,dark,[V(x-.08,1.08,.3),V(x,1.11,.31),V(x+.08,1.08,.3)],.028);
  }
  tube(face,dark,[V(-.34,.75,.32),V(-.2,.68,.33),V(-.05,.75,.32)],.027);
  const paper=new THREE.Group();paper.position.set(-.63,-.42,.61);paper.rotation.z=.12;actor.add(paper);
  const sheet=new THREE.Mesh(new RoundedBoxGeometry(.76,1.0,.06,4,.025),white);paper.add(sheet);
  for(const y of [.26,.04,-.18]){const line=new THREE.Mesh(new THREE.BoxGeometry(.46,.055,.015),ink);line.position.set(.025,y,.032);paper.add(line)}
  const highlights=[];const checks=[];
  for(const y of [.26,.04,-.18]) {
    const m=new THREE.MeshBasicMaterial({color:0xf3ca65,transparent:true,opacity:0});const highlight=new THREE.Mesh(new THREE.PlaneGeometry(.57,.13),m);highlight.position.set(0,y,.045);paper.add(highlight);highlights.push(highlight);
    const check=tube(paper,mint,[V(.26,y,.055),V(.295,y-.037,.055),V(.36,y+.05,.055)],.016);checks.push(check);
  }
  const leftUpper=capsule(actor,violet,V(),V(),.14),leftLower=capsule(actor,violet,V(),V(),.145);
  leftUpper.set(V(-.97,-.16,.02),V(-1.14,-.64,.3));leftLower.set(V(-1.14,-.64,.3),V(-.8,-.73,.76));
  const leftHand=new THREE.Group();leftHand.position.set(-.73,-.73,.8);actor.add(leftHand);
  ellipsoid(leftHand,violet,V(),V(.21,.17,.1));
  for(let i=0;i<3;i++)ellipsoid(leftHand,violet,V(.12,-.09+i*.09,.04),V(.15,.055,.07));
  ellipsoid(leftHand,violet,V(.1,.12,.03),V(.15,.07,.07));
  const shoulder=V(.66,-.67,.02),upper=capsule(actor,violet,V(),V(),.155),lower=capsule(actor,violet,V(),V(),.145);
  const hand=new THREE.Group();actor.add(hand);ellipsoid(hand,violet,V(0,.11,0),V(.16,.19,.095));
  const fingers=[];
  for(let i=0;i<3;i++) {const finger=new THREE.Group();finger.position.set(-.105+i*.1,.22,0);hand.add(finger);const a=capsule(finger,violet,V(),V(),.055);a.set(V(),V(0,.10,0));const tip=new THREE.Group();tip.position.y=.10;finger.add(tip);const b=capsule(tip,violet,V(),V(),.053);b.set(V(),V(0,.09,0));fingers.push({finger,tip});}
  const thumb=new THREE.Group();thumb.position.set(-.13,.04,.01);hand.add(thumb);const thumbBone=capsule(thumb,violet,V(),V(),.055);thumbBone.set(V(),V(-.14,.11,.01));
  const approvalThumb=capsule(hand,violet,V(-.15,.12,0),V(-.14,.49,.02),.06);approvalThumb.set(V(-.15,.12,0),V(-.14,.49,.02));
  function handPose(mode) {
    for(let i=0;i<fingers.length;i++) {const {finger,tip}=fingers[i];const curl=mode==='fist'||mode==='grip'||(mode==='point'&&i!==0);finger.rotation.x=curl?1.28:0;tip.rotation.x=curl?1.08:0;finger.rotation.z=(i-1)*-.09;}
    thumb.visible=mode!=='fist'&&mode!=='point';approvalThumb.group.visible=mode==='fist';thumb.rotation.z=0;thumb.rotation.x=mode==='grip'?.7:0;
  }
  upper.group.visible=false;lower.group.visible=false;const softArm=new THREE.Mesh(new THREE.BufferGeometry(),violet);actor.add(softArm);const wristJoint=ellipsoid(actor,violet,V(),V(.145,.145,.145));
  function arm(wrist,elbow,angle=0,mode='open') {softArm.geometry.dispose();softArm.geometry=new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(shoulder,elbow,wrist),32,.15,14,false);wristJoint.position.copy(wrist);hand.position.copy(wrist);hand.rotation.set(0,0,angle);handPose(mode);}
  const loupe=new THREE.Group();actor.add(loupe);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.21,.028,12,48),dark);loupe.add(ring);
  const glass=new THREE.Mesh(new THREE.CircleGeometry(.182,40),new THREE.MeshBasicMaterial({color:0xe4ddff,transparent:true,opacity:.24,side:THREE.DoubleSide}));glass.position.z=.01;loupe.add(glass);
  const handle=capsule(loupe,dark,V(.14,-.15,0),V(.36,-.4,0),.042);handle.set(V(.14,-.15,0),V(.36,-.4,0));
  const pen=new THREE.Group();actor.add(pen);const pencil=capsule(pen,ink,V(),V(.32,.32,0),.027);pencil.set(V(),V(.32,.32,0));const nib=new THREE.Mesh(new THREE.ConeGeometry(.03,.11,12),dark);nib.position.set(-.028,-.028,0);nib.rotation.z=-Math.PI/4;pen.add(nib);
  const thought=new THREE.Group();actor.add(thought);
  for(const [x,y,r] of [[.82,1.03,.045],[1.03,1.24,.07],[1.3,1.48,.22]])ellipsoid(thought,white,V(x,y,.04),V(r,r,.07));
  const bulb=ellipsoid(thought,new THREE.MeshStandardMaterial({color:0xf1c966,emissive:0x6d4605,roughness:.4}),V(1.3,1.51,.13),V(.085,.1,.04));
  const base=new THREE.Mesh(new THREE.BoxGeometry(.085,.045,.04),dark);base.position.set(1.3,1.4,.13);thought.add(base);
  const confetti=new THREE.Group();actor.add(confetti);const pieces=[];
  const colors=[0xa18aff,0xe3bc60,0x53b89a,0xe2ddfb];
  for(let i=0;i<38;i++) {const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.065,.12),new THREE.MeshStandardMaterial({color:colors[i%4],side:THREE.DoubleSide,roughness:.6}));confetti.add(mesh);pieces.push({mesh,angle:i*2.39996,speed:.6+(i%7)*.13,delay:(i%5)*.025});}
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;const ctx=shadowCanvas.getContext('2d');const gradient=ctx.createRadialGradient(64,64,1,64,64,64);gradient.addColorStop(0,'rgba(35,24,70,.2)');gradient.addColorStop(1,'rgba(35,24,70,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(2.6,.35),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));shadow.position.set(0,-1.81,.03);scene.add(shadow);
  function setFrame(pose,seconds) {
    const t=((seconds%4.8)+4.8)%4.8;const action=beat(t,.35,1,3.4,4.3);
    actor.position.set(0,0,0);actor.rotation.set(0,0,0);actor.scale.set(1,1,1);face.position.set(0,0,0);face.rotation.z=0;paper.position.set(-.63,-.42,.61);paper.rotation.z=.12;leftHand.position.set(-.73,-.73,.8);
    loupe.visible=false;pen.visible=false;thought.visible=false;confetti.visible=false;checks.forEach(c=>c.visible=false);highlights.forEach(h=>h.material.opacity=0);
    for(const eye of eyes)eye.scale.y=.145*(1-.9*beat(t,1.08,1.15,1.19,1.26));
    arm(V(1.42,.16,.12),V(1.18,-.37,.05),-.12);
    if(pose==='welcome') {hand.rotation.z=-.12+Math.sin(t*8)*.28*action;actor.rotation.z=Math.sin(t*3)*.018*action;}
    if(pose==='explain') {
      const next=smooth((t-1.7)/.6)*(1-smooth((t-3.5)/.7)),row=.26-.44*next;const target=V(-.55,row-.42,.85);arm(target.clone().add(V(.342,.25,0)),V(.74,-.1,.38),1.95,'point');
      highlights[0].material.opacity=.6*action*(1-next);highlights[2].material.opacity=.6*action*next;face.position.x=-.025*action;face.position.y=-.025*action;
    }
    if(pose==='read') {
      const x=-.62+Math.sin(t*1.7)*.13*action,y=-.12-Math.sin(Math.PI*THREE.MathUtils.clamp((t-.5)/3.8,0,1))*.43;
      loupe.visible=true;loupe.position.set(x,y,.96);const wrist=V(x+.34,y-.39,.96);arm(wrist,V(.69,-.5,.48),.7,'grip');
      face.position.set(-.03*action,-.045*action,0);face.rotation.z=.035*action;actor.rotation.z=.015*action;
    }
    if(pose==='think') {
      arm(V(.15,.45,.66),V(.7,-.2,.38),.72,'point');face.rotation.z=-.055*action;face.position.y=.025*action;
      thought.visible=t>.9&&t<4.1;thought.scale.setScalar(.78+.22*smooth((t-.9)/.35));bulb.material.emissiveIntensity=1+Math.sin(t*5)*.2;
    }
    if(pose==='verify') {
      const row=.26-.22*smooth((t-1.2)/.22)-.22*smooth((t-2)/.22)+.44*smooth((t-3.4)/.7),y=row-.42;const writing=beat(t,.5,.8,3.2,3.6);
      const tip=V(-.33,y,.75),withdraw=smooth((t-3.1)/.5)*(1-smooth((t-4.1)/.5));pen.visible=true;pen.position.copy(tip);pen.position.x+=Math.sin(t*13)*.025*writing+.4*withdraw;pen.position.y+=Math.cos(t*13)*.02*writing+.18*withdraw;
      arm(pen.position.clone().add(V(.25,.25,.05)),V(.58,-.22,.45),1.0,'grip');checks.forEach((c,i)=>c.visible=t>1.1+i*.8);mint.transparent=true;mint.opacity=1-smooth((t-3.7)/.5);face.position.y=-.035*writing;
    }
    if(pose==='celebrate') {
      arm(V(1.32,.16,.15),V(1.12,-.35,.07),-.08,'fist');
      const jump=beat(t,.5,.95,1.2,1.6);actor.position.y=.18*jump;actor.rotation.z=Math.sin(t*4)*.025*action;
      confetti.visible=t>.75&&t<3.8;
      for(const p of pieces) {const age=Math.max(0,t-.75-p.delay);p.mesh.position.set(Math.cos(p.angle)*p.speed*age,1.5+1.2*age-1.05*age*age,.3+Math.sin(p.angle)*.5*age);p.mesh.rotation.set(age*4+p.angle,age*3,age*2);p.mesh.material.transparent=true;p.mesh.material.opacity=1-smooth((age-2.2)/.7);}
    }
    renderer.render(scene,camera);
  }
  setFrame('welcome',0);
  return {renderer,scene,camera,setFrame};
}
