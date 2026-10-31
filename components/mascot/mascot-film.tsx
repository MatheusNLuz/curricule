import Image from 'next/image';
import type {RefObject} from 'react';
import type {MascotPose} from '@/lib/mascot-guide';
import styles from './motion.module.css';

export function MascotFilm({pose,videoRef,repeat=false}:{pose:MascotPose;videoRef?:RefObject<HTMLVideoElement|null>;repeat?:boolean}) {
  return <span className={styles.film}>
    <Image src={`/mascot/motion/${pose}.webp`} width={512} height={512} alt="" className={styles.still} sizes="(max-width:600px) 224px, 280px" />
    <video ref={videoRef} className={styles.clip} width={512} height={512} muted playsInline loop={repeat} preload="none" aria-hidden="true" onLoadedData={event=>{
      const video=event.currentTarget,canvas=document.createElement('canvas');canvas.width=1;canvas.height=1;
      const context=canvas.getContext('2d',{willReadFrequently:true});
      if(!context)return;
      context.drawImage(video,0,0,1,1,0,0,1,1);
      const transparent=context.getImageData(0,0,1,1).data[3]===0;
      video.parentElement!.dataset.ready=String(transparent);
      video.parentElement!.dataset.unsupported=String(!transparent);
      if(!transparent)video.pause();
    }} onError={event=>{event.currentTarget.parentElement!.dataset.ready='false'}}><source src={`/mascot/motion/${pose}.webm`} type="video/webm" /></video>
  </span>;
}
