class Operation {
    target;
    anchor;
    delta;

    constructor(target, anchor, delta) {
        this.target = target;
        this.anchor = anchor;
        this.delta = delta ?? { x: 0, y: 0 };
    }

    position(x, y) { return { x, y }; }
    scale(s) { return s; }
    limit(limits) {}
}

export class Transform {
    size = { x: 1, y: 1 };

    x = 0;
    y = 0;
    scale = 1.00;
    
    ops_queue = [];

    limits = {
        min:     { x: 0, y: 0 },
        max:     { x: 100, y: 100 },
        size:    { x: 0, y: 0 },
        padding: {
            min: { x: 0, y: 0 },
            max: { x: 0, y: 0 },
        },
    };

    apply(op) {
        ({ x: this.x, y: this.y, scale: this.scale } = this.preview(op));
    }

    preview(op) {
        let state = this.ops_queue.reduce((acc, op) =>
            op.apply(acc.x, acc.y, acc.scale), this);

        if (op?.target == this) {
            op.limit(state.x, state.y, state.scale);
            state = op.apply(state.x, state.y, state.scale);
        }

        return state;
    }
}

export class Translate extends Operation {
    apply(x, y, scale) {
        return {
            x: x + this.delta.x,
            y: y + this.delta.y,
            scale,
        }
    }

    limit(x, y, scale) {
        this.delta.x = Math.min(
            Math.max(
                this.delta.x,
                this.target.limits.min.x - this.target.limits.padding.min.x / scale - x + 2
            ),
            this.target.limits.max.x - this.target.size.x + Math.trunc(this.target.limits.padding.max.x / scale) - x
        );

        this.delta.y = Math.min(
            Math.max(
                this.delta.y,
                this.target.limits.min.y - this.target.limits.padding.min.y / scale - y + 2
            ),
            this.target.limits.max.y - this.target.size.y + this.target.limits.padding.max.y / scale - y
        );
    }
}
export class Scale extends Operation {
    apply(x, y, scale) {
        const new_scale = Math.abs(Math.min(
            this.delta.x / this.target.size.x,
            this.delta.y / this.target.size.y,
        ));
        
        const test = (this.anchor.x + x) * (scale / new_scale) - this.anchor.x;

        return {
            x: Math.min(
                Math.max(
                    (this.anchor.x + x) * (scale / new_scale) - this.anchor.x,
                    this.target.limits.min.x - this.target.limits.padding.min.x / new_scale + 2,
                ),
                this.target.limits.max.x + this.target.limits.padding.max.x / new_scale - this.target.size.x
            ),
            y: Math.min(
                Math.max(
                    (this.anchor.y + y) * (scale / new_scale) - this.anchor.y,
                    this.target.limits.min.y - this.target.limits.padding.min.y / new_scale + 2,
                ),
                this.target.limits.max.y + this.target.limits.padding.max.y / new_scale - this.target.size.y
            ),
            scale: new_scale,
        };
    }

    limit() {
        this.delta.x = Math.max(
            Math.min(
                this.delta.x,
                Math.abs(this.target.limits.max.x + this.target.limits.padding.max.x
                    - this.target.limits.min.x + this.target.limits.padding.min.x)
            ),
            this.target.limits.size.x
        );
        this.delta.y = Math.max(
            Math.min(
                this.delta.y,
                Math.abs(this.target.limits.max.y + this.target.limits.padding.max.y
                    - this.target.limits.min.y + this.target.limits.padding.min.y)
            ),
            this.target.limits.size.y
        );
    }
}
