export const GROUND_Y = 0;
export const BOUNDARY_RADIUS = 58;
export const WALK_SPEED = 8;
export const RUN_SPEED = 18;
export const TURN_SPEED = 12;
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

export const MARKER_INTERACT_RADIUS = 6;
export const MARKER_ACTIVATE_RADIUS = 4;
export const MARKER_DEFS: MarkerDef[] = [
  { page: 'about', label: 'About', pos: [3, 0, -44], color: 0x00ffee },
  { page: 'major-events', label: 'Major Events', pos: [46.3, 0, -7.4], color: 0xff6ef9 },
  { page: 'minor-events', label: 'Minor Events', pos: [-49.2, 0, -18.2], color: 0xcc44ff },
  { page: 'artist', label: 'Artist', pos: [-48.3, 0, 22.0], color: 0xffcc00 },
];

export const STATE_IDLE = 0;
export const STATE_RUN = 1;
export const STATE_WALK = 2;
export const STATE_NAMES = ['Idle', 'Run', 'Walk'];
export const STATE_COLORS = ['#4fffaa', '#ff7c4f', '#ffe566'];
