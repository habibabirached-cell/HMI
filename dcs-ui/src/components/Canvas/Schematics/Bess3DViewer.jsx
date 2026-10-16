import { useEffect, useRef, useState } from 'react';
import { loadThreeGltfRuntime } from '../../../utils/threeGltfRuntime';

function frameObject(THREE, object, camera) {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  object.position.sub(center);
  object.updateMatrixWorld(true);

  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const fitDist = maxDim / (2 * Math.tan((camera.fov * Math.PI) / 360));
  const dist = fitDist * 0.88;

  camera.position.set(dist * 0.62, dist * 0.38, dist * 0.95);
  camera.lookAt(0, 0, 0);
  camera.near = Math.max(maxDim / 1000, 0.001);
  camera.far = Math.max(maxDim * 20, 100);
  camera.updateProjectionMatrix();
}

const ACCENT_GREEN = 0x4caf50;
const ACCENT_LIME = 0x8bc34a;

/** Sharper specular response on PBR materials loaded from GLB. */
function applyGlossyMaterials(root) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      if (!mat) continue;
      if ('roughness' in mat) {
        mat.roughness = Math.max(0.06, (mat.roughness ?? 0.5) * 0.4);
      }
      if ('metalness' in mat) {
        mat.metalness = Math.min(1, (mat.metalness ?? 0) + 0.35);
      }
      if ('clearcoat' in mat) {
        mat.clearcoat = Math.max(mat.clearcoat ?? 0, 0.45);
        mat.clearcoatRoughness = Math.min(mat.clearcoatRoughness ?? 0.5, 0.12);
      }
      if ('envMapIntensity' in mat) {
        mat.envMapIntensity = (mat.envMapIntensity ?? 1) * 2;
      }
      mat.needsUpdate = true;
    }
  });
}

/** MVUPS site model — softer, less blown-out whites than BESS glossy preset. */
function applyMvupsMaterials(root) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      if (!mat) continue;
      if ('roughness' in mat) {
        mat.roughness = Math.min(1, (mat.roughness ?? 0.5) * 1.35 + 0.12);
      }
      if ('metalness' in mat) {
        mat.metalness = Math.max(0, (mat.metalness ?? 0) * 0.65);
      }
      if ('clearcoat' in mat) {
        mat.clearcoat = Math.min(mat.clearcoat ?? 0, 0.08);
      }
      if ('envMapIntensity' in mat) {
        mat.envMapIntensity = (mat.envMapIntensity ?? 1) * 0.45;
      }
      mat.needsUpdate = true;
    }
  });
}

const VIEWER_LIGHTING = {
  bess: {
    toneMappingExposure: 1.35,
    ambient: 1.68,
    key: 5,
    fill: 1.8,
    pointAccent: 88,
    pointSpec: 36,
    rim: 0.72,
    materialPass: applyGlossyMaterials,
  },
  mvups: {
    toneMappingExposure: 0.88,
    ambient: 0.72,
    key: 1.85,
    fill: 0.45,
    pointAccent: 10,
    pointSpec: 6,
    rim: 0.22,
    materialPass: applyMvupsMaterials,
  },
};

/**
 * WebGL preview of Bess.c.glb — rendered in an HTML overlay (Bess3DOverlays).
 */
export default function Bess3DViewer({ width, height, modelUrl, viewerProfile = 'bess' }) {
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
        scene.background = new THREE.Color(0x0d1117);

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 5000);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setSize(width, height, false);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        const lighting = VIEWER_LIGHTING[viewerProfile] ?? VIEWER_LIGHTING.bess;
        renderer.toneMappingExposure = lighting.toneMappingExposure;
        renderer.domElement.style.display = 'block';
        renderer.domElement.style.position = 'absolute';
        renderer.domElement.style.left = '0';
        renderer.domElement.style.top = '0';
        renderer.domElement.style.width = `${width}px`;
        renderer.domElement.style.height = `${height}px`;
        host.appendChild(renderer.domElement);

        scene.add(new THREE.AmbientLight(0xffffff, lighting.ambient));
        const keyLight = new THREE.DirectionalLight(0xffffff, lighting.key);
        keyLight.position.set(4, 6, 5);
        scene.add(keyLight);
        const fillLight = new THREE.DirectionalLight(ACCENT_GREEN, lighting.fill);
        fillLight.position.set(-5, 2, -3);
        scene.add(fillLight);
        const accentSpecular = new THREE.PointLight(ACCENT_LIME, lighting.pointAccent, 80);
        accentSpecular.position.set(-3, 1.5, 4);
        scene.add(accentSpecular);
        const specHighlight = new THREE.PointLight(0xffffff, lighting.pointSpec, 55);
        specHighlight.position.set(3, 4, 6);
        scene.add(specHighlight);
        const rimLight = new THREE.DirectionalLight(ACCENT_GREEN, lighting.rim);
        rimLight.position.set(0, -2, -6);
        scene.add(rimLight);

        let turntable = null;

        const loader = createGltfLoader();
        loader.load(
          modelUrl,
          (gltf) => {
            if (disposed) return;
            lighting.materialPass(gltf.scene);
            turntable = new THREE.Group();
            turntable.add(gltf.scene);
            scene.add(turntable);
            frameObject(THREE, turntable, camera);
          },
          undefined,
          (err) => {
            if (!disposed) {
              setLoadError('Model failed to load');
              // eslint-disable-next-line no-console
              console.warn('[Bess3DViewer] GLB load error:', err);
            }
          },
        );

        const TURNTABLE_YAW = 0.004;

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
          console.warn('[Bess3DViewer] Three.js load error:', err);
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
  }, [width, height, modelUrl, viewerProfile]);

  return (
    <div
      ref={hostRef}
      className="bess-3d-viewer gas-turbine-3d-viewer"
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
