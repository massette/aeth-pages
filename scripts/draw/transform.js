import { LAYOUT } from "/scripts/styles.js";

class Operation {
    anchor;
    delta;

    constructor(anchor, delta) {
        this.anchor = anchor ?? null;
        this.delta = delta ?? { x: 0, y: 0 };
    }

    apply(target) {
        return target;
    }
}

export class Translate extends Operation {
    apply(target) {
        const x = target.x + this.delta.x;
        const y = target.y + this.delta.y;

        return { ...target, x, y };
    }
}

export class Scale extends Operation {
    size;

    apply(target) {
        const size = this.size ?? target.size;

        const scale = Math.max(
            Math.abs(this.delta.x / size.x),
            Math.abs(this.delta.y / size.y),
        );

        const x = target.x - (this.anchor.x - target.x) * (scale / target.scale) + (this.anchor.x - target.x);
        const y = target.y - (this.anchor.y - target.y) * (scale / target.scale) + (this.anchor.y - target.y);

        return { ...target, x, y, scale };
    }
}

class Limit extends Operation {
    constructor(fixed) {
        super();
        this.fixed = fixed;
    }
}

class LimitWithin extends Limit {
    apply(target) {
        const scale = Math.min(
            target.scale,
            this.fixed.size.x / target.size.x,
            this.fixed.size.y / target.size.y,
        );

        const x = Math.min(
            Math.max(target.x, this.fixed.x),
            this.fixed.x + this.fixed.size.x - target.size.x * scale,
        );

        const y = Math.min(
            Math.max(target.y, this.fixed.y),
            this.fixed.y + this.fixed.size.y - target.size.y * scale,
        );

        return { ...target, x, y, scale };
    }
}

class LimitContain extends Limit {
    apply(target) {
        const scale = Math.max(
            target.scale,
            Math.min(
                this.fixed.size.x / target.size.x,
                this.fixed.size.y / target.size.y,
            ),
        );

        const x = Math.max(
            Math.min(target.x, this.fixed.x),
            this.fixed.x + this.fixed.size.x - target.size.x * scale,
        );

        const y = Math.max(
            Math.min(target.y, this.fixed.y),
            this.fixed.y + this.fixed.size.y - target.size.y * scale,
        );

        return { ...target, x, y, scale };
    }
}

class Limits extends Operation {
    limits = [];

    clear() {
        this.limits = [];
    }

    within(fixed) {
        this.limits.push(new LimitWithin(fixed));
    }

    contain(fixed) {
        this.limits.push(new LimitContain(fixed));
    }

    apply(target) {
        return this.limits.reduce((acc, limit) => limit.apply(acc), target);
    }
}

export class Transform {
    size = { x: 0, y: 0 };

    x = 0;
    y = 0;
    scale = 1.00;

    limits = {
        min:     { x: null, y: null, scale: null, size: { x: null, y: null }},
        max:     { x: null, y: null, scale: null, size: { x: null, y: null }},
    };

    constructor(container) {
        this.limits = new Limits();

        if (container)
            this.limits.within(container);
    }

    point(x, y, op) {
        const trans = op ? this.preview(op)
                         : this;

        return {
            x: (x + trans.x) * trans.scale, 
            y: (y + trans.y) * trans.scale,
        };
    }

    inverse(x, y, op) {
        const trans = op ? this.preview(op)
                         : this;

        return {
            x: (x - trans.x) / trans.scale,
            y: (y - trans.y) / trans.scale,
        };
    }

    apply(...ops) {
        ({ x: this.x, y: this.y, scale: this.scale } = this.preview(...ops));
    }

    preview(...ops) {
        const trans = ops.reduce((acc, op) => op.apply(acc), this);
        return this.limits.apply(trans);
    }

    checkScale(x, y, op) { return null; }
    checkTranslate(x, y, op) { return null; }
}
