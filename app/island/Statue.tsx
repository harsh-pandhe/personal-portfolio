"use client";

// A bronze of Harsh at the south entrance of the plaza, where visitors arrive: the figure (a KayKit
// body frozen mid-cheer) holds a quadcopter up in one hand, on a stone plinth with a plaque.
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone as skClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { fontFamily } from "./landmarks/common";
import { Solid } from "./Props";
import { world } from "./store";
import { heightAt } from "./terrain";

const BODY = "/models/people/rogue.glb";
const ANIMS = "/models/people/people-anims.glb";
const POS: [number, number] = [-2.2, 12.6]; // between the entrance flags, clear of the gardens
const PLINTH = 1.35;
const SCALE = 2.3; // ~3.3 m tall

function Quad({ mat }: { mat: THREE.Material }) {
  // a small quadcopter in the same bronze, held flat on the palm
  return (
    <group>
      <mesh material={mat}>
        <boxGeometry args={[0.16, 0.05, 0.16]} />
      </mesh>
      {[0, 1, 2, 3].map((k) => {
        const a = Math.PI / 4 + (k * Math.PI) / 2;
        return (
          <group key={k} rotation-y={a}>
            <mesh position={[0.13, 0, 0]} material={mat}>
              <boxGeometry args={[0.2, 0.025, 0.03]} />
            </mesh>
            <mesh position={[0.24, 0.025, 0]} material={mat}>
              <cylinderGeometry args={[0.075, 0.075, 0.01, 14]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export default function Statue() {
  const { scene } = useGLTF(BODY, false, true);
  const { animations } = useGLTF(ANIMS, false, true);
  const bronze = useMemo(() => new THREE.MeshStandardMaterial({ color: "#9a6a3c", metalness: 0.85, roughness: 0.38 }), []);
  const stone = useMemo(() => new THREE.MeshStandardMaterial({ color: "#d9d2c3", roughness: 0.85 }), []);
  const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3d3f44", roughness: 0.7 }), []);
  // (three.js drops the dots from node names: "upperarm.r" in the file is "upperarmr" here)
  const body = useMemo(() => {
    const b = skClone(scene);
    const knife = b.getObjectByName("Throwable");
    if (knife) knife.visible = false; // the drone takes its place
    b.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.material = bronze;
        m.castShadow = true;
        m.frustumCulled = false;
      }
    });
    return b;
  }, [scene, bronze]);
    useEffect(() => {
    const clip = animations.find((a) => a.name === "Cheer");
    if (!clip) return;
    const mixer = new THREE.AnimationMixer(body);
    mixer.clipAction(clip).play();
    // freeze the frame where the right hand is highest (arm raised, drone overhead)
    const hand = body.getObjectByName("handr");
    const p = new THREE.Vector3();
    let best = 0,
      top = -Infinity;
    for (let k = 0; k <= 40; k++) {
      mixer.setTime((clip.duration * k) / 40);
      body.updateMatrixWorld(true);
      const y = hand ? hand.getWorldPosition(p).y : 0;
      if (y > top) (top = y), (best = k);
    }
    mixer.setTime((clip.duration * best) / 40);
    body.updateMatrixWorld(true);
    // the cheer stops at the shoulders: lift the right arm up and out, clear of the head, to hold the drone high
    // (in the body's own frame it faces +z, so its right hand side is -x)
    const up = new THREE.Vector3(-0.62, 0.78, 0.12).normalize().applyQuaternion(body.getWorldQuaternion(new THREE.Quaternion()));
    const aim = (bone: THREE.Object3D | undefined, child: THREE.Object3D | undefined) => {
      if (!bone || !child || !bone.parent) return;
      const a = bone.getWorldPosition(new THREE.Vector3()),
        b = child.getWorldPosition(new THREE.Vector3());
      const turn = new THREE.Quaternion().setFromUnitVectors(b.sub(a).normalize(), up);
      const world = bone.getWorldQuaternion(new THREE.Quaternion());
      const parent = bone.parent.getWorldQuaternion(new THREE.Quaternion());
      bone.quaternion.copy(parent.invert().multiply(turn.multiply(world)));
      body.updateMatrixWorld(true);
    };
    aim(body.getObjectByName("upperarmr"), body.getObjectByName("lowerarmr"));
    aim(body.getObjectByName("lowerarmr"), body.getObjectByName("wristr"));
    return () => {
      mixer.stopAllAction();
    };
  }, [body, animations]);
  const hand = useMemo(() => body.getObjectByName("handslotr") ?? null, [body]);

  const plaque = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 200;
    const g = c.getContext("2d")!;
    g.fillStyle = "#2b2d31";
    g.fillRect(0, 0, 512, 200);
    g.strokeStyle = "#b08850";
    g.lineWidth = 6;
    g.strokeRect(10, 10, 492, 180);
    g.textAlign = "center";
    g.fillStyle = "#e8c48a";
    g.font = `800 58px ${fontFamily()}`;
    g.fillText("HARSH PANDHE", 256, 92);
    g.font = `500 24px ${fontFamily()}`;
    g.fillStyle = "#cfc6b4";
    g.fillText("Builds things that fly · Nerul → Singapore", 256, 146);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, []);
  const plaqueMat = useMemo(() => new THREE.MeshStandardMaterial({ map: plaque, emissiveMap: plaque, emissive: "#ffffff", emissiveIntensity: 0, roughness: 0.5 }), [plaque]);
  useFrame(() => {
    plaqueMat.emissiveIntensity = world.night * 0.6;
  });

  const y = heightAt(...POS);
  // turn toward people arriving from the south road
  const yaw = Math.atan2(0 - POS[0], 23 - POS[1]);
  return (
    <group position={[POS[0], y, POS[1]]} rotation-y={yaw}>
      <Solid r={1.3} />
      {/* octagonal plinth turned so a flat face carries the plaque */}
      <mesh position-y={0.12} rotation-y={Math.PI / 8} material={dark} receiveShadow castShadow>
        <cylinderGeometry args={[1.35, 1.45, 0.24, 8]} />
      </mesh>
      <mesh position-y={0.24 + (PLINTH - 0.24) / 2} rotation-y={Math.PI / 8} material={stone} receiveShadow castShadow>
        <cylinderGeometry args={[0.95, 1.1, PLINTH - 0.24, 8]} />
      </mesh>
      <mesh position={[0, 0.78, 0.962]} rotation-x={-0.125} material={plaqueMat}>
        <planeGeometry args={[0.7, 0.28]} />
      </mesh>
      <primitive object={body} position-y={PLINTH} scale={SCALE} />
      {hand && <HandDrone hand={hand} mat={bronze} />}
    </group>
  );
}

/** The drone rides on the right hand of the frozen pose, kept level above the fist. */
function HandDrone({ hand, mat }: { hand: THREE.Object3D; mat: THREE.Material }) {
  const holder = useMemo(() => new THREE.Group(), []);
  const done = useRef(false);
  useEffect(() => {
    hand.add(holder);
    return () => {
      hand.remove(holder);
    };
  }, [hand, holder]);
  // once the pose has settled, cancel the hand's rotation and scale so the drone sits flat, ~0.35 m above the fist
  useFrame(() => {
    if (done.current || !holder.parent) return;
    done.current = true;
    const hq = hand.getWorldQuaternion(new THREE.Quaternion()).invert();
    const hs = hand.getWorldScale(new THREE.Vector3());
    holder.quaternion.copy(hq);
    holder.scale.set(1 / hs.x, 1 / hs.y, 1 / hs.z);
    holder.position.copy(hand.worldToLocal(hand.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.38, 0))));
  });
  return (
    <primitive object={holder}>
      <group scale={2.4}>
        <Quad mat={mat} />
      </group>
    </primitive>
  );
}

useGLTF.preload(BODY, false, true);
