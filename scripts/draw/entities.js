import { Transform, Translate, Scale } from "/scripts/draw/transform.js";
import { setScreensState } from "/scripts/call/screens.js";
import { getFileImage } from "/scripts/call/files.js";
import { updateEntity } from "/scripts/call/entities.js";

import { LAYOUT, COLORS } from "/scripts/styles.js";

export class Token extends Transform {
    entity;
    image;

    constructor(entity, container) {
        super(container);

        this.entity = entity;
        this.x = entity.x;
        this.y = entity.y;
        this.scale = entity.scale;

        getFileImage(entity.FileId).then(image => {
            this.image = image.image;
            this.size.x = image.width;
            this.size.y = image.height;
        });
    }

    draw(ctx, next_op) {
        const trans = next_op ? this.preview(next_op)
                              : this;

        ctx.translate(trans.x, trans.y);
        ctx.scale(trans.scale, trans.scale);

        if (this.image) {
            ctx.drawImage(this.image, 0, 0);
        }
    }

    apply(...ops) {
        super.apply(...ops);

        this.entity.x = this.x;
        this.entity.y = this.y;
        this.entity.scale = this.scale;

        updateEntity(this.entity);
    }

    draw_handles(ctx, next_op) {
        const trans = next_op ? this.preview(next_op)
                              : this;

        ctx.translate(trans.x, trans.y);
        ctx.scale(trans.scale, trans.scale);

        ctx.strokeStyle = COLORS.SELECT.STROKE;
        ctx.lineWidth   *= LAYOUT.SELECT.BORDER / trans.scale;
        ctx.strokeRect(0, 0, this.size.x, this.size.y);

        ctx.fillStyle = COLORS.SELECT.FILL;
        const size = LAYOUT.HANDLE * (ctx.lineWidth / LAYOUT.SELECT.BORDER);
        for (const x of [ 0, this.size.x ]) {
            for (const y of [ 0, this.size.y ]) {
                ctx.fillRect(x - size / 2, y - size / 2, size, size);
            }
        }
    }

    checkTranslate(x, y, op) {
        const trans = op ? this.preview(op)
                         : this;

        if (x >= this.x && x <= this.x + this.size.x * this.scale
         && y >= this.y && y <= this.y + this.size.y * this.scale) {
            return new Translate();
        }

        return null;
    }

    checkScale(x, y, size, op) {
        const trans = op ? this.preview(op)
                         : this;

        for (const xx of [trans.x, trans.x + trans.size.x * trans.scale]) {
            for (const yy of [trans.y, trans.y + trans.size.y * trans.scale]) {
                if (x >= xx - size / 2 && x <= xx + size / 2
                 && y >= yy - size / 2 && y <= yy + size / 2) {
                    const anchor = {
                        x: trans.x + (trans.size.x * trans.scale) - (x - trans.x),
                        y: trans.y + (trans.size.y * trans.scale) - (y - trans.y),
                    };

                    const delta = {
                        x: x - anchor.x,
                        y: y - anchor.y,
                    };

                    return new Scale(anchor, delta);
                }
            }
        }
        
        return null;
    }
}

export class Screens extends Transform {
    shape;
    points;

    active;
    dirty;
    peek;

    constructor(container, shape) {
        super(container);

        this.updateShape(shape ?? []);
    }

    updateShape(shape) {
        if (this.dirty)
            return;

        let x = Math.min.apply(Math, shape.map(rect => rect.x));
        let y = Math.min.apply(Math, shape.map(rect => rect.y));

        const scale = (shape[0]?.width ?? LAYOUT.SCREEN.WIDTH) / LAYOUT.SCREEN.WIDTH;

        this.shape = shape.map(rect => ({
            x: (rect.x - x) / scale,
            y: (rect.y - y) / scale,
        }));

        // update size
        this.size.x = Math.max.apply(Math, this.shape.map(rect => rect.x + LAYOUT.SCREEN.WIDTH ).concat(1));
        this.size.y = Math.max.apply(Math, this.shape.map(rect => rect.y + LAYOUT.SCREEN.HEIGHT).concat(1));

        let active;
        for (const rect of this.shape) {
            // update active
            if (this.active && rect.id == this.active.id) {
                active = rect;
            }
        }

        // preseve position of selected screen
        if (active && this.active) {
            x += this.active.x - active.x;
            y += this.active.y - active.y;
        }

        ({ x: this.x, y: this.y, scale: this.scale } = this.limits.apply({ ...this, x, y, scale }));
        this.active = active ?? this.shape[0];
    }

    apply(...ops) {
        super.apply(...ops);

        const actuals = this.shape.map(rect => ({
            id: rect.id,
            x: this.x + rect.x * this.scale,
            y: this.y + rect.y * this.scale,
            width:  LAYOUT.SCREEN.WIDTH  * this.scale,
            height: LAYOUT.SCREEN.HEIGHT * this.scale,
        }));

        console.log(actuals);

        setScreensState(actuals).then(() => {
            // this.dirty = false;
        });
    }

    draw(ctx, op) {
        if (!this.active)
            return;

        const trans = op ? this.preview(op)
                         : this;
        const path = new Path2D();

        for (const rect of this.shape) {
            path.rect(rect.x, rect.y, LAYOUT.SCREEN.WIDTH, LAYOUT.SCREEN.HEIGHT);
        }


        ctx.translate(trans.x, trans.y);
        ctx.scale(trans.scale, trans.scale);

        ctx.fillStyle   = COLORS.SCREEN.FILL;
        ctx.fill(path);

        ctx.strokeStyle = COLORS.SCREEN.STROKE;
        ctx.lineWidth   *= LAYOUT.SCREEN.BORDER / trans.scale;
        ctx.stroke(path);
    }

    draw_handles(ctx, op) {
        if (!this.active)
            return;

        const trans = op ? this.preview(op)
                         : this;

        ctx.translate(trans.x, trans.y);
        ctx.scale(trans.scale, trans.scale);

        ctx.strokeStyle = COLORS.SELECT.STROKE;
        ctx.lineWidth   *= LAYOUT.SELECT.BORDER / trans.scale;
        ctx.strokeRect(this.active.x, this.active.y, LAYOUT.SCREEN.WIDTH, LAYOUT.SCREEN.HEIGHT);

        ctx.fillStyle = COLORS.SELECT.FILL;
        const size = LAYOUT.HANDLE * (ctx.lineWidth / LAYOUT.SELECT.BORDER);
        for (const x of [ this.active.x, this.active.x + LAYOUT.SCREEN.WIDTH ]) {
            for (const y of [ this.active.y, this.active.y + LAYOUT.SCREEN.HEIGHT ]) {
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

            if (x >= xx && x <= xx + LAYOUT.SCREEN.WIDTH  * trans.scale
             && y >= yy && y <= yy + LAYOUT.SCREEN.HEIGHT * trans.scale) {
                this.active = rect;
                this.dirty = true;
                return new Translate();
            }
        }

        return null;
    }

    checkScale(x, y, size, op) {
        if (!this.active)
            return;

        for (const xx of [
            this.x + this.active.x * this.scale,
            this.x + (this.active.x + LAYOUT.SCREEN.WIDTH) * this.scale
        ]) {
            for (const yy of [
                this.y + this.active.y * this.scale,
                this.y + (this.active.y + LAYOUT.SCREEN.HEIGHT) * this.scale
            ]) {
                if (x >= xx - size / 2 && x <= xx + size / 2
                 && y >= yy - size / 2 && y <= yy + size / 2) {
                    const anchor = {
                        x: this.x + (this.active.x + LAYOUT.SCREEN.WIDTH) * this.scale
                            - (xx - (this.x + this.active.x * this.scale)),
                        y: this.y + (this.active.y + LAYOUT.SCREEN.HEIGHT) * this.scale
                            - (yy - (this.y + this.active.y * this.scale)),
                    };

                    const delta = {
                        x: x - anchor.x,
                        y: y - anchor.y,
                    };

                    const op = new Scale(anchor, delta);
                    op.size = { x: LAYOUT.SCREEN.WIDTH, y: LAYOUT.SCREEN.HEIGHT };

                    return op;
                }
            }
        }
        
        return null;
    }
}

