import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Center, useGLTF } from "@react-three/drei";
import type { Group } from "three";
import { Box3, MathUtils, Vector3 } from "three";
import { Canvas3DErrorBoundary } from "./Canvas3DErrorBoundary";

/**
 * Local Draco decoder (KHR_draco_mesh_compression).
 * Bess.c.glb requires this; default drei path hits gstatic CDN and can hang offline / behind firewalls.
 */
const DRACO_DECODER_PATH = "/draco/";

export type RotatingGlbViewerProps = {
  modelUrl: string;
  /** Full 360° turn period in seconds. */
  rotationPeriodS?: number;
  cameraDistance?: number;
  lookDownDeg?: number;
  lookAtY?: number;
  modelY?: number;
  /** Target max dimension after normalize. */
  fitSize?: number;
  background?: string;
};

function CameraLookDown({
  cameraDistance,
  lookDownDeg,
  lookAtY,
}: {
  cameraDistance: number;
  lookDownDeg: number;
  lookAtY: number;
}) {
  const { camera } = useThree();

  useLayoutEffect(() => {
    const pitch = MathUtils.degToRad(lookDownDeg);
    camera.position.set(
      0,
      cameraDistance * Math.sin(pitch),
      cameraDistance * Math.cos(pitch),
    );
    camera.lookAt(0, lookAtY, 0);
    camera.updateProjectionMatrix();
  }, [camera, cameraDistance, lookDownDeg, lookAtY]);

  return null;
}

function RotatingModel({
  modelUrl,
  rotationPeriodS,
  modelY,
  fitSize,
}: {
  modelUrl: string;
  rotationPeriodS: number;
  modelY: number;
  fitSize: number;
}) {
  const groupRef = useRef<Group>(null);
  const { scene } = useGLTF(modelUrl, DRACO_DECODER_PATH);

  const prepared = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if ("castShadow" in child) {
        (child as { castShadow: boolean; receiveShadow: boolean }).castShadow = true;
        (child as { castShadow: boolean; receiveShadow: boolean }).receiveShadow = true;
      }
    });

    const box = new Box3().setFromObject(clone);
    const size = box.getSize(new Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    clone.scale.setScalar(fitSize / maxDim);

    return clone;
  }, [scene, fitSize]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += ((Math.PI * 2) / rotationPeriodS) * delta;
    }
  });

  return (
    <group ref={groupRef} position={[0, modelY, 0]}>
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

export function RotatingGlbViewer({
  modelUrl,
  rotationPeriodS = 15,
  cameraDistance = 3.8,
  lookDownDeg = 24,
  lookAtY = 0,
  modelY = 0,
  fitSize = 1.65,
  background = "#212121",
}: RotatingGlbViewerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      useGLTF.preload(modelUrl, DRACO_DECODER_PATH);
    }
  }, [modelUrl]);

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
          <CameraLookDown
            cameraDistance={cameraDistance}
            lookDownDeg={lookDownDeg}
            lookAtY={lookAtY}
          />
          <color attach="background" args={[background]} />
          {/* Local lights only — no remote HDR (Environment) so this works offline / behind firewalls. */}
          <ambientLight intensity={0.75} />
          <hemisphereLight args={["#ffffff", "#212121", 0.55]} />
          <directionalLight position={[4, 6, 3]} intensity={1.6} />
          <directionalLight position={[-3.5, 2.5, -4]} intensity={0.65} />
          <directionalLight position={[0, 3, -2]} intensity={0.35} />
          <RotatingModel
            modelUrl={modelUrl}
            rotationPeriodS={rotationPeriodS}
            modelY={modelY}
            fitSize={fitSize}
          />
        </Canvas>
      </Suspense>
    </Canvas3DErrorBoundary>
  );
}
