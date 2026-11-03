"use client";

import { Component, Suspense, memo, useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import Image from "next/image";
import { RotateCcw } from "lucide-react";
import { BackSide, DoubleSide, SRGBColorSpace, TextureLoader, Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { Player } from "@/lib/team-types";

type PlayerRole = { id: string; label: string };
type PlayerPitch3DProps = {
    playersByRole: Map<string, Player[]>;
    roles: PlayerRole[];
    onSelect: (player: Player) => void;
    onError: () => void;
    onReady: () => void;
    active?: boolean; // false cuando la vista 3D está oculta
};

type Slot = [number, number, number];

// Vista inicial: algo más alejada y centrada hacia nuestra portería para que el portero entre en pantalla.
const HOME_POSITION: Slot = [0, 10, 17.5];
const HOME_TARGET: Slot = [0, 0, 1];
const HOME = new Vector3(...HOME_POSITION);
const TARGET = new Vector3(...HOME_TARGET);

type RowConfig = {
    z: number;        // profundidad de la fila (+ = hacia tu portería, - = hacia el rival)
    xMin: number;     // límite izquierdo de la zona
    xMax: number;     // límite derecho de la zona
    perRow: number;   // jugadores máximos por fila
    maxGap: number;   // separación máxima horizontal entre jugadores
    rowGap: number;   // separación entre filas si hay más de perRow
    zigzag: number;   // desplazamiento en z alterno para que los vecinos no se pisen
};

const FORMATION: Record<string, RowConfig> = {
    goalkeeper:   { z: 5.9,  xMin: -2,   xMax: 2,    perRow: 3, maxGap: 2.4, rowGap: 1.8, zigzag: 0 },
    defender:     { z: 3.2,  xMin: -3.8, xMax: 3.8,  perRow: 4, maxGap: 2.6, rowGap: 2.2, zigzag: 0.5 },
    "left-wing":  { z: -0.8, xMin: -4.2, xMax: -1.4, perRow: 2, maxGap: 2.4, rowGap: 2.2, zigzag: 0.6 },
    "right-wing": { z: -0.8, xMin: 1.4,  xMax: 4.2,  perRow: 2, maxGap: 2.4, rowGap: 2.2, zigzag: 0.6 },
    pivot:        { z: -4.8, xMin: -3.8, xMax: 3.8,  perRow: 4, maxGap: 2.6, rowGap: 2.2, zigzag: 0.5 },
    unspecified:  { z: -6.6, xMin: -3.8, xMax: 3.8,  perRow: 4, maxGap: 2.6, rowGap: 2.2, zigzag: 0.5 },
};

function getSlots(roleId: string, count: number): Slot[] {
    const cfg = FORMATION[roleId] ?? FORMATION.unspecified;
    const rows = Math.ceil(count / cfg.perRow);
    const centerX = (cfg.xMin + cfg.xMax) / 2;

    return Array.from({ length: count }, (_, i) => {
        const row = Math.floor(i / cfg.perRow);
        const col = i % cfg.perRow;
        const inRow = Math.min(cfg.perRow, count - row * cfg.perRow);

        const gap = inRow > 1 ? Math.min(cfg.maxGap, (cfg.xMax - cfg.xMin) / (inRow - 1)) : 0;
        const x = centerX + (col - (inRow - 1) / 2) * gap;
        const z = cfg.z + (row - (rows - 1) / 2) * cfg.rowGap - (col % 2 === 1 ? cfg.zigzag : 0);

        return [x, 0.25, z];
    });
}

class PlayerSceneErrorBoundary extends Component<{ onError: () => void; children: ReactNode }, { hasError: boolean }> {
    state = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error) {
        console.error("Could not render the 3D player field", error);
        // Se retrasa para no desmontar el Canvas mientras React sigue renderizando
        setTimeout(() => this.props.onError(), 0);
    }

    render() {
        return this.state.hasError ? null : this.props.children;
    }
}

function PlayerMarker({ player, position, onSelect, layer }: {
    player: Player;
    position: Slot;
    onSelect: (player: Player) => void;
    layer: RefObject<HTMLDivElement | null>;
}) {
    return (
        <Html position={position} center distanceFactor={10} zIndexRange={[100, 0]} portal={layer as RefObject<HTMLElement>}>
            <button
                type="button"
                aria-label={`Ver ficha de ${player.name}, ${player.position}${player.injured ? ", lesionado" : ""}`}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                    event.stopPropagation();
                    onSelect(player);
                }}
                className="player-3d-marker"
            >
                <span className="player-3d-marker-image">
                    {player.photo
                        ? <Image src={player.photo} alt="" width={66} height={82} unoptimized />
                        : <span>{player.name.split(" ").map((part) => part[0]).join("").slice(0, 3)}</span>}
                    {player.injured ? <i aria-label="Lesionado">!</i> : null}
                </span>
                <span className="player-3d-marker-name">{player.name}</span>
                <span className="player-3d-marker-role">{player.position}</span>
            </button>
        </Html>
    );
}

function CanvasFallback({ onError }: { onError: () => void }) {
    return (
        <div className="player-field-status">
            <p>Este navegador no ha podido iniciar WebGL.</p>
            <button type="button" onClick={onError} className="mt-3 border border-[var(--lime)] px-4 py-2 font-bold text-[var(--lime)]">
                Usar campo 2D
            </button>
        </div>
    );
}

function Goal({ z }: { z: number }) {
    const dir = Math.sign(z);
    return (
        <group position={[0, 0, z]}>
            <mesh position={[-0.8, 0.5, 0]}>
                <boxGeometry args={[0.08, 1.05, 0.08]} />
                <meshStandardMaterial color="#f4f4f4" />
            </mesh>
            <mesh position={[0.8, 0.5, 0]}>
                <boxGeometry args={[0.08, 1.05, 0.08]} />
                <meshStandardMaterial color="#f4f4f4" />
            </mesh>
            <mesh position={[0, 1.02, 0]}>
                <boxGeometry args={[1.68, 0.08, 0.08]} />
                <meshStandardMaterial color="#f4f4f4" />
            </mesh>
            <mesh position={[0, 0.5, dir * 0.28]}>
                <planeGeometry args={[1.6, 1]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.22} side={DoubleSide} />
            </mesh>
        </group>
    );
}

function LightTower({ position }: { position: Slot }) {
    return (
        <group position={position}>
            <mesh position={[0, 2.5, 0]}>
                <cylinderGeometry args={[0.12, 0.16, 5.2, 8]} />
                <meshStandardMaterial color="#2a312e" />
            </mesh>
            <mesh position={[0, 5.2, 0]}>
                <boxGeometry args={[1.6, 0.35, 0.5]} />
                <meshBasicMaterial color="#fff6d8" />
            </mesh>
        </group>
    );
}

function FutsalHall() {
    const sideColors = ["#243d78", "#8e2633", "#243d78", "#686c68"];
    const rows = Array.from({ length: 5 }, (_, i) => ({ h: 0.5 + i * 0.4, off: i * 0.9 }));

    return (
        <group>
            {/* Suelo del pabellón (parqué) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]}>
                <circleGeometry args={[26, 64]} />
                <meshStandardMaterial color="#b98a55" roughness={0.7} />
            </mesh>
            {/* Zona de pista azul alrededor del campo */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
                <planeGeometry args={[12, 17]} />
                <meshStandardMaterial color="#1f4e8c" roughness={0.8} />
            </mesh>

            {/* Pared circular y franja de color */}
            <mesh position={[0, 4.5, 0]}>
                <cylinderGeometry args={[26, 26, 9.5, 64, 1, true]} />
                <meshStandardMaterial color="#1a2220" side={BackSide} roughness={1} />
            </mesh>
            <mesh position={[0, 1.9, 0]}>
                <cylinderGeometry args={[25.9, 25.9, 1.1, 64, 1, true]} />
                <meshStandardMaterial color="#c6f432" side={BackSide} emissive="#c6f432" emissiveIntensity={0.25} />
            </mesh>

            {/* Bandas publicitarias */}
            {[-1, 1].map((s) => (
                <group key={s}>
                    <mesh position={[s * 5.4, 0.22, 0]}>
                        <boxGeometry args={[0.18, 0.7, 15.8]} />
                        <meshStandardMaterial color="#111815" />
                    </mesh>
                    <mesh position={[s * 5.3, 0.25, 0]}>
                        <boxGeometry args={[0.02, 0.35, 15.2]} />
                        <meshBasicMaterial color="#c6f432" />
                    </mesh>
                    <mesh position={[0, 0.22, s * 7.95]}>
                        <boxGeometry args={[10.9, 0.7, 0.18]} />
                        <meshStandardMaterial color="#111815" />
                    </mesh>
                    <mesh position={[0, 0.25, s * 7.85]}>
                        <boxGeometry args={[10.2, 0.35, 0.02]} />
                        <meshBasicMaterial color="#c6f432" />
                    </mesh>
                </group>
            ))}

            {/* Porterías */}
            <Goal z={7.5} />
            <Goal z={-7.5} />

            {/* Gradas laterales */}
            {rows.map(({ h, off }, i) =>
                [-1, 1].map((s) => (
                    <group key={`side-${i}-${s}`}>
                        <mesh position={[s * (6.4 + off), h / 2 - 0.1, 0]}>
                            <boxGeometry args={[0.9, h, 16]} />
                            <meshStandardMaterial color="#454b48" roughness={0.95} />
                        </mesh>
                        {sideColors.map((c, k) => (
                            <mesh key={k} position={[s * (6.4 + off), h - 0.05, (k - 1.5) * 3.9]}>
                                <boxGeometry args={[0.7, 0.08, 3.7]} />
                                <meshStandardMaterial color={i % 2 === 0 ? c : sideColors[3 - k]} roughness={0.85} />
                            </mesh>
                        ))}
                    </group>
                ))
            )}

            {/* Gradas de fondo */}
            {rows.map(({ h, off }, i) =>
                [-1, 1].map((s) => (
                    <group key={`end-${i}-${s}`}>
                        <mesh position={[0, h / 2 - 0.1, s * (8.8 + off)]}>
                            <boxGeometry args={[11, h, 0.9]} />
                            <meshStandardMaterial color="#454b48" roughness={0.95} />
                        </mesh>
                        {sideColors.map((c, k) => (
                            <mesh key={k} position={[(k - 1.5) * 2.7, h - 0.05, s * (8.8 + off)]}>
                                <boxGeometry args={[2.55, 0.08, 0.7]} />
                                <meshStandardMaterial color={i % 2 === 0 ? c : sideColors[3 - k]} roughness={0.85} />
                            </mesh>
                        ))}
                    </group>
                ))
            )}

            {/* Torres de focos */}
            <LightTower position={[-11, 0, -12]} />
            <LightTower position={[11, 0, -12]} />
            <LightTower position={[-11, 0, 12]} />
            <LightTower position={[11, 0, 12]} />
        </group>
    );
}

// Lleva la cámara a la vista inicial con una transición suave. Si el usuario toca el campo
// mientras tanto, la transición se detiene.
function CameraReset({ request }: { request: number }) {
    const camera = useThree((state) => state.camera);
    const controls = useThree((state) => state.controls) as OrbitControlsImpl | null;
    const animating = useRef(false);

    useEffect(() => {
        if (request) animating.current = true;
    }, [request]);

    useEffect(() => {
        if (!controls) return;
        const stop = () => { animating.current = false; };
        controls.addEventListener("start", stop);
        return () => controls.removeEventListener("start", stop);
    }, [controls]);

    useFrame(() => {
        if (!animating.current || !controls) return;
        camera.position.lerp(HOME, 0.12);
        controls.target.lerp(TARGET, 0.12);
        controls.update();
        if (camera.position.distanceTo(HOME) < 0.02 && controls.target.distanceTo(TARGET) < 0.01) animating.current = false;
    });

    return null;
}

function PitchScene({ playersByRole, roles, onSelect, markerLayer }: Pick<PlayerPitch3DProps, "playersByRole" | "roles" | "onSelect"> & {
    markerLayer: RefObject<HTMLDivElement | null>;
}) {
    // Textura cacheada por useLoader: sin clone ni dispose
    const fieldMap = useLoader(TextureLoader, "/fotos/Campo.jpg");
    useEffect(() => {
        // Las texturas de three.js son objetos mutables por diseño
        // eslint-disable-next-line react-hooks/immutability
        fieldMap.colorSpace = SRGBColorSpace;
        fieldMap.needsUpdate = true;
    }, [fieldMap]);

    return (
        <>
            <ambientLight intensity={1.2} />
            <directionalLight position={[6, 14, 8]} intensity={1.1} />
            <FutsalHall />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]}>
                <planeGeometry args={[10, 15]} />
                <meshBasicMaterial map={fieldMap} />
            </mesh>
            {roles.slice(0, 5).map((role) => {
                const players = playersByRole.get(role.id) ?? [];
                const slots = getSlots(role.id, players.length);
                return players.map((player, index) => (
                    <PlayerMarker
                        key={player.id}
                        player={player}
                        position={slots[index]}
                        onSelect={onSelect}
                        layer={markerLayer}
                    />
                ));
            })}
        </>
    );
}

export const PlayerPitch3D = memo(function PlayerPitch3D({
    playersByRole,
    roles,
    onSelect,
    onError,
    onReady,
    active = true,
}: PlayerPitch3DProps) {
    const [mounted, setMounted] = useState(false);
    const [resetRequest, setResetRequest] = useState(0);
    // Capa fija para los marcadores. Sin ella, Html los cuelga del contenedor del canvas, que
    // cambia justo después de montar: al volver a la sección (textura ya en caché) los marcadores
    // se recreaban a mitad de render y el primero —el portero— se quedaba vacío.
    const markerLayer = useRef<HTMLDivElement>(null);
    const onReadyRef = useRef(onReady);
    useEffect(() => {
        onReadyRef.current = onReady;
    }, [onReady]);

    // Monta el Canvas un frame después, fuera del render que cambia de vista
    useEffect(() => {
        const id = requestAnimationFrame(() => setMounted(true));
        return () => cancelAnimationFrame(id);
    }, []);

    const handleCreated = useCallback(() => {
        requestAnimationFrame(() => onReadyRef.current());
    }, []);

    return (
        <div className="player-pitch-3d relative mx-auto aspect-[6/5] w-full max-w-[900px] overflow-hidden border border-[var(--lime)]/50">
            {mounted ? (
                <PlayerSceneErrorBoundary onError={onError}>
                    <Canvas
                        frameloop={active ? "always" : "never"}
                        dpr={[1, 1.5]}
                        camera={{ position: HOME_POSITION, fov: 46, near: 0.1, far: 80 }}
                        gl={{ antialias: true, alpha: false, powerPreference: "low-power" }}
                        fallback={<CanvasFallback onError={onError} />}
                        onCreated={handleCreated}
                    >
                        <color attach="background" args={["#111711"]} />
                        <Suspense fallback={null}>
                            <PitchScene playersByRole={playersByRole} roles={roles} onSelect={onSelect} markerLayer={markerLayer} />
                        </Suspense>
                        <OrbitControls
                            makeDefault
                            target={HOME_TARGET}
                            enableDamping
                            dampingFactor={0.08}
                            enablePan
                            enableRotate
                            minPolarAngle={0.3}
                            maxPolarAngle={1.25}
                            minDistance={8}
                            maxDistance={24}
                        />
                        <CameraReset request={resetRequest} />
                    </Canvas>
                </PlayerSceneErrorBoundary>
            ) : null}
            <div ref={markerLayer} className="player-3d-markers" />
            {mounted ? (
                <button
                    type="button"
                    onClick={() => setResetRequest((value) => value + 1)}
                    className="absolute right-2 top-2 z-10 inline-flex min-h-10 items-center gap-1.5 border border-[var(--lime)]/60 bg-black/70 px-3 text-[10px] font-black uppercase tracking-[0.08em] text-white transition hover:bg-[var(--lime)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--lime)]"
                >
                    <RotateCcw size={13} /> Centrar
                </button>
            ) : null}
        </div>
    );
});