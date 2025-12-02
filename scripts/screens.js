import { Canvas } from "/scripts/draw/canvas.js";
import { Screens } from "/scripts/draw/entities.js";
import { Transform, Translate, Scale } from "/scripts/draw/transform.js";
import { getActive, getMapImage, getMapEntities } from "/scripts/call/maps.js";
import { getScreensState } from "/scripts/call/screens.js";

import { COLORS, LAYOUT } from "/scripts/styles.js";

/* INITIALIZE MAP */
let active = await getActive().then(map => getMapImage(map));

/* INITIALIZE STAGE */
export const canvas = new Canvas();

const view = new Transform();
view.size.x = active.width;
view.size.y = active.height;

const view_limit = {
    x: 0,
    y: 0,
    size: view.size,
}

const next = {
    op: null,
    target: null,
};

function try_preview(target) {
    if (next.op && target == next.target)
        return target.preview(next.op);

    return target;
}

/* POLLING */
const POLL_INTERVAL = 2_000;

export const screens = new Screens(view_limit);
next.target = screens;

async function updateScreens() {
    await getScreensState().then(shape => screens.updateShape(shape));
    canvas.render();
}

const entities = [];

async function updateEntities() {
    
}

updateScreens();

setInterval(() => {
    updateScreens();
}, POLL_INTERVAL);

/* STAGE FUNCTIONS */
canvas.resize = async function(width, height) {
    // update view limits
    view.limits.clear();
    view.limits.contain({
        x: 0,
        y: 0,
        size: {
            x: width  - 2 * LAYOUT.VIEW.BORDER,
            y: height - 2 * LAYOUT.VIEW.BORDER,
        },
    });

    // update zoom
    const scale_factor = Math.max(
        width  / canvas.size.x,
        height / canvas.size.y,
    );

    view.scale *= scale_factor;
    view.x *= scale_factor;
    view.y *= scale_factor;

    view.apply(view.limits);
}

canvas.updateMap = async function(map) {
    active = await getMapImage(map);

    // update view limits
    view.size.x = active.width;
    view.size.y = active.height;
    
    // reset view transform
    view.x = 0;
    view.y = 0;
    view.scale  = -Infinity;

    view.apply(view.limits);
}

canvas.wheel = async function(mouse, ev) {
    const v = try_preview(view);

    const anchor = {
        x: mouse.x,
        y: mouse.y,
    };

    const delta  = {
        x: (v.scale + ev.wheelDeltaY / 5000) * v.size.x,
        y: (v.scale + ev.wheelDeltaY / 5000) * v.size.y,
    };

    const op = new Scale(anchor, delta);
    view.apply(op);
}

canvas.mousedown = async function(mouse) {
    const m = view.inverse(
        mouse.x - LAYOUT.VIEW.BORDER,
        mouse.y - LAYOUT.VIEW.BORDER,
        (next.target == view) ? next.op : null
    );

    // check scale handles
    if (next.target && next.target != view) {
        const op = next.target.checkScale(m.x, m.y, LAYOUT.HANDLE / view.scale, next.op);

        if (op) {
            next.op = op;
            return;
        }
    }
    
    // otherwise, translate
    const entities = [ screens ];
    
    for (const entity of entities) {
        const op = entity.checkTranslate(m.x, m.y, (entity == next.target) ? next.op : null);

        if (op) {
            next.op = op;
            next.target = entity;
            return;
        }
    }

    // otherwise pan
    next.op = new Translate();
    next.target = view;
}

canvas.mousemove = async function(mouse) {
    if (next.op) {
        if (next.target == view) {
            next.op.delta.x += mouse.dx;
            next.op.delta.y += mouse.dy;
        } else {
            const v = try_preview(view);

            next.op.delta.x += mouse.dx / v.scale;
            next.op.delta.y += mouse.dy / v.scale;
        }
    }
}

canvas.mouseup = async function(mouse) {
    next.target?.apply(next.op);
    next.op = null;
}

/* MAP LAYER */
canvas.draw = async function(ctx) {
    // calculate transform
    const v = try_preview(view);

    if (active.width  * v.scale + 2 * LAYOUT.VIEW.BORDER < canvas.size.x) {
        view.x = (canvas.size.x - active.width * v.scale - 2 * LAYOUT.VIEW.BORDER) / 2;
        v.x = view.x;
    }

    if (active.height * v.scale + 2 * LAYOUT.VIEW.BORDER < canvas.size.y) {
        view.y = (canvas.size.y - active.height * v.scale - 2 * LAYOUT.VIEW.BORDER) / 2;
        v.y = view.y;
    }

    // calculate border
    const view_border = new Path2D();
    view_border.rect(
        Math.max(0, v.x) + LAYOUT.VIEW.BORDER / 2,
        Math.max(0, v.y) + LAYOUT.VIEW.BORDER / 2,
        Math.min(v.size.x * v.scale + LAYOUT.VIEW.BORDER, canvas.size.x - LAYOUT.VIEW.BORDER),
        Math.min(v.size.y * v.scale + LAYOUT.VIEW.BORDER, canvas.size.y - LAYOUT.VIEW.BORDER),
    );

    // apply transform
    ctx.reset();
    ctx.save();
    ctx.clip(view_border, "evenodd");
    ctx.translate(LAYOUT.VIEW.BORDER, LAYOUT.VIEW.BORDER);

    ctx.translate(v.x , v.y);
    ctx.scale(v.scale, v.scale);

    // draw map
    ctx.drawImage(active.image, 0, 0);

    // draw entities
    const entities = [ screens ];

    ctx.lineWidth = 1 / view.scale;
    for (const entity of entities) {
        ctx.save();
        if (next.target == entity) {
            entity.draw(ctx, next.op);
        } else {
            entity.draw(ctx);
        }
        ctx.restore();
    }

    // draw border
    if (next.target && next.target != view) {
        ctx.save();
        next.target.draw_handles(ctx, next.op);
        ctx.restore();
    }

    ctx.restore();
    ctx.strokeStyle = COLORS.FG;
    ctx.lineWidth = LAYOUT.VIEW.BORDER;
    ctx.stroke(view_border);
}
