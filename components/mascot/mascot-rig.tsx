import Image from "next/image";
import styles from "./rig.module.css";

/** One shared cutout rig: actions never regenerate the character's anatomy. */
export function MascotRig() {
  return <span className={styles.rig} aria-hidden="true">
    <span className={styles.ground} />
    <span className={styles.performer}>
      <Image src="/mascot/rig/body.webp" width={640} height={660} alt="" className={styles.rigBody} sizes="280px" />
      <span className={styles.documentArm}><Image src="/mascot/rig/document.webp" width={320} height={320} alt="" sizes="120px" /></span>
      <span className={styles.gestureArm}>
        <Image src="/mascot/rig/wave.webp" width={320} height={320} alt="" className={styles.waveHand} sizes="120px" />
      </span>
      <span className={styles.restingArm}><Image src="/mascot/rig/rest.webp" width={240} height={360} alt="" sizes="90px" /></span>
      <span className={styles.confirmArm}><Image src="/mascot/rig/approve.webp" width={320} height={320} alt="" sizes="120px" /></span>
      <span className={styles.face}>
        <Image src="/mascot/rig/brows.webp" width={320} height={65} alt="" className={styles.brows} sizes="90px" />
        <span className={styles.eyes}><Image src="/mascot/rig/eyes.webp" width={320} height={160} alt="" sizes="90px" /></span>
        <Image src="/mascot/rig/smile.webp" width={160} height={80} alt="" className={styles.smile} sizes="35px" />
      </span>
    </span>
  </span>;
}
