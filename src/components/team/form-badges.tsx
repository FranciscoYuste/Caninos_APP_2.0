import type { FormResult } from "@/lib/team-form";

const STYLES: Record<FormResult, string> = {
    V: "bg-emerald-500 text-[var(--ink)]",
    E: "bg-white/25 text-white",
    D: "bg-rose-600 text-white",
};
const LABELS: Record<FormResult, string> = { V: "victoria", E: "empate", D: "derrota" };

// Racha reciente: un cuadrado por partido, del más antiguo (izquierda) al más reciente.
export function FormBadges({ form, className = "" }: { form: FormResult[]; className?: string }) {
    if (!form.length) return null;
    return (
        <span className={`inline-flex gap-1 ${className}`} role="img" aria-label={`Últimos resultados: ${form.map((result) => LABELS[result]).join(", ")}`}>
            {form.map((result, index) => (
                <span key={index} aria-hidden="true" className={`grid size-[18px] place-items-center text-[10px] font-black leading-none ${STYLES[result]}`}>{result}</span>
            ))}
        </span>
    );
}
