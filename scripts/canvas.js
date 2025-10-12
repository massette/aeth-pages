export class Stage {
  element;
  layers;
  width;
  height;

  render(ev) {
    this.layers.forEach((layer) => {
      // clear canvas
      layer.context.resetTransform();
      layer.context.clearRect(0, 0, this.width, this.height);

      // callback for drawing to canvas
      layer.draw(layer.context, ev);
    });
  }

  call(funcName, ...args) {
    // iterate backwards from highest layer
    for (let i = this.layers.length - 1; i >= 0; i--) {
      if (this.layers[i][funcName])
        this.layers[i][funcName](...args);
    }

    // render changes in all layers
    this.render();
  }

  constructor(element) {
    this.element = element;
    this.element.classList.add("canvas-stage");

    this.layers = [];

    this.width = this.element.clientWidth;
    this.height = this.element.clientHeight;

    // attach layer events
    this.element.addEventListener("mousedown", (ev) =>
      this.call("mousedown", ev.offsetX, ev.offsetY, ev.button, ev));

    this.element.addEventListener("wheel", (ev) => 
      this.call("wheel", ev.offsetX, ev.offsetY, ev.deltaX, ev.deltaY, ev));

    this.element.addEventListener("mouseup",   (ev) =>
      this.call("mouseup", ev.offsetX, ev.offsetY, ev.button, ev));

    this.element.addEventListener("mousemove", (ev) => 
      this.call("mousemove", ev.offsetX, ev.offsetY, ev.buttons, ev));

    // attach window events
    window.addEventListener("resize", (ev) => {
      const oldWidth = this.width;
      const oldHeight = this.height;

      this.width = this.element.clientWidth;
      this.height = this.element.clientHeight;

      for (let i = this.layers.length - 1; i >= 0; i--) {
        this.layers[i].canvas.width = this.width;
        this.layers[i].canvas.height = this.height;

        if (this.layers[i].resize)
          this.layers[i].resize(this.width, this.height, oldWidth, oldHeight, ev);
      }

      this.render();
    });
  }

  addLayer(layer) {
    // add new layers to top of stack
    this.layers.push(layer);
    this.element.appendChild(layer.canvas);

    // force initial resize to stage dimensions
    layer.canvas.width = this.width;
    layer.canvas.height = this.height;

    // force rerender new layer
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

  draw(ctx) {
    throw new Error(`Cannot draw layer without declared draw function!`);
  }
}
