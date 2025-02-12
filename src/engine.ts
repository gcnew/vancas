
import { Shortcut, KeyMap, normaliseShortcut } from './keyboard'

import { Falsy, clamp, isTruthy } from './util'

type GameObj = {
    draw: (dt: number) => void,
    setup: () => void,
    tearDown: () => void
}

let game: GameObj;
let drawGame: (dt: number) => void;

export let canvas: HTMLCanvasElement;
export let ctx: CanvasRenderingContext2D;
export let width: number;
export let height: number;

export let debug: boolean = true;

const frameWindow = 1000;
let   frameRateBuffer: number[] = [];

let lastT: number = 0;

let gameStop = false;

export const pressedKeys: { [key in typeof KeyMap[keyof typeof KeyMap]]?: true | undefined } = {};

export let mouseX: number;
export let mouseY: number;

export let clickX: number | undefined;
export let clickY: number | undefined;

export const isMac = /Mac/.test(navigator.platform);

let KbShortcuts: Map<string, () => void> = new Map();

export function setup() {
    canvas = document.getElementById('myCanvas')! as HTMLCanvasElement;

    ctx = canvas.getContext('2d')!;
    if (ctx === null) {
        // Cannot initialise the context, show the banner message and exit
        document.getElementById('cannotInitBanner')!.style.display = 'initial';
        return;
    }

    resize();

    window.onresize = resize;
    window.requestAnimationFrame(draw);

    window.addEventListener('keydown', keydownListener);
    window.addEventListener('keyup',   keyupListener);
    window.addEventListener('keydown', e => {
        // skip repeats
        if (e.repeat) {
            return;
        }

        const sigil = [
                e.metaKey  && 'META',
                e.ctrlKey  && 'CTRL',
                e.altKey   && 'ALT',
                e.shiftKey && 'SHIFT',
                KeyMap[e.code as keyof typeof KeyMap] || e.code
            ]
            .filter(isTruthy)
            .join('+');

        KbShortcuts.get(sigil)?.();
    });

    canvas.addEventListener('mousemove', e => {
        mouseX = e.pageX;
        mouseY = e.pageY;
    });

    canvas.addEventListener('mousedown', e => {
        clickX = e.offsetX;
        clickY = e.offsetY;
    });

    // listen on the window for mouse-up, otherwise the event is not received if clicked outside of the window or canvas
    window.addEventListener('mouseup', e => {
        clickX = undefined;
        clickY = undefined;
    });
}

export function setGameObject(newGame: GameObj) {
    game?.tearDown();
    game = newGame;
    game.setup();
    drawGame = game.draw;
    resize();
}

export function registerShortcuts(shortcuts: Shortcut[]) {
    for (const [fn, sc] of shortcuts) {
        const fixed = normaliseShortcut(sc);
        KbShortcuts.set(fixed, fn);
    }
}

export function removeShortcuts(shortcuts: Shortcut[]) {
    for (const [fn, sc] of shortcuts) {
        const fixed = normaliseShortcut(sc);
        KbShortcuts.delete(fixed);
    }
}

export function toggleDebug() {
    debug = !debug;
}

export function toggleRun() {
    gameStop = !gameStop;
    !gameStop && window.requestAnimationFrame(draw);
}

function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;

    // fix for high-dpi displays
    if (window.devicePixelRatio !== 1) {
        canvas.width = width * window.devicePixelRatio;
        canvas.height = height * window.devicePixelRatio;

        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
}

function keydownListener(e: KeyboardEvent) {
    const code = KeyMap[e.code as keyof typeof KeyMap] || e.code;

    // tab has a special meaning; if it is fired point-blank, we cancel the default behaviour
    // otherwise, the keyup event might never be received if the window loses focus
    if (e.code === 'Tab' && e.target === document.body) {
        e.preventDefault();
    }

    pressedKeys[code] = true;
}

function keyupListener(e: KeyboardEvent) {
    const code = KeyMap[e.code as keyof typeof KeyMap] || e.code;

    // when holding the meta (command) key, key-up events are not fired sans CapsLock
    // so we need to clear all pressed keys here
    if (isMac && code === 'META') {
        const keys = Object.keys(pressedKeys) as (keyof typeof pressedKeys)[];
        for (const k of keys) {
            if (k !== 'CAPSLOCK') {
                delete pressedKeys[k];
            }
        }
    }

    delete pressedKeys[code];
}

type DebugMsgFunc = () => string | Falsy

let DebugMessages: DebugMsgFunc[] = [

    () => {
        const fps = frameRateBuffer.length / frameWindow * 1000 | 0;
        return `w:${width} h:${height} fps:${fps}`;
    },

    () => {
        let min, max;
        if (frameRateBuffer.length) {
            max = frameRateBuffer.reduce((x, y) => x > y ? x : y);
            min = frameRateBuffer.reduce((x, y) => x < y ? x : y);
        }

        return `min:${min?.toFixed(2)} max:${max?.toFixed(2)}`;
    },

    () => {
        return `x:${mouseX} y:${mouseY}`;
    },

    () => {
        return clickX && `cx:${clickX} cy:${clickY}`;
    },

    () => {
        const keys = Object.keys(pressedKeys);

        return keys.length && `keys:${keys.join(', ')}`;
    }
];

export function addDebugMsg(f: DebugMsgFunc) {
    DebugMessages.push(f);
}

export function removeDebugMsg(f: DebugMsgFunc) {
    DebugMessages = DebugMessages.filter(x => x !== f)
}

function drawDebug() {
    ctx.fillStyle = 'darkred';
    ctx.font = '10px monospace';

    const msg = DebugMessages
        .map(f => f())
        .filter(isTruthy);

    for (let i = 0; i < msg.length; ++i) {
        // const dims = ctx.measureText(msg);
        // ctx.fillText(msg, width - 10 - dims.width, height - dims.fontBoundingBoxAscent);

        ctx.fillText(msg[i], width - 130, (i + 1) * 10);
    }
}

function updateFrameStats(dt: number) {
    frameRateBuffer.push(dt);
    const [frames] = frameRateBuffer.reduceRight(([fs, sum], x) => x + sum < frameWindow ? [fs + 1, x + sum] : [fs, frameWindow], [0, 0]);
    frameRateBuffer.splice(0, frameRateBuffer.length - frames);
}

function draw(t: number) {
    const dt = t - lastT;
    lastT = t;

    updateFrameStats(dt);

    drawGame(dt);
    debug && drawDebug();

    if (!gameStop) {
        window.requestAnimationFrame(draw);
    }
}
