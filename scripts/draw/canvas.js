import { registerStage } from "/scripts/call/maps.js";

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

    async updateSize(width, height) {
        await this.call("resize", width, height);

        // update dimensions
        this.width  = width;
        this.height = height;

        // update layer dimensions
        for (const layer of this.layers) {
            layer.canvas.width = this.width;
            layer.canvas.height = this.height;
        }

        // force graphical update
        this.render()
    }
    
    async call(fn, ...args) {
        // try to call function on layers
        await Promise.all(this.layers.map(layer =>
            (layer[fn]) ? layer[fn](...args)
                        : Promise.resolve()));


        // try to call function on self
        if (this[fn])
            await this[fn](...args);
    }

    async updateMouse(x, y, buttons) {
        // bound click coords
        const in_bounds = (x >= 0) && (x <= this.width)
                       && (y >= 0) && (y <= this.height);

        // update position
        this.mouse.dx = x - this.mouse.x;
        this.mouse.dy = y - this.mouse.y;

        this.mouse.x  = x;
        this.mouse.y  = y;

        // ignore mouse movements originating out of bounds
        const moved = (this.mouse.buttons || in_bounds) && (this.mouse.dx || this.mouse.dy);
        if (moved)
            await this.call("mousemove", this.mouse);

        // update buttons
        const pressed  = in_bounds ? (buttons & ~this.mouse.buttons) : 0; // 0 -> 1
        const released = (~buttons & this.mouse.buttons); // 1 -> 0
        this.mouse.buttons = buttons;

        // ignore clicks that start out of bounds
        if (pressed) 
            await this.call("mousedown", this.mouse, pressed);

        if (released)
            await this.call("mouseup", this.mouse, released);

        // check for changes
        if (pressed || released || moved) {
            // force update graphical state
            this.render();
        }
    }

    async attach(id) {
        this.container = document.getElementById(id);
        this.container.classList.add("canvas-stage");

        // force resize to new size
        await this.call("updateSize", this.container.clientWidth, this.container.clientHeight)
        
        // attach all layers
        for (const layer of this.layers) {
            this.container.append(layer.canvas);
        }

        // local input events
        this.container.addEventListener("mousedown", (ev) =>
            this.updateMouse(ev.offsetX, ev.offsetY, ev.buttons));

        this.container.addEventListener("wheel", async (ev) => {
            await this.call("wheel", this.mouse, ev)
            this.render();
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

        window.addEventListener("resize", async (ev) => {
            await this.call("updateSize",
                this.container.clientWidth, this.container.clientHeight);
        });

        registerStage(this);
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
