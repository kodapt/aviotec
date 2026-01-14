import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';

import type { AviotecInputs } from '../../rules';
import { calculateAviotec } from '../../rules';

const DEFAULT_INPUTS: AviotecInputs = {
  mountingHeightMeters: 10,
  openingAngleDeg: 48.5,
  focalLengthMm: 6.0,
  minFlameWidthMeters: 0.5,
  minSmokeWidthMeters: 0.75,
};

const DIAGRAM = {
  width: 360,
  height: 240,
  padding: 32,
};

const Mode2D = () => {
  const [inputs, setInputs] = useState<AviotecInputs>(DEFAULT_INPUTS);

  const outputs = useMemo(() => calculateAviotec(inputs), [inputs]);

  const handleChange = (key: keyof AviotecInputs) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = Number(event.target.value);
      setInputs((prev) => ({
        ...prev,
        [key]: Number.isFinite(value) ? value : 0,
      }));
    };

  const displayData = useMemo(
    () => ({ inputs, outputs }),
    [inputs, outputs],
  );

  const maxDistance = Math.max(outputs.flameMaxDistanceMeters, 1);
  const maxHeight = Math.max(inputs.mountingHeightMeters, 1);
  const scale = Math.min(
    (DIAGRAM.width - DIAGRAM.padding * 2) / maxDistance,
    (DIAGRAM.height - DIAGRAM.padding * 2) / maxHeight,
  );

  const groundY = DIAGRAM.height - DIAGRAM.padding;
  const cameraX = DIAGRAM.padding;
  const cameraY = groundY - inputs.mountingHeightMeters * scale;
  const distanceX = cameraX + outputs.flameMaxDistanceMeters * scale;

  return (
    <section className="panel mode2d">
      <header className="mode2d__header">
        <div>
          <h2>2D Workspace</h2>
          <p className="panel__subtitle">
            Adjust the inputs to preview rule engine outputs.
          </p>
        </div>
      </header>
      <div className="mode2d__grid">
        <div className="mode2d__panel">
          <h3 className="mode2d__title">Inputs</h3>
          <div className="mode2d__form">
            <label className="mode2d__field">
              <span>Mounting height (m)</span>
              <input
                type="number"
                value={inputs.mountingHeightMeters}
                min={0}
                step={0.1}
                onChange={handleChange('mountingHeightMeters')}
              />
            </label>
            <label className="mode2d__field">
              <span>Opening angle (deg)</span>
              <input
                type="number"
                value={inputs.openingAngleDeg}
                min={0}
                step={0.1}
                onChange={handleChange('openingAngleDeg')}
              />
            </label>
            <label className="mode2d__field">
              <span>Focal length (mm)</span>
              <input
                type="number"
                value={inputs.focalLengthMm}
                min={0}
                step={0.1}
                onChange={handleChange('focalLengthMm')}
              />
            </label>
            <label className="mode2d__field">
              <span>Min flame width (m)</span>
              <input
                type="number"
                value={inputs.minFlameWidthMeters}
                min={0}
                step={0.05}
                onChange={handleChange('minFlameWidthMeters')}
              />
            </label>
            <label className="mode2d__field">
              <span>Min smoke width (m)</span>
              <input
                type="number"
                value={inputs.minSmokeWidthMeters}
                min={0}
                step={0.05}
                onChange={handleChange('minSmokeWidthMeters')}
              />
            </label>
          </div>
          {outputs.warnings.length > 0 && (
            <div className="mode2d__warnings">
              <h4>Warnings</h4>
              <ul>
                {outputs.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="mode2d__panel">
          <h3 className="mode2d__title">Results</h3>
          <pre>{JSON.stringify(displayData, null, 2)}</pre>
          <div className="mode2d__diagram">
            <svg
              width={DIAGRAM.width}
              height={DIAGRAM.height}
              viewBox={`0 0 ${DIAGRAM.width} ${DIAGRAM.height}`}
              role="img"
              aria-label="2D coverage diagram"
            >
              <rect
                x={1}
                y={1}
                width={DIAGRAM.width - 2}
                height={DIAGRAM.height - 2}
                rx={12}
                fill="#14181d"
                stroke="#2f3842"
              />
              <line
                x1={DIAGRAM.padding}
                y1={groundY}
                x2={DIAGRAM.width - DIAGRAM.padding}
                y2={groundY}
                stroke="#2f3842"
                strokeWidth={2}
              />
              <polygon
                points={`${cameraX},${cameraY} ${cameraX},${groundY} ${distanceX},${groundY}`}
                fill="rgba(61, 163, 255, 0.2)"
                stroke="#3da3ff"
                strokeWidth={2}
              />
              <circle cx={cameraX} cy={cameraY} r={6} fill="#3da3ff" />
              <line
                x1={cameraX - 12}
                y1={cameraY}
                x2={cameraX - 12}
                y2={groundY}
                stroke="#8f9ba8"
                strokeWidth={1.5}
              />
              <text
                x={cameraX - 20}
                y={(cameraY + groundY) / 2}
                fill="#8f9ba8"
                fontSize={12}
                textAnchor="end"
                dominantBaseline="middle"
              >
                {inputs.mountingHeightMeters.toFixed(1)}m
              </text>
              <line
                x1={cameraX}
                y1={groundY + 16}
                x2={distanceX}
                y2={groundY + 16}
                stroke="#8f9ba8"
                strokeWidth={1.5}
              />
              <text
                x={(cameraX + distanceX) / 2}
                y={groundY + 32}
                fill="#8f9ba8"
                fontSize={12}
                textAnchor="middle"
              >
                {outputs.flameMaxDistanceMeters.toFixed(1)}m
              </text>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Mode2D;
