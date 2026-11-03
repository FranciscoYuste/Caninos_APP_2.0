// Encuadre común para las fotos y vídeos de las cartas. Cada fichero llega con un zoom distinto
// (unos grabados más cerca, otros más verticales), así que se mide la silueta del jugador y se
// coloca el medio para que la cabeza tenga siempre el mismo ancho y la misma altura en la carta.

// Silueta medida, en fracciones del ancho/alto del medio.
export type Subject = {
    top: number;       // coronilla
    headWidth: number; // parte más ancha de la cabeza
    centerX: number;   // centro de la cabeza
};

// Dónde debe quedar la cabeza, en fracciones de la caja que contiene el medio.
export type FrameTarget = {
    headWidth: number;
    top: number;
    centerX: number;
};

// Carta del jugador: el vídeo ocupa toda la parte alta; la foto va en su hueco a la derecha del dorsal.
export const CARD_VIDEO_FRAME: FrameTarget = { headWidth: 0.32, top: 0.1, centerX: 0.55 };
export const CARD_PHOTO_FRAME: FrameTarget = { headWidth: 0.29, top: 0.06, centerX: 0.5 };
export const KATSU_PHOTO_FRAME: FrameTarget = { headWidth: 0.285, top: 0.06, centerX: 0.5 };

const SAMPLE_WIDTH = 120;

// Busca la silueta en los píxeles RGBA de un fotograma. Las fotos son recortes con fondo
// transparente y los vídeos tienen fondo negro: se usa el alfa o el brillo según el caso.
export function analyzeSilhouette(data: Uint8ClampedArray, width: number, height: number): Subject | null {
    let clear = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] < 128) clear++;
    const useAlpha = clear > width * height * 0.05;

    const spans: Array<[number, number] | null> = [];
    for (let y = 0; y < height; y++) {
        let left = -1;
        let right = -1;
        let count = 0;
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const on = useAlpha ? data[i + 3] > 128 : data[i] + data[i + 1] + data[i + 2] > 75;
            if (!on) continue;
            count++;
            if (left < 0) left = x;
            right = x;
        }
        spans.push(count >= width * 0.03 ? [left, right] : null);
    }
    const spanWidth = (y: number) => {
        const span = spans[y];
        return span ? span[1] - span[0] + 1 : 0;
    };

    // Coronilla: primera fila con contenido que no sea ruido suelto
    const top = spans.findIndex((span, y) => span && spans[y + 1] && spans[y + 2]);
    if (top < 0) return null;

    // Los hombros empiezan donde la silueta se acerca al ancho del cuerpo; la cabeza está por encima
    const body = Math.max(...spans.map((_, y) => spanWidth(y)));
    let shoulders = top;
    while (shoulders < height && spanWidth(shoulders) < body * 0.75) shoulders++;

    let widest = top;
    let centerSum = 0;
    let rows = 0;
    for (let y = top; y < top + (shoulders - top) / 2; y++) {
        const span = spans[y];
        if (!span) continue;
        if (spanWidth(y) > spanWidth(widest)) widest = y;
        centerSum += (span[0] + span[1]) / 2;
        rows++;
    }

    const subject = { top: top / height, headWidth: spanWidth(widest) / width, centerX: rows ? centerSum / rows / width : 0.5 };
    // Una medida absurda (fotograma negro, fondo sin recortar...) se descarta y se usa el ajuste por defecto
    if (subject.top > 0.6 || subject.headWidth < 0.1 || subject.headWidth > 0.8) return null;
    return subject;
}

// Mide la silueta de una imagen o del fotograma actual de un vídeo. Devuelve null si no se
// puede leer (sin CORS, fotograma vacío...).
export function measureSubject(source: CanvasImageSource, width: number, height: number): Subject | null {
    if (!width || !height) return null;
    const sampleHeight = Math.max(1, Math.round((SAMPLE_WIDTH * height) / width));
    const canvas = document.createElement("canvas");
    canvas.width = SAMPLE_WIDTH;
    canvas.height = sampleHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    try {
        context.drawImage(source, 0, 0, SAMPLE_WIDTH, sampleHeight);
        return analyzeSilhouette(context.getImageData(0, 0, SAMPLE_WIDTH, sampleHeight).data, SAMPLE_WIDTH, sampleHeight);
    } catch {
        return null;
    }
}

export type FrameBox = { left: number; top: number; width: number; height: number };

// Posición y tamaño del medio (en fracciones de la caja) para llevar la cabeza al objetivo.
export function frameMedia(subject: Subject, media: { width: number; height: number }, box: { width: number; height: number }, target: FrameTarget): FrameBox | null {
    if (!media.width || !media.height || !box.width || !box.height) return null;
    // Escala respecto a ocupar el ancho de la caja, acotada por si la medida se ha ido
    const fitWidth = box.width / media.width;
    const scale = Math.min(fitWidth * 2, Math.max(fitWidth * 0.5, (target.headWidth * box.width) / (subject.headWidth * media.width)));
    const width = media.width * scale;
    const height = media.height * scale;

    let left = target.centerX * box.width - subject.centerX * width;
    // Si es más ancho que la caja, que no deje huecos a los lados
    if (width >= box.width) left = Math.min(0, Math.max(box.width - width, left));
    let top = target.top * box.height - subject.top * height;
    // Nunca deja hueco debajo del busto
    if (top + height < box.height) top = box.height - height;

    return { left: left / box.width, top: top / box.height, width: width / box.width, height: height / box.height };
}

// Cada fichero se mide una vez: en memoria y, si se puede, en el navegador (las URL cambian al resubir).
const memory = new Map<string, Subject>();
const STORAGE_PREFIX = "encuadre:";

export function readSubject(src: string): Subject | undefined {
    if (memory.has(src)) return memory.get(src);
    try {
        const stored = localStorage.getItem(STORAGE_PREFIX + src);
        if (stored) {
            const subject = JSON.parse(stored) as Subject;
            memory.set(src, subject);
            return subject;
        }
    } catch {
        // Sin almacenamiento: se vuelve a medir
    }
    return undefined;
}

export function saveSubject(src: string, subject: Subject) {
    memory.set(src, subject);
    try {
        localStorage.setItem(STORAGE_PREFIX + src, JSON.stringify(subject));
    } catch {
        // Sin almacenamiento: queda en memoria
    }
}
