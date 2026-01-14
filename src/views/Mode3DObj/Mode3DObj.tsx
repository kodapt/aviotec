import { calculateAviotec } from '../../rules';

const Mode3DObj = () => {
  const result = calculateAviotec({ mode: '3d-obj', seed: 780 });

  return (
    <section className="panel">
      <h2>3D OBJ Workspace</h2>
      <p className="panel__subtitle">Placeholder view for OBJ import/export.</p>
      <pre>{JSON.stringify(result, null, 2)}</pre>
    </section>
  );
};

export default Mode3DObj;
