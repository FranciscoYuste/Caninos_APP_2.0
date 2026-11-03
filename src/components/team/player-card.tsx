"use client";

import Image from "next/image";
import { Cross, Star } from "lucide-react";
import { FramedPhoto, FramedVideo } from "@/components/team/framed-media";
import { useCardSpin } from "@/components/team/use-card-spin";
import { CARD_PHOTO_FRAME, CARD_VIDEO_FRAME } from "@/lib/media-framing";
import type { Player } from "@/lib/team-types";

const POSITION_CODES: Record<string, string> = {
    Portero: "POR",
    Cierre: "CIE",
    "Ala izquierda": "ALA",
    "Ala derecha": "ALA",
    "Pívot": "PÍV",
};

function initials(name: string): string {
    return name.split(" ").map((part) => part[0]).join("").slice(0, 3);
}

// "marcados/tirados" con el porcentaje de acierto, o "—" si no ha tirado ninguno.
function successRate(value: string): string {
    const [scored, taken] = value.split("/").map(Number);
    if (!taken) return "—";
    return `${value} · ${Math.round((scored / taken) * 100)}%`;
}

const perGame = (value: number, games: number) => (games ? (value / games).toLocaleString("es-ES", { maximumFractionDigits: 2 }) : "—");

function CardShine() {
    return <><span className="collect-holo" aria-hidden="true" /><span className="collect-glare" aria-hidden="true" /></>;
}

// Carta coleccionable del jugador: delante la foto y los totales, detrás el partido a partido.
export function PlayerCard({ player }: { player: Player }) {
    const { ref, flipped, handlers } = useCardSpin<HTMLDivElement>();
    const katsuRounds = player.katsuRounds ?? [];
    const matches = player.matchStats ?? [];
    const contributions = (match: (typeof matches)[number]) => match.goals + match.assists;
    const maxContributions = Math.max(1, ...matches.map(contributions));
    const best = matches.reduce<(typeof matches)[number] | null>((top, match) => (contributions(match) > (top ? contributions(top) : 0) ? match : top), null);
    const scoringGames = matches.filter((match) => match.goals > 0).length;
    const summary = [
        { label: "G + A", value: player.goals + player.assists },
        { label: "Goles / conv.", value: perGame(player.goals, player.games) },
        { label: "Asist. / conv.", value: perGame(player.assists, player.games) },
        { label: "Penaltis", value: successRate(player.penalties) },
        { label: "Dobles pen.", value: successRate(player.doublePenalties) },
        { label: "Partidos con gol", value: matches.length ? `${scoringGames} de ${matches.length}` : "—" },
        { label: "Mejor partido", value: best ? `${best.goals} G · ${best.assists} A · J${best.jornada}` : "—" },
        { label: "Tarjetas", value: `${player.yellowCards} A · ${player.redCards} R` },
        { label: "KATSU", value: katsuRounds.length ? katsuRounds.map((round) => `J${round}`).join(", ") : "—" },
    ];
    const positionCode = POSITION_CODES[player.position];
    const stats = [
        { value: player.goals, label: "GOL" },
        { value: player.assists, label: "ASI" },
        { value: player.games, label: "CONV" },
        { value: player.penalties, label: "PEN" },
        { value: player.doublePenalties, label: "DOB" },
        { value: player.directFreeKicks, label: "FD" },
    ];

    return (
        <div id={`player-${player.id}`} className="collect-stage">
            <div
                ref={ref}
                role="button"
                tabIndex={0}
                aria-pressed={flipped}
                aria-label={`Carta de ${player.name}. ${flipped ? "Muestra el partido a partido" : "Muestra los totales"}. Pulsa para darle la vuelta o arrástrala a un lado.`}
                className="collect-card"
                {...handlers}
            >
                <div className="collect-face collect-front">
                    <div className={`collect-face-in${player.video ? " has-video" : ""}`}>
                        <div className={player.video ? "collect-media collect-media-video" : "collect-media"}>
                            {player.video
                                ? <FramedVideo src={player.video} label={`vídeo de ${player.name}`} frame={CARD_VIDEO_FRAME} />
                                : player.photo
                                    ? <FramedPhoto src={player.photo} alt={`Foto de ${player.name}`} frame={CARD_PHOTO_FRAME} sizes="320px" />
                                    : <span className="collect-initials">{initials(player.name)}</span>}
                        </div>
                        <div className="collect-corner">
                            <span className="collect-number">{player.number ?? "—"}</span>
                            {positionCode ? <span className="collect-position">{positionCode}</span> : null}
                        </div>
                        <Image src="/fotos/escudo-256.png" alt="" width={56} height={56} className="collect-crest" draggable={false} />
                        <div className="collect-badges">
                            {katsuRounds.length ? <span className="collect-badge" title={`Jugador KATSU ${katsuRounds.length} ${katsuRounds.length === 1 ? "vez" : "veces"}`}><Star size={11} fill="currentColor" />{katsuRounds.length}</span> : null}
                            {player.injured ? <span className="collect-badge collect-badge-injured" title="Lesionado"><Cross size={14} strokeWidth={3} /></span> : null}
                        </div>
                        <div className="collect-plate">
                            <p className="collect-name">{player.name}</p>
                            <span className="collect-rule" />
                            <div className="collect-stats">
                                {stats.map((stat) => <p key={stat.label}><b>{stat.value}</b><span>{stat.label}</span></p>)}
                            </div>
                            <div className="collect-foot">
                                <span>{player.position}</span>
                                <span>{player.yellowCards} A · {player.redCards} R</span>
                            </div>
                        </div>
                        <CardShine />
                    </div>
                </div>

                <div className="collect-face collect-back">
                    <div className="collect-face-in collect-back-in">
                        <div className="collect-back-head">
                            <b>{player.name}</b>
                            <span>#{player.number ?? "—"}</span>
                        </div>
                        <p className="collect-back-title">Por jornada{matches.length ? <> · <i className="is-goals">Goles</i> <i className="is-assists">Asist.</i></> : null}{katsuRounds.length ? " · ★ KATSU" : ""}</p>
                        {matches.length ? (
                            <div>
                                <div className="collect-bars">
                                    {matches.map((match) => (
                                        <span key={match.jornada} className={katsuRounds.includes(match.jornada) ? "is-katsu" : ""} style={{ height: `${Math.max(4, (contributions(match) / maxContributions) * 100)}%` }} title={`${match.label}: ${match.goals} goles, ${match.assists} asistencias`}>
                                            {match.assists ? <i className="is-assists" style={{ flexGrow: match.assists }} /> : null}
                                            <i className="is-goals" style={{ flexGrow: Math.max(match.goals, contributions(match) ? 0 : 1) }} />
                                        </span>
                                    ))}
                                </div>
                                <div className={`collect-bars-axis${matches.length > 12 ? " is-ends" : ""}`}>
                                    {matches.length <= 12
                                        ? matches.map((match) => <span key={match.jornada}>J{match.jornada}</span>)
                                        : <><span>J{matches[0].jornada}</span><span>J{matches.at(-1)?.jornada}</span></>}
                                </div>
                            </div>
                        ) : <p className="collect-empty">Todavía no hay estadísticas por partido.</p>}
                        <dl className="collect-summary">
                            {summary.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
                        </dl>
                        {player.injured ? <p className="collect-injury"><Cross size={12} strokeWidth={3} /> {player.injuryDescription || "Lesionado"}</p> : null}
                        <Image src="/fotos/escudo-256.png" alt="" width={40} height={40} className="collect-back-crest" draggable={false} />
                        <CardShine />
                    </div>
                </div>
            </div>
        </div>
    );
}

// Detalle completo de cada partido, debajo de la carta.
export function PlayerMatchDetail({ player }: { player: Player }) {
    if (!player.matchStats?.length) return null;
    return (
        <details className="mx-auto mt-4 w-full max-w-[320px] border border-[var(--line)] bg-black/85 px-3 py-3">
            <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--lime)]">Detalle por partido</summary>
            <table className="collect-detail mt-3">
                <thead>
                    <tr>
                        <th scope="col">Partido</th>
                        <th scope="col" title="Goles">G</th>
                        <th scope="col" title="Asistencias">A</th>
                        <th scope="col" title="Penaltis marcados/tirados">PEN</th>
                        <th scope="col" title="Dobles penaltis marcados/tirados">DOB</th>
                        <th scope="col" title="Faltas directas marcadas">FD</th>
                        <th scope="col" title="Tarjetas">TJ</th>
                    </tr>
                </thead>
                <tbody>
                    {player.matchStats.map((match) => (
                        <tr key={match.jornada}>
                            <th scope="row" title={match.label}><b>J{match.jornada}</b><span>{match.opponent}</span></th>
                            <td className={match.goals ? "is-on" : ""}>{match.goals}</td>
                            <td className={match.assists ? "is-on" : ""}>{match.assists}</td>
                            <td>{match.penalties}</td>
                            <td>{match.doublePenalties}</td>
                            <td>{match.directFreeKicks}</td>
                            <td>
                                {match.yellowCards ? <i className="is-yellow" title="Amarillas">{match.yellowCards}</i> : null}
                                {match.redCards ? <i className="is-red" title="Rojas">{match.redCards}</i> : null}
                                {match.yellowCards || match.redCards ? null : "—"}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </details>
    );
}
