/** Middle-mouse / touch two-finger pan sensitivity. 0.1 = ten times slower than 1:1. */
export const CANVAS_PAN_SPEED = 0.1;

/**
 * Trackpad two-finger scroll arrives as wheel events — often large deltas on Windows.
 * Kept separate so wheel pan can be tuned without affecting touch drag-pan.
 */
export const CANVAS_WHEEL_PAN_SPEED = 0.1;

/** Arrow-key viewport pan when the canvas was last clicked (pixels per keypress). */
export const CANVAS_ARROW_PAN_STEP = 24;
