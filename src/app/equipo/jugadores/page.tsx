import { PlayersSection } from "@/components/team/players-section";
import { pageMetadata } from "@/lib/metadata";
import { getEmptyMessage, getTeamData } from "@/lib/team-data";

export const metadata = pageMetadata("Jugadores", "La plantilla en el campo: elige un jugador para ver su ficha y sus estadísticas.");

export default async function PlayersPage() {
    const data = await getTeamData();
    return <PlayersSection squad={data?.squad ?? []} emptyMessage={getEmptyMessage(data)} />;
}
