import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Center, useGLTF } from "@react-three/drei";
import type { Group } from "three";
import { Box3, MathUtils, Vector3 } from "three";

const MODEL_URL =
  "/models/Meshy_AI_Industrial_Processing_0807154644_texture.glb";

/** Full 360° turn every 15 seconds. */
const ROTATION_PERIOD_S = 15;

/** Distance from model center; pitched down by LOOK_DOWN_DEG. */
const CAMERA_DISTANCE = 3.8;
const LOOK_DOWN_DEG = 30;

function CameraLookDown() {
  const { camera } = useThree();

  useLayoutEffect(() => {
    const pitch = MathUtils.degToRad(LOOK_DOWN_DEG);
    camera.position.set(
      0,
      CAMERA_DISTANCE * Math.sin(pitch),
      CAMERA_DISTANCE * Math.cos(pitch),
    );
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera]);

  return null;
}

function RotatingModel() {
  const groupRef = useRef<Group>(null);
  const { scene } = useGLTF(MODEL_URL);

  const prepared = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if ("castShadow" in child) {
        (child as { castShadow: boolean; receiveShadow: boolean }).castShadow = true;
        (child as { castShadow: boolean; receiveShadow: boolean }).receiveShadow = true;
      }
    });

    // Normalize size so the asset fills the stage consistently.
    const box = new Box3().setFromObject(clone);
    const size = box.getSize(new Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = 1.65 / maxDim;
    clone.scale.setScalar(scale);

    return clone;
  }, [scene]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += ((Math.PI * 2) / ROTATION_PERIOD_S) * delta;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <Center>
        <primitive object={prepared} />
      </Center>
    </group>
  );
}

function ViewerFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-lime/30 border-t-lime" />
        <span className="font-mono text-[10px] uppercase tracking-wider text-lime/70">
          Loading 3D model…
        </span>
      </div>
    </div>
  );
}

import { Canvas3DErrorBoundary } from "./Canvas3DErrorBoundary";

export function SynconModelViewer() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <ViewerFallback />;
  }

  return (
    <Canvas3DErrorBoundary fallback={<ViewerFallback />}>
      <Suspense fallback={<ViewerFallback />}>
        <Canvas
          className="h-full w-full touch-none"
          camera={{ fov: 35, near: 0.1, far: 100 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 1.75]}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <CameraLookDown />
          <color attach="background" args={["#212121"]} />
          {/* Local lights only — no remote HDR (Environment) so this works offline / behind firewalls. */}
          <ambientLight intensity={0.75} />
          <hemisphereLight args={["#ffffff", "#212121", 0.55]} />
          <directionalLight position={[4, 6, 3]} intensity={1.6} />
          <directionalLight position={[-3.5, 2.5, -4]} intensity={0.65} />
          <directionalLight position={[0, 3, -2]} intensity={0.35} />
          <RotatingModel />
        </Canvas>
      </Suspense>
    </Canvas3DErrorBoundary>
  );
}

if (typeof window !== "undefined") {
  useGLTF.preload(MODEL_URL);
}
