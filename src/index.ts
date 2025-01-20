
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let width: number;
let height: number;

let debug: boolean = true;

const WorldZoom = 20;

let editorMode = false;
let gridSize = WorldZoom;

const frameWindow = 1000;
let   frameRateBuffer: number[] = [];

let lastT: number = 0;

let gameStop = false;

const pressedKeys: { [key in typeof KeyMap[keyof typeof KeyMap]]?: true | undefined } = {};

let mouseX: number;
let mouseY: number;

let clickX: number | undefined;
let clickY: number | undefined;

const isMac = /Mac/.test(navigator.platform);

const KeyMap = {
    F1:           'F1',
    F2:           'F2',
    F3:           'F3',
    F4:           'F4',
    F5:           'F5',
    F6:           'F6',
    F7:           'F7',
    F8:           'F8',
    F9:           'F9',
    F10:          'F10',
    F11:          'F11',
    F12:          'F12',

    Digit1:       '1',
    Digit2:       '2',
    Digit3:       '3',
    Digit4:       '4',
    Digit5:       '5',
    Digit6:       '6',
    Digit7:       '7',
    Digit8:       '8',
    Digit9:       '9',
    Digit0:       '0',

    KeyA:         'A',
    KeyB:         'B',
    KeyC:         'C',
    KeyD:         'D',
    KeyE:         'E',
    KeyF:         'F',
    KeyG:         'G',
    KeyH:         'H',
    KeyI:         'I',
    KeyJ:         'J',
    KeyK:         'K',
    KeyL:         'L',
    KeyM:         'M',
    KeyN:         'N',
    KeyO:         'O',
    KeyP:         'P',
    KeyQ:         'Q',
    KeyR:         'R',
    KeyS:         'S',
    KeyT:         'T',
    KeyU:         'U',
    KeyV:         'V',
    KeyW:         'W',
    KeyX:         'X',
    KeyY:         'Y',
    KeyZ:         'Z',

    ShiftLeft:    'SHIFT',
    ShiftRight:   'SHIFT',
    ControlLeft:  'CTRL',
    ControlRight: 'CTRL',
    AltLeft:      'ALT',
    AltRight:     'ALT',
    MetaLeft:     'META',
    MetaRight:    'META',

    Escape:       'ESC',
    Tab:          'TAB',
    Backspace:    'BACKSPACE',
    Delete:       'DELETE',
    Enter:        'ENTER',
    CapsLock:     'CAPSLOCK',
    Space:        'SPACE',

    ArrowLeft:    'LEFT',
    ArrowRight:   'RIGHT',
    ArrowUp:      'UP',
    ArrowDown:    'DOWN',

    Minus:        '-',
    Equal:        '=',
    BracketLeft:  '[',
    BracketRight: ']',
    Semicolon:    ';',
    Quote:        '\'',
    Backslash:    '\\',
    Backquote:    '`',
    Comma:        ',',
    Period:       '.',
    Slash:        '/',
} as const;

let KbShortcuts = parseShortcuts(new Map([
    [toggleEditor, isMac ? 'META + E' : 'CTRL + E'],
    [resetZoom,    isMac ? 'META + 0' : 'CTRL + 0'],
    [toggleDebug,  'D'],
    [toggleRun,    'S'],
] as const));

window.onload = setup;


function setup() {
    canvas = document.getElementById('myCanvas')! as HTMLCanvasElement;

    const ctx0 = canvas.getContext('2d');
    if (ctx0 === null) {
        // Cannot initialise the context, show show the banner message and exit
        document.getElementById('cannotInitBanner')!.style.display = 'initial';
        return;
    }

    ctx = ctx0;

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

    canvas.addEventListener('wheel', e => {
        gridSize = clamp(gridSize + (e.deltaY > 0 ? 1 : -1), 5, 100);
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

function toggleDebug() {
    debug = !debug;
}

function toggleRun() {
    gameStop = !gameStop;
    !gameStop && window.requestAnimationFrame(draw);
}

function resetZoom() {
    gridSize = WorldZoom;
}

type Falsy = false | 0 | '' | null | undefined;

// this is a type predicate - if x is `truthy`, then it's T
const isTruthy = <T>(x: T | Falsy): x is T => !!x;

function parseShortcuts(m: Map<() => void, string>): Map<string, () => void> {
    const prio = [ 'META', 'CTRL', 'ALT', 'SHIFT' ];

    const entries = [... m.entries()].map(([handler, shortcut]) => {
        const fixed = shortcut
            .toUpperCase()
            .split(/\s*\+\s*/g)
            .sort(x => {
                const idx = prio.indexOf(x);
                return idx !== -1 ? idx : x.charCodeAt(0);
            })
            .join('+');

        return [fixed, handler] as const;
    });

    return new Map(entries);
}

function clamp(x: number, min: number, max: number) {
    return Math.max(min, Math.min(x, max));
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

function toggleEditor() {
    editorMode = !editorMode;
    document.getElementById('sidebar')!.style.display = editorMode ? 'initial' : 'none';
    resize();
}

function drawDebug() {
    ctx.fillStyle = 'darkred';
    ctx.font = '10px monospace';

    const fps = frameRateBuffer.length / frameWindow * 1000 | 0;
    let min, max;
    if (frameRateBuffer.length) {
        max = frameRateBuffer.reduce((x, y) => x > y ? x : y);
        min = frameRateBuffer.reduce((x, y) => x < y ? x : y);
    }

    const keys = Object.keys(pressedKeys);

    const msg = [
        `w:${width} h:${height} fps:${fps}`,
        `min:${min?.toFixed(2)} max:${max?.toFixed(2)}`,
        `zoom:${gridSize}`,
        `x:${mouseX} y:${mouseY}`,

        clickX && `cx:${clickX} cy:${clickY}`,

        keys.length && `keys:${keys.join(', ')}`
    ].filter(isTruthy);

    for (let i = 0; i < msg.length; ++i) {
        ctx.fillText(msg[i], width - 130, (i + 1) * 10);
    }

    // const dims = ctx.measureText(msg);
    // ctx.fillText(msg, width - 10 - dims.width, height - dims.fontBoundingBoxAscent);
}

function updateFrameStats(dt: number) {
    frameRateBuffer.push(dt);
    const [frames] = frameRateBuffer.reduceRight(([fs, sum], x) => x + sum < frameWindow ? [fs + 1, x + sum] : [fs, frameWindow], [0, 0]);
    frameRateBuffer.splice(0, frameRateBuffer.length - frames);
}

function draw(t: number) {
    if (editorMode) {
        drawEditor();
    } else {
        drawGame();
    }

    const dt = t - lastT;
    lastT = t;

    updateFrameStats(dt);
    debug && drawDebug();

    if (!gameStop) {
        window.requestAnimationFrame(draw);
    }
}

function drawGame() {
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = 'darkred';
    ctx.font = '10px Arial';
    ctx.fillText('High DPI Canvas!', 10, 20);
}

function drawEditor() {
    ctx.clearRect(0, 0, width, height);

    // Set line properties
    ctx.strokeStyle = '#D0E7FF';
    ctx.lineWidth = 1;

    // Draw vertical grid lines
    for (let x = gridSize; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }

    // Draw horizontal grid lines
    for (let y = gridSize; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }

    if (clickX !== undefined) {
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#34495E';
        ctx.strokeRect(clickX, clickY!, mouseX - clickX, mouseY - clickY!);
    }
}
