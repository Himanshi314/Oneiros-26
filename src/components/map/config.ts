export const GROUND_Y = 0;
export const BOUNDARY_RADIUS = 58;
export const WALK_SPEED = 14;
export const RUN_SPEED = 32;
export const TURN_SPEED = 14;
export const CAM_DIST_DEFAULT = 22;
export const CAM_DIST_MIN = 3;
export const CAM_DIST_MAX = 40;
export const CAM_PITCH_MIN = 0.02;
export const CAM_PITCH_MAX = 1.4;
export const CAM_SMOOTH = 0.14;
export const CAM_MAX_RADIUS = 57;
export const SPRINT_THRESHOLD = 0.72;

export type MarkerDef = {
  page: string;
  label: string;
  pos: [number, number, number];
  color: number;
};

export const MARKER_INTERACT_RADIUS = 14;
export const MARKER_ACTIVATE_RADIUS = 14;
export const MARKER_DEFS: MarkerDef[] = [
  { page: 'about', label: 'About', pos: [-27, 0, -52], color: 0x00ffee },
  { page: 'major-events', label: 'Major Events', pos: [60, 0, 6], color: 0xff6ef9 },
  { page: 'minor-events', label: 'Minor Events', pos: [30, 0, -50], color: 0xcc44ff },
  { page: 'artist', label: 'Artist', pos: [-55.3, 0, 10], color: 0xffcc00 },
];

export const STATE_IDLE = 0;
export const STATE_RUN = 1;
export const STATE_WALK = 2;
export const STATE_NAMES = ['Idle', 'Run', 'Walk'];
export const STATE_COLORS = ['#4fffaa', '#ff7c4f', '#ffe566'];
