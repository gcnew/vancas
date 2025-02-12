
import {
    canvas, ctx, isMac,

    width, height, clickX, clickY, mouseX, mouseY,

    registerShortcuts, removeShortcuts, addDebugMsg, removeDebugMsg
} from './engine'

import { Shortcut } from './keyboard'
import { WorldZoom } from './game'

import { clamp } from './util'

let KbShortcuts: Shortcut[] = [
    [resetZoom, isMac ? 'META + 0' : 'CTRL + 0'],
];

let gridSize = WorldZoom;

export function setup() {
    canvas.addEventListener('wheel', zoomListener);
    document.getElementById('sidebar')!.style.display = 'initial';

    registerShortcuts(KbShortcuts);
    addDebugMsg(dbgZoom);
}

export function tearDown() {
    canvas.removeEventListener('wheel', zoomListener);
    document.getElementById('sidebar')!.style.display = 'none'

    removeShortcuts(KbShortcuts);
    removeDebugMsg(dbgZoom);
}

function zoomListener(e: WheelEvent) {
    gridSize = clamp(gridSize + (e.deltaY > 0 ? 1 : -1), 5, 100);
}

function resetZoom() {
    gridSize = WorldZoom;
}

function dbgZoom() {
    return `zoom:${gridSize}`;
}

export function draw() {
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

