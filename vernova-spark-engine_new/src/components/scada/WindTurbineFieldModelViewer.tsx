import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Center, Sky, useGLTF } from "@react-three/drei";
import type { Group, Mesh, ShaderMaterial } from "three";
import {
  AdditiveBlending,
  Box3,
  CanvasTexture,
  Color,
  DoubleSide,
  MathUtils,
  Sprite,
  SpriteMaterial,
  Vector3,
} from "three";

const MODEL_URL = "/models/windTurbineField.glb";

/** Full 360° turn period. */
const ROTATION_PERIOD_S = 15;

/** Distance from model center; pitched down by LOOK_DOWN_DEG. */
const CAMERA_DISTANCE = 0.3;
const LOOK_DOWN_DEG = 0;

/** Low golden-hour sun — drives sky + ray direction. */
const SUN_POSITION = new Vector3(12, 3.2, 6);

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

function makeCloudTexture() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new CanvasTexture(canvas);

  ctx.clearRect(0, 0, size, size);

  // Denser puff stack so soft sprites read clearly against a bright sky.
  const blobs = [
    [0.5, 0.55, 0.38, 0.9],
    [0.3, 0.5, 0.3, 0.78],
    [0.7, 0.52, 0.32, 0.8],
    [0.42, 0.4, 0.26, 0.7],
    [0.6, 0.42, 0.28, 0.72],
    [0.5, 0.66, 0.34, 0.75],
    [0.22, 0.58, 0.22, 0.55],
    [0.78, 0.58, 0.24, 0.58],
    [0.55, 0.34, 0.2, 0.5],
  ] as const;

  for (const [x, y, rx, a] of blobs) {
    const g = ctx.createRadialGradient(
      x * size,
      y * size,
      0,
      x * size,
      y * size,
      rx * size,
    );
    g.addColorStop(0, `rgba(255,252,245,${a})`);
    g.addColorStop(0.35, `rgba(255,240,220,${a * 0.75})`);
    g.addColorStop(0.7, `rgba(255,220,185,${a * 0.28})`);
    g.addColorStop(1, "rgba(255,210,170,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x * size, y * size, rx * size, rx * size * 0.58, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/** Local offsets in camera space (x right, y up, z toward camera = negative forward). */
const CLOUD_LAYOUT = [
  { offset: [-0.09, 0.07, -0.55], scale: 0.28, speed: 0.02, phase: 0.2, opacity: 0.88 },
  { offset: [0.1, 0.09, -0.7], scale: 0.36, speed: 0.014, phase: 1.1, opacity: 0.82 },
  { offset: [-0.02, 0.11, -0.85], scale: 0.42, speed: 0.011, phase: 2.4, opacity: 0.75 },
  { offset: [0.14, 0.05, -0.48], scale: 0.22, speed: 0.018, phase: 3.3, opacity: 0.9 },
  { offset: [-0.14, 0.06, -0.62], scale: 0.26, speed: 0.016, phase: 4.1, opacity: 0.85 },
  { offset: [0.04, 0.13, -1.05], scale: 0.5, speed: 0.009, phase: 5.0, opacity: 0.68 },
  { offset: [-0.08, 0.04, -0.4], scale: 0.18, speed: 0.022, phase: 1.7, opacity: 0.92 },
] as const;

const _cloudWorld = new Vector3();

function DriftClouds() {
  const groupRef = useRef<Group>(null);
  const texture = useMemo(() => makeCloudTexture(), []);

  const sprites = useMemo(() => {
    return CLOUD_LAYOUT.map((c) => {
      const mat = new SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        opacity: c.opacity,
        color: new Color("#fff1de"),
        toneMapped: false,
      });
      const sprite = new Sprite(mat);
      sprite.renderOrder = 2;
      sprite.scale.set(c.scale * 1.7, c.scale * 0.9, 1);
      return { sprite, ...c };
    });
  }, [texture]);

  useFrame(({ camera, clock }) => {
    const t = clock.elapsedTime;
    camera.updateMatrixWorld();

    for (const c of sprites) {
      const driftX = Math.sin(t * c.speed * 6 + c.phase) * 0.025;
      const driftY = Math.sin(t * c.speed * 4 + c.phase * 1.7) * 0.01;

      // Keep clouds inside the actual camera frustum (world placements were off-screen).
      _cloudWorld.set(c.offset[0] + driftX, c.offset[1] + driftY, c.offset[2]);
      _cloudWorld.applyMatrix4(camera.matrixWorld);
      c.sprite.position.copy(_cloudWorld);

      const pulse = c.opacity * (0.9 + 0.1 * Math.sin(t * 0.4 + c.phase));
      (c.sprite.material as SpriteMaterial).opacity = pulse;
    }
  });

  useEffect(() => {
    return () => {
      texture.dispose();
      for (const c of sprites) {
        (c.sprite.material as SpriteMaterial).dispose();
      }
    };
  }, [sprites, texture]);

  return (
    <group ref={groupRef}>
      {sprites.map((c, i) => (
        <primitive key={i} object={c.sprite} />
      ))}
    </group>
  );
}

const SUN_RAY_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SUN_RAY_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  varying vec2 vUv;

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    // Origin near top-right of the plane (sun side)
    vec2 origin = vec2(0.55, 0.72);
    vec2 d = p - origin;
    float dist = length(d);
    float ang = atan(d.y, d.x);

    float rays = 0.0;
    // Sharp cinematic spokes
    rays += pow(max(0.0, sin(ang * 14.0 + uTime * 0.15)), 28.0);
    rays += pow(max(0.0, sin(ang * 9.0 - uTime * 0.08 + 1.7)), 18.0) * 0.65;
    // Softer secondary wash
    rays += pow(max(0.0, sin(ang * 5.0 + uTime * 0.05)), 6.0) * 0.25;

    float falloff = smoothstep(1.55, 0.05, dist);
    float core = exp(-dist * 3.2) * 0.9;
    float shimmer = 0.85 + 0.15 * sin(uTime * 0.7 + ang * 3.0);

    float alpha = (rays * falloff * 0.85 + core) * shimmer;
    alpha *= smoothstep(1.0, 0.2, abs(p.y + 0.1));

    vec3 col = mix(uColor, vec3(1.0, 0.92, 0.7), core * 0.65);
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.85));
  }
`;

function OrangeSunRays() {
  const meshRef = useRef<Mesh>(null);
  const matRef = useRef<ShaderMaterial>(null);

  const material = useMemo(
    () =>
      ({
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: AdditiveBlending,
        side: DoubleSide,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new Color("#ff7a28") },
        },
        vertexShader: SUN_RAY_VERT,
        fragmentShader: SUN_RAY_FRAG,
      }) as const,
    [],
  );

  useFrame(({ clock, camera }) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = clock.elapsedTime;
    }
    if (meshRef.current) {
      // Keep a large billboard behind the scene, biased toward the sun.
      meshRef.current.position.copy(SUN_POSITION).normalize().multiplyScalar(2.4);
      meshRef.current.quaternion.copy(camera.quaternion);
    }
  });

  return (
    <mesh ref={meshRef} renderOrder={-1} scale={[3.6, 3.6, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial ref={matRef} {...material} />
    </mesh>
  );
}

function SunDisc() {
  const ref = useRef<Mesh>(null);
  const texture = useMemo(() => {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return new CanvasTexture(canvas);
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,245,210,1)");
    g.addColorStop(0.25, "rgba(255,170,70,0.95)");
    g.addColorStop(0.55, "rgba(255,90,20,0.35)");
    g.addColorStop(1, "rgba(255,60,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  useFrame(({ camera }) => {
    if (!ref.current) return;
    ref.current.position.copy(SUN_POSITION).normalize().multiplyScalar(2.55);
    ref.current.quaternion.copy(camera.quaternion);
  });

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <sprite ref={ref as never} scale={[0.55, 0.55, 1]} renderOrder={-1}>
      <spriteMaterial
        map={texture}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={AdditiveBlending}
        opacity={0.95}
      />
    </sprite>
  );
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
    <group ref={groupRef} position={[0, -0.01, 0]}>
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

export function WindTurbineFieldModelViewer() {
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
          camera={{ fov: 35, near: 0.01, far: 1000 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 1.75]}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <CameraLookDown />
          {/* Warm late-day sky — GLB has no world/skybox from Blender. */}
          <color attach="background" args={["#f0a46a"]} />
          <Sky
            distance={450000}
            sunPosition={SUN_POSITION.toArray() as [number, number, number]}
            mieCoefficient={0.006}
            mieDirectionalG={0.85}
            rayleigh={1.6}
            turbidity={8}
          />
          <OrangeSunRays />
          <SunDisc />
          <DriftClouds />
          {/* Local lights only — no remote HDR (Environment) so this works offline / behind firewalls. */}
          <ambientLight intensity={0.7} />
          <hemisphereLight args={["#ffd7a8", "#3d5a3a", 0.75]} />
          <directionalLight position={SUN_POSITION.toArray() as [number, number, number]} intensity={1.9} color="#ffb070" />
          <directionalLight position={[-3.5, 2.5, -4]} intensity={0.45} color="#8eb6ff" />
          <directionalLight position={[0, 3, -2]} intensity={0.3} />
          <RotatingModel />
        </Canvas>
      </Suspense>
    </Canvas3DErrorBoundary>
  );
}

if (typeof window !== "undefined") {
  useGLTF.preload(MODEL_URL);
}
