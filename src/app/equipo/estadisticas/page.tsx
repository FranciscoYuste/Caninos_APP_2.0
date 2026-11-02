import { StatsSection } from "@/components/team/stats-section";
import { pageMetadata } from "@/lib/metadata";
import { getTeamData } from "@/lib/team-data";

export const metadata = pageMetadata("Estadísticas", "Goles, asistencias, tarjetas y convocatorias de cada jugador.");

export default async function StatsPage() {
    const data = await getTeamData();
    return <StatsSection squad={data?.squad ?? []} />;
}
