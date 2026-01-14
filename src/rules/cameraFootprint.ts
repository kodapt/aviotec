export type CameraFootprintParams = {
  cameraHeight: number;
  rangeMax: number;
  hfovDeg: number;
  vfovDeg: number;
};

export type CameraFootprintResult = {
  width: number;
  depth: number;
  area: number;
  d: number;
};

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const safeValue = (value: number) => (Number.isFinite(value) ? value : 0);

export const calcFootprint = (
  params: CameraFootprintParams,
): CameraFootprintResult => {
  const cameraHeight = Math.max(0, safeValue(params.cameraHeight));
  const rangeMax = Math.max(0, safeValue(params.rangeMax));
  const hfovDeg = safeValue(params.hfovDeg);
  const vfovDeg = safeValue(params.vfovDeg);

  const d = Math.max(0, Math.min(cameraHeight, rangeMax));
  const width = Math.max(0, 2 * d * Math.tan(toRadians(hfovDeg / 2)));
  const depth = Math.max(0, 2 * d * Math.tan(toRadians(vfovDeg / 2)));

  return {
    width,
    depth,
    area: Math.max(0, width * depth),
    d,
  };
};
