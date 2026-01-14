import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';

import { calcFootprint } from '../../rules';

type Inputs = {
  roomLength: number;
  roomWidth: number;
  roomHeight: number;
  wallThickness: number;
  cameraHeight: number;
  hfovDeg: number;
  vfovDeg: number;
  rangeMax: number;
};

type CameraPlacement = {
  position: [number, number, number];
  normal: [number, number, number];
};

const DEFAULT_INPUTS: Inputs = {
  roomLength: 20,
  roomWidth: 12,
  roomHeight: 4,
  wallThickness: 0.2,
  cameraHeight: 3.5,
  hfovDeg: 90,
  vfovDeg: 60,
  rangeMax: 30,
};

const toSafeNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const Room = ({
  roomLength,
  roomWidth,
  roomHeight,
  wallThickness,
  onWallPointerDown,
}: {
  roomLength: number;
  roomWidth: number;
  roomHeight: number;
  wallThickness: number;
  onWallPointerDown: (event: ThreeEvent<PointerEvent>) => void;
}) => {
  const innerLength = Math.max(0.1, roomLength - wallThickness * 2);
  const innerWidth = Math.max(0.1, roomWidth - wallThickness * 2);
  const wallMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#555c64', side: THREE.DoubleSide }),
    [],
  );
  const surfaceMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#4b5158', side: THREE.DoubleSide }),
    [],
  );

  return (
    <group>
      <mesh material={surfaceMaterial} rotation={[-Math.PI / 2, 0, 0]} position={[roomLength / 2, 0, roomWidth / 2]}>
        <planeGeometry args={[roomLength, roomWidth]} />
      </mesh>
      <mesh material={surfaceMaterial} rotation={[Math.PI / 2, 0, 0]} position={[roomLength / 2, roomHeight, roomWidth / 2]}>
        <planeGeometry args={[roomLength, roomWidth]} />
      </mesh>
      <mesh
        material={wallMaterial}
        position={[roomLength / 2, roomHeight / 2, wallThickness / 2]}
        onPointerDown={onWallPointerDown}
      >
        <boxGeometry args={[roomLength, roomHeight, wallThickness]} />
      </mesh>
      <mesh
        material={wallMaterial}
        position={[roomLength / 2, roomHeight / 2, roomWidth - wallThickness / 2]}
        onPointerDown={onWallPointerDown}
      >
        <boxGeometry args={[roomLength, roomHeight, wallThickness]} />
      </mesh>
      <mesh
        material={wallMaterial}
        position={[wallThickness / 2, roomHeight / 2, roomWidth / 2]}
        onPointerDown={onWallPointerDown}
      >
        <boxGeometry args={[wallThickness, roomHeight, innerWidth]} />
      </mesh>
      <mesh
        material={wallMaterial}
        position={[roomLength - wallThickness / 2, roomHeight / 2, roomWidth / 2]}
        onPointerDown={onWallPointerDown}
      >
        <boxGeometry args={[wallThickness, roomHeight, innerWidth]} />
      </mesh>
    </group>
  );
};

const CameraMarker = ({
  position,
  normal,
}: {
  position: [number, number, number];
  normal: [number, number, number];
}) => {
  const meshRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    if (!meshRef.current) {
      return;
    }
    const targetDirection = new THREE.Vector3(-normal[0], -normal[1], -normal[2]).normalize();
    const upDirection = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(upDirection, targetDirection);
    meshRef.current.setRotationFromQuaternion(quaternion);
  }, [normal]);

  return (
    <mesh ref={meshRef} position={position}>
      <coneGeometry args={[0.14, 0.3, 16]} />
      <meshStandardMaterial color="#3da3ff" />
    </mesh>
  );
};

const FootprintPlane = ({
  width,
  depth,
  center,
}: {
  width: number;
  depth: number;
  center: [number, number, number];
}) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={center} raycast={() => null}>
    <planeGeometry args={[width, depth]} />
    <meshStandardMaterial color="#3da3ff" transparent opacity={0.35} side={THREE.DoubleSide} />
  </mesh>
);

const MovementControls = ({
  roomLength,
  roomWidth,
  wallThickness,
  roomHeight,
}: {
  roomLength: number;
  roomWidth: number;
  wallThickness: number;
  roomHeight: number;
}) => {
  const controlsRef = useRef<{ lock: () => void } | null>(null);
  const { camera, gl } = useThree();
  const keys = useRef({ forward: false, back: false, left: false, right: false });

  useFrame((_, delta) => {
    const moveSpeed = 4;
    const direction = new THREE.Vector3();
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const left = new THREE.Vector3().crossVectors(camera.up, forward).normalize();

    if (keys.current.forward) direction.add(forward);
    if (keys.current.back) direction.sub(forward);
    if (keys.current.left) direction.add(left);
    if (keys.current.right) direction.sub(left);

    if (direction.lengthSq() > 0) {
      direction.normalize().multiplyScalar(moveSpeed * delta);
      camera.position.add(direction);
    }

    const minX = wallThickness;
    const maxX = roomLength - wallThickness;
    const minZ = wallThickness;
    const maxZ = roomWidth - wallThickness;
    camera.position.x = clamp(camera.position.x, minX, maxX);
    camera.position.z = clamp(camera.position.z, minZ, maxZ);
    camera.position.y = clamp(camera.position.y, 0.5, roomHeight - 0.2);
  });

  useEffect(() => {
    camera.position.set(roomLength / 2, 1.6, roomWidth * 0.2);
  }, [camera, roomLength, roomWidth]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'KeyW') keys.current.forward = true;
      if (event.code === 'KeyS') keys.current.back = true;
      if (event.code === 'KeyA') keys.current.left = true;
      if (event.code === 'KeyD') keys.current.right = true;
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'KeyW') keys.current.forward = false;
      if (event.code === 'KeyS') keys.current.back = false;
      if (event.code === 'KeyA') keys.current.left = false;
      if (event.code === 'KeyD') keys.current.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const handleClick = () => controlsRef.current?.lock();
    gl.domElement.addEventListener('click', handleClick);
    return () => {
      gl.domElement.removeEventListener('click', handleClick);
    };
  }, [gl]);

  return <PointerLockControls ref={controlsRef} />;
};

const Mode3DParam = () => {
  const [inputs, setInputs] = useState<Inputs>(DEFAULT_INPUTS);
  const [cameraPlacement, setCameraPlacement] = useState<CameraPlacement>(() => ({
    position: [DEFAULT_INPUTS.roomLength / 2, DEFAULT_INPUTS.cameraHeight, DEFAULT_INPUTS.roomWidth / 2],
    normal: [0, 1, 0],
  }));

  useEffect(() => {
    setCameraPlacement((prev) => ({
      position: [
        clamp(prev.position[0], inputs.wallThickness, inputs.roomLength - inputs.wallThickness),
        clamp(inputs.cameraHeight, 0, inputs.roomHeight),
        clamp(prev.position[2], inputs.wallThickness, inputs.roomWidth - inputs.wallThickness),
      ],
      normal: prev.normal,
    }));
  }, [inputs.cameraHeight, inputs.roomHeight, inputs.roomLength, inputs.roomWidth, inputs.wallThickness]);

  const footprint = useMemo(() => calcFootprint({
    cameraHeight: inputs.cameraHeight,
    rangeMax: inputs.rangeMax,
    hfovDeg: inputs.hfovDeg,
    vfovDeg: inputs.vfovDeg,
  }), [inputs]);

  const clampedWidth = clamp(footprint.width, 0.1, inputs.roomLength);
  const clampedDepth = clamp(footprint.depth, 0.1, inputs.roomWidth);
  const clampedArea = clampedWidth * clampedDepth;

  const handleWallPointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (!event.face) {
      return;
    }

    const normalMatrix = new THREE.Matrix3().getNormalMatrix(event.object.matrixWorld);
    const worldNormal = event.face.normal.clone().applyMatrix3(normalMatrix).normalize();

    if (worldNormal.dot(event.ray.direction) > 0) {
      worldNormal.multiplyScalar(-1);
    }

    const offsetPosition = event.point.clone().add(worldNormal.clone().multiplyScalar(0.05));

    const nextPosition: [number, number, number] = [
      offsetPosition.x,
      offsetPosition.y,
      offsetPosition.z,
    ];

    const nextNormal: [number, number, number] = [worldNormal.x, worldNormal.y, worldNormal.z];

    setCameraPlacement({ position: nextPosition, normal: nextNormal });
    setInputs((prev) => ({
      ...prev,
      cameraHeight: offsetPosition.y,
    }));
  };

  const handleChange = (key: keyof Inputs) => (event: ChangeEvent<HTMLInputElement>) => {
    setInputs((prev) => ({
      ...prev,
      [key]: toSafeNumber(event.target.value),
    }));
  };

  const inputStyle = {
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: '#14181d',
    color: 'var(--text)',
    padding: '8px 10px',
    fontSize: 14,
  } as const;

  return (
    <section className="panel" style={{ gap: 24 }}>
      <h2>3D Param Workspace</h2>
      <p className="panel__subtitle">
        Prototype 3D room with pointer-lock navigation and detection footprint.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(260px, 1fr) minmax(360px, 2fr)',
          gap: 24,
        }}
      >
        <div
          style={{
            background: '#1f252b',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16 }}>Inputs</h3>
          <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--muted)' }}>
            Room length (m)
            <input
              type="number"
              value={inputs.roomLength}
              onChange={handleChange('roomLength')}
              step={0.5}
              min={1}
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--muted)' }}>
            Room width (m)
            <input
              type="number"
              value={inputs.roomWidth}
              onChange={handleChange('roomWidth')}
              step={0.5}
              min={1}
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--muted)' }}>
            Room height (m)
            <input
              type="number"
              value={inputs.roomHeight}
              onChange={handleChange('roomHeight')}
              step={0.1}
              min={1}
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--muted)' }}>
            Wall thickness (m)
            <input
              type="number"
              value={inputs.wallThickness}
              onChange={handleChange('wallThickness')}
              step={0.05}
              min={0.05}
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--muted)' }}>
            Camera height (m)
            <input
              type="number"
              value={inputs.cameraHeight}
              onChange={handleChange('cameraHeight')}
              step={0.1}
              min={0.5}
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--muted)' }}>
            HFOV (deg)
            <input
              type="number"
              value={inputs.hfovDeg}
              onChange={handleChange('hfovDeg')}
              step={1}
              min={1}
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--muted)' }}>
            VFOV (deg)
            <input
              type="number"
              value={inputs.vfovDeg}
              onChange={handleChange('vfovDeg')}
              step={1}
              min={1}
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--muted)' }}>
            Range max (m)
            <input
              type="number"
              value={inputs.rangeMax}
              onChange={handleChange('rangeMax')}
              step={1}
              min={1}
              style={inputStyle}
            />
          </label>
          <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text)' }}>
            <strong>Placement</strong>
            <div>
              Position: {cameraPlacement.position.map((value) => value.toFixed(2)).join(', ')}
            </div>
            <div>Mounting height: {cameraPlacement.position[1].toFixed(2)} m</div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text)' }}>
            <strong>Footprint</strong>
            <div>D: {footprint.d.toFixed(2)} m</div>
            <div>Width: {clampedWidth.toFixed(2)} m</div>
            <div>Depth: {clampedDepth.toFixed(2)} m</div>
            <div>Area: {clampedArea.toFixed(2)} m²</div>
          </div>
        </div>
        <div
          style={{
            background: '#1f252b',
            border: '1px solid var(--border)',
            borderRadius: 12,
            minHeight: 520,
            overflow: 'hidden',
          }}
        >
          <Canvas
            camera={{
              position: [inputs.roomLength / 2, 1.6, inputs.roomWidth * 0.2],
              fov: 60,
            }}
            style={{ height: '100%', width: '100%' }}
          >
            <ambientLight intensity={0.7} />
            <directionalLight intensity={0.8} position={[10, 10, 5]} />
            <pointLight
              intensity={0.8}
              position={[inputs.roomLength / 2, inputs.roomHeight * 0.8, inputs.roomWidth / 2]}
            />
            <pointLight
              intensity={0.6}
              position={[inputs.roomLength / 4, inputs.roomHeight * 0.5, inputs.roomWidth / 3]}
            />
            <Room
              roomLength={inputs.roomLength}
              roomWidth={inputs.roomWidth}
              roomHeight={inputs.roomHeight}
              wallThickness={inputs.wallThickness}
              onWallPointerDown={handleWallPointerDown}
            />
            <CameraMarker
              position={cameraPlacement.position}
              normal={cameraPlacement.normal}
            />
            <FootprintPlane
              width={clampedWidth}
              depth={clampedDepth}
              center={[cameraPlacement.position[0], 0.01, cameraPlacement.position[2]]}
            />
            <MovementControls
              roomLength={inputs.roomLength}
              roomWidth={inputs.roomWidth}
              wallThickness={inputs.wallThickness}
              roomHeight={inputs.roomHeight}
            />
          </Canvas>
        </div>
      </div>
    </section>
  );
};

export default Mode3DParam;
