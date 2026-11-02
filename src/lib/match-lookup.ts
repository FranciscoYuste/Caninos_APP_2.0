import { cache } from "react";
import { findCompetitionByScope } from "@/lib/competition-data";
import { getCompetitionData } from "@/lib/competition-page";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Un partido del Bayern con su competición y los datos de esa competición (para páginas de detalle).
export const findMatchContext = cache(async (id: string) => {
    if (!UUID_PATTERN.test(id)) return null;
    const supabase = await createSupabaseServerClient();
    const { data: scope, error } = await supabase.from("partidos").select("temporada,fase,grupo").eq("id", id).maybeSingle();
    if (error) {
        console.error("Could not look up match competition", error);
        return null;
    }
    if (!scope) return null;
    const competition = await findCompetitionByScope(scope.temporada, scope.fase, scope.grupo);
    if (!competition) return null;
    const data = await getCompetitionData(competition);
    const match = data?.results.find((item) => item.key === id);
    if (!data || !match) return null;
    return {
        competition,
        match,
        katsu: data.katsuCards.find((card) => card.key === id),
        otherMatches: data.roundMatches.filter((item) => item.jornada === match.jornada && item.key !== match.key),
    };
});
