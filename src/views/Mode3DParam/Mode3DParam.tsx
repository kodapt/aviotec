import { calculateAviotec } from '../../rules';

const Mode3DParam = () => {
  const result = calculateAviotec({
    mountingHeightMeters: 10,
    openingAngleDeg: 48.5,
    focalLengthMm: 6.0,
    minFlameWidthMeters: 0.5,
    minSmokeWidthMeters: 0.75,
  });

  return (
    <section className="panel">
      <h2>3D Param Workspace</h2>
      <p className="panel__subtitle">Placeholder view for parametric modeling.</p>
      <pre>{JSON.stringify(result, null, 2)}</pre>
    </section>
  );
};

export default Mode3DParam;
