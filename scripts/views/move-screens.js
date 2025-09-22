import { Stage, Layer } from "/scripts/canvas.js";
import { Map } from "/scripts/map.js";
// import { peek } from "/scripts/views/move-peek.js";

/* CONSTANTS */
// unit constants
const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);

/*  */
const element = document.getElementById("views-stage");
const stage = new Stage(element);

// view transform
let offX  = 0,
    offY = 0,
    scale = 1.00;

function viewClamp(x, y) {
  return {
    x: (stage.width < map.width * scale)
     ? Math.min(Math.max(offX, 0), map.width * scale - stage.width)
     : (map.width * scale - stage.width) / 2,

    y: (stage.height < map.height * scale)
     ? Math.min(Math.max(offY, 0), map.height * scale - stage.height)
     : (map.height * scale - stage.height) / 2,
  };
}

// cursor
let selection = null;

const OP_NONE      = 0;
const OP_TRANSLATE = 1;
const OP_SCALE     = 2;
let nextOperation = OP_NONE;

// load map
const map = new Map();

/* DRAW MAP */
const mapLayer = new Layer();

mapLayer.draw = function(ctx) {
  ctx.save()
  // apply world transforms
  ctx.translate(-offX, -offY);
  ctx.scale(scale, scale);

  // draw map
  ctx.drawImage(map.image, 0, 0);
 
  // draw border
  ctx.restore();
  // TODO: draw border in world space
  ctx.beginPath();
  ctx.rect(
    Math.max(-offX, ctx.lineWidth / 2),
    Math.max(-offY, ctx.lineWidth / 2),
    Math.min(map.width * scale,
             stage.width - ctx.lineWidth,
             -offX + map.width * scale - ctx.lineWidth / 2,
             stage.width + offX - ctx.lineWidth / 2),
    Math.min(map.height * scale,
             stage.height - ctx.lineWidth,
             -offY + map.height * scale - ctx.lineWidth / 2,
             stage.height + offY - ctx.lineWidth / 2));

  ctx.strokeStyle = "#000";
  ctx.lineWidth = 0.2 * rem;
  ctx.stroke();
}

/* DRAW BOUNDS */
const boundsLayer = new Layer();

/* MOUSE EVENTS */
mapLayer.mousedown = function(x, y, buttons) {
  if (selection) {
    // check for transform handle
    // otherwise, continue
    selection = null;
  }

  // check if click intersects any object
  
  // start translation
  // otherwise, start translate map
}

let oldX = 0,
    oldY = 0;

mapLayer.mousemove = (x, y, buttons) => {
  if (buttons & 1) { // left click
    // TODO: proper check for dragging the view and not an object
    // drag to pan
    // TODO: snap to grid
    
    offX -= x - oldX;
    offY -= y - oldY;

    // enforce view boundaries
    ({ x: offX, y: offY } = viewClamp(offX, offY));
  }

  oldX = x;
  oldY = y;
}

mapLayer.wheel = (x, y, dx, dy, ev) => {
  const minScale = stage.width / Math.max(map.width, map.height);
  const oldScale = scale;

  scale = Math.max(scale - dy * 0.0001, minScale);

  // center transform on mouse position
  // TODO: more linear scaling curve
  offX += (x + offX) * (1 - oldScale / scale);
  offY += (y + offY) * (1 - oldScale / scale);

  // enforce view boundaries
  ({ x: offX, y: offY } = viewClamp(offX, offY));

  // scroll if at max zoom
  if (scale == oldScale) {
    ev.preventDefault();
  }
}

stage.addLayer(mapLayer);

/*
// screen properties
// const peek = new Rect(870, 2150, 1366, 768);
// peek.scale = 1.2;

/* VIEWS DRAW *
const viewsBounds = new Layer();

viewsBounds.draw = (ctx) => {
  ctx.save();
  // apply world transforms
  ctx.translate(-viewsOffset.x, -viewsOffset.y);
  ctx.scale(viewsScale, viewsScale);


  // peek.draw(ctx);

  if (selection)
    selection.drawHandles(ctx);

  ctx.restore();

  // draw border
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 0.2 * rem;
  ctx.strokeRect(
    Math.max(-viewsOffset.x, ctx.lineWidth / 2),
    Math.max(-viewsOffset.y, ctx.lineWidth / 2),
    Math.min(mapImage.naturalWidth * viewsScale,
             viewsStage.width - ctx.lineWidth,
             -viewsOffset.x + mapImage.naturalWidth * viewsScale - ctx.lineWidth / 2,
             viewsStage.width + viewsOffset.x - ctx.lineWidth / 2),
    Math.min(mapImage.naturalHeight * viewsScale,
             viewsStage.height - ctx.lineWidth,
             -viewsOffset.y + mapImage.naturalHeight * viewsScale - ctx.lineWidth / 2,
             viewsStage.height + viewsOffset.y - ctx.lineWidth / 2));
}

viewsStage.addLayer(viewsMap);
viewsStage.addLayer(viewsBounds);

/* TOKENS DRAWING *
const tokensLayer = new Layer();

tokensLayer.draw = (ctx) => {
  // ctx.drawImage(mapImage, peek.x, peek.y, peek.width * peek.scale, peek.height * peek.scale,
  //                        0, 0, tokensStage.width, tokensStage.height);
}

tokensStage.addLayer(tokensLayer);
*/
