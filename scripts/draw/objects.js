import { Transform } from "/scripts/draw/transform.js"

/* CONSTANTS */
const style = getComputedStyle(document.body);
const U_REM = parseFloat(style.fontSize);

// layout
const SELECT_BORDER = 0.20 * U_REM;
const SCALE_HANDLE  = 0.50 * U_REM;

export class Rect extends Transform {
    constructor(x, y, width, height, container) {
        super();

        this.x = x;
        this.y = y;
        this.size.x = width;
        this.size.y = height;

        this.limits.max = container.size;
    }

    draw(ctx, next_op) {
        const { x, y, scale } = this.preview(next_op);

        ctx.fillStyle = "red";
        ctx.fillRect(x, y, scale * this.size.x, scale * this.size.y);

        if (next_op?.target == this) {
            ctx.strokeStyle = "#FFF";
            ctx.strokeWidth = SELECT_BORDER;
            ctx.strokeRect(x, y, scale * this.size.x, scale * this.size.y);
        }
    }
}

class Token extends Transform {
    image;

    draw(ctx, next_op) {}
}
