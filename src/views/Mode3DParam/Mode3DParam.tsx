import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
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

type AimHit = {
  point: [number, number, number];
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
  wallMeshesRef,
}: {
  roomLength: number;
  roomWidth: number;
  roomHeight: number;
  wallThickness: number;
  wallMeshesRef: MutableRefObject<THREE.Mesh[]>;
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

  const setWallRef = (index: number) => (node: THREE.Mesh | null) => {
    if (node) {
      wallMeshesRef.current[index] = node;
    }
  };

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
        ref={setWallRef(0)}
      >
        <boxGeometry args={[roomLength, roomHeight, wallThickness]} />
      </mesh>
      <mesh
        material={wallMaterial}
        position={[roomLength / 2, roomHeight / 2, roomWidth - wallThickness / 2]}
        ref={setWallRef(1)}
      >
        <boxGeometry args={[roomLength, roomHeight, wallThickness]} />
      </mesh>
      <mesh
        material={wallMaterial}
        position={[wallThickness / 2, roomHeight / 2, roomWidth / 2]}
        ref={setWallRef(2)}
      >
        <boxGeometry args={[wallThickness, roomHeight, innerWidth]} />
      </mesh>
      <mesh
        material={wallMaterial}
        position={[roomLength - wallThickness / 2, roomHeight / 2, roomWidth / 2]}
        ref={setWallRef(3)}
      >
        <boxGeometry args={[wallThickness, roomHeight, innerWidth]} />
      </mesh>
    </group>
  );
};

const CameraMarker = ({
  position,
  normal,
  opacity = 1,
  color = '#3da3ff',
  disableRaycast = false,
}: {
  position: [number, number, number];
  normal: [number, number, number];
  opacity?: number;
  color?: string;
  disableRaycast?: boolean;
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
    <mesh ref={meshRef} position={position} raycast={disableRaycast ? () => null : undefined}>
      <coneGeometry args={[0.14, 0.3, 16]} />
      <meshStandardMaterial color={color} transparent={opacity < 1} opacity={opacity} />
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
  onPointerLockChange,
}: {
  roomLength: number;
  roomWidth: number;
  wallThickness: number;
  roomHeight: number;
  onPointerLockChange?: (isLocked: boolean) => void;
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

  useEffect(() => {
    if (!onPointerLockChange) {
      return;
    }
    const handlePointerLockChange = () => {
      onPointerLockChange(document.pointerLockElement === gl.domElement);
    };
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
    };
  }, [gl, onPointerLockChange]);

  return <PointerLockControls ref={controlsRef} />;
};

const AimRaycaster = ({
  wallMeshesRef,
  onAimHit,
}: {
  wallMeshesRef: MutableRefObject<THREE.Mesh[]>;
  onAimHit: (hit: AimHit | null) => void;
}) => {
  const { camera } = useThree();
  const raycasterRef = useRef(new THREE.Raycaster());
  const elapsedRef = useRef(0);

  useFrame((_, delta) => {
    elapsedRef.current += delta;
    if (elapsedRef.current < 1 / 30) {
      return;
    }
    elapsedRef.current = 0;

    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    raycasterRef.current.set(camera.position, direction);
    const wallMeshes = wallMeshesRef.current.filter((mesh): mesh is THREE.Mesh => Boolean(mesh));
    const intersections = raycasterRef.current.intersectObjects(wallMeshes, false);
    const hit = intersections[0];

    if (!hit || !hit.face) {
      onAimHit(null);
      return;
    }

    const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
    const worldNormal = hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();

    if (worldNormal.dot(direction) > 0) {
      worldNormal.multiplyScalar(-1);
    }

    onAimHit({
      point: [hit.point.x, hit.point.y, hit.point.z],
      normal: [worldNormal.x, worldNormal.y, worldNormal.z],
    });
  });

  return null;
};

const Mode3DParam = () => {
  const [inputs, setInputs] = useState<Inputs>(DEFAULT_INPUTS);
  const [cameraPlacement, setCameraPlacement] = useState<CameraPlacement | null>(null);
  const [aimHit, setAimHit] = useState<AimHit | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const aimHitRef = useRef<AimHit | null>(null);
  const wallMeshesRef = useRef<THREE.Mesh[]>([]);
  const isEditingRef = useRef(false);

  useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

  useEffect(() => {
    setCameraPlacement((prev) => {
      if (!prev) {
        return prev;
      }
      const nextPosition: [number, number, number] = [
        clamp(prev.position[0], inputs.wallThickness, inputs.roomLength - inputs.wallThickness),
        clamp(inputs.cameraHeight, 0, inputs.roomHeight),
        clamp(prev.position[2], inputs.wallThickness, inputs.roomWidth - inputs.wallThickness),
      ];
      const isSame = prev.position.every((value, index) => value === nextPosition[index]);
      return isSame ? prev : { position: nextPosition, normal: prev.normal };
    });
  }, [inputs.cameraHeight, inputs.roomHeight, inputs.roomLength, inputs.roomWidth, inputs.wallThickness]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isEditingRef.current || event.repeat || event.code !== 'KeyE') {
        return;
      }
      const hit = aimHitRef.current;
      if (!hit) {
        return;
      }
      const offsetPosition = new THREE.Vector3(...hit.point).add(
        new THREE.Vector3(...hit.normal).multiplyScalar(0.05),
      );

      const nextPosition: [number, number, number] = [
        offsetPosition.x,
        offsetPosition.y,
        offsetPosition.z,
      ];
      const nextNormal: [number, number, number] = [...hit.normal];

      setCameraPlacement({ position: nextPosition, normal: nextNormal });
      setInputs((prev) => ({
        ...prev,
        cameraHeight: offsetPosition.y,
      }));
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!isEditing) {
      aimHitRef.current = null;
      setAimHit(null);
    }
  }, [isEditing]);

  const footprint = useMemo(() => calcFootprint({
    cameraHeight: inputs.cameraHeight,
    rangeMax: inputs.rangeMax,
    hfovDeg: inputs.hfovDeg,
    vfovDeg: inputs.vfovDeg,
  }), [inputs]);

  const clampedWidth = clamp(footprint.width, 0.1, inputs.roomLength);
  const clampedDepth = clamp(footprint.depth, 0.1, inputs.roomWidth);
  const clampedArea = clampedWidth * clampedDepth;

  const handleAimHit = (nextHit: AimHit | null) => {
    if (!nextHit) {
      if (aimHitRef.current !== null) {
        aimHitRef.current = null;
        setAimHit(null);
      }
      return;
    }

    const previous = aimHitRef.current;
    aimHitRef.current = nextHit;
    const hasChanged = !previous
      || previous.point.some((value, index) => Math.abs(value - nextHit.point[index]) > 0.001)
      || previous.normal.some((value, index) => Math.abs(value - nextHit.normal[index]) > 0.001);

    if (hasChanged) {
      setAimHit(nextHit);
    }
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

  const ghostPosition = useMemo(() => {
    if (!aimHit) {
      return null;
    }
    const offset = new THREE.Vector3(...aimHit.point).add(
      new THREE.Vector3(...aimHit.normal).multiplyScalar(0.05),
    );
    return [offset.x, offset.y, offset.z] as [number, number, number];
  }, [aimHit]);

  const footprintCenter: [number, number, number] = cameraPlacement
    ? [cameraPlacement.position[0], 0.01, cameraPlacement.position[2]]
    : [inputs.roomLength / 2, 0.01, inputs.roomWidth / 2];

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
            {cameraPlacement ? (
              <>
                <div>
                  Position: {cameraPlacement.position.map((value) => value.toFixed(2)).join(', ')}
                </div>
                <div>Mounting height: {cameraPlacement.position[1].toFixed(2)} m</div>
              </>
            ) : (
              <div>Not placed yet (press E to place).</div>
            )}
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
            position: 'relative',
          }}
        >
          {isEditing && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: 18,
                height: 18,
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                zIndex: 2,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  width: '100%',
                  height: 2,
                  background: 'rgba(255, 255, 255, 0.7)',
                  transform: 'translateY(-50%)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: 0,
                  width: 2,
                  height: '100%',
                  background: 'rgba(255, 255, 255, 0.7)',
                  transform: 'translateX(-50%)',
                }}
              />
            </div>
          )}
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
              wallMeshesRef={wallMeshesRef}
            />
            {cameraPlacement && (
              <CameraMarker
                position={cameraPlacement.position}
                normal={cameraPlacement.normal}
              />
            )}
            {isEditing && aimHit && ghostPosition && (
              <CameraMarker
                position={ghostPosition}
                normal={aimHit.normal}
                opacity={0.4}
                color="#9bd1ff"
                disableRaycast
              />
            )}
            <FootprintPlane
              width={clampedWidth}
              depth={clampedDepth}
              center={footprintCenter}
            />
            {isEditing && (
              <AimRaycaster wallMeshesRef={wallMeshesRef} onAimHit={handleAimHit} />
            )}
            <MovementControls
              roomLength={inputs.roomLength}
              roomWidth={inputs.roomWidth}
              wallThickness={inputs.wallThickness}
              roomHeight={inputs.roomHeight}
              onPointerLockChange={setIsEditing}
            />
          </Canvas>
        </div>
      </div>
    </section>
  );
};

export default Mode3DParam;
