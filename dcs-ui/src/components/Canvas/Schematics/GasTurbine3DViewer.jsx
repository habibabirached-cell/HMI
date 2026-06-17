import { useEffect, useRef, useState } from 'react';
import { loadThreeGltfRuntime } from '../../../utils/threeGltfRuntime';

function frameObject(THREE, object, camera) {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  // Origin at model center so orbit + lookAt stay aligned with the viewport.
  object.position.sub(center);
  object.updateMatrixWorld(true);

  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const fitDist = maxDim / (2 * Math.tan((camera.fov * Math.PI) / 360));
  const dist = fitDist * 0.54;

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
export default function GasTurbine3DViewer({ width, height, modelUrl }) {
  const hostRef = useRef(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || (width < 8) || (height < 8) || !modelUrl) return undefined;

    setLoadError(null);

    let frameId = 0;
    let disposed = false;
    let renderer = null;
    let scene = null;

    loadThreeGltfRuntime()
      .then(({ THREE, createGltfLoader }) => {
        if (disposed) return;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0d1117);

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 5000);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setSize(width, height, false);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;
        renderer.domElement.style.display = 'block';
        renderer.domElement.style.position = 'absolute';
        renderer.domElement.style.left = '0';
        renderer.domElement.style.top = '0';
        renderer.domElement.style.width = `${width}px`;
        renderer.domElement.style.height = `${height}px`;
        host.appendChild(renderer.domElement);

        scene.add(new THREE.AmbientLight(0xffffff, 0.45));
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
        keyLight.position.set(4, 6, 5);
        scene.add(keyLight);
        const fillLight = new THREE.DirectionalLight(ACCENT_BLUE, 55);
        fillLight.position.set(-5, 2, -3);
        scene.add(fillLight);
        const accentSpecular = new THREE.PointLight(ACCENT_BLUE, 35, 80);
        accentSpecular.position.set(-4, 0.5, 3);
        scene.add(accentSpecular);
        const rimLight = new THREE.DirectionalLight(ACCENT_BLUE, 18);
        rimLight.position.set(0, -2, -6);
        scene.add(rimLight);

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
            frameObject(THREE, turntable, camera);
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

        const TURNTABLE_YAW = 0.0014;
        const SHAFT_SPIN = 0.014;

        const animate = () => {
          frameId = requestAnimationFrame(animate);
          if (turntable && modelRoot && shaftAxis) {
            turntable.rotation.y += TURNTABLE_YAW;
            modelRoot.rotateOnAxis(shaftAxis, SHAFT_SPIN);
            shaftSpinAngle += SHAFT_SPIN;

            // Smooth blue/green accent each shaft revolution (cosine ease).
            const mix = 0.5 - 0.5 * Math.cos(shaftSpinAngle / COLOR_CYCLE_TURNS);
            accentColor.copy(blueColor).lerp(greenColor, mix);
            fillLight.color.copy(accentColor);
            accentSpecular.color.copy(accentColor);
            rimLight.color.copy(accentColor);
          }
          renderer.render(scene, camera);
        };
        animate();
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
  }, [width, height, modelUrl]);

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
      {loadError && (
        <div className="gas-turbine-3d-viewer__error">{loadError}</div>
      )}
    </div>
  );
}
