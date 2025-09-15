import { Rect, Stage, Layer } from "/scripts/canvas.js";

// unit constants
const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);

// canvas objects
const viewsElement = document.getElementById("views-stage");
const viewsStage = new Stage(viewsElement);

const tokensElement = document.getElementById("tokens-stage");
const tokensStage = new Stage(tokensElement);

// screen properties
const peek = new Rect(870, 2150, 1366, 768);
peek.scale = 1.2;

// transform stuff
let selection = null;

const OP_NONE = 0;
const OP_TRANSLATE = 1;
const OP_SCALE = 2;

let nextOperation = OP_NONE;

// load map image
const mapImage = new Image();

mapImage.onload = (ev) => {
  // zoom to fit
  viewsScale = Math.min(
    viewsStage.width / mapImage.naturalWidth,
    viewsStage.height / mapImage.naturalHeight);

  // enforce view boundaries
  viewsOffset.x = (viewsStage.width < mapImage.naturalWidth * viewsScale)
    ? Math.min(Math.max(viewsOffset.x, 0),
               mapImage.naturalWidth * viewsScale - viewsStage.width)
    : (mapImage.naturalWidth * viewsScale - viewsStage.width) / 2;

  viewsOffset.y = (viewsStage.height < mapImage.naturalHeight * viewsScale)
    ? Math.min(Math.max(viewsOffset.y, 0),
               mapImage.naturalHeight * viewsScale - viewsStage.height)
    : (mapImage.naturalHeight * viewsScale - viewsStage.height) / 2;

  // re-render canvases
  viewsStage.render();
  tokensStage.render();
}

mapImage.src = "/images/maps/camp.png";

/* VIEWS DRAW */
let viewsScale = 1.00;
let viewsOffset = {x: 0, y: 0};

const viewsMap = new Layer();

viewsMap.draw = (ctx) => {
  // apply world transforms
  ctx.translate(-viewsOffset.x, -viewsOffset.y);
  ctx.scale(viewsScale, viewsScale);

  // draw map
  ctx.drawImage(mapImage, 0, 0);
}

viewsMap.mousedown = (x, y, buttons) => {
  if (selection) {
    // check for transform handle
    // otherwise continue
    selection = null;
    viewsMap.mousedown(x, y, buttons);
  } else {
    // check if click intersects any screen
    console.log(peek.x, x / viewsScale + viewsOffset.x, peek.x + peek.width * peek.scale);

    if (peek.contains((x + viewsOffset.x) / viewsScale,
                      (y + viewsOffset.y) / viewsScale))
      selection = peek;

    if (selection) {
      console.log("start translate #peek");
      // start translation
    } else {
      console.log("start translate world");
    }
  }
}

let oldX = 0,
    oldY = 0;

viewsMap.mousemove = (x, y, buttons) => {
  if (buttons & 1) { // left click
    // drag to pan
    // TODO: snap to grid
    viewsOffset.x -= x - oldX;
    viewsOffset.y -= y - oldY;

    // enforce view boundaries
    viewsOffset.x = (viewsStage.width < mapImage.naturalWidth * viewsScale)
      ? Math.min(Math.max(viewsOffset.x, 0),
                 mapImage.naturalWidth * viewsScale - viewsStage.width)
      : (mapImage.naturalWidth * viewsScale - viewsStage.width) / 2;

    viewsOffset.y = (viewsStage.height < mapImage.naturalHeight * viewsScale)
      ? Math.min(Math.max(viewsOffset.y, 0),
                 mapImage.naturalHeight * viewsScale - viewsStage.height)
      : (mapImage.naturalHeight * viewsScale - viewsStage.height) / 2;
  }

  oldX = x;
  oldY = y;
}

viewsMap.wheel = (x, y, dx, dy, ev) => {
  const oldScale = viewsScale
  const minScale = viewsStage.width / Math.max(mapImage.naturalWidth, mapImage.naturalHeight);

  // center on mouse position, (x, y)
  const worldX = (x + viewsOffset.x) / viewsScale;
  const worldY = (y + viewsOffset.y) / viewsScale;

  // update transforms
  viewsScale = Math.max(minScale, viewsScale - (dy * 0.0001));
  // TODO: smoother, more regular scaling curve
  viewsOffset.x += worldX * (viewsScale - oldScale);
  viewsOffset.y += worldY * (viewsScale - oldScale);

  // enforce view boundaries
  viewsOffset.x = (viewsStage.width < mapImage.naturalWidth * viewsScale)
    ? Math.min(Math.max(viewsOffset.x, 0),
               mapImage.naturalWidth * viewsScale - viewsStage.width)
    : (mapImage.naturalWidth * viewsScale - viewsStage.width) / 2;

  viewsOffset.y = (viewsStage.height < mapImage.naturalHeight * viewsScale)
    ? Math.min(Math.max(viewsOffset.y, 0),
               mapImage.naturalHeight * viewsScale - viewsStage.height)
    : (mapImage.naturalHeight * viewsScale - viewsStage.height) / 2;

  // TODO: scroll if at zoom limit
  ev.preventDefault();
}

const viewsBounds = new Layer();

viewsBounds.draw = (ctx) => {
  ctx.save();
  // apply world transforms
  ctx.translate(-viewsOffset.x, -viewsOffset.y);
  ctx.scale(viewsScale, viewsScale);


  peek.draw(ctx);

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

viewsStage.add(viewsMap);
viewsStage.add(viewsBounds);

/* TOKENS DRAWING */
const tokensLayer = new Layer();

tokensLayer.draw = (ctx) => {
  ctx.drawImage(mapImage, peek.x, peek.y, peek.width * peek.scale, peek.height * peek.scale,
                          0, 0, tokensStage.width, tokensStage.height);
}

tokensStage.add(tokensLayer);
