/** Explore Data uses full backend parallel defaults (incl. CFE + load compliance). */
export function parallelDimensionsForExploreWall(defaultsOrDims) {
  const list = Array.isArray(defaultsOrDims)
    ? defaultsOrDims
    : defaultsOrDims?.parallel_dimensions;
  if (!list?.length) return [];
  return [...list];
}
