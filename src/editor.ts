
import {
    type VEvent,

    canvas, ctx, isMac, pressedKeys, debug,

    width, height, mouseX, mouseY,

    registerShortcuts, removeShortcuts, addDebugMsg, removeDebugMsg, listen, unlisten
} from './engine'

import { Shortcut } from './keyboard'
import { WorldZoom } from './game'

import { clamp, uuid, onlyKey } from './util'

const META_KEY = isMac ? 'META' : 'CTRL';

let KbShortcuts: Shortcut[] = [
    [resetZoom,                `${META_KEY} + 0`],
    [onEscape,                'ESC'],
    [onBackspace,             'BACKSPACE'],
    [() => setTool('line'),   'L'],
    [() => setTool('grab'),   'G']
];

let gridSize = WorldZoom;

type Tool = 'line' | 'pointer' | 'grab'
let tool: Tool = 'pointer';

type Point = { x: number, y: number }
type Rect  = { startX: number, startY: number, endX: number, endY: number }


type Objects = {
    kind: 'line',
    id: string,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    width: number,
    color: string,
}

let objects: Objects[] = [];
let hovered: string | undefined;
let hidden: { [x: string]: true | undefined } = {};
let selected: { [x: string]: true | undefined } = {};

let currentWidth = 2;

// delta x, y
let dx = 0;
let dy = 0;

// translation x, y - pivot for dx, dy when the `grab` tool is active
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

const FoldableHeaders = document.querySelectorAll<HTMLElement>('.foldable .header');

const ObjectsListContents = document.querySelector<HTMLElement>('#objects-list .contents')!;
const PropertiesContents = document.querySelector<HTMLElement>('#properties .contents')!;

let snapToGrid = true;

export function setup() {
    canvas.addEventListener('wheel', zoomListener);

    Sidebar.style.display = null!;
    SimpleTools.addEventListener('click', toolSelectionListener);
    SnapToGrid.addEventListener('change', snapToGridChange);

    ObjectsListContents.addEventListener('click', onObjectItemClick);
    ObjectsListContents.addEventListener('mouseover', onObjectMouseOver);
    ObjectsListContents.addEventListener('mouseleave', onObjectMouseLeave);

    PropertiesContents.addEventListener('change', onPropertiesChange);

    FoldableHeaders.forEach(x => x.addEventListener('click', showHideFoldable));

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

    ObjectsListContents.removeEventListener('click', onObjectItemClick);
    ObjectsListContents.removeEventListener('mouseover', onObjectMouseOver);
    ObjectsListContents.removeEventListener('mouseleave', onObjectMouseLeave);

    PropertiesContents.removeEventListener('change', onPropertiesChange);

    FoldableHeaders.forEach(x => x.removeEventListener('click', showHideFoldable));

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

function showHideFoldable(e: Event) {
    const foldable = (e.target as HTMLElement).closest('.foldable');

    const openClosedIndicator = foldable?.querySelector<HTMLElement>('.open-closed-indicator');
    const contents = foldable?.querySelector<HTMLElement>('.contents');

    // something didn't work
    if (!openClosedIndicator || !contents) {
        return;
    }

    const isOpen = !openClosedIndicator.classList.contains('closed');
    if (isOpen) {
        openClosedIndicator.classList.add('closed');
        contents.style.display = 'none';
    } else {
        openClosedIndicator.classList.remove('closed');
        contents.style.display = null!;
    }
}

// delegate the event handling to the `contents` parent
function onObjectItemClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    const objectRow = target.closest<HTMLElement>('.object-row');

    const id = objectRow?.dataset.id;
    if (!id) {
        // something went wrong..
        return;
    }

    // if the `eye` has been clicked, toggle visibility
    if (target.matches('.visibility')) {
        if (hidden[id]) {
            delete hidden[id];
        } else {
            hidden[id] = true;
        }
    } else {
        // .. or else toggle selection
        if (selected[id]) {
            delete selected[id];
        } else {
            if (!pressedKeys[META_KEY]) {
                selected = { [id]: true };
            } else {
                selected[id] = true;
            }
        }
    }

    updateObjectsList();
}

function onObjectMouseOver(e: MouseEvent) {
    const target = (e.target as HTMLElement).closest<HTMLElement>('.object-row');
    const id = target?.dataset.id;
    hovered = id || undefined;
}

function onObjectMouseLeave(e: MouseEvent) {
    hovered = undefined;
}

function onPropertiesChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const selectedId = onlyKey(selected);
    const selectedObj = selectedId && objects.find(x => x.id === selectedId);

    // something went wrong
    if (!selectedObj) {
        return;
    }

    if (target.value === '' && target.type !== 'text') {
        // this is not a valid value; ignore it and reset to the old value
        const oldValue = selectedObj[target.id as keyof typeof selectedObj];
        target.value = String(oldValue);
    }

    // parse the value to a number if input type is `number`
    const value = target.type === 'number'
        ? Number(target.value)
        : target.value;

    // TODO: should use a safer method
    target.value = String(value);
    (selectedObj as any)[target.id] = value;
}

function applySnap(x: Point) {
    if (!snapToGrid || !isSnapToGridTool(tool)) {
        return x;
    }

    const offsetX = gridSize - dx % gridSize;
    const offsetY = gridSize - dy % gridSize;

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
            addLine(startPoint);
            updateObjectsList();

            break;
        }

        case 'grab': {
            canvas.style.cursor = 'grab';
            break;
        }

        case 'pointer': {
            selectObjectsInsideArea(startPoint);
            break;
        }
    }

    startPoint = undefined;
}

function addLine(startPoint: Point) {
    const m = WorldZoom / gridSize;
    const end = applySnap({ x: mouseX, y: mouseY });

    const line: Objects = {
        kind: 'line',
        id: uuid(),
        startX: (startPoint.x + dx) * m,
        startY: (startPoint.y + dy) * m,
        endX: (end.x + dx) * m,
        endY: (end.y + dy) * m,
        width: currentWidth,
        color: '#34495E'
    };

    objects.push(line);
}

function selectObjectsInsideArea(startPoint: Point) {
    const m = WorldZoom / gridSize;
    const area = normaliseRect({
        startX: (startPoint.x + dx) * m,
        startY: (startPoint.y + dy) * m,
        endX: (mouseX + dx) * m,
        endY: (mouseY + dy) * m
    });

    const selectedEntries = objects.filter(x => {
            const norm = normaliseRect(x);
            return isInside(area, norm);
        })
        .map(x => [x.id, true as const]);

    selected = Object.fromEntries(selectedEntries);
    updateObjectsList();
}

function onMouseDown(e: VEvent) {
    startPoint = applySnap({ x: e.clickX, y: e.clickY });

    switch (tool) {
        case 'grab': {
            tx = dx;
            ty = dy;

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
    selected = {};
    hovered = undefined;

    updateObjectsList();
}

function onBackspace() {
    objects = objects.filter(x => !selected[x.id]);
    selected = {};

    updateObjectsList();
}

function updateObjectsList() {
    const objectsListHtml = objects.map(renderObject)
        .join('');

    ObjectsListContents.innerHTML = objectsListHtml;

    const selectedId = onlyKey(selected);
    const propertiesHtml = selectedId
        ? renderProperties(objects.find(x => x.id === selectedId)!)
        : '';

    PropertiesContents.innerHTML = propertiesHtml;
}

function renderObject(x: Objects, idx: number) {
    return `
    <div class="object-row ${selected[x.id] ? 'selected' : ''}" data-id="${x.id}">
        <span class="type ${x.kind}"></span>
        <span class="label">${x.kind} ${idx}</span>
        <span class="visibility ${hidden[x.id] ? 'hidden' : ''}"></span>
    </div>
`;
}

function renderProperties(x: Objects) {
    return `
    <div class="properties-row">
        <label for="startX">start X:</label>
        <input id="startX" name="startX" type="number" value="${x.startX}">
    </div>
    <div class="properties-row">
        <label for="startY">start Y:</label>
        <input id="startY" name="startY" type="number" value="${x.startY}">
    </div>
    <div class="properties-row">
        <label for="endX">end X:</label>
        <input id="endX" name="endX" type="number" value="${x.endX}">
    </div>
    <div class="properties-row">
        <label for="endY">end Y:</label>
        <input id="endY" name="endY" type="number" value="${x.endY}">
    </div>
    <div class="properties-row">
        <label for="color">colour:</label>
        <input id="color" name="color" type="color" value="${x.color}">
    </div>
    <div class="properties-row">
        <label for="width">width:</label>
        <input id="width" name="width" type="number" value="${x.width}">
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
export function draw(dt: number) {
    ctx.clearRect(0, 0, width, height);

    if (pressedKeys[META_KEY]) {
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
    drawObjects(dt);
    drawTool();
}

function drawGrid() {
    // Set line properties
    ctx.strokeStyle = '#D0E7FF';
    ctx.lineWidth = 1;

    // Draw vertical grid lines
    for (let x = -dx % gridSize; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }

    // Draw horizontal grid lines
    for (let y = -dy % gridSize; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
}

function drawObjects(dt: number) {
    for (const o of objects) {
        if (hidden[o.id]) {
            continue;
        }

        if (selected[o.id]) {
            ctx.setLineDash([20, 5]);
            ctx.lineDashOffset = (Date.now() % 1000) / 20;
        }

        switch (o.kind) {
            case 'line': {
                const m = gridSize / WorldZoom;

                ctx.beginPath();
                ctx.lineWidth = o.width * m;
                ctx.strokeStyle = hovered === o.id ? '#fb5b5b' : o.color;
                ctx.moveTo(o.startX * m - dx, o.startY * m - dy);
                ctx.lineTo(o.endX * m - dx, o.endY * m - dy);
                ctx.stroke();
            }
        }

        // reset
        if (selected[o.id]) {
            ctx.setLineDash([]);
            ctx.lineDashOffset = 0;
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

    const rect = normaliseRect({
        startX: startPoint.x,
        startY: startPoint.y,
        endX: mouseX,
        endY: mouseY
    });

    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#34495E';
    ctx.strokeRect(rect.startX, rect.startY, rect.endX - rect.startX, rect.endY - rect.startY);

    if (debug) {
        const m = WorldZoom / gridSize;
        const worldRec = normaliseRect({
            startX: (rect.startX + dx) * m,
            startY: (rect.startY + dy) * m,
            endX: (rect.endX + dx) * m,
            endY: (rect.endY + dy) * m
        });

        ctx.beginPath();
        ctx.fillStyle = 'darkred';
        ctx.arc(rect.startX, rect.startY, 3, 0, 2 * Math.PI);
        ctx.arc(rect.endX, rect.endY, 3, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = 'darkred';
        ctx.font = '10px monospace';
        ctx.fillText(`(${worldRec.startX.toFixed(2)}, ${worldRec.startY.toFixed(2)})`, rect.startX, rect.startY + 10);

        const msg = `(${worldRec.endX.toFixed(2)}, ${worldRec.endY.toFixed(2)})`;
        const dims = ctx.measureText(msg);
        ctx.fillText(msg, rect.endX - dims.width, rect.endY - 5 /* dims.fontBoundingBoxAscent */);
    }
}

function drawLine() {
    if (startPoint === undefined) {
        return;
    }

    const m = gridSize / WorldZoom;
    const end = applySnap({ x: mouseX, y: mouseY });

    ctx.beginPath();
    ctx.lineWidth = currentWidth * m;
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

    dx = tx + startPoint.x - mouseX;
    dy = ty + startPoint.y - mouseY;
}

function isInside(bigger: Rect, target: Rect) {
    return bigger.startX <= target.startX
        && bigger.startY <= target.startY
        && bigger.endX >= target.endX
        && bigger.endY >= target.endY;
}

// A rectangle is defined by its diagonal, however it is assumed that (startX <= endX) and (startY <= endY), i.e.
// Good diagonal  o         Bad diagonal      o
//                 \                         /
//                  o                       o
//
// This method normalises "Bad diagonal" to "Good diagonal"
function normaliseRect(x: Rect): Rect {
    return {
        startX: Math.min(x.startX, x.endX),
        startY: Math.min(x.startY, x.endY),
        endX: Math.max(x.startX, x.endX),
        endY: Math.max(x.startY, x.endY)
    };
}
