export class Stage {
    constainer;

    width;
    height;

    layers = [];
    mouse = {
        x: 0, y: 0,
        dx: 0, dy: 0,
        buttons: 0,
    };

    newLayer() {
        const layer = new Layer();

        // add layer to top of stack
        this.layers.push(layer);

        if (this.container)
            this.container.appendChild(layer.canvas);

        // initialize layer
        layer.canvas.width  = this.width;
        layer.canvas.height = this.height;

        return layer;
    }

    render(ev) {
        // draw all layers
        for (const layer of this.layers) {
            // reset canvas
            layer.context.resetTransform();
            layer.context.clearRect(0, 0, this.width, this.height);

            // try to draw canvas
            if (layer.draw)
                layer.draw(layer.context, ev);
        }
    }

    resize(ev) {
        const oldWidth  = this.width;
        const oldHeight = this.height;

        // update dimensions
        this.width  = this.container.clientWidth;
        this.height = this.container.clientHeight;

        // update layer dimensions
        for (const layer of this.layers) {
            layer.canvas.width = this.width;
            layer.canvas.height = this.height;
        }

        // force graphical update
        this.render()
    }
    
    call(fn, ...args) {
        // try to call function on layers
        for (const layer of this.layers) {
            if (layer[fn])
                layer[fn](...args);
        }

        // try to call function on self
        if (this[fn])
            this[fn](...args);
    }

    updateMouse(x, y, buttons) {
        // bound click coords
        const in_bounds = (x >= 0) && (x <= this.width)
                       && (y >= 0) && (y <= this.height);

        if (!in_bounds) {
            x = Math.min(
                Math.max(x, 0),
                this.width,
            );

            y = Math.min(
                Math.max(y, 0),
                this.height,
            );
        }

        // update position
        this.mouse.dx = x - this.mouse.x;
        this.mouse.dy = y - this.mouse.y;

        this.mouse.x  = x;
        this.mouse.y  = y;

        // update buttons
        const pressed  = in_bounds ? (buttons & ~this.mouse.buttons) : 0; // 0 -> 1
        const released = (~buttons & this.mouse.buttons); // 1 -> 0
        this.mouse.buttons = buttons;

        // ignore clicks that start out of bounds
        if (pressed) 
            this.call("mousedown", this.mouse, pressed);

        if (released)
            this.call("mouseup", this.mouse, released);

        // ignore mouse movements originating out of bounds
        const moved = (this.mouse.buttons || in_bounds) && (this.mouse.dx || this.mouse.dy);
        if (moved)
            this.call("mousemove", this.mouse);

        // check for changes
        if (pressed || released || moved) {
            // force update graphical state
            this.render();
        }
    }

    attach(id) {
        this.container = document.getElementById(id);
        this.container.classList.add("canvas-stage");

        // force resize to new size
        this.resize()
        
        // attach all layers
        for (const layer of this.layers) {
            this.container.append(layer.canvas);
        }

        // local input events
        this.container.addEventListener("mousedown", (ev) => {
            // update mouse state
            this.updateMouse(ev.offsetX, ev.offsetY, ev.buttons);

            this.call("mousedown", this.mouse, ev);
            this.call("mouseup", this.mouse, ev);
        });

        this.container.addEventListener("wheel", (ev) => {
            this.call("wheel", this.mouse, ev);
        });

        // page input events
        window.addEventListener("mouseup", (ev) => {
            // update mouse state
            const rect = this.container.getBoundingClientRect();
            this.updateMouse(
                ev.clientX - rect.left,
                ev.clientY - rect.top,
                ev.buttons
            );

        });

        window.addEventListener("mousemove", (ev) => {
            // update mouse state
            const rect = this.container.getBoundingClientRect();
            this.updateMouse(
                ev.clientX - rect.left,
                ev.clientY - rect.top,
                this.mouse.buttons
            );
        });

        window.addEventListener("resize", (ev) => {
            this.call("resize",
                this.container.clientWidth, this.container.clientHeight, this.width, this.height, ev);
        });
    }
}

// internal canvas abstraction
class Layer {
    canvas;
    context;

    constructor() {
        // create new canvas
        this.canvas = document.createElement("canvas");
        this.canvas.className = "canvas-layer";

        // initialize grapahics context
        this.context = this.canvas.getContext("2d");
    }
}
