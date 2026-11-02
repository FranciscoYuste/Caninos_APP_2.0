import { IntroLanding } from "@/components/intro-landing";
import { getActiveCompetition } from "@/lib/competition-data";

export default async function HomePage() {
    const competition = await getActiveCompetition();
    return <IntroLanding season={competition.season} />;
}
