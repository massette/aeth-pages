import { Transform } from "/scripts/draw/transform.js";

export class Screen extends Transform {
    draw(ctx, next_op) {
        const { x, y, scale } = this.preview(next_op);
        ctx.fillRect(x - scale, y - scale, 2 * scale, 2 * scale);
    }
}
