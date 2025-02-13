
import {
    type VEvent,

    canvas, ctx, isMac,

    width, height, clickX, clickY, mouseX, mouseY,

    registerShortcuts, removeShortcuts, addDebugMsg, removeDebugMsg, listen, unlisten
} from './engine'

import { Shortcut } from './keyboard'
import { WorldZoom } from './game'

import { clamp } from './util'

let KbShortcuts: Shortcut[] = [
    [resetZoom,               isMac ? 'META + 0' : 'CTRL + 0'],
    [setEscape,               'ESC'],
    [() => setTool('line'),   'L'],
    [() => setTool('grab'),   'G']
];

let gridSize = WorldZoom;

type Tool = 'line' | 'pointer' | 'grab'
let tool: Tool = 'pointer';

type Objects = { kind: 'line', startX: number, startY: number, endX: number, endY: number, zoom: number, width: number }

let escape = false;
let objects: Objects[] = [];

let currentWidth = 2;

let dx = 0;
let dy = 0;

let tdx = 0;
let tdy = 0;

const ToolCursor = {
    line: 'crosshair',
    pointer: 'default',
    grab: 'grab'
};

export function setup() {
    canvas.addEventListener('wheel', zoomListener);

    document.getElementById('sidebar')!.style.display = 'initial';
    document.querySelector<HTMLElement>('.simple-tools')!.addEventListener('click', toolSelectionListener);

    listen('mouseup', commitToolAction);
    listen('mousedown', onMouseDown);

    registerShortcuts(KbShortcuts);

    addDebugMsg(dbgZoom);
    addDebugMsg(dbgWorldPos);
}

export function tearDown() {
    canvas.removeEventListener('wheel', zoomListener);

    document.getElementById('sidebar')!.style.display = 'none'
    document.querySelector<HTMLElement>('.simple-tools')!.removeEventListener('click', toolSelectionListener);

    unlisten('mouseup', commitToolAction);
    unlisten('mousedown', onMouseDown);

    removeShortcuts(KbShortcuts);
    removeDebugMsg(dbgZoom);
    removeDebugMsg(dbgWorldPos);

    setTool('pointer');
}

function toolSelectionListener(e: MouseEvent) {
    const tool = (e.target as HTMLElement).attributes.getNamedItem('data')!.value as Tool;
    setTool(tool);
}

function setTool(t: Tool) {
    tool = t;
    canvas.style.cursor = ToolCursor[tool];
}

function commitToolAction(evt: VEvent) {
    if (escape) {
        escape = false;
        return;
    }

    switch (tool) {
        case 'line': {
            objects.push({
                kind: 'line',
                startX: mouseX - dx,
                startY: mouseY - dy,
                endX: evt.clickX - dx,
                endY: evt.clickY - dy,
                zoom: gridSize,
                width: currentWidth
            });

            return;
        }

        case 'grab': {
            tdx = dx;
            tdy = dy;

            canvas.style.cursor = 'grab';

            return;
        }
    }
}

function onMouseDown(e: VEvent) {
    switch (tool) {
        case 'grab': {
            canvas.style.cursor = 'grabbing';
            return;
        }
    }
}

function zoomListener(e: WheelEvent) {
    gridSize = clamp(gridSize + (e.deltaY > 0 ? 1 : -1), 5, 100);
}

function resetZoom() {
    gridSize = WorldZoom;
    tdx = dx = 0;
    tdy = dy = 0;
}

function setEscape() {
    // if in no operation, just revert to the `pointer` tool
    if (clickX === undefined) {
        setTool('pointer');
        return;
    }

    escape = true;
}

function dbgZoom() {
    return `zoom:${gridSize}`;
}

function dbgWorldPos() {
    return `dx:${dx.toFixed(2)} dy:${dy.toFixed(2)}`;
}

export function draw() {
    ctx.clearRect(0, 0, width, height);

    // Set line properties
    ctx.strokeStyle = '#D0E7FF';
    ctx.lineWidth = 1;

    // Draw vertical grid lines
    for (let x = gridSize + dx % gridSize; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }

    // Draw horizontal grid lines
    for (let y = gridSize + dy % gridSize; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }

    if (tool === 'grab') {
        applyGrab();
    }

    drawObjects();
    drawTool();
}

function drawObjects() {
    for (const o of objects) {
        switch (o.kind) {
            case 'line': {
                const m = gridSize / o.zoom;

                ctx.beginPath();
                ctx.lineWidth = o.width * m;
                ctx.strokeStyle = '#34495E';
                ctx.moveTo(o.startX * m + dx, o.startY * m + dy);
                ctx.lineTo(o.endX * m + dx, o.endY * m + dy);
                ctx.stroke();
            }
        }
    }
}

function drawTool() {
    switch (tool) {
        case 'pointer': return drawPointer();
        case 'line':    return drawLine();
        case 'grab':    return; // do nothing
    }
}

function drawPointer() {
    if (clickX === undefined || escape) {
        return;
    }

    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#34495E';
    ctx.strokeRect(clickX, clickY!, mouseX - clickX, mouseY - clickY!);
}

function drawLine() {
    if (clickX === undefined || escape) {
        return;
    }

    ctx.beginPath();
    ctx.lineWidth = currentWidth;
    ctx.strokeStyle = '#34495E';
    ctx.moveTo(clickX, clickY!);
    ctx.lineTo(mouseX, mouseY);
    ctx.stroke();
}

// this should be done before drawind the other objects
function applyGrab() {
    if (clickX === undefined) {
        return;
    }

    dx = tdx + mouseX - clickX;
    dy = tdy + mouseY - clickY!;
}
