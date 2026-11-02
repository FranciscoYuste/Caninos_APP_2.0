import { describe, expect, it } from "vitest";
import { isMediaKind, mediaExtension, mediaPrefix } from "@/lib/media";

const ID = "11111111-1111-4111-8111-111111111111";

describe("media", () => {
    it("guarda cada tipo en su carpeta gestionada, nunca en la raíz del bucket", () => {
        expect(mediaPrefix("foto_jugador", ID)).toBe(`jugadores/${ID}/foto-`);
        expect(mediaPrefix("video_jugador", ID)).toBe(`jugadores/${ID}/video-`);
        expect(mediaPrefix("foto_convocatoria", ID)).toBe(`convocatorias/${ID}-`);
    });

    it("solo acepta los formatos que genera o admite el subidor", () => {
        expect(mediaExtension("foto_jugador", "image/png")).toBe("png");
        expect(mediaExtension("foto_jugador", "image/jpeg")).toBeNull();
        expect(mediaExtension("foto_convocatoria", "image/jpeg")).toBe("jpg");
        expect(mediaExtension("video_jugador", "video/quicktime")).toBe("mov");
        expect(mediaExtension("video_jugador", "image/png")).toBeNull();
    });

    it("rechaza tipos desconocidos", () => {
        expect(isMediaKind("foto_jugador")).toBe(true);
        expect(isMediaKind("toString")).toBe(false);
        expect(isMediaKind(undefined)).toBe(false);
    });
});
