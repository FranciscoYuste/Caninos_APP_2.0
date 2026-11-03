import { describe, expect, it } from "vitest";
import { analyzeSilhouette, frameMedia, type FrameTarget } from "@/lib/media-framing";

// Dibuja una silueta simple (cabeza + hombros) sobre fondo negro o transparente.
function bust(width: number, height: number, transparent: boolean) {
    const data = new Uint8ClampedArray(width * height * 4);
    const fill = (x0: number, y0: number, x1: number, y1: number) => {
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) data.set([200, 40, 40, 255], (y * width + x) * 4);
    };
    if (!transparent) for (let i = 3; i < data.length; i += 4) data[i] = 255;
    fill(40, 20, 80, 60);   // cabeza: 40 px de ancho, coronilla en y=20, centrada en x=60
    fill(50, 60, 70, 70);   // cuello
    fill(0, 70, 120, height); // hombros y torso hasta los bordes
    return data;
}

describe("analyzeSilhouette", () => {
    it.each([["vídeo con fondo negro", false], ["foto recortada", true]])("mide la cabeza en un %s", (_, transparent) => {
        const subject = analyzeSilhouette(bust(120, 150, transparent), 120, 150);
        expect(subject).not.toBeNull();
        expect(subject!.top).toBeCloseTo(20 / 150, 3);
        expect(subject!.headWidth).toBeCloseTo(40 / 120, 3);
        expect(subject!.centerX).toBeCloseTo(59.5 / 120, 2);
    });

    it("descarta un fotograma vacío", () => {
        const empty = new Uint8ClampedArray(120 * 150 * 4).fill(0).map((value, i) => (i % 4 === 3 ? 255 : value));
        expect(analyzeSilhouette(empty, 120, 150)).toBeNull();
    });
});

describe("frameMedia", () => {
    const target: FrameTarget = { headWidth: 0.3, top: 0.1, centerX: 0.5 };

    it("lleva la cabeza al ancho, altura y centro del objetivo", () => {
        const subject = { top: 0.2, headWidth: 0.4, centerX: 0.5 };
        const frame = frameMedia(subject, { width: 500, height: 1000 }, { width: 300, height: 350 }, target)!;
        const width = frame.width * 300;
        expect(subject.headWidth * width).toBeCloseTo(0.3 * 300);
        expect(frame.top * 350 + subject.top * frame.height * 350).toBeCloseTo(0.1 * 350);
        expect(frame.left * 300 + subject.centerX * width).toBeCloseTo(0.5 * 300);
    });

    it("no deja hueco debajo del busto", () => {
        const frame = frameMedia({ top: 0, headWidth: 0.6, centerX: 0.5 }, { width: 400, height: 400 }, { width: 300, height: 350 }, target)!;
        expect(frame.top + frame.height).toBeGreaterThanOrEqual(1);
    });

    it("no deja huecos laterales si el medio es más ancho que la caja", () => {
        const frame = frameMedia({ top: 0.1, headWidth: 0.1, centerX: 0.1 }, { width: 1000, height: 1000 }, { width: 300, height: 350 }, target)!;
        expect(frame.left).toBeLessThanOrEqual(0);
        expect(frame.left + frame.width).toBeGreaterThanOrEqual(1);
    });
});
