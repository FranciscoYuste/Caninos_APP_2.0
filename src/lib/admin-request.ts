// POST JSON a una ruta /api/admin desde los formularios. Lanza un Error con el mensaje para el usuario.
export async function postAdmin<T = Record<string, unknown>>(url: string, body: unknown): Promise<T> {
    let response: Response;
    try {
        response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } catch {
        throw new Error("No se pudo conectar con el servidor.");
    }
    const result = await response.json().catch(() => ({})) as T & { error?: string };
    if (!response.ok) throw new Error(result.error ?? "No se pudieron guardar los cambios.");
    return result;
}
