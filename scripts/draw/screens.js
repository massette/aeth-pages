import { Stage } from "/scripts/draw/canvas.js";
import { Rect } from "/scripts/draw/objects.js";
import { Transform, Translate, Scale } from "/scripts/draw/transform.js";
import { getActive, getMapImage } from "/scripts/call/maps.js";

/* CONSTANTS */
const style = getComputedStyle(document.body);
const U_REM = parseFloat(style.fontSize);

// layout
const VIEW_BORDER   = 0.20 * U_REM;

// colors
const COLOR_FG = style.getPropertyValue("--color-fg");
const COLOR_BG = style.getPropertyValue("--color-bg");

/* INITIALIZE MAP */
let active = await getActive().then(map => getMapImage(map));

/* INITIALIZE STAGE */
export const stage = new Stage();
const view = new Transform();
view.size = { x: 3500, y: 5180 };
let preview = { x: 0, y: 0, scale: 1.00 };

function to_view(x, y) {
    return {
        x: (x - VIEW_BORDER) / preview.scale - preview.x,
        y: (y - VIEW_BORDER) / preview.scale - preview.y,
    }
}

const objects = [
    new Rect(20, 20, 50, 50, view),
]
let next_op = null;

/* STAGE FUNCTIONS */
stage.resize = async function(width, height) {
    // update view limits
    view.limits.min.x = -view.size.x;
    view.limits.max.x =  view.size.x;
    view.limits.min.y = -view.size.y;
    view.limits.max.y =  view.size.y;

    view.limits.size.x = width  - 2 * VIEW_BORDER;
    view.limits.size.y = height - 2 * VIEW_BORDER;
    
    view.limits.padding.min.x = 2 * VIEW_BORDER - width ;
    view.limits.padding.min.y = 2 * VIEW_BORDER - height;
}
// -view.size.x + width

stage.updateMap = async function(map) {
    active = await getMapImage(map);

    // update view limits
    view.size.x = active.width;
    view.size.y = active.height;

    view.limits.min.x = -view.size.x;
    view.limits.max.x =  view.size.x;
    view.limits.min.y = -view.size.y;
    view.limits.max.y =  view.size.y;

    view.limits.size.x = stage.width  - 2 * VIEW_BORDER;
    view.limits.size.y = stage.height - 2 * VIEW_BORDER;
    
    view.limits.padding.min.x = 2 * VIEW_BORDER - stage.width ;
    view.limits.padding.min.y = 2 * VIEW_BORDER - stage.height;
}

let peak = 0;
stage.wheel = async function(mouse, ev) {
    const op = new Scale(view,
                         to_view(mouse.x, mouse.y),
                         { x: (preview.scale + ev.wheelDeltaY / 5000) * view.size.x, y: (preview.scale + ev.wheelDeltaY / 5000) * view.size.y });

    op.target.apply(op);
}

stage.mousedown = async function(mouse) {
    const { x: mx, y: my } = to_view(mouse.x, mouse.y);

    // check scale handles
    
    // otherwise, check translate handles
    let target = null;

    for (const object of objects) {
        let { x, y, scale } = object.preview(next_op);

        if (mx >= x && mx <= x + object.size.x * scale
         && my >= y && my <= y + object.size.y * scale) {
            target = object;
            break;
        }
    }

    // otherwise, target view
    next_op = new Translate(target ?? view);
}

stage.mousemove = async function(mouse) {
    if (next_op) {
        next_op.delta.x += mouse.dx / preview.scale;
        next_op.delta.y += mouse.dy / preview.scale;
    }
}

stage.mouseup = async function(mouse) {
    next_op?.target.apply(next_op);
    next_op = null;
}

/* MAP LAYER */
const mapLayer = stage.newLayer();

mapLayer.draw = async function(ctx) {
    ctx.save();
    ctx.translate(Math.floor(VIEW_BORDER), Math.floor(VIEW_BORDER));

    // apply transform
    preview = view.preview(next_op);
    if (active.width * preview.scale < stage.width - 2 * VIEW_BORDER)
        preview.x = ((stage.width  - 2 * VIEW_BORDER) / preview.scale - active.width ) / 2;

    if (active.height * preview.scale < stage.height - 2 * VIEW_BORDER)
        preview.y = ((stage.height - 2 * VIEW_BORDER) / preview.scale - active.height) / 2;

    ctx.scale(preview.scale, preview.scale);
    ctx.translate(preview.x , preview.y);

    // draw map
    ctx.fillStyle = "white";
    ctx.drawImage(active.image, 0, 0);

    // draw objects
    for (const object of objects) {
        object.draw(ctx, next_op);
    }
}

/* BOUNDS LAYER */
const boundsLayer = stage.newLayer();

boundsLayer.draw = async function(ctx) {
    ctx.reset()
    ctx.strokeStyle = COLOR_FG;
    ctx.lineWidth = VIEW_BORDER;

    const border_width  = Math.min(stage.width , active.width  * preview.scale + 2 * VIEW_BORDER);
    const border_height = Math.min(stage.height, active.height * preview.scale + 2 * VIEW_BORDER);

    ctx.strokeRect(
        (stage.width  - border_width ) / 2 + VIEW_BORDER / 2,
        (stage.height - border_height) / 2 + VIEW_BORDER / 2,
        border_width  - VIEW_BORDER, border_height - VIEW_BORDER
    );
}
