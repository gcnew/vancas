
import {
    canvas, ctx,

    width, height, clickX, clickY, mouseX, mouseY,
} from './engine'

export const WorldZoom = 20;

export function setup() {
}

export function tearDown() {
}

export function draw() {
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = 'darkred';
    ctx.font = '10px Arial';
    ctx.fillText('High DPI Canvas!', 10, 20);
}
