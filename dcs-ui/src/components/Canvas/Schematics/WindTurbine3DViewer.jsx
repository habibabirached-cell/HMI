import { useEffect, useRef, useState } from 'react';
import { loadThreeGltfRuntime } from '../../../utils/threeGltfRuntime';

function tuneWindFieldMaterials(root) {
  root.traverse((node) => {
    if (!node.isMesh) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((mat) => {
      if (!mat) return;
      if (mat.emissive) mat.emissive.setRGB(0, 0, 0);
      if ('emissiveIntensity' in mat) mat.emissiveIntensity = 0;
      mat.metalness = 0;
      mat.roughness = Math.max(mat.roughness ?? 0.5, 0.78);
    });
  });
}

function frameWindField(THREE, object, camera) {
  let terrainBox = new THREE.Box3();
  object.traverse((node) => {
    if (node.isMesh && node.name === 'Mesh_0') {
      terrainBox.expandByObject(node);
    }
  });
  if (terrainBox.isEmpty()) {
    terrainBox.setFromObject(object);
  }

  const center = terrainBox.getCenter(new THREE.Vector3());
  const fullSize = terrainBox.getSize(new THREE.Vector3());

  const fieldFocus = 0.34;
  const frameSize = new THREE.Vector3(
    fullSize.x * fieldFocus,
    Math.max(fullSize.y * 5, 0.12),
    fullSize.z * fieldFocus,
  );

  object.position.sub(center);
  object.updateMatrixWorld(true);

  const maxDim = Math.max(frameSize.x, frameSize.y, frameSize.z, 0.001);
  const fitDist = maxDim / (2 * Math.tan((camera.fov * Math.PI) / 360));
  const dist = fitDist * 0.2;

  camera.position.set(dist * 0.62, dist * 0.56, dist * 0.78);
  camera.lookAt(0, frameSize.y * 0.06, 0);
  camera.near = Math.max(maxDim / 1000, 0.001);
  camera.far = Math.max(maxDim * 24, 100);
  camera.updateProjectionMatrix();
}

/**
 * Neutral-lit turntable preview for wind turbine field GLBs in the configurator hub.
 */
export default function WindTurbine3DViewer({ width, height, modelUrl }) {
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
        renderer.toneMappingExposure = 1.0;
        renderer.domElement.style.display = 'block';
        renderer.domElement.style.position = 'absolute';
        renderer.domElement.style.left = '0';
        renderer.domElement.style.top = '0';
        renderer.domElement.style.width = `${width}px`;
        renderer.domElement.style.height = `${height}px`;
        host.appendChild(renderer.domElement);

        scene.add(new THREE.AmbientLight(0xffffff, 0.62));
        const keyLight = new THREE.DirectionalLight(0xfff4e8, 1.05);
        keyLight.position.set(6, 9, 5);
        scene.add(keyLight);
        const fillLight = new THREE.DirectionalLight(0xdce8ff, 0.42);
        fillLight.position.set(-5, 4, -3);
        scene.add(fillLight);
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.28);
        rimLight.position.set(1, 3, -6);
        scene.add(rimLight);

        let turntable = null;

        const loader = createGltfLoader();
        loader.load(
          modelUrl,
          (gltf) => {
            if (disposed) return;
            tuneWindFieldMaterials(gltf.scene);

            turntable = new THREE.Group();
            turntable.add(gltf.scene);
            scene.add(turntable);
            frameWindField(THREE, turntable, camera);
          },
          undefined,
          (err) => {
            if (!disposed) {
              setLoadError('Model failed to load');
              // eslint-disable-next-line no-console
              console.warn('[WindTurbine3DViewer] GLB load error:', err);
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
          console.warn('[WindTurbine3DViewer] Three.js load error:', err);
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
      className="wind-turbine-3d-viewer"
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none',
        position: 'relative',
      }}
    >
      {loadError && (
        <div className="wind-turbine-3d-viewer__error">{loadError}</div>
      )}
    </div>
  );
}
