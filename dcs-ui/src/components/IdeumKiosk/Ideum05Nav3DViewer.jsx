import { useEffect, useRef, useState } from 'react';
import { loadThreeGltfRuntime } from '../../utils/threeGltfRuntime';

const ACCENT_TEAL = 0x00d4a8;
/** Camera height above the look-at target — controls pitch (higher = more top-down). */
const DEFAULT_CAMERA_PITCH_LIFT = 0.42;

function frameObject(
  THREE,
  object,
  camera,
  { fitScale = 0.92, modelYOffset = 0, cameraPitchLift = DEFAULT_CAMERA_PITCH_LIFT } = {},
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
  camera.near = Math.max(maxDim / 1000, 0.001);
  camera.far = Math.max(maxDim * 20, 100);
  camera.updateProjectionMatrix();
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
  cameraPitchLift = DEFAULT_CAMERA_PITCH_LIFT,
}) {
  const hostRef = useRef(null);
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

        const loader = createGltfLoader();
        loader.load(
          modelUrl,
          (gltf) => {
            if (disposed) return;
            turntable = new THREE.Group();
            turntable.add(gltf.scene);
            scene.add(turntable);
            frameObject(THREE, turntable, camera, { fitScale, modelYOffset, cameraPitchLift });
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

        const TURNTABLE_YAW = 0.003;

        const animate = () => {
          frameId = requestAnimationFrame(animate);
          if (turntable) {
            turntable.rotation.y += TURNTABLE_YAW;
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
  }, [width, height, modelUrl, fitScale, modelYOffset, cameraPitchLift]);

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
      {loadError && (
        <div className="ideum05-nav-3d-viewer__error">{loadError}</div>
      )}
    </div>
  );
}
