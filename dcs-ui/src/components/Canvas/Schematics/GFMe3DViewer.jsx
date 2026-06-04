import { useEffect, useRef, useState } from 'react';

const DEG = Math.PI / 180;

/**
 * GFMe collapse-tile motion tuning — edit these values directly.
 * Angles are in degrees; frequencies are Hz (full back-and-forth cycles per second).
 * t_x slides the model along the axis parallel to screen left/right (camera right).
 * z1/z2 slide toward/away from the viewer (camera ↔ model axis); frequency_f_z in Hz.
 */
export const GFME_3D_MOTION = {
  yaw1: 100,
  yaw2: 170,
  frequency_yaw: 0.05,

  pitch1: -15,
  pitch2: 15,
  frequency_pitch: 0.05,

  t_x: 0,

  z1: 2.5, 
  z2: 3.5,
  frequency_f_z: 0.05,

  /** Center + left + right row: gap between unit bounding boxes (model units). */
  flank_gap: 0.06,
  /** false = center unit only */
  show_flanking_units: true,
};

/** Map elapsed time to a value that oscillates between min and max. */
function oscillate(tSec, frequencyHz, minVal, maxVal) {
  if (frequencyHz <= 0) return minVal;
  const mid = (minVal + maxVal) / 2;
  const amp = (maxVal - minVal) / 2;
  return mid + amp * Math.sin(2 * Math.PI * frequencyHz * tSec);
}

/** Loaded from public/vendor/three (same origin — works behind corporate firewalls). */
let threeRuntimePromise = null;

function vendorThreeUrls() {
  const base = `${process.env.PUBLIC_URL || ''}/vendor/three`;
  return {
    threeModule: `${base}/build/three.module.js`,
    gltfLoaderModule: `${base}/examples/jsm/loaders/GLTFLoader.js`,
  };
}

function loadThreeRuntime() {
  if (!threeRuntimePromise) {
    const { threeModule, gltfLoaderModule } = vendorThreeUrls();
    threeRuntimePromise = Promise.all([
      import(/* webpackIgnore: true */ threeModule),
      import(/* webpackIgnore: true */ gltfLoaderModule),
    ])
      .then(([threeMod, loaderMod]) => ({
        THREE: threeMod,
        GLTFLoader: loaderMod.GLTFLoader,
      }))
      .catch((err) => {
        threeRuntimePromise = null;
        throw err;
      });
  }
  return threeRuntimePromise;
}

function frameObject(THREE, object, camera) {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  object.position.sub(center);
  object.updateMatrixWorld(true);

  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const fitDist = maxDim / (2 * Math.tan((camera.fov * Math.PI) / 360));
  // Pull back so the full cabinet fits with margin (model bbox is larger than gas turbine).
  const dist = fitDist * 1.18;

  camera.position.set(dist * 0.62, dist * 0.38, dist * 0.95);
  camera.lookAt(0, 0, 0);
  camera.near = Math.max(maxDim / 1000, 0.001);
  camera.far = Math.max(maxDim * 20, 100);
  camera.updateProjectionMatrix();

  return size;
}

function boxExtentAlongAxis(box, axis) {
  const { min, max } = box;
  const pts = [
    [min.x, min.y, min.z],
    [min.x, min.y, max.z],
    [min.x, max.y, min.z],
    [min.x, max.y, max.z],
    [max.x, min.y, min.z],
    [max.x, min.y, max.z],
    [max.x, max.y, min.z],
    [max.x, max.y, max.z],
  ];
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < pts.length; i += 1) {
    const p = pts[i][0] * axis.x + pts[i][1] * axis.y + pts[i][2] * axis.z;
    lo = Math.min(lo, p);
    hi = Math.max(hi, p);
  }
  return hi - lo;
}

/** Stable in/out axis: origin → camera (do not use turntable.position — it causes jitter when z is large). */
function setTowardViewerAxis(out, camera) {
  out.copy(camera.position);
  const len = out.length();
  if (len > 1e-6) {
    out.divideScalar(len);
  } else {
    out.set(0, 0, 1);
  }
}

/** One centered clone in a slot; returns bbox extent along rowAxis (for abutting spacing). */
function addCenteredUnitClone(THREE, parent, sourceScene, rowAxis, offsetAlongRow = 0) {
  const slot = new THREE.Group();
  slot.position.copy(rowAxis).multiplyScalar(offsetAlongRow);
  const clone = sourceScene.clone(true);
  slot.add(clone);

  const box = new THREE.Box3().setFromObject(clone);
  const center = box.getCenter(new THREE.Vector3());
  clone.position.sub(center);
  clone.updateMatrixWorld(true);

  parent.add(slot);

  const sized = new THREE.Box3().setFromObject(slot);
  return boxExtentAlongAxis(sized, rowAxis);
}

function buildTurntableAssembly(THREE, gltfScene, motion, camera) {
  const turntable = new THREE.Group();
  /** Screen left/right — same axis as t_x (camera right). */
  const rowAxis = new THREE.Vector3();
  rowAxis.setFromMatrixColumn(camera.matrixWorld, 0).normalize();

  const unitSpan = addCenteredUnitClone(THREE, turntable, gltfScene, rowAxis, 0);

  if (motion.show_flanking_units !== false) {
    const gap = Math.max(0, motion.flank_gap ?? 0);
    const step = unitSpan + gap;
    addCenteredUnitClone(THREE, turntable, gltfScene, rowAxis, -step);
    addCenteredUnitClone(THREE, turntable, gltfScene, rowAxis, step);
  }

  return turntable;
}

/** Frame camera from one unit so rowAxis matches screen left/right before triple layout. */
function primeCameraForAssembly(THREE, gltfScene, camera) {
  const probe = new THREE.Group();
  const clone = gltfScene.clone(true);
  probe.add(clone);
  const box = new THREE.Box3().setFromObject(clone);
  clone.position.sub(box.getCenter(new THREE.Vector3()));
  frameObject(THREE, probe, camera);
  camera.updateMatrixWorld(true);
}

const ACCENT_TEAL = 0x00d4a8;
const ACCENT_CYAN = 0x2e7d7d;

/**
 * WebGL preview of g2x2.gltf — rendered in an HTML overlay (GFMe3DOverlays).
 */
export default function GFMe3DViewer({ width, height, modelUrl }) {
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

    loadThreeRuntime()
      .then(({ THREE, GLTFLoader }) => {
        if (disposed) return;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0d1117);

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 5000);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setSize(width, height, false);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        renderer.domElement.style.display = 'block';
        renderer.domElement.style.position = 'absolute';
        renderer.domElement.style.left = '0';
        renderer.domElement.style.top = '0';
        renderer.domElement.style.width = `${width}px`;
        renderer.domElement.style.height = `${height}px`;
        host.appendChild(renderer.domElement);

        scene.add(new THREE.AmbientLight(0xffffff, 0.5));
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.25);
        keyLight.position.set(4, 6, 5);
        scene.add(keyLight);
        const fillLight = new THREE.DirectionalLight(ACCENT_TEAL, 42);
        fillLight.position.set(-5, 2, -3);
        scene.add(fillLight);
        const accentSpecular = new THREE.PointLight(ACCENT_CYAN, 28, 80);
        accentSpecular.position.set(-3, 1.5, 4);
        scene.add(accentSpecular);
        const rimLight = new THREE.DirectionalLight(ACCENT_TEAL, 14);
        rimLight.position.set(0, -2, -6);
        scene.add(rimLight);

        let turntable = null;
        const motion = GFME_3D_MOTION;
        const screenRight = new THREE.Vector3();
        const towardViewer = new THREE.Vector3();
        const t0 = performance.now();

        const loader = new GLTFLoader();
        loader.load(
          modelUrl,
          (gltf) => {
            if (disposed) return;
            primeCameraForAssembly(THREE, gltf.scene, camera);
            turntable = buildTurntableAssembly(THREE, gltf.scene, motion, camera);
            scene.add(turntable);
            frameObject(THREE, turntable, camera);
          },
          undefined,
          (err) => {
            if (!disposed) {
              setLoadError('Model failed to load');
              // eslint-disable-next-line no-console
              console.warn('[GFMe3DViewer] GLTF load error:', err);
            }
          },
        );

        const animate = () => {
          frameId = requestAnimationFrame(animate);
          if (turntable) {
            const tSec = (performance.now() - t0) / 1000;
            const yawDeg = oscillate(tSec, motion.frequency_yaw, motion.yaw1, motion.yaw2);
            const pitchDeg = oscillate(
              tSec,
              motion.frequency_pitch,
              motion.pitch1,
              motion.pitch2,
            );
            turntable.rotation.y = yawDeg * DEG;
            turntable.rotation.x = pitchDeg * DEG;

            const zVal =
              motion.frequency_f_z > 0
                ? oscillate(tSec, motion.frequency_f_z, motion.z1, motion.z2)
                : 0;

            screenRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
            setTowardViewerAxis(towardViewer, camera);

            turntable.position.set(0, 0, 0);
            turntable.position.addScaledVector(screenRight, motion.t_x);
            turntable.position.addScaledVector(towardViewer, zVal);
          }
          renderer.render(scene, camera);
        };
        animate();
      })
      .catch((err) => {
        if (!disposed) {
          setLoadError('3D engine failed to load');
          // eslint-disable-next-line no-console
          console.warn('[GFMe3DViewer] Three.js load error:', err);
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
      className="gfme-3d-viewer gas-turbine-3d-viewer"
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
