var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
define("keyboard", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.normaliseShortcut = exports.KeyMap = void 0;
    exports.KeyMap = {
        F1: 'F1',
        F2: 'F2',
        F3: 'F3',
        F4: 'F4',
        F5: 'F5',
        F6: 'F6',
        F7: 'F7',
        F8: 'F8',
        F9: 'F9',
        F10: 'F10',
        F11: 'F11',
        F12: 'F12',
        Digit1: '1',
        Digit2: '2',
        Digit3: '3',
        Digit4: '4',
        Digit5: '5',
        Digit6: '6',
        Digit7: '7',
        Digit8: '8',
        Digit9: '9',
        Digit0: '0',
        KeyA: 'A',
        KeyB: 'B',
        KeyC: 'C',
        KeyD: 'D',
        KeyE: 'E',
        KeyF: 'F',
        KeyG: 'G',
        KeyH: 'H',
        KeyI: 'I',
        KeyJ: 'J',
        KeyK: 'K',
        KeyL: 'L',
        KeyM: 'M',
        KeyN: 'N',
        KeyO: 'O',
        KeyP: 'P',
        KeyQ: 'Q',
        KeyR: 'R',
        KeyS: 'S',
        KeyT: 'T',
        KeyU: 'U',
        KeyV: 'V',
        KeyW: 'W',
        KeyX: 'X',
        KeyY: 'Y',
        KeyZ: 'Z',
        ShiftLeft: 'SHIFT',
        ShiftRight: 'SHIFT',
        ControlLeft: 'CTRL',
        ControlRight: 'CTRL',
        AltLeft: 'ALT',
        AltRight: 'ALT',
        MetaLeft: 'META',
        MetaRight: 'META',
        Escape: 'ESC',
        Tab: 'TAB',
        Backspace: 'BACKSPACE',
        Delete: 'DELETE',
        Enter: 'ENTER',
        CapsLock: 'CAPSLOCK',
        Space: 'SPACE',
        ArrowLeft: 'LEFT',
        ArrowRight: 'RIGHT',
        ArrowUp: 'UP',
        ArrowDown: 'DOWN',
        Minus: '-',
        Equal: '=',
        BracketLeft: '[',
        BracketRight: ']',
        Semicolon: ';',
        Quote: '\'',
        Backslash: '\\',
        Backquote: '`',
        Comma: ',',
        Period: '.',
        Slash: '/',
    };
    function normaliseShortcut(sc) {
        const prio = ['META', 'CTRL', 'ALT', 'SHIFT'];
        return sc
            .toUpperCase()
            .split(/\s*\+\s*/g)
            .sort(x => {
            const idx = prio.indexOf(x);
            return idx !== -1 ? idx : x.charCodeAt(0);
        })
            .join('+');
    }
    exports.normaliseShortcut = normaliseShortcut;
});
define("util", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.onlyKey = exports.uuid = exports.clamp = exports.isTruthy = void 0;
    function isTruthy(x) {
        return !!x;
    }
    exports.isTruthy = isTruthy;
    function clamp(x, min, max) {
        return Math.max(min, Math.min(x, max));
    }
    exports.clamp = clamp;
    function uuid() {
        return crypto.randomUUID();
    }
    exports.uuid = uuid;
    function onlyKey(x) {
        const keys = Object.keys(x);
        return keys.length === 1 ? keys[0] : undefined;
    }
    exports.onlyKey = onlyKey;
});
define("engine", ["require", "exports", "keyboard", "util"], function (require, exports, keyboard_1, util_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.removeDebugMsg = exports.addDebugMsg = exports.raise = exports.unlisten = exports.listen = exports.toggleRun = exports.toggleDebug = exports.removeShortcuts = exports.registerShortcuts = exports.setGameObject = exports.setup = exports.isMac = exports.clickY = exports.clickX = exports.mouseY = exports.mouseX = exports.pressedKeys = exports.debug = exports.height = exports.width = exports.ctx = exports.canvas = void 0;
    let game;
    let drawGame;
    exports.debug = true;
    const frameWindow = 1000;
    let frameRateBuffer = [];
    let lastT = 0;
    let gameStop = false;
    exports.pressedKeys = {};
    exports.isMac = /Mac/.test(navigator.platform);
    let KbShortcuts = new Map();
    const eventRegistry = {};
    function setup() {
        exports.canvas = document.getElementById('myCanvas');
        exports.ctx = exports.canvas.getContext('2d');
        if (exports.ctx === null) {
            // Cannot initialise the context, show the banner message and exit
            document.getElementById('cannotInitBanner').style.display = null;
            return;
        }
        resize();
        window.onresize = resize;
        window.requestAnimationFrame(draw);
        window.addEventListener('keydown', keydownListener);
        window.addEventListener('keyup', keyupListener);
        window.addEventListener('keydown', e => {
            // skip repeats
            if (e.repeat) {
                return;
            }
            // do nothing if the originating element is input unless the pressed key is ESC
            // in case of ESC, the element should lose focus
            if (e.target.tagName === 'INPUT') {
                if (keyboard_1.KeyMap[e.code] === 'ESC') {
                    e.target.blur();
                }
                return;
            }
            const sigil = [
                e.metaKey && 'META',
                e.ctrlKey && 'CTRL',
                e.altKey && 'ALT',
                e.shiftKey && 'SHIFT',
                keyboard_1.KeyMap[e.code] || e.code
            ]
                .filter(util_1.isTruthy)
                .join('+');
            KbShortcuts.get(sigil)?.();
        });
        window.addEventListener('mousemove', e => {
            exports.mouseX = (0, util_1.clamp)(e.pageX, 0, exports.width);
            exports.mouseY = (0, util_1.clamp)(e.pageY, 0, exports.height);
        });
        exports.canvas.addEventListener('mousedown', e => {
            if (e.button !== 0) {
                return;
            }
            exports.clickX = e.offsetX;
            exports.clickY = e.offsetY;
            raise({ kind: 'mousedown', clickX: exports.clickX, clickY: exports.clickY });
        });
        // listen on the window for mouse-up, otherwise the event is not received if clicked outside of the window or canvas
        window.addEventListener('mouseup', e => {
            if (e.button !== 0) {
                return;
            }
            raise({ kind: 'mouseup', clickX: exports.clickX, clickY: exports.clickY });
            exports.clickX = undefined;
            exports.clickY = undefined;
        });
    }
    exports.setup = setup;
    function setGameObject(newGame) {
        game?.tearDown();
        game = newGame;
        game.setup();
        drawGame = game.draw;
        resize();
    }
    exports.setGameObject = setGameObject;
    function registerShortcuts(shortcuts) {
        for (const [fn, sc] of shortcuts) {
            const fixed = (0, keyboard_1.normaliseShortcut)(sc);
            KbShortcuts.set(fixed, fn);
        }
    }
    exports.registerShortcuts = registerShortcuts;
    function removeShortcuts(shortcuts) {
        for (const [fn, sc] of shortcuts) {
            const fixed = (0, keyboard_1.normaliseShortcut)(sc);
            KbShortcuts.delete(fixed);
        }
    }
    exports.removeShortcuts = removeShortcuts;
    function toggleDebug() {
        exports.debug = !exports.debug;
    }
    exports.toggleDebug = toggleDebug;
    function toggleRun() {
        gameStop = !gameStop;
        !gameStop && window.requestAnimationFrame(draw);
    }
    exports.toggleRun = toggleRun;
    function listen(e, f) {
        eventRegistry[e] = eventRegistry[e] || [];
        eventRegistry[e].push(f);
    }
    exports.listen = listen;
    function unlisten(e, f) {
        eventRegistry[e] = (eventRegistry[e] || []).filter(x => x !== f);
    }
    exports.unlisten = unlisten;
    function raise(e) {
        eventRegistry[e.kind]?.forEach(fn => fn(e));
    }
    exports.raise = raise;
    function resize() {
        // if setup fails, etc
        if (!exports.canvas) {
            return;
        }
        exports.width = exports.canvas.clientWidth;
        exports.height = exports.canvas.clientHeight;
        // fix for high-dpi displays
        if (window.devicePixelRatio !== 1) {
            exports.canvas.width = exports.width * window.devicePixelRatio;
            exports.canvas.height = exports.height * window.devicePixelRatio;
            exports.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        }
    }
    function keydownListener(e) {
        const code = keyboard_1.KeyMap[e.code] || e.code;
        // tab has a special meaning; if it is fired point-blank, we cancel the default behaviour
        // otherwise, the keyup event might never be received if the window loses focus
        if (e.code === 'Tab' && e.target === document.body) {
            e.preventDefault();
        }
        exports.pressedKeys[code] = true;
    }
    function keyupListener(e) {
        const code = keyboard_1.KeyMap[e.code] || e.code;
        // when holding the meta (command) key, key-up events are not fired sans CapsLock
        // so we need to clear all pressed keys here
        if (exports.isMac && code === 'META') {
            const keys = Object.keys(exports.pressedKeys);
            for (const k of keys) {
                if (k !== 'CAPSLOCK') {
                    delete exports.pressedKeys[k];
                }
            }
        }
        delete exports.pressedKeys[code];
    }
    let DebugMessages = [
        () => {
            const fps = frameRateBuffer.length / frameWindow * 1000 | 0;
            return `w:${exports.width} h:${exports.height} fps:${fps}`;
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
            return `x:${exports.mouseX} y:${exports.mouseY}`;
        },
        () => {
            return exports.clickX && `cx:${exports.clickX} cy:${exports.clickY}`;
        },
        () => {
            const keys = Object.keys(exports.pressedKeys);
            return keys.length && `keys:${keys.join(', ')}`;
        }
    ];
    function addDebugMsg(f) {
        DebugMessages.push(f);
    }
    exports.addDebugMsg = addDebugMsg;
    function removeDebugMsg(f) {
        DebugMessages = DebugMessages.filter(x => x !== f);
    }
    exports.removeDebugMsg = removeDebugMsg;
    function drawDebug() {
        exports.ctx.fillStyle = 'darkred';
        exports.ctx.font = '10px monospace';
        const msg = DebugMessages
            .map(f => f())
            .filter(util_1.isTruthy);
        for (let i = 0; i < msg.length; ++i) {
            exports.ctx.fillText(msg[i], exports.width - 130, (i + 1) * 10);
        }
    }
    function updateFrameStats(dt) {
        frameRateBuffer.push(dt);
        const [frames] = frameRateBuffer.reduceRight(([fs, sum], x) => x + sum < frameWindow ? [fs + 1, x + sum] : [fs, frameWindow], [0, 0]);
        frameRateBuffer.splice(0, frameRateBuffer.length - frames);
    }
    function draw(t) {
        const dt = t - lastT;
        lastT = t;
        updateFrameStats(dt);
        drawGame(dt);
        exports.debug && drawDebug();
        if (!gameStop) {
            window.requestAnimationFrame(draw);
        }
    }
});
define("game", ["require", "exports", "engine"], function (require, exports, engine_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.draw = exports.tearDown = exports.setup = exports.WorldZoom = void 0;
    exports.WorldZoom = 20;
    function setup() {
    }
    exports.setup = setup;
    function tearDown() {
    }
    exports.tearDown = tearDown;
    function draw() {
        engine_1.ctx.clearRect(0, 0, engine_1.width, engine_1.height);
        engine_1.ctx.fillStyle = 'darkred';
        engine_1.ctx.font = '10px Arial';
        engine_1.ctx.fillText('High DPI Canvas!', 10, 20);
    }
    exports.draw = draw;
});
define("editor", ["require", "exports", "engine", "game", "util"], function (require, exports, engine_2, game_1, util_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.draw = exports.tearDown = exports.setup = void 0;
    const META_KEY = engine_2.isMac ? 'META' : 'CTRL';
    let KbShortcuts = [
        [resetZoom, `${META_KEY} + 0`],
        [onEscape, 'ESC'],
        [onBackspace, 'BACKSPACE'],
        [() => setTool('line'), 'L'],
        [() => setTool('grab'), 'G']
    ];
    let gridSize = game_1.WorldZoom;
    let tool = 'pointer';
    let objects = [];
    let hovered;
    let hidden = {};
    let selected = {};
    let currentWidth = 2;
    // delta x, y
    let dx = 0;
    let dy = 0;
    // translation x, y - pivot for dx, dy when the `grab` tool is active
    let tx = 0;
    let ty = 0;
    let startPoint;
    const ToolCursor = {
        line: 'crosshair',
        pointer: 'default',
        grab: 'grab'
    };
    const Sidebar = document.getElementById('sidebar');
    const SimpleTools = document.querySelector('.simple-tools');
    const SnapToGrid = document.querySelector('#snapToGrid');
    const FoldableHeaders = document.querySelectorAll('.foldable .header');
    const ObjectsListContents = document.querySelector('#objects-list .contents');
    const PropertiesContents = document.querySelector('#properties .contents');
    let snapToGrid = true;
    function setup() {
        engine_2.canvas.addEventListener('wheel', zoomListener);
        Sidebar.style.display = null;
        SimpleTools.addEventListener('click', toolSelectionListener);
        SnapToGrid.addEventListener('change', snapToGridChange);
        ObjectsListContents.addEventListener('click', onObjectItemClick);
        ObjectsListContents.addEventListener('mouseover', onObjectMouseOver);
        ObjectsListContents.addEventListener('mouseleave', onObjectMouseLeave);
        PropertiesContents.addEventListener('change', onPropertiesChange);
        FoldableHeaders.forEach(x => x.addEventListener('click', showHideFoldable));
        (0, engine_2.listen)('mouseup', onMouseUp);
        (0, engine_2.listen)('mousedown', onMouseDown);
        (0, engine_2.registerShortcuts)(KbShortcuts);
        (0, engine_2.addDebugMsg)(dbgZoom);
        (0, engine_2.addDebugMsg)(dbgWorldPos);
        setTool('pointer');
    }
    exports.setup = setup;
    function tearDown() {
        engine_2.canvas.removeEventListener('wheel', zoomListener);
        Sidebar.style.display = 'none';
        SimpleTools.removeEventListener('click', toolSelectionListener);
        SnapToGrid.removeEventListener('change', snapToGridChange);
        ObjectsListContents.removeEventListener('click', onObjectItemClick);
        ObjectsListContents.removeEventListener('mouseover', onObjectMouseOver);
        ObjectsListContents.removeEventListener('mouseleave', onObjectMouseLeave);
        PropertiesContents.removeEventListener('change', onPropertiesChange);
        FoldableHeaders.forEach(x => x.removeEventListener('click', showHideFoldable));
        (0, engine_2.unlisten)('mouseup', onMouseUp);
        (0, engine_2.unlisten)('mousedown', onMouseDown);
        (0, engine_2.removeShortcuts)(KbShortcuts);
        (0, engine_2.removeDebugMsg)(dbgZoom);
        (0, engine_2.removeDebugMsg)(dbgWorldPos);
        // reset the cursor of the canvas; TODO: should store and then revert
        setTool('pointer');
    }
    exports.tearDown = tearDown;
    function toolSelectionListener(e) {
        const tool = e.target.dataset.tool;
        // if no tool was clicked, just return
        if (!tool) {
            return;
        }
        setTool(tool);
    }
    function setTool(t) {
        // unselect the old tool
        document.querySelector('.simple-icon.selected')?.classList.remove('selected');
        document.querySelector(`.simple-icon[data-tool="${t}"]`)?.classList.add('selected');
        tool = t;
        engine_2.canvas.style.cursor = ToolCursor[tool];
    }
    function snapToGridChange(e) {
        snapToGrid = SnapToGrid.checked;
    }
    function showHideFoldable(e) {
        const foldable = e.target.closest('.foldable');
        const openClosedIndicator = foldable?.querySelector('.open-closed-indicator');
        const contents = foldable?.querySelector('.contents');
        // something didn't work
        if (!openClosedIndicator || !contents) {
            return;
        }
        const isOpen = !openClosedIndicator.classList.contains('closed');
        if (isOpen) {
            openClosedIndicator.classList.add('closed');
            contents.style.display = 'none';
        }
        else {
            openClosedIndicator.classList.remove('closed');
            contents.style.display = null;
        }
    }
    // delegate the event handling to the `contents` parent
    function onObjectItemClick(e) {
        const target = e.target;
        const objectRow = target.closest('.object-row');
        const id = objectRow?.dataset.id;
        if (!id) {
            // something went wrong..
            return;
        }
        // if the `eye` has been clicked, toggle visibility
        if (target.matches('.visibility')) {
            if (hidden[id]) {
                delete hidden[id];
            }
            else {
                hidden[id] = true;
            }
        }
        else {
            // .. or else toggle selection
            if (selected[id]) {
                delete selected[id];
            }
            else {
                if (!engine_2.pressedKeys[META_KEY]) {
                    selected = { [id]: true };
                }
                else {
                    selected[id] = true;
                }
            }
        }
        updateObjectsList();
    }
    function onObjectMouseOver(e) {
        const target = e.target.closest('.object-row');
        const id = target?.dataset.id;
        hovered = id || undefined;
    }
    function onObjectMouseLeave(e) {
        hovered = undefined;
    }
    function onPropertiesChange(e) {
        const target = e.target;
        const selectedId = (0, util_2.onlyKey)(selected);
        const selectedObj = selectedId && objects.find(x => x.id === selectedId);
        // something went wrong
        if (!selectedObj) {
            return;
        }
        if (target.value === '' && target.type !== 'text') {
            // this is not a valid value; ignore it and reset to the old value
            const oldValue = selectedObj[target.id];
            target.value = String(oldValue);
        }
        // parse the value to a number if input type is `number`
        const value = target.type === 'number'
            ? Number(target.value)
            : target.value;
        // TODO: should use a safer method
        target.value = String(value);
        selectedObj[target.id] = value;
    }
    function applySnap(x) {
        if (!snapToGrid || !isSnapToGridTool(tool)) {
            return x;
        }
        const offsetX = gridSize - dx % gridSize;
        const offsetY = gridSize - dy % gridSize;
        return {
            x: offsetX + Math.round((engine_2.mouseX - offsetX) / gridSize) * gridSize,
            y: offsetY + Math.round((engine_2.mouseY - offsetY) / gridSize) * gridSize
        };
    }
    function isSnapToGridTool(x) {
        switch (x) {
            case 'line': return true;
            case 'pointer': return false;
            case 'grab': return false;
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
                engine_2.canvas.style.cursor = 'grab';
                break;
            }
            case 'pointer': {
                selectObjectsInsideArea(startPoint);
                break;
            }
        }
        startPoint = undefined;
    }
    function addLine(startPoint) {
        const m = game_1.WorldZoom / gridSize;
        const end = applySnap({ x: engine_2.mouseX, y: engine_2.mouseY });
        const line = {
            kind: 'line',
            id: (0, util_2.uuid)(),
            startX: (startPoint.x + dx) * m,
            startY: (startPoint.y + dy) * m,
            endX: (end.x + dx) * m,
            endY: (end.y + dy) * m,
            width: currentWidth,
            color: '#34495E'
        };
        objects.push(line);
    }
    function selectObjectsInsideArea(startPoint) {
        const m = game_1.WorldZoom / gridSize;
        const area = normaliseRect({
            startX: (startPoint.x + dx) * m,
            startY: (startPoint.y + dy) * m,
            endX: (engine_2.mouseX + dx) * m,
            endY: (engine_2.mouseY + dy) * m
        });
        const selectedEntries = objects.filter(x => {
            const norm = normaliseRect(x);
            return isInside(area, norm);
        })
            .map(x => [x.id, true]);
        selected = Object.fromEntries(selectedEntries);
        updateObjectsList();
    }
    function onMouseDown(e) {
        startPoint = applySnap({ x: e.clickX, y: e.clickY });
        switch (tool) {
            case 'grab': {
                tx = dx;
                ty = dy;
                engine_2.canvas.style.cursor = 'grabbing';
                return;
            }
        }
    }
    function zoomListener(e) {
        gridSize = (0, util_2.clamp)(gridSize + (e.deltaY > 0 ? 1 : -1), 5, 100);
    }
    function resetZoom() {
        gridSize = game_1.WorldZoom;
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
        const selectedId = (0, util_2.onlyKey)(selected);
        const propertiesHtml = selectedId
            ? renderProperties(objects.find(x => x.id === selectedId))
            : '';
        PropertiesContents.innerHTML = propertiesHtml;
    }
    function renderObject(x, idx) {
        return `
    <div class="object-row ${selected[x.id] ? 'selected' : ''}" data-id="${x.id}">
        <span class="type ${x.kind}"></span>
        <span class="label">${x.kind} ${idx}</span>
        <span class="visibility ${hidden[x.id] ? 'hidden' : ''}"></span>
    </div>
`;
    }
    function renderProperties(x) {
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
    let savedTool;
    function draw(dt) {
        engine_2.ctx.clearRect(0, 0, engine_2.width, engine_2.height);
        if (engine_2.pressedKeys[META_KEY]) {
            if (!savedTool) {
                savedTool = tool;
                setTool('grab');
            }
        }
        else {
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
    exports.draw = draw;
    function drawGrid() {
        // Set line properties
        engine_2.ctx.strokeStyle = '#D0E7FF';
        engine_2.ctx.lineWidth = 1;
        // Draw vertical grid lines
        for (let x = -dx % gridSize; x < engine_2.width; x += gridSize) {
            engine_2.ctx.beginPath();
            engine_2.ctx.moveTo(x, 0);
            engine_2.ctx.lineTo(x, engine_2.height);
            engine_2.ctx.stroke();
        }
        // Draw horizontal grid lines
        for (let y = -dy % gridSize; y < engine_2.height; y += gridSize) {
            engine_2.ctx.beginPath();
            engine_2.ctx.moveTo(0, y);
            engine_2.ctx.lineTo(engine_2.width, y);
            engine_2.ctx.stroke();
        }
    }
    function drawObjects(dt) {
        for (const o of objects) {
            if (hidden[o.id]) {
                continue;
            }
            if (selected[o.id]) {
                engine_2.ctx.setLineDash([20, 5]);
                engine_2.ctx.lineDashOffset = (Date.now() % 1000) / 20;
            }
            switch (o.kind) {
                case 'line': {
                    const m = gridSize / game_1.WorldZoom;
                    engine_2.ctx.beginPath();
                    engine_2.ctx.lineWidth = o.width * m;
                    engine_2.ctx.strokeStyle = hovered === o.id ? '#fb5b5b' : o.color;
                    engine_2.ctx.moveTo(o.startX * m - dx, o.startY * m - dy);
                    engine_2.ctx.lineTo(o.endX * m - dx, o.endY * m - dy);
                    engine_2.ctx.stroke();
                }
            }
            // reset
            if (selected[o.id]) {
                engine_2.ctx.setLineDash([]);
                engine_2.ctx.lineDashOffset = 0;
            }
        }
    }
    function drawTool() {
        switch (tool) {
            case 'pointer': return drawPointer();
            case 'line': return drawLine();
            case 'grab': return; // do nothing
        }
    }
    function drawPointer() {
        if (startPoint === undefined) {
            return;
        }
        const rect = normaliseRect({
            startX: startPoint.x,
            startY: startPoint.y,
            endX: engine_2.mouseX,
            endY: engine_2.mouseY
        });
        engine_2.ctx.beginPath();
        engine_2.ctx.lineWidth = 1;
        engine_2.ctx.strokeStyle = '#34495E';
        engine_2.ctx.strokeRect(rect.startX, rect.startY, rect.endX - rect.startX, rect.endY - rect.startY);
        if (engine_2.debug) {
            const m = game_1.WorldZoom / gridSize;
            const worldRec = normaliseRect({
                startX: (rect.startX + dx) * m,
                startY: (rect.startY + dy) * m,
                endX: (rect.endX + dx) * m,
                endY: (rect.endY + dy) * m
            });
            engine_2.ctx.beginPath();
            engine_2.ctx.fillStyle = 'darkred';
            engine_2.ctx.arc(rect.startX, rect.startY, 3, 0, 2 * Math.PI);
            engine_2.ctx.arc(rect.endX, rect.endY, 3, 0, 2 * Math.PI);
            engine_2.ctx.fill();
            engine_2.ctx.fillStyle = 'darkred';
            engine_2.ctx.font = '10px monospace';
            engine_2.ctx.fillText(`(${worldRec.startX.toFixed(2)}, ${worldRec.startY.toFixed(2)})`, rect.startX, rect.startY + 10);
            const msg = `(${worldRec.endX.toFixed(2)}, ${worldRec.endY.toFixed(2)})`;
            const dims = engine_2.ctx.measureText(msg);
            engine_2.ctx.fillText(msg, rect.endX - dims.width, rect.endY - 5 /* dims.fontBoundingBoxAscent */);
        }
    }
    function drawLine() {
        if (startPoint === undefined) {
            return;
        }
        const m = gridSize / game_1.WorldZoom;
        const end = applySnap({ x: engine_2.mouseX, y: engine_2.mouseY });
        engine_2.ctx.beginPath();
        engine_2.ctx.lineWidth = currentWidth * m;
        engine_2.ctx.strokeStyle = '#34495E';
        engine_2.ctx.moveTo(startPoint.x, startPoint.y);
        engine_2.ctx.lineTo(end.x, end.y);
        engine_2.ctx.stroke();
    }
    // this should be done before drawind the other objects
    function applyGrab() {
        if (startPoint === undefined) {
            return;
        }
        dx = tx + startPoint.x - engine_2.mouseX;
        dy = ty + startPoint.y - engine_2.mouseY;
    }
    function isInside(bigger, target) {
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
    function normaliseRect(x) {
        return {
            startX: Math.min(x.startX, x.endX),
            startY: Math.min(x.startY, x.endY),
            endX: Math.max(x.startX, x.endX),
            endY: Math.max(x.startY, x.endY)
        };
    }
});
define("index", ["require", "exports", "editor", "game", "engine"], function (require, exports, Editor, Game, engine_3) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    Editor = __importStar(Editor);
    Game = __importStar(Game);
    let KbShortcuts = [
        [toggleEditor, engine_3.isMac ? 'META + E' : 'CTRL + E'],
        [engine_3.toggleDebug, 'D'],
        [engine_3.toggleRun, 'S'],
    ];
    let isEditor = false;
    function toggleEditor() {
        isEditor = !isEditor;
        (0, engine_3.setGameObject)(isEditor ? Editor : Game);
    }
    window.onload = function () {
        (0, engine_3.setup)();
        (0, engine_3.registerShortcuts)(KbShortcuts);
        (0, engine_3.setGameObject)(Game);
    };
});
