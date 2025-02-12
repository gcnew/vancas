
export const KeyMap = {
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

export type Shortcut = [() => void, string]

export function normaliseShortcut(sc: string) {
    const prio = [ 'META', 'CTRL', 'ALT', 'SHIFT' ];

    return sc
        .toUpperCase()
        .split(/\s*\+\s*/g)
        .sort(x => {
            const idx = prio.indexOf(x);
            return idx !== -1 ? idx : x.charCodeAt(0);
        })
        .join('+');
}
