
import * as Editor from './editor'
import * as Game from './game'

import { Shortcut } from './keyboard'
import { setup, setGameObject, registerShortcuts, toggleRun, toggleDebug, isMac } from './engine'

let KbShortcuts: Shortcut[] = [
    [toggleEditor, isMac ? 'META + E' : 'CTRL + E'],
    [toggleDebug,  'D'],
    [toggleRun,    'S'],
];

let isEditor = false;

function toggleEditor() {
    isEditor = !isEditor;

    setGameObject(isEditor ? Editor : Game);
}

window.onload = function() {
    setup();
    registerShortcuts(KbShortcuts);
    setGameObject(Game);
};
