import { redirect } from "next/navigation";
import { getActiveCompetition } from "@/lib/competition-data";
import { competitionPath, isTeamSection } from "@/lib/competition-paths";

// /equipo y sus antiguas subrutas llevan siempre a la competición en curso.
// Lo usan la portada y el icono de la web guardada en el móvil.
export default async function TeamRedirect({ params }: { params: Promise<{ ruta?: string[] }> }) {
    const [first, id] = (await params).ruta ?? [];
    if ((first === "partido" || first === "jugador" || first === "katsu") && id) redirect(`/${first}/${id}`);
    const competition = await getActiveCompetition();
    redirect(competitionPath(competition, first && isTeamSection(first) ? first : undefined));
}
