import {
    AmbientLight,
    CylinderGeometry,
    DirectionalLight,
    Group,
    Mesh,
    MeshBasicMaterial,
    MeshStandardMaterial,
    PerspectiveCamera,
    PMREMGenerator,
    PointLight,
    Scene,
    SRGBColorSpace,
    TextureLoader,
    WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export type CoinPose = { size: number; centerX: number; centerY: number; spin: number; tilt: number; opacity: number };

const FOV = 35;
const CAMERA_Z = 10;
const RADIUS = 1;
const THICKNESS = 0.09;
const FACE_ROTATION = -Math.PI / 2;

// Moneda 3D del escudo para la intro (three.js sin React, se carga aparte solo en la portada).
// La pose se da en píxeles de pantalla (tamaño y centro) para que coincida exactamente con el
// hueco de la máscara que descubre la web.
export async function createIntroCoin(canvas: HTMLCanvasElement, crestUrl: string) {
    const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = SRGBColorSpace;

    const scene = new Scene();
    const pmrem = new PMREMGenerator(renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = environment;

    const camera = new PerspectiveCamera(FOV, 1, 0.05, 100);
    camera.position.set(0, 0, CAMERA_Z);

    const face = await new TextureLoader().loadAsync(crestUrl);
    face.colorSpace = SRGBColorSpace;
    face.anisotropy = renderer.capabilities.getMaxAnisotropy();
    // Las tapas del cilindro reparten la imagen girada 90°: se compensa para que el escudo salga derecho.
    face.center.set(0.5, 0.5);
    face.rotation = FACE_ROTATION;
    // Reverso: la misma imagen; por cómo se mapea la tapa inferior, vista por detrás ya sale sin espejo.
    const back = face.clone();
    back.needsUpdate = true;

    // Canto metálico con luces reales; las caras sin iluminación para conservar los colores exactos del
    // escudo, con un sombreado simulado según el ángulo (ver render).
    const edge = new MeshStandardMaterial({ color: 0xd4af37, metalness: 1, roughness: 0.28, transparent: true });
    const front = new MeshBasicMaterial({ map: face, transparent: true });
    const rear = new MeshBasicMaterial({ map: back, color: 0x555555, transparent: true });
    const geometry = new CylinderGeometry(RADIUS, RADIUS, THICKNESS, 128, 1);
    // El cilindro se tumba para que su anverso mire a la cámara.
    const coin = new Mesh(geometry, [edge, front, rear]);
    coin.rotation.x = -Math.PI / 2;
    const pivot = new Group();
    pivot.add(coin);
    scene.add(pivot);

    scene.add(new AmbientLight(0xffffff, 0.5));
    const key = new DirectionalLight(0xfff1c9, 1.6);
    key.position.set(-3, 4, 6);
    scene.add(key);
    // Luz fría desde el fondo del túnel: perfila el canto cuando la moneda gira.
    const rim = new PointLight(0xbfe6ff, 30, 30);
    rim.position.set(0, 3, -4);
    scene.add(rim);

    let width = 0, height = 0;
    const tanHalf = Math.tan((FOV * Math.PI) / 360);

    return {
        render({ size, centerX, centerY, spin, tilt, opacity }: CoinPose) {
            const vw = window.innerWidth, vh = window.innerHeight;
            if (vw !== width || vh !== height) {
                width = vw;
                height = vh;
                renderer.setSize(vw, vh, false);
                camera.aspect = vw / vh;
                camera.updateProjectionMatrix();
            }
            // Distancia a la que el diámetro de la moneda ocupa "size" píxeles en pantalla.
            const distance = (RADIUS * vh) / (size * tanHalf);
            const unitsPerPixel = (2 * distance * tanHalf) / vh;
            const x = (centerX - vw / 2) * unitsPerPixel, y = -(centerY - vh / 2) * unitsPerPixel;
            pivot.position.set(x, y, CAMERA_Z - distance);
            // Con giro 0 la cámara ve la tapa superior del cilindro (el anverso), de ahí la media vuelta.
            // Fuera del centro se orienta hacia la cámara para que de frente coincida con el escudo plano.
            pivot.rotation.set(tilt + Math.atan2(y, distance), ((spin + 180) * Math.PI) / 180 + Math.atan2(-x, distance), 0);
            edge.opacity = front.opacity = rear.opacity = opacity;
            // De frente, color real; de canto, más oscuro, como si la luz dejara de darle de lleno.
            const facing = Math.abs(Math.cos((spin * Math.PI) / 180)) * Math.cos(tilt);
            front.color.setScalar(0.55 + 0.45 * facing);
            rear.color.setScalar((0.55 + 0.45 * facing) * 0.35);
            renderer.render(scene, camera);
        },
        dispose() {
            geometry.dispose();
            [edge, front, rear].forEach((material) => material.dispose());
            face.dispose();
            back.dispose();
            environment.dispose();
            pmrem.dispose();
            renderer.dispose();
        },
    };
}

export type IntroCoin = Awaited<ReturnType<typeof createIntroCoin>>;
