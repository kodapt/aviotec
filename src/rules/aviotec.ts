import type { AviotecInputs, AviotecOutputs } from './types';

type HeightLookup = {
  height: number;
  flameDistance: number;
  smokeDistance: number;
};

const HEIGHT_LOOKUP: HeightLookup[] = [
  { height: 2, flameDistance: 4, smokeDistance: 3 },
  { height: 5, flameDistance: 9, smokeDistance: 7 },
  { height: 10, flameDistance: 16, smokeDistance: 12 },
  { height: 15, flameDistance: 22, smokeDistance: 17 },
  { height: 20, flameDistance: 27, smokeDistance: 21 },
  { height: 25, flameDistance: 31, smokeDistance: 24 },
  { height: 30, flameDistance: 34, smokeDistance: 26 },
];

const FLAME_REFERENCE_WIDTH = 0.5;
const SMOKE_REFERENCE_WIDTH = 0.75;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const interpolate = (value: number, min: HeightLookup, max: HeightLookup) => {
  if (min.height === max.height) {
    return { flame: min.flameDistance, smoke: min.smokeDistance };
  }
  const ratio = (value - min.height) / (max.height - min.height);
  return {
    flame: min.flameDistance + ratio * (max.flameDistance - min.flameDistance),
    smoke: min.smokeDistance + ratio * (max.smokeDistance - min.smokeDistance),
  };
};

const lookupBaseDistances = (mountingHeight: number) => {
  const clamped = clamp(
    mountingHeight,
    HEIGHT_LOOKUP[0].height,
    HEIGHT_LOOKUP[HEIGHT_LOOKUP.length - 1].height,
  );

  const lowerIndex = HEIGHT_LOOKUP.findIndex((row) => clamped <= row.height);
  if (lowerIndex <= 0) {
    const first = HEIGHT_LOOKUP[0];
    return { flame: first.flameDistance, smoke: first.smokeDistance };
  }
  const lower = HEIGHT_LOOKUP[lowerIndex - 1];
  const upper = HEIGHT_LOOKUP[lowerIndex];
  return interpolate(clamped, lower, upper);
};

export const calculateAviotec = (inputs: AviotecInputs): AviotecOutputs => {
  const warnings: string[] = [];

  if (inputs.mountingHeightMeters <= 0 || inputs.mountingHeightMeters > 30) {
    warnings.push('Mounting height should be between 0 and 30 meters.');
  }
  if (inputs.openingAngleDeg <= 0 || inputs.openingAngleDeg > 120) {
    warnings.push('Opening angle should be between 0 and 120 degrees.');
  }
  if (inputs.focalLengthMm <= 0) {
    warnings.push('Focal length must be greater than 0 mm.');
  }
  if (inputs.minFlameWidthMeters <= 0 || inputs.minSmokeWidthMeters <= 0) {
    warnings.push('Minimum target widths must be greater than 0 meters.');
  }

  const base = lookupBaseDistances(inputs.mountingHeightMeters);

  const flameScale =
    inputs.minFlameWidthMeters > 0
      ? inputs.minFlameWidthMeters / FLAME_REFERENCE_WIDTH
      : 0;
  const smokeScale =
    inputs.minSmokeWidthMeters > 0
      ? inputs.minSmokeWidthMeters / SMOKE_REFERENCE_WIDTH
      : 0;

  const flameMaxDistanceMeters = Math.max(0, base.flame * flameScale);
  const smokeMaxDistanceMeters = Math.max(0, base.smoke * smokeScale);

  return {
    flameMaxDistanceMeters,
    smokeMaxDistanceMeters,
    warnings,
  };
};
