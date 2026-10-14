/** Parallel-coords defaults — corridor bands already encode these on Explore Data wall. */
export const EXPLORE_WALL_PARALLEL_EXCLUDE = [
  'Carbon Free Energy (%)',
  'Year 1 Load Compliance (%)',
];

export function parallelDimensionsForExploreWall(defaultsOrDims) {
  const list = Array.isArray(defaultsOrDims)
    ? defaultsOrDims
    : defaultsOrDims?.parallel_dimensions;
  if (!list?.length) return [];
  return list.filter((col) => !EXPLORE_WALL_PARALLEL_EXCLUDE.includes(col));
}
