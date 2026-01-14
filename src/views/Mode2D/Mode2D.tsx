import { calculateAviotec } from '../../rules';

const Mode2D = () => {
  const result = calculateAviotec({ mode: '2d', seed: 120 });

  return (
    <section className="panel">
      <h2>2D Workspace</h2>
      <p className="panel__subtitle">Placeholder view for 2D tooling.</p>
      <pre>{JSON.stringify(result, null, 2)}</pre>
    </section>
  );
};

export default Mode2D;
