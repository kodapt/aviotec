export type AviotecInputs = {
  mountingHeightMeters: number;
  openingAngleDeg: number;
  focalLengthMm: number;
  minFlameWidthMeters: number;
  minSmokeWidthMeters: number;
};

export type AviotecOutputs = {
  flameMaxDistanceMeters: number;
  smokeMaxDistanceMeters: number;
  warnings: string[];
};
