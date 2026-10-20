import { orderExploreWallParallelDimensions } from './dataVisExploreWallParallelOrder';

/** Explore Data parallel dims: gas turbines, then carbon-free, LCOE, and uptime. */
export function parallelDimensionsForExploreWall(defaultsOrDims) {
  const list = Array.isArray(defaultsOrDims)
    ? defaultsOrDims
    : defaultsOrDims?.parallel_dimensions;
  if (!list?.length) return [];
  return orderExploreWallParallelDimensions(list);
}
