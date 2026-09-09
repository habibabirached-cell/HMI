import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Center, useGLTF } from "@react-three/drei";
import type { Camera, Group } from "three";
import { Box3, MathUtils, Vector3 } from "three";
import { Canvas3DErrorBoundary } from "./Canvas3DErrorBoundary";

const DRACO_DECODER_PATH = "/draco/";
const MODEL_URL = "/models/allStatcomHouses.glb";

/** One full overview orbit before the flythrough. */
const ORBIT_PERIOD_S = 15;
/** Dive from overview into the start of the hall pass. */
const DIVE_S = 2.0;
/** Continuous left→right pass across the chambers (no mid stops). */
const PAN_S = 6.0;
/** Pull back out to overview. */
const RETURN_S = 2.4;

/** Default overview orbit standoff (main STATCOM card). */
const DEFAULT_CAMERA_DISTANCE = 2.3;
const LOOK_DOWN_DEG = 30;
const LOOK_AT_Y = -0.5;
const MODEL_Y = -0.15;
const FIT_SIZE = 1.65;

export type StatcomFlythroughViewerProps = {
  /** Overview orbit distance (smaller = closer). */
  cameraDistance?: number;
};

type Pose = { position: Vector3; lookAt: Vector3 };

function easeInOut(t: number) {
  const x = MathUtils.clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

function overviewPose(angleRad: number, cameraDistance: number): Pose {
  const pitch = MathUtils.degToRad(LOOK_DOWN_DEG);
  const y = cameraDistance * Math.sin(pitch);
  const r = cameraDistance * Math.cos(pitch);
  return {
    position: new Vector3(Math.sin(angleRad) * r, y, Math.cos(angleRad) * r),
    lookAt: new Vector3(0, LOOK_AT_Y, 0),
  };
}

/** Start/end poses for a continuous hall pass (kept farther back). */
function buildHallPass(root: Group): { start: Pose; end: Pose } | null {
  const box = new Box3().setFromObject(root);
  if (box.isEmpty()) return null;

  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  const alongX = size.x >= size.z;
  const span = alongX ? size.x : size.z;
  const hallCenter = alongX ? center.x : center.z;
  const cross = alongX ? center.z : center.x;
  const halfSpan = span * 0.2;
  // Pull back: higher camera, more standoff from the halls.
  const lookY = box.min.y + size.y * 0.42;
  const camY = box.min.y + size.y * 1.15;
  const standoff = Math.max(0.75, (alongX ? size.z : size.x) * 0.38);

  const poseAt = (along: number): Pose => {
    const lookAt = alongX
      ? new Vector3(along, lookY, cross)
      : new Vector3(cross, lookY, along);
    const position = alongX
      ? new Vector3(along, camY, cross + standoff)
      : new Vector3(cross + standoff, camY, along);
    return { position, lookAt };
  };

  return {
    start: poseAt(hallCenter - halfSpan),
    end: poseAt(hallCenter + halfSpan),
  };
}

function applyPose(camera: Camera, pose: Pose) {
  camera.position.copy(pose.position);
  camera.lookAt(pose.lookAt);
}

function lerpPose(a: Pose, b: Pose, t: number, ease = true): Pose {
  const k = ease ? easeInOut(t) : MathUtils.clamp(t, 0, 1);
  return {
    position: a.position.clone().lerp(b.position, k),
    lookAt: a.lookAt.clone().lerp(b.lookAt, k),
  };
}

function StatcomScene({ cameraDistance }: { cameraDistance: number }) {
  const { camera } = useThree();
  const groupRef = useRef<Group>(null);
  const hallPassRef = useRef<{ start: Pose; end: Pose } | null>(null);
  const elapsedRef = useRef(0);
  const { scene } = useGLTF(MODEL_URL, DRACO_DECODER_PATH);

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
    clone.scale.setScalar(FIT_SIZE / maxDim);
    return clone;
  }, [scene]);

  useFrame((_, delta) => {
    if (groupRef.current && !hallPassRef.current) {
      hallPassRef.current = buildHallPass(groupRef.current);
    }

    const hall = hallPassRef.current;
    const flyTotalS = DIVE_S + PAN_S;
    const cycleS = ORBIT_PERIOD_S + flyTotalS + RETURN_S;

    elapsedRef.current += delta;
    const t = elapsedRef.current % cycleS;

    if (t < ORBIT_PERIOD_S || !hall) {
      const angle = (Math.min(t, ORBIT_PERIOD_S) / ORBIT_PERIOD_S) * Math.PI * 2;
      applyPose(camera, overviewPose(angle, cameraDistance));
      return;
    }

    const afterOrbit = t - ORBIT_PERIOD_S;

    if (afterOrbit < DIVE_S) {
      applyPose(
        camera,
        lerpPose(
          overviewPose(Math.PI * 2, cameraDistance),
          hall.start,
          afterOrbit / DIVE_S,
        ),
      );
      return;
    }

    if (afterOrbit < flyTotalS) {
      // Linear pan — constant speed across chambers (no pause).
      const panT = (afterOrbit - DIVE_S) / PAN_S;
      applyPose(camera, lerpPose(hall.start, hall.end, panT, false));
      return;
    }

    const returnT = (afterOrbit - flyTotalS) / RETURN_S;
    applyPose(
      camera,
      lerpPose(hall.end, overviewPose(0, cameraDistance), returnT),
    );
  });

  return (
    <>
      <color attach="background" args={["#212121"]} />
      <ambientLight intensity={0.75} />
      <hemisphereLight args={["#ffffff", "#212121", 0.55]} />
      <directionalLight position={[4, 6, 3]} intensity={1.6} />
      <directionalLight position={[-3.5, 2.5, -4]} intensity={0.65} />
      <directionalLight position={[0, 3, -2]} intensity={0.35} />
      <group ref={groupRef} position={[0, MODEL_Y, 0]}>
        <Center>
          <primitive object={prepared} />
        </Center>
      </group>
    </>
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

export function StatcomFlythroughViewer({
  cameraDistance = DEFAULT_CAMERA_DISTANCE,
}: StatcomFlythroughViewerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      useGLTF.preload(MODEL_URL, DRACO_DECODER_PATH);
    }
  }, []);

  if (!mounted) {
    return <ViewerFallback />;
  }

  return (
    <Canvas3DErrorBoundary fallback={<ViewerFallback />}>
      <Suspense fallback={<ViewerFallback />}>
        <Canvas
          className="h-full w-full touch-none"
          camera={{ fov: 35, near: 0.05, far: 100 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 1.75]}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <StatcomScene cameraDistance={cameraDistance} />
        </Canvas>
      </Suspense>
    </Canvas3DErrorBoundary>
  );
}
