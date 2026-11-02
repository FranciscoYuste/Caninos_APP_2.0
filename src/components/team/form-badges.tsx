import type { FormResult } from "@/lib/team-form";

const STYLES: Record<FormResult, string> = {
    V: "bg-emerald-500 text-[var(--ink)]",
    E: "bg-white/25 text-white",
    D: "bg-rose-600 text-white",
};
const LABELS: Record<FormResult, string> = { V: "victoria", E: "empate", D: "derrota" };

// Racha reciente: un cuadrado por partido, del más antiguo (izquierda) al más reciente.
// "sm" es la variante compacta que va bajo el nombre del equipo en la tabla del móvil.
export function FormBadges({ form, size = "md", className = "" }: { form: FormResult[]; size?: "sm" | "md"; className?: string }) {
    if (!form.length) return null;
    return (
        <span className={`flex gap-1 ${size === "sm" ? "gap-0.5" : ""} ${className}`} role="img" aria-label={`Últimos resultados: ${form.map((result) => LABELS[result]).join(", ")}`}>
            {form.map((result, index) => (
                <span key={index} aria-hidden="true" className={`grid place-items-center font-black leading-none ${size === "sm" ? "size-4 text-[10px]" : "size-[18px] text-[10px]"} ${STYLES[result]}`}>{result}</span>
            ))}
        </span>
    );
}
