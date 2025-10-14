import { Stage, Layer } from "/scripts/canvas.js";
import map from "/scripts/map.js";

/* */
const element = document.getElementById("tokens-stage");
export const stage = new Stage(element);

const mapLayer = new Layer();

// screen properties
const SC_WIDTH  = 1024;
const SC_HEIGHT = 600;

const peek = {
  x: 0,
  y: 0,
  width: 10,
  height: 10,
};

export function set_peek(screens, i) {
  const sc = screens.screens[i];

  peek.x = screens.x + sc.x * SC_WIDTH  * screens.scale;
  peek.y = screens.y + sc.y * SC_HEIGHT * screens.scale;
  peek.width  = SC_WIDTH  * screens.scale;
  peek.height = SC_HEIGHT * screens.scale;

  stage.render();
}

mapLayer.draw = function(ctx) {
  ctx.drawImage(map.image, peek.x, peek.y, peek.width, peek.height, 0, 0, stage.width, stage.height);
}

stage.addLayer(mapLayer);
map.register(stage);
