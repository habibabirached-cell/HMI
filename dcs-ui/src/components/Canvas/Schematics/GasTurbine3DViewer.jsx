import { useEffect, useRef, useState } from 'react';
import { loadThreeGltfRuntime } from '../../../utils/threeGltfRuntime';

function frameObject(THREE, object, camera, cameraDist = 1.8) {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  object.position.sub(center);
  object.updateMatrixWorld(true);

  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const dist = cameraDist;

  camera.position.set(dist * 0.72, dist * 0.38, dist * 0.88);
  camera.lookAt(0, 0, 0);
  camera.near = Math.max(maxDim / 1000, 0.001);
  camera.far = Math.max(maxDim * 20, 100);
  camera.updateProjectionMatrix();
}

/** Longest bounding-box axis — treated as the turbine shaft for roll spin. */
function shaftAxisFromSize(THREE, size) {
  const axes = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0, 1),
  ];
  const dims = [size.x, size.y, size.z];
  const idx = dims.indexOf(Math.max(...dims));
  return axes[idx];
}

const ACCENT_BLUE = 0x4488ff;
const ACCENT_GREEN = 0x33cc66;
/** One blue-to-green-to-blue cycle per shaft revolution. */
const COLOR_CYCLE_TURNS = 1;

/**
 * WebGL preview of gasT3.glb — rendered in an HTML overlay (GasTurbine3DOverlays).
 */
export default function GasTurbine3DViewer({
  width,
  height,
  modelUrl,
  turntableOnly = false,
  cameraDist = 1.8,
  neutralLighting = false,
  lowPixelRatio = false,
}) {
  const hostRef = useRef(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || width <= 7 || height <= 7 || !modelUrl) return undefined;

    setLoadError(null);

    let frameId = 0;
    let disposed = false;
    let renderer = null;
    let scene = null;
    let intersectionObserver = null;
    let onVisibilityChange = null;

    loadThreeGltfRuntime()
      .then(({ THREE, createGltfLoader }) => {
        if (disposed) return;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0d1117);

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 5000);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setSize(width, height, false);
        renderer.setPixelRatio(
          Math.min(window.devicePixelRatio, lowPixelRatio ? 1 : 1.5),
        );
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = neutralLighting ? 1.38 : 1.1;
        renderer.domElement.style.display = 'block';
        renderer.domElement.style.position = 'absolute';
        renderer.domElement.style.left = '0';
        renderer.domElement.style.top = '0';
        renderer.domElement.style.width = `${width}px`;
        renderer.domElement.style.height = `${height}px`;
        host.appendChild(renderer.domElement);

        scene.add(new THREE.AmbientLight(0xffffff, neutralLighting ? 0.82 : 0.45));
        const keyLight = new THREE.DirectionalLight(0xffffff, neutralLighting ? 1.65 : 1.4);
        keyLight.position.set(neutralLighting ? 2 : 4, neutralLighting ? 4 : 6, neutralLighting ? 7 : 5);
        scene.add(keyLight);
        const fillLight = new THREE.DirectionalLight(
          neutralLighting ? 0xffffff : ACCENT_BLUE,
          neutralLighting ? 1.05 : 55,
        );
        fillLight.position.set(neutralLighting ? -2 : -5, neutralLighting ? 2 : 2, neutralLighting ? 6 : -3);
        scene.add(fillLight);
        const accentSpecular = new THREE.PointLight(
          neutralLighting ? 0xffffff : ACCENT_BLUE,
          neutralLighting ? 0.95 : 35,
          80,
        );
        accentSpecular.position.set(neutralLighting ? 0 : -4, neutralLighting ? 1.5 : 0.5, neutralLighting ? 5.5 : 3);
        scene.add(accentSpecular);
        const rimLight = new THREE.DirectionalLight(
          neutralLighting ? 0xffffff : ACCENT_BLUE,
          neutralLighting ? 0.55 : 18,
        );
        rimLight.position.set(0, -2, -6);
        scene.add(rimLight);
        if (neutralLighting) {
          const frontLight = new THREE.DirectionalLight(0xffffff, 1.25);
          frontLight.position.set(0.5, 0.5, 8);
          scene.add(frontLight);
          const topLight = new THREE.DirectionalLight(0xffffff, 0.75);
          topLight.position.set(0, 9, 2);
          scene.add(topLight);
        }

        const blueColor = new THREE.Color(ACCENT_BLUE);
        const greenColor = new THREE.Color(ACCENT_GREEN);
        const accentColor = new THREE.Color(ACCENT_BLUE);

        let turntable = null;
        let modelRoot = null;
        let shaftAxis = null;
        let shaftSpinAngle = 0;

        const loader = createGltfLoader();
        loader.load(
          modelUrl,
          (gltf) => {
            if (disposed) return;
            modelRoot = gltf.scene;
            const box = new THREE.Box3().setFromObject(modelRoot);
            shaftAxis = shaftAxisFromSize(THREE, box.getSize(new THREE.Vector3()));

            turntable = new THREE.Group();
            turntable.add(modelRoot);
            scene.add(turntable);
            frameObject(THREE, turntable, camera, cameraDist);
          },
          undefined,
          (err) => {
            if (!disposed) {
              setLoadError('Model failed to load');
              // eslint-disable-next-line no-console
              console.warn('[GasTurbine3DViewer] GLB load error:', err);
            }
          },
        );

        const TURNTABLE_YAW = 0.004;
        const SHAFT_SPIN = 0.014;

        let inView = true;
        let loopRunning = false;

        const tick = () => {
          if (disposed) return;
          loopRunning = false;
          if (!inView || document.hidden) return;
          loopRunning = true;
          frameId = requestAnimationFrame(tick);
          if (turntable && modelRoot && shaftAxis) {
            turntable.rotation.y += TURNTABLE_YAW;
            if (!turntableOnly && !neutralLighting) {
              modelRoot.rotateOnAxis(shaftAxis, SHAFT_SPIN);
              shaftSpinAngle += SHAFT_SPIN;

              const mix = 0.5 - 0.5 * Math.cos(shaftSpinAngle / COLOR_CYCLE_TURNS);
              accentColor.copy(blueColor).lerp(greenColor, mix);
              fillLight.color.copy(accentColor);
              accentSpecular.color.copy(accentColor);
              rimLight.color.copy(accentColor);
            }
          }
          renderer.render(scene, camera);
        };

        const startLoop = () => {
          if (!loopRunning && inView && !document.hidden) tick();
        };

        intersectionObserver =
          typeof IntersectionObserver !== 'undefined'
            ? new IntersectionObserver(
                ([entry]) => {
                  inView = entry.isIntersecting;
                  if (inView) startLoop();
                },
                { root: null, threshold: 0.01 },
              )
            : null;
        intersectionObserver?.observe(host);

        onVisibilityChange = () => {
          if (!document.hidden) startLoop();
        };
        document.addEventListener('visibilitychange', onVisibilityChange);
        startLoop();
      })
      .catch((err) => {
        if (!disposed) {
          setLoadError('3D engine failed to load');
          // eslint-disable-next-line no-console
          console.warn('[GasTurbine3DViewer] Three.js load error:', err);
        }
      });

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      if (onVisibilityChange) {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
      intersectionObserver?.disconnect();
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
  }, [width, height, modelUrl, turntableOnly, cameraDist, neutralLighting, lowPixelRatio]);

  return (
    <div
      ref={hostRef}
      className="gas-turbine-3d-viewer"
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none',
        position: 'relative',
      }}
    >
      {loadError ? (
        <div className="gas-turbine-3d-viewer__error">{loadError}</div>
      ) : null}
    </div>
  );
}
