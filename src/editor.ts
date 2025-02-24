
import {
    type VEvent,

    canvas, ctx, isMac, pressedKeys,

    width, height, mouseX, mouseY,

    registerShortcuts, removeShortcuts, addDebugMsg, removeDebugMsg, listen, unlisten
} from './engine'

import { Shortcut } from './keyboard'
import { WorldZoom } from './game'

import { clamp, uuid } from './util'

let KbShortcuts: Shortcut[] = [
    [resetZoom,               isMac ? 'META + 0' : 'CTRL + 0'],
    [onEscape,                'ESC'],
    [() => setTool('line'),   'L'],
    [() => setTool('grab'),   'G']
];

let gridSize = WorldZoom;

type Tool = 'line' | 'pointer' | 'grab'
let tool: Tool = 'pointer';

type Point = { x: number, y: number }

type Objects = {
    kind: 'line',
    id: string,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    zoom: number,
    width: number,
    color: string,
    visible: boolean
}

let objects: Objects[] = [];

let currentWidth = 2;

// delta x, y
let dx = 0;
let dy = 0;

// translation x, y
let tx = 0;
let ty = 0;

let startPoint: Point | undefined;

const ToolCursor = {
    line: 'crosshair',
    pointer: 'default',
    grab: 'grab'
};

const Sidebar = document.getElementById('sidebar')!;
const SimpleTools = document.querySelector<HTMLElement>('.simple-tools')!;
const SnapToGrid = document.querySelector<HTMLInputElement>('#snapToGrid')!;

const ObjectsListHeader = document.querySelector<HTMLElement>('.objects-list .header')!;
const ObjectsListContents = document.querySelector<HTMLElement>('.objects-list .contents')!;

let snapToGrid = true;

export function setup() {
    canvas.addEventListener('wheel', zoomListener);

    Sidebar.style.display = null!;
    SimpleTools.addEventListener('click', toolSelectionListener);
    SnapToGrid.addEventListener('change', snapToGridChange);
    ObjectsListHeader.addEventListener('click', showHideObjectsList);
    ObjectsListContents.addEventListener('click', showHideObject);

    listen('mouseup', onMouseUp);
    listen('mousedown', onMouseDown);

    registerShortcuts(KbShortcuts);
    addDebugMsg(dbgZoom);
    addDebugMsg(dbgWorldPos);

    setTool('pointer');
}

export function tearDown() {
    canvas.removeEventListener('wheel', zoomListener);

    Sidebar.style.display = 'none'
    SimpleTools.removeEventListener('click', toolSelectionListener);
    SnapToGrid.removeEventListener('change', snapToGridChange);
    ObjectsListHeader.removeEventListener('click', showHideObjectsList);
    ObjectsListContents.removeEventListener('click', showHideObject);

    unlisten('mouseup', onMouseUp);
    unlisten('mousedown', onMouseDown);

    removeShortcuts(KbShortcuts);
    removeDebugMsg(dbgZoom);
    removeDebugMsg(dbgWorldPos);

    // reset the cursor of the canvas; TODO: should store and then revert
    setTool('pointer');
}

function toolSelectionListener(e: MouseEvent) {
    const tool = (e.target as HTMLElement).dataset.tool;

    // if no tool was clicked, just return
    if (!tool) {
        return;
    }

    setTool(tool as Tool);
}

function setTool(t: Tool) {
    // unselect the old tool
    document.querySelector('.simple-icon.selected')?.classList.remove('selected');

    document.querySelector(`.simple-icon[data-tool="${t}"]`)?.classList.add('selected');

    tool = t;
    canvas.style.cursor = ToolCursor[tool];
}

function snapToGridChange(e: Event) {
    snapToGrid = SnapToGrid.checked;
}

function showHideObjectsList() {
    const OpenClosedIndicator = ObjectsListHeader.querySelector('.open-closed-indicator')!;
    const isOpen = !OpenClosedIndicator.classList.contains('closed');

    if (isOpen) {
        OpenClosedIndicator.classList.add('closed');
        ObjectsListContents.style.display = 'none';
    } else {
        OpenClosedIndicator.classList.remove('closed');
        ObjectsListContents.style.display = null!;
    }
}

// delegate the event handling to the `contents` parent
function showHideObject(e: MouseEvent) {
    const target = e.target as HTMLElement;

    // it is not the correct child; exit
    if (!target.classList.contains('visibility')) {
        return;
    }

    const id = target.parentElement?.dataset.id;
    if (!id) {
        // something went wrong..
        return;
    }

    const obj = objects.find(x => x.id === id)!;
    if (obj.visible) {
        obj.visible = false;
        target.classList.add('hidden');
    } else {
        obj.visible = true;
        target.classList.remove('hidden');
    }
}

function applySnap(x: Point) {
    if (!snapToGrid || !isSnapToGridTool(tool)) {
        return x;
    }

    const offsetX = (gridSize + dx % gridSize) % gridSize;
    const offsetY = (gridSize + dy % gridSize) % gridSize;

    return {
        x: offsetX + Math.round((mouseX - offsetX) / gridSize) * gridSize,
        y: offsetY + Math.round((mouseY - offsetY) / gridSize) * gridSize
    };
}

function isSnapToGridTool(x: Tool): boolean {
    switch (x) {
        case 'line':    return true;
        case 'pointer': return false;
        case 'grab':    return false;
    }
}

function onMouseUp() {
    // nothing to do
    if (startPoint === undefined) {
        return;
    }

    switch (tool) {
        case 'line': {
            const end = applySnap({ x: mouseX, y: mouseY });

            objects.push({
                kind: 'line',
                id: uuid(),
                startX: startPoint.x - dx,
                startY: startPoint.y - dy,
                endX: end.x - dx,
                endY: end.y - dy,
                zoom: gridSize,
                width: currentWidth,
                color: '#34495E',
                visible: true
            });

            updateObjectsList();
            break;
        }

        case 'grab': {
            tx = dx;
            ty = dy;

            canvas.style.cursor = 'grab';

            break;
        }
    }

    startPoint = undefined;
}

function onMouseDown(e: VEvent) {
    startPoint = applySnap({ x: e.clickX, y: e.clickY });

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
    tx = dx = 0;
    ty = dy = 0;
}

function onEscape() {
    // if in operation, revert to the `pointer` tool
    if (startPoint === undefined) {
        setTool('pointer');
    }

    startPoint = undefined;
}

function updateObjectsList() {
    const html = objects.map(renderObject)
        .join('');

    ObjectsListContents.innerHTML = html;
}

function renderObject(x: Objects, idx: number) {
    return `
    <div class="object-row" data-id="${x.id}">
        <span class="type ${x.kind}"></span>
        <span class="label">${x.kind} ${idx}</span>
        <span class="visibility ${x.visible ? '' : 'hidden'}"></span>
    </div>
`;
}

function dbgZoom() {
    return `zoom:${gridSize}`;
}

function dbgWorldPos() {
    return `dx:${dx.toFixed(2)} dy:${dy.toFixed(2)}`;
}

let savedTool: Tool | undefined;
export function draw() {
    ctx.clearRect(0, 0, width, height);

    if (pressedKeys.META) {
        if (!savedTool) {
            savedTool = tool;
            setTool('grab');
        }
    } else {
        if (savedTool) {
            setTool(savedTool);
            savedTool = undefined;
        }
    }

    if (tool === 'grab') {
        applyGrab();
    }

    drawGrid();
    drawObjects();
    drawTool();
}

function drawGrid() {
    // Set line properties
    ctx.strokeStyle = '#D0E7FF';
    ctx.lineWidth = 1;

    // Draw vertical grid lines
    for (let x = dx % gridSize; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }

    // Draw horizontal grid lines
    for (let y = dy % gridSize; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
}

function drawObjects() {
    for (const o of objects) {
        if (!o.visible) {
            continue;
        }

        switch (o.kind) {
            case 'line': {
                const m = gridSize / o.zoom;

                ctx.beginPath();
                ctx.lineWidth = o.width * m;
                ctx.strokeStyle = o.color;
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
    if (startPoint === undefined) {
        return;
    }

    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#34495E';
    ctx.strokeRect(startPoint.x, startPoint.y, mouseX - startPoint.x, mouseY - startPoint.y);
}

function drawLine() {
    if (startPoint === undefined) {
        return;
    }

    const end = applySnap({ x: mouseX, y: mouseY });

    ctx.beginPath();
    ctx.lineWidth = currentWidth;
    ctx.strokeStyle = '#34495E';
    ctx.moveTo(startPoint.x, startPoint.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
}

// this should be done before drawind the other objects
function applyGrab() {
    if (startPoint === undefined) {
        return;
    }

    dx = tx + mouseX - startPoint.x;
    dy = ty + mouseY - startPoint.y;
}
