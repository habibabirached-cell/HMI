import { useEffect, useRef, useState } from 'react';
import { loadThreeGltfRuntime } from '../../utils/threeGltfRuntime';

const ACCENT_TEAL = 0x00d4a8;
/** Camera height above the look-at target — controls pitch (higher = more top-down). */
const DEFAULT_CAMERA_PITCH_LIFT = 0.42;
const TURNTABLE_YAW = 0.004;
const DEFAULT_PENDULUM_AMPLITUDE_DEG = 45;
const DEFAULT_PENDULUM_PERIOD_MS = 7000;
const DEFAULT_FACE_TRIGGER_WINDOW_DEG = 6;
const DEFAULT_FLYBY_TRAVEL_SCALE = 0.42;
const DEFAULT_FLYBY_DURATION_MS = 3200;

function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

function radToDeg(rad) {
  return (rad * 180) / Math.PI;
}

function normalizeYawDeg(rad) {
  let deg = radToDeg(rad) % 360;
  if (deg < 0) deg += 360;
  return deg;
}

function shortestAngleDiffDeg(aDeg, bDeg) {
  return ((aDeg - bDeg + 180) % 360 + 360) % 360 - 180;
}

function pickLongitudinalAxis(THREE, size) {
  if (size.z >= size.x && size.z >= size.y) {
    return new THREE.Vector3(0, 0, 1);
  }
  if (size.y >= size.x && size.y >= size.z) {
    return new THREE.Vector3(0, 1, 0);
  }
  return new THREE.Vector3(1, 0, 0);
}

function frameObject(
  THREE,
  object,
  camera,
  {
    fitScale = 0.92,
    modelYOffset = 0,
    cameraPitchLift = DEFAULT_CAMERA_PITCH_LIFT,
    shiftUP = 0,
    shiftScreenX = 0,
  } = {},
) {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  object.position.sub(center);
  object.updateMatrixWorld(true);

  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const fitDist = maxDim / (2 * Math.tan((camera.fov * Math.PI) / 360));
  const dist = fitDist * fitScale;

  if (modelYOffset) {
    object.position.y += maxDim * modelYOffset;
    object.updateMatrixWorld(true);
  }

  const targetY = object.position.y;
  // Keep pitch above the shifted target — world-space camera, independent of turntable yaw.
  camera.position.set(dist * 0.65, targetY + dist * cameraPitchLift, dist * 0.9);
  camera.lookAt(0, targetY, 0);
  camera.updateMatrixWorld(true);

  // Screen-space vertical shift: move model along the camera up axis (parallel to screen up).
  if (shiftUP) {
    object.position.addScaledVector(camera.up.clone().normalize(), maxDim * shiftUP);
    object.updateMatrixWorld(true);
  }

  // Screen-space horizontal shift (+ = model appears farther right on screen).
  if (shiftScreenX) {
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize();
    object.position.addScaledVector(right, maxDim * shiftScreenX);
    object.updateMatrixWorld(true);
  }

  camera.near = Math.max(maxDim / 1000, 0.001);
  camera.far = Math.max(maxDim * 20, 100);
  camera.updateProjectionMatrix();

  const longitudinalLocal = pickLongitudinalAxis(THREE, size);
  const longestDim = Math.max(size.x, size.y, size.z, 0.001);

  return { maxDim, targetY, longitudinalLocal, longestDim };
}

/**
 * Slow turntable preview for Ideum05 nav card slots (external glTF + Draco).
 */
export default function Ideum05Nav3DViewer({
  width,
  height,
  modelUrl,
  fitScale = 0.92,
  modelYOffset = 0,
  shiftUP = 0,
  shiftScreenX = 0,
  cameraPitchLift = DEFAULT_CAMERA_PITCH_LIFT,
  rotationMode = 'turntable',
  pendulumAmplitudeDeg = DEFAULT_PENDULUM_AMPLITUDE_DEG,
  pendulumPeriodMs = DEFAULT_PENDULUM_PERIOD_MS,
  pendulumOffsetDeg = 0,
  faceYawDeg = 0,
  faceTriggerWindowDeg = DEFAULT_FACE_TRIGGER_WINDOW_DEG,
  flybyTravelScale = DEFAULT_FLYBY_TRAVEL_SCALE,
  flybyDurationMs = DEFAULT_FLYBY_DURATION_MS,
  flybyRepeatCount = 1,
  turntableSpeedScale = 1,
  showYawDebug = false,
}) {
  const hostRef = useRef(null);
  const debugRef = useRef(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || width < 8 || height < 8 || !modelUrl) return undefined;

    setLoadError(null);

    let frameId = 0;
    let disposed = false;
    let renderer = null;
    let scene = null;

    loadThreeGltfRuntime()
      .then(({ THREE, createGltfLoader }) => {
        if (disposed) return;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0e10);

        const camera = new THREE.PerspectiveCamera(42, width / height, 0.01, 5000);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setSize(width, height, false);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        renderer.domElement.style.display = 'block';
        renderer.domElement.style.position = 'absolute';
        renderer.domElement.style.left = '0';
        renderer.domElement.style.top = '0';
        renderer.domElement.style.width = `${width}px`;
        renderer.domElement.style.height = `${height}px`;
        host.appendChild(renderer.domElement);

        scene.add(new THREE.AmbientLight(0xffffff, 0.85));
        const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
        keyLight.position.set(4, 6, 5);
        scene.add(keyLight);
        const fillLight = new THREE.DirectionalLight(ACCENT_TEAL, 0.9);
        fillLight.position.set(-5, 2, -3);
        scene.add(fillLight);
        const rimLight = new THREE.DirectionalLight(ACCENT_TEAL, 0.45);
        rimLight.position.set(0, -2, -6);
        scene.add(rimLight);

        let turntable = null;
        let frameMeta = null;
        let baseCameraPos = null;
        let baseLookAt = null;
        let flybyTravel = 0;
        let longitudinalWorld = null;

        let faceFlybyState = 'rotating';
        let flybyStartMs = 0;
        let flybyCyclesLeft = 0;
        const flybyLegMs = Math.max(flybyDurationMs / 2, 400);
        const faceFlybyTune = rotationMode === 'faceFlybyTune';
        const turntableStep = TURNTABLE_YAW * Math.max(turntableSpeedScale, 0.1);

        const getFaceYawRad = () => degToRad(faceYawDeg);

        const updateLongitudinalWorld = () => {
          if (!turntable || !frameMeta) return;
          turntable.updateMatrixWorld(true);
          longitudinalWorld = frameMeta.longitudinalLocal
            .clone()
            .applyQuaternion(turntable.quaternion)
            .normalize();
        };

        const applyCameraAlongLongitudinal = (amount) => {
          if (!baseCameraPos || !baseLookAt || !longitudinalWorld) return;
          const offset = longitudinalWorld.clone().multiplyScalar(amount);
          camera.position.copy(baseCameraPos).add(offset);
          const lookAt = baseLookAt.clone().add(offset);
          camera.lookAt(lookAt);
        };

        const loader = createGltfLoader();
        loader.load(
          modelUrl,
          (gltf) => {
            if (disposed) return;
            turntable = new THREE.Group();
            turntable.add(gltf.scene);
            scene.add(turntable);
            frameMeta = frameObject(THREE, turntable, camera, {
              fitScale,
              modelYOffset,
              cameraPitchLift,
              shiftUP,
              shiftScreenX,
            });
            baseCameraPos = camera.position.clone();
            baseLookAt = new THREE.Vector3(0, frameMeta.targetY, 0);
            flybyTravel = frameMeta.longestDim * flybyTravelScale;
            if (faceFlybyTune) {
              turntable.rotation.y = getFaceYawRad();
              faceFlybyState = 'flyby_out';
              flybyStartMs = performance.now();
            } else if (rotationMode === 'faceFlyby') {
              // Start away from the trigger angle so rotation is visible before the first flyby.
              turntable.rotation.y =
                getFaceYawRad() + degToRad(faceTriggerWindowDeg + 20);
            }
            updateLongitudinalWorld();
          },
          undefined,
          (err) => {
            if (!disposed) {
              setLoadError('Model failed to load');
              // eslint-disable-next-line no-console
              console.warn('[Ideum05Nav3DViewer] glTF load error:', err);
            }
          },
        );

        const pendulumAmplitudeRad = degToRad(pendulumAmplitudeDeg);
        const pendulumOffsetRad = degToRad(pendulumOffsetDeg);
        const pendulumOmega = (2 * Math.PI) / Math.max(pendulumPeriodMs, 500);
        const animStartMs = performance.now();

        const animate = () => {
          frameId = requestAnimationFrame(animate);
          if (turntable) {
            if (rotationMode === 'faceFlyby' || rotationMode === 'faceFlybyTune') {
              const now = performance.now();
              const faceYawRad = getFaceYawRad();

              if (faceFlybyTune) {
                turntable.rotation.y = faceYawRad;
                updateLongitudinalWorld();
              } else if (faceFlybyState === 'rotating') {
                turntable.rotation.y += turntableStep;
                const yawDeg = normalizeYawDeg(turntable.rotation.y);
                if (
                  Math.abs(shortestAngleDiffDeg(yawDeg, faceYawDeg)) <= faceTriggerWindowDeg
                ) {
                  turntable.rotation.y = faceYawRad;
                  updateLongitudinalWorld();
                  flybyStartMs = now;
                  flybyCyclesLeft = Math.max(Math.round(flybyRepeatCount), 1);
                  faceFlybyState = 'flyby_out';
                }
              }

              if (faceFlybyState === 'flyby_out') {
                turntable.rotation.y = faceYawRad;
                updateLongitudinalWorld();
                const t = Math.min((now - flybyStartMs) / flybyLegMs, 1);
                applyCameraAlongLongitudinal(flybyTravel * t);
                if (t >= 1) {
                  flybyStartMs = now;
                  faceFlybyState = 'flyby_back';
                }
              } else if (faceFlybyState === 'flyby_back') {
                turntable.rotation.y = faceYawRad;
                updateLongitudinalWorld();
                const t = Math.min((now - flybyStartMs) / flybyLegMs, 1);
                applyCameraAlongLongitudinal(flybyTravel * (1 - t));
                if (t >= 1) {
                  camera.position.copy(baseCameraPos);
                  camera.lookAt(baseLookAt);
                  if (faceFlybyTune) {
                    flybyStartMs = now;
                    faceFlybyState = 'flyby_out';
                  } else {
                    flybyCyclesLeft -= 1;
                    if (flybyCyclesLeft > 0) {
                      flybyStartMs = now;
                      faceFlybyState = 'flyby_out';
                    } else {
                      turntable.rotation.y = faceYawRad + degToRad(faceTriggerWindowDeg + 15);
                      faceFlybyState = 'rotating';
                    }
                  }
                }
              }

              if (showYawDebug && debugRef.current) {
                const yawDeg = normalizeYawDeg(turntable.rotation.y);
                debugRef.current.textContent = `yaw ${yawDeg.toFixed(1)}° · set modelFaceYawDeg`;
              }
            } else if (rotationMode === 'pendulum') {
              const elapsedMs = performance.now() - animStartMs;
              turntable.rotation.y =
                pendulumOffsetRad + pendulumAmplitudeRad * Math.sin(elapsedMs * pendulumOmega);
              if (showYawDebug && debugRef.current) {
                debugRef.current.textContent = `yaw ${normalizeYawDeg(turntable.rotation.y).toFixed(1)}°`;
              }
            } else {
              turntable.rotation.y += TURNTABLE_YAW;
              if (showYawDebug && debugRef.current) {
                debugRef.current.textContent = `yaw ${normalizeYawDeg(turntable.rotation.y).toFixed(1)}°`;
              }
            }
          }
          renderer.render(scene, camera);
        };
        animate();
      })
      .catch((err) => {
        if (!disposed) {
          setLoadError('3D engine failed to load');
          // eslint-disable-next-line no-console
          console.warn('[Ideum05Nav3DViewer] Three.js load error:', err);
        }
      });

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      if (renderer) {
        renderer.dispose();
        if (renderer.domElement.parentNode === host) {
          host.removeChild(renderer.domElement);
        }
      }
      if (scene) {
        scene.traverse((obj) => {
          if (obj.isMesh) {
            obj.geometry?.dispose();
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            mats.forEach((m) => m?.dispose());
          }
        });
      }
    };
  }, [
    width,
    height,
    modelUrl,
    fitScale,
    modelYOffset,
    shiftUP,
    shiftScreenX,
    cameraPitchLift,
    rotationMode,
    pendulumAmplitudeDeg,
    pendulumPeriodMs,
    pendulumOffsetDeg,
    faceYawDeg,
    faceTriggerWindowDeg,
    flybyTravelScale,
    flybyDurationMs,
    flybyRepeatCount,
    turntableSpeedScale,
    showYawDebug,
  ]);

  return (
    <div
      ref={hostRef}
      className="ideum05-nav-3d-viewer"
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none',
        position: 'relative',
      }}
    >
      {showYawDebug && (
        <div
          ref={debugRef}
          className="ideum05-nav-3d-viewer__yaw-debug"
          style={{
            position: 'absolute',
            left: 8,
            bottom: 8,
            zIndex: 2,
            padding: '4px 8px',
            borderRadius: 4,
            background: 'rgba(0, 0, 0, 0.72)',
            color: '#00d4a8',
            fontFamily: 'monospace',
            fontSize: 11,
            lineHeight: 1.3,
            pointerEvents: 'none',
          }}
        />
      )}
      {loadError && (
        <div className="ideum05-nav-3d-viewer__error">{loadError}</div>
      )}
    </div>
  );
}
