import { Transform, Translate, Scale } from "/scripts/draw/transform.js";
import { LAYOUT, COLORS } from "/scripts/styles.js";

export class Token extends Transform {
    image;

    draw(ctx, next_op) {}
}

export class Screens extends Transform {
    shape;
    points;

    active;

    constructor(container, shape) {
        super(container);

        this.updateShape(shape ?? [{ x:0, y:0, width:1024, height:600 }]);
    }

    updateShape(shape) {
        // update size
        const left   = Math.min.apply(Math, shape.map(shape => shape.x));
        const right  = Math.max.apply(Math, shape.map(shape => shape.x + shape.width));
        const top    = Math.min.apply(Math, shape.map(shape => shape.y));
        const bottom = Math.max.apply(Math, shape.map(shape => shape.y + shape.height));

        this.size.x = right - left;
        this.size.y = bottom - top;

        this.apply(this.limits);

        // update shape
        this.shape = shape;

        let active;
        for (const rect of this.shape) {
            rect.x -= left;
            rect.y -= top;

            // update active
            if (this.active && rect.x == this.active.x && rect.y == this.active.y) {
                active = rect;
            }
        }

        // update screens position
        if (active && this.active) {
            this.x += this.active.x - active.x;
            this.y += this.active.y - active.y;
        } else {
            this.active = active ?? this.shape[0];
        }
    }

    apply(...ops) {
        super.apply(...ops);
    }

    draw(ctx, op) {
        const trans = op ? this.preview(op)
                         : this;
        const path = new Path2D();

        for (const rect of this.shape)
            path.rect(rect.x, rect.y, rect.width, rect.height);

        ctx.translate(trans.x, trans.y);
        ctx.scale(trans.scale, trans.scale);

        ctx.fillStyle   = COLORS.SCREEN.FILL;
        ctx.fill(path);

        ctx.strokeStyle = COLORS.SCREEN.STROKE;
        ctx.lineWidth   *= LAYOUT.SCREEN.BORDER / trans.scale;
        ctx.stroke(path);
    }

    draw_handles(ctx, op) {
        const trans = op ? this.preview(op)
                         : this;

        ctx.translate(trans.x, trans.y);
        ctx.scale(trans.scale, trans.scale);

        ctx.strokeStyle = COLORS.SELECT.STROKE;
        ctx.lineWidth   *= LAYOUT.SELECT.BORDER / trans.scale;
        ctx.strokeRect(this.active.x, this.active.y, this.active.width, this.active.height);

        ctx.fillStyle = COLORS.SELECT.FILL;
        const size = LAYOUT.HANDLE * (ctx.lineWidth / LAYOUT.SELECT.BORDER);
        for (const x of [ this.active.x, this.active.x + this.active.width ]) {
            for (const y of [ this.active.y, this.active.y + this.active.height ]) {
                ctx.fillRect(x - size / 2, y - size / 2, size, size);
            }
        }
    }

    checkTranslate(x, y, op) {
        const trans = op ? this.preview(op)
                         : this;

        for (const rect of this.shape) {
            const xx = trans.x + rect.x * trans.scale;
            const yy = trans.y + rect.y * trans.scale;

            if (x >= xx && x <= xx + rect.width  * trans.scale
             && y >= yy && y <= yy + rect.height * trans.scale) {
                this.active = rect;
                return new Translate();
            }
        }

        return null;
    }

    checkScale(x, y, size, op) {
        for (const xx of [
            this.x + this.active.x * this.scale,
            this.x + (this.active.x + this.active.width) * this.scale
        ]) {
            for (const yy of [
                this.y + this.active.y * this.scale,
                this.y + (this.active.y + this.active.height) * this.scale
            ]) {
                if (x >= xx - size / 2 && x <= xx + size / 2
                 && y >= yy - size / 2 && y <= yy + size / 2) {
                    const anchor = {
                        x: this.x + (this.active.x + this.active.width) * this.scale
                            - (xx - (this.x + this.active.x * this.scale)),
                        y: this.y + (this.active.y + this.active.height) * this.scale
                            - (yy - (this.y + this.active.y * this.scale)),
                    };

                    const delta = {
                        x: x - anchor.x,
                        y: y - anchor.y,
                    };

                    const op = new Scale(anchor, delta);
                    op.size = { x: this.active.width, y: this.active.height };

                    return op;
                }
            }
        }
        
        return null;
    }
}

