import { calculateAviotec } from '../../rules';

const Mode3DParam = () => {
  const result = calculateAviotec({ mode: '3d-param', seed: 340 });

  return (
    <section className="panel">
      <h2>3D Param Workspace</h2>
      <p className="panel__subtitle">Placeholder view for parametric modeling.</p>
      <pre>{JSON.stringify(result, null, 2)}</pre>
    </section>
  );
};

export default Mode3DParam;
