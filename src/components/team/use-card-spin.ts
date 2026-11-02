"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

type SpinState = {
    rotY: number;
    rotX: number;
    target: number;
    vel: number;
    dragging: boolean;
    moved: boolean;
    startX: number;
    startY: number;
    startRot: number;
    lastX: number;
    lastT: number;
    idle: number;
};

// Giro de una carta con el dedo o el ratón. Arrastrarla a los lados la gira; al soltarla se queda
// en la cara más cercana (con inercia) y un toque le da la vuelta. En reposo se balancea un poco.
// Escribe el giro directamente en el estilo del elemento (sin renders por fotograma) y expone
// --shine, la posición de la franja de luz del holográfico, que depende del giro y no del dedo.
export function useCardSpin<T extends HTMLElement>() {
    const ref = useRef<T>(null);
    const [flipped, setFlipped] = useState(false);
    const spin = useRef<SpinState>({ rotY: 0, rotX: 0, target: 0, vel: 0, dragging: false, moved: false, startX: 0, startY: 0, startRot: 0, lastX: 0, lastT: 0, idle: 0 });

    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const started = performance.now();
        let frame = 0;
        const tick = (now: number) => {
            const state = spin.current;
            let showY = state.rotY;
            let showX = state.rotX;
            if (!state.dragging) {
                state.rotY += (state.target - state.rotY) * 0.12;
                state.rotX -= state.rotX * 0.12;
                state.idle += 1;
                const sway = reduced ? 0 : Math.min(1, state.idle / 90);
                const seconds = (now - started) / 1000;
                showY = state.rotY + Math.sin(seconds * 1.1) * 9 * sway;
                showX = state.rotX + Math.sin(seconds * 0.8) * 4 * sway;
            }
            element.style.transform = `rotateX(${showX}deg) rotateY(${showY}deg)`;
            element.style.setProperty("--shine", `${50 + Math.sin((showY * Math.PI / 180) * 2.2) * 70 + showX * 2}%`);
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, []);

    const settle = useCallback((target: number) => {
        spin.current.target = target;
        spin.current.idle = 0;
        setFlipped(Math.round(target / 180) % 2 !== 0);
    }, []);

    const flip = useCallback(() => settle(Math.round(spin.current.rotY / 180) * 180 + 180), [settle]);

    const onPointerDown = useCallback((event: PointerEvent<T>) => {
        const state = spin.current;
        Object.assign(state, { dragging: true, moved: false, startX: event.clientX, startY: event.clientY, lastX: event.clientX, startRot: state.rotY, lastT: performance.now(), vel: 0 });
        event.currentTarget.setPointerCapture(event.pointerId);
    }, []);

    const onPointerMove = useCallback((event: PointerEvent<T>) => {
        const state = spin.current;
        if (!state.dragging) return;
        const dx = event.clientX - state.startX;
        const dy = event.clientY - state.startY;
        if (Math.abs(dx) + Math.abs(dy) > 6) state.moved = true;
        state.rotY = state.startRot + dx * 0.7;
        // Con el dedo solo se gira a los lados: deslizar arriba o abajo mueve la página.
        state.rotX = event.pointerType === "mouse" ? Math.max(-18, Math.min(18, -dy * 0.25)) : 0;
        const now = performance.now();
        state.vel = ((event.clientX - state.lastX) / Math.max(1, now - state.lastT)) * 0.7 * 16;
        state.lastX = event.clientX;
        state.lastT = now;
    }, []);

    const onPointerUp = useCallback(() => {
        const state = spin.current;
        if (!state.dragging) return;
        state.dragging = false;
        if (state.moved) settle(Math.round((state.rotY + state.vel * 6) / 180) * 180);
        else flip();
    }, [flip, settle]);

    const onPointerCancel = useCallback(() => {
        const state = spin.current;
        state.dragging = false;
        settle(Math.round(state.rotY / 180) * 180);
    }, [settle]);

    const onKeyDown = useCallback((event: KeyboardEvent<T>) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        flip();
    }, [flip]);

    return { ref, flipped, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onKeyDown } };
}
