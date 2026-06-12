/**
 * Three.js + GLTFLoader + Draco (KHR_draco_mesh_compression) from public/vendor/three.
 * Same-origin vendor bundle works behind corporate firewalls (no CDN).
 */

let threeGltfRuntimePromise = null;

export function vendorThreeUrls() {
  const base = `${process.env.PUBLIC_URL || ''}/vendor/three`;
  return {
    threeModule: `${base}/build/three.module.js`,
    gltfLoaderModule: `${base}/examples/jsm/loaders/GLTFLoader.js`,
    dracoLoaderModule: `${base}/examples/jsm/loaders/DRACOLoader.js`,
    /** glTF Draco extension build — required for KHR_draco_mesh_compression. */
    dracoDecoderPath: `${base}/examples/jsm/libs/draco/gltf/`,
  };
}

/**
 * Load Three.js runtime once; returns helpers to create Draco-enabled GLTF loaders.
 */
export function loadThreeGltfRuntime() {
  if (!threeGltfRuntimePromise) {
    const urls = vendorThreeUrls();
    threeGltfRuntimePromise = Promise.all([
      import(/* webpackIgnore: true */ urls.threeModule),
      import(/* webpackIgnore: true */ urls.gltfLoaderModule),
      import(/* webpackIgnore: true */ urls.dracoLoaderModule),
    ])
      .then(([threeMod, gltfMod, dracoMod]) => {
        const dracoLoader = new dracoMod.DRACOLoader();
        dracoLoader.setDecoderPath(urls.dracoDecoderPath);

        const createGltfLoader = () => {
          const loader = new gltfMod.GLTFLoader();
          loader.setDRACOLoader(dracoLoader);
          return loader;
        };

        return {
          THREE: threeMod,
          GLTFLoader: gltfMod.GLTFLoader,
          DRACOLoader: dracoMod.DRACOLoader,
          dracoLoader,
          createGltfLoader,
        };
      })
      .catch((err) => {
        threeGltfRuntimePromise = null;
        throw err;
      });
  }
  return threeGltfRuntimePromise;
}
