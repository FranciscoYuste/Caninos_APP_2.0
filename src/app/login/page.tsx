"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
    const router = useRouter();
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setBusy(true);
        setMessage("");
        const form = new FormData(event.currentTarget);
        const email = String(form.get("email"));
        const password = String(form.get("password"));
        const supabase = createSupabaseBrowserClient();
        const result = await supabase.auth.signInWithPassword({ email, password });
        setBusy(false);
        if (result.error) { setMessage(result.error.message); return; }
        const requestedPath = new URLSearchParams(window.location.search).get("next");
        const destination = requestedPath?.startsWith("/") && !requestedPath.startsWith("//") && !requestedPath.includes("\\")
            ? requestedPath
            : "/admin";
        router.push(destination);
        router.refresh();
    }

    return <main className="grid min-h-screen place-items-center px-5 py-12"><div className="w-full max-w-md border border-[var(--line)] bg-[var(--panel)] p-7 sm:p-9"><Link href="/" className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--lime)]">Bayern D.L.Caninos</Link><h1 className="mt-8 text-3xl font-black uppercase">Acceso administrador</h1><p className="mt-2 text-sm text-[var(--muted)]">Inicia sesión para actualizar jornadas, goles, estadísticas y clasificación. El contenido del equipo es público.</p>
        <form onSubmit={submit} className="mt-7 space-y-4"><label className="block text-xs text-[var(--muted)]">Correo electrónico<input name="email" type="email" autoComplete="email" required className="mt-2 w-full border border-[var(--line)] bg-[var(--ink)] px-3 py-3 text-sm text-white outline-none focus:border-[var(--lime)]" /></label><label className="block text-xs text-[var(--muted)]">Contraseña<input name="password" type="password" autoComplete="current-password" required className="mt-2 w-full border border-[var(--line)] bg-[var(--ink)] px-3 py-3 text-sm text-white outline-none focus:border-[var(--lime)]" /></label>{message && <p role="status" className="text-sm text-[var(--lime)]">{message}</p>}<button disabled={busy} className="w-full bg-[var(--lime)] px-4 py-3 text-xs font-black uppercase text-[var(--ink)] disabled:opacity-60">{busy ? "Un momento..." : "Iniciar sesión"}</button></form>
        <Link href="/equipo" className="mt-5 inline-block text-xs text-[var(--muted)] underline underline-offset-4">Volver al contenido público</Link>
    </div></main>;
}