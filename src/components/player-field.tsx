"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { Box, Grid2X2 } from "lucide-react";
import { PlayerMini } from "@/components/player-mini";
import type { Player } from "@/components/team-dashboard";

type PlayerRole = { id: string; label: string };
type FieldMode = "2d" | "3d";

const PlayerPitch3D = dynamic(
    () => import("@/components/player-pitch-3d").then((module) => module.PlayerPitch3D),
    {
        ssr: false,
        loading: () => <p className="player-field-status">Preparando el campo 3D...</p>,
    },
);

const PLACEMENTS = [
    "col-start-2 col-span-2 row-start-1",
    "col-start-1 col-span-4 row-start-2",
    "col-start-1 col-span-2 row-start-3",
    "col-start-3 col-span-2 row-start-3",
    "col-start-1 col-span-4 row-start-4",
];

export function PlayerField({ playersByRole, roles, onSelect }: {
    playersByRole: Map<string, Player[]>;
    roles: PlayerRole[];
    onSelect: (player: Player) => void;
}) {
    const [mode, setMode] = useState<FieldMode>("3d");
    // Una vez montado, el 3D no se desmonta al cambiar a 2D: solo se oculta
    const [keep3D, setKeep3D] = useState(true);
    const [webGLAvailable, setWebGLAvailable] = useState<boolean | null>(null);
    const [webGLError, setWebGLError] = useState(false);

    const handle3DError = useCallback(() => {
        setWebGLError(true);
        setWebGLAvailable(false);
        setKeep3D(false); // desmonta el 3D roto
        setMode("2d");
    }, []);

    const handle3DReady = useCallback(() => {
        setWebGLError(false);
        setWebGLAvailable(true);
    }, []);

    const changeMode = (next: FieldMode) => {
        if (next === "3d") {
            if (webGLAvailable === false) return; // no reintentar si WebGL no funciona
            setKeep3D(true);
        }
        setMode(next);
    };

    return (
        <div className="player-field-shell mb-10 overflow-hidden border border-[var(--lime)]/40 bg-[#101710] p-3 sm:p-5">
            <div className="mb-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/55">Campo · Temporada 2026-2027</p>
                <div className="flex items-center gap-2" role="group" aria-label="Modo de visualización del campo">
                    <button
                        type="button"
                        aria-pressed={mode === "3d"}
                        disabled={webGLAvailable === false}
                        onClick={() => changeMode("3d")}
                        className={`inline-flex min-h-10 items-center gap-2 border px-4 text-[10px] font-black uppercase tracking-[0.08em] transition disabled:cursor-not-allowed disabled:opacity-40 ${mode === "3d" ? "border-[var(--lime)] bg-[var(--lime)] text-[var(--ink)]" : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--lime)] hover:text-white"}`}
                    >
                        <Box size={15} /> 3D
                    </button>
                    <button
                        type="button"
                        aria-pressed={mode === "2d"}
                        onClick={() => changeMode("2d")}
                        className={`inline-flex min-h-10 items-center gap-2 border px-4 text-[10px] font-black uppercase tracking-[0.08em] transition ${mode === "2d" ? "border-[var(--lime)] bg-[var(--lime)] text-[var(--ink)]" : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--lime)] hover:text-white"}`}
                    >
                        <Grid2X2 size={15} /> 2D
                    </button>
                </div>
            </div>

            {webGLAvailable === false ? (
                <p className="mb-3 text-center text-xs text-[var(--muted)]">
                    {webGLError
                        ? "No se pudo iniciar el campo 3D. Se muestra el campo 2D."
                        : "Este dispositivo o navegador no tiene WebGL disponible. Se muestra el campo 2D."}
                </p>
            ) : null}

            {keep3D ? (
                <div className={mode === "3d" ? "" : "hidden"}>
                    <PlayerPitch3D
                        playersByRole={playersByRole}
                        roles={roles}
                        onSelect={onSelect}
                        onError={handle3DError}
                        onReady={handle3DReady}
                        active={mode === "3d"}
                    />
                </div>
            ) : null}

            {mode === "2d" ? (
                <div className="player-field-2d futsal-pitch relative mx-auto aspect-[2/3] w-full max-w-[520px] overflow-hidden border border-orange-300">
                    <div className="relative grid h-full grid-cols-4 grid-rows-4">
                        {roles.slice(0, 5).map((role, index) => (
                            <div key={role.id} className={`z-[1] flex flex-col items-center justify-center px-1 py-2 ${PLACEMENTS[index]}`}>
                                <p className="mb-1 bg-black/50 px-2 py-1 text-center text-[8px] font-bold uppercase tracking-[0.06em] text-white sm:text-[9px]">{role.label}</p>
                                <div className={role.id === "defender" || role.id === "pivot" ? "mx-auto grid w-fit max-w-full grid-cols-4 justify-items-center" : "flex w-full max-w-[320px] flex-wrap justify-center"}>
                                    {(playersByRole.get(role.id) ?? []).map((player) => (
                                        <div key={player.id} className={role.id === "defender" || role.id === "pivot" ? "w-16 min-w-0" : "w-1/3 sm:w-1/4"}>
                                            <PlayerMini player={player} onSelect={() => onSelect(player)} />
                                        </div>
                                    ))}
                                </div>
                                {playersByRole.get(role.id)?.length === 0 ? <span className="bg-black/35 px-2 py-1 text-center text-[8px] text-white/80">Sin asignar</span> : null}
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}

            {playersByRole.get("unspecified")?.length ? (
                <div className="mx-auto mt-3 flex max-w-[520px] flex-wrap justify-center gap-2 border border-dashed border-white/20 p-3">
                    <p className="w-full text-center text-[9px] font-bold uppercase text-white/55">Posición por definir</p>
                    {playersByRole.get("unspecified")?.map((player) => <div key={player.id} className="w-20"><PlayerMini player={player} onSelect={() => onSelect(player)} /></div>)}
                </div>
            ) : null}

            {mode === "3d" && webGLAvailable === null
                ? <p className="mt-3 text-center text-[9px] text-white/45">Iniciando campo 3D...</p>
                : mode === "3d"
                    ? <p className="mt-3 text-center text-[9px] font-bold uppercase tracking-[0.12em] text-white/45">Arrastra para explorar · usa la rueda o pellizca para acercar</p>
                    : null}
        </div>
    );
}