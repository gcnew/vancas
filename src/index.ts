
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let width: number;
let height: number;

let debug: boolean = true;

let editorMode = false;
let gridSize = 20;

const frameWindow = 1000;
let   frameRateBuffer: number[] = [];

let lastT: number = 0;

let gameStop = false;

const pressedKeys: { [key: string]: string } = {};

window.onload = setup;

let mouseX: number;
let mouseY: number;

let clickX: number | undefined;
let clickY: number | undefined;

// #A3C4FC
// #B7D8F4
// #D0E7FF
// #B0E0E6
// #C0D9E1

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
        if (e.code === 'KeyD' && !e.repeat) {
            debug = !debug;
        }

        if (e.code === 'KeyS' && !e.repeat) {
            gameStop = !gameStop;
            !gameStop && window.requestAnimationFrame(draw);
        }

        if (e.code === 'KeyE' && !e.repeat) {
            editorMode = !editorMode;
            toggleEditor();
        }
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

    canvas.addEventListener('mouseup', e => {
        clickX = undefined;
        clickY = undefined;
    });
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
    const code = e.altKey   ? 'ALT'   :
                 e.metaKey  ? 'META'  :
                 e.shiftKey ? 'SHIFT' :
                 e.code;

    pressedKeys[code] = code;
}

function keyupListener(e: KeyboardEvent) {
    const code = e.altKey   ? 'ALT'   :
                 e.metaKey  ? 'META'  :
                 e.shiftKey ? 'SHIFT' :
                 e.code;

    delete pressedKeys[code];
}

function toggleEditor() {
    document.getElementById('sidebar')!.style.display = editorMode ? 'inherit' : 'none';
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

    ctx.fillText(`w:${width} h:${height} fps:${fps}`, width - 130, 10);
    ctx.fillText(`min:${min?.toFixed(2)} max:${max?.toFixed(2)}`, width - 130, 20);

    ctx.fillText(`zoom:${gridSize}`, width - 130, 30);
    ctx.fillText(`x:${mouseX} y:${mouseY}`, width - 130, 40);
    ctx.fillText(`x:${clickX} y:${clickY}`, width - 130, 50);

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

    const colours = [ '#000080', '#4682B4', '#483D8B', '#7A9BF1', '#5A6D8E', '#3F75B8', '#4B8BBE', '#6A8BCD', '#7A9CDE' ];
    for (let i = 0; i < colours.length; ++i) {
        ctx.fillStyle = 'darkred';
        ctx.font = '10px Arial';
        ctx.fillText(colours[i], 50, 20 + i * 75);

        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = colours[i];
        ctx.strokeRect(50, 25 + i * 75, 200, 50);
    }

    if (clickX !== undefined) {
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#34495E';
        ctx.strokeRect(clickX, clickY!, mouseX - clickX, mouseY - clickY!);
    }
}
