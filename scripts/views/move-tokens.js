import { Stage, Layer } from "/scripts/canvas.js";
import map from "/scripts/map.js";

/* */
const element = document.getElementById("tokens-stage");
export const stage = new Stage(element);

const mapLayer = new Layer();

export const peek = {
  x: 1167,
  y: 656,
  width: 1166,
  height: 656,
};

mapLayer.draw = function(ctx) {
  ctx.drawImage(map.image, peek.x, peek.y, peek.width, peek.height, 0, 0, stage.width, stage.height);
}

stage.addLayer(mapLayer);
map.register(stage);
