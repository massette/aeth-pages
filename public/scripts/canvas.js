// group of stacked canvases
export class Stage {
  container;
  layers = [];

  width;
  height;

  call(name, ...args) {
    for (const layer of this.layers) {
      if (layer[name]) {
        layer[name](...args);
      }
    }
  }

  render() {
    // draw layers
    for (const layer of this.layers) {
      layer.context.resetTransform();
      layer.context.clearRect(0, 0, layer.canvas.width, layer.canvas.height);

      if (!layer.draw)
        throw new Error("Cannot render layer with no draw function");

      layer.draw(layer.context);
    }
  }

  constructor(container) {
    this.container = container;
    this.container.classList.add("canvas-stage");

    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;

    /* EVENT CALLBACKS */
    // TODO: centralize non-canvas events on the stage
    this.container.addEventListener("mousedown", (ev) => {
      this.call("mousedown", ev.offsetX, ev.offsetY, ev.button, ev);
      this.render();
    });

    this.container.addEventListener("wheel", (ev) => {
      this.call("wheel", ev.offsetX, ev.offsetY, ev.deltaX, ev.deltaY, ev);
      this.render();
    });

    this.container.addEventListener("mouseup",   (ev) => {
      this.call("mouseup", ev.offsetX, ev.offsetY, ev.button, ev);
      this.render();
    });

    this.container.addEventListener("mousemove", (ev) => {
      this.call("mousemove", ev.offsetX, ev.offsetY, ev.buttons, ev);
      this.render();
    });

    window.addEventListener("resize", (ev) => {
      this.width = this.container.clientWidth;
      this.height = this.container.clientHeight;

      this.call("resize", this.width, this.height);
      this.render();
    });
  }

  add(layer) {
    this.container.appendChild(layer.canvas);
    this.layers.push(layer);

    // force resize to initial stage dimensions
    if (layer.resize)
      layer.resize(this.container.clientWidth, this.container.clientHeight);
    
    // note: canvas not cleared before initial draw
    if (layer.draw)
      layer.draw(layer.context);
  }
}

// canvas abstraction
export class Layer {
  canvas;
  context;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "canvas-layer";

    this.context = this.canvas.getContext("2d");
  }

  // set canvas dimensions
  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
  }
}

// box with transform
export class Rect {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    this.scale = 1;
  }

  draw(ctx) {
    ctx.fillStyle = "#00F5";
    ctx.fillRect(this.x, this.y, this.width * this.scale, this.height * this.scale);

    ctx.strokeStyle = "#00F";
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.width * this.scale, this.height * this.scale);
  }

  drawHandles(ctx) {

    ctx.strokeStyle = "#FFF";
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.width * this.scale, this.height * this.scale);

    const radius = 3;
    ctx.fillStyle = "#FFF";
    const left = this.x - radius;
    const right = this.x + this.width * this.scale - radius;
    const top = this.y - radius;
    const bottom = this.y + this.height * this.scale - radius;

    ctx.fillRect(left, top, 2 * radius, 2 * radius);
    ctx.fillRect(right, top, 2 * radius, 2 * radius);
    ctx.fillRect(left, bottom, 2 * radius, 2 * radius);
    ctx.fillRect(right, bottom, 2 * radius, 2 * radius);
  }

  contains(x, y) {
    return (x >= this.x) && (x < this.x + this.width * this.scale)
        && (y >= this.y) && (y < this.y + this.height * this.scale);
  }
}

// image with transform
