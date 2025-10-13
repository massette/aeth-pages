import { Stage, Layer } from "/scripts/canvas.js";
import map from "/scripts/map.js";
import { openMapsModal, uploadMap } from "/scripts/calls.js"

/* CONSTANTS */
// unit constants
const U_REM = parseFloat(getComputedStyle(document.documentElement).fontSize);

/*  */
const element = document.getElementById("views-stage");
const stage = new Stage(element);

// layout constants
const VIEW_BORDER   = 0.30 * U_REM;
const SCREEN_BORDER = 0.10 * U_REM;
const SELECT_BORDER = 0.20 * U_REM;

const SCALE_HANDLE  = 0.50 * U_REM;

// view transform
const view = {
  x: 0,
  y: 0,
  width: stage.width,
  height: stage.height,
};

let scale  = 1.00;

function update_view(x, y) {
  x = x ?? view.x;
  y = y ?? view.y;

  view.x = (stage.width  - 2 * VIEW_BORDER < map.width  * scale)
    ? Math.min(
        Math.max(x, 0),
        map.width  - (view.width  - 2 * VIEW_BORDER) / scale
      )
    : (map.width  - (stage.width  - 2 * VIEW_BORDER) / scale) / 2;

  view.y = (stage.height - 2 * VIEW_BORDER < map.height * scale)
    ? Math.min(
        Math.max(y, 0),
        map.height - (view.height - 2 * VIEW_BORDER) / scale
      )
    : (map.height - (stage.height - 2 * VIEW_BORDER) / scale) / 2;
}

function to_world(x, y) {
  return {
    x: (x - VIEW_BORDER) / scale + view.x,
    y: (y - VIEW_BORDER) / scale + view.y,
  }
}

function to_screen(wx, wy) {
  return {
    x: (wx - view.x) * scale + VIEW_BORDER,
    y: (wy - view.y) * scale + VIEW_BORDER,
  }
}

// 
const OP_NONE  = 0;
const OP_TRANS = 1;
const OP_SCALE = 2;
const OP_PAN   = 3;

const op = {
  type  : OP_NONE,
  target: null,
  
  start : {x: 0, y: 0},
  offset: {x: 0, y: 0},
};

function set_op(target, type, x, y) {
  op.type   = type;
  op.target = target;
  
  op.start.x = target.x;
  op.start.y = target.y;

  op.offset.x = (x - target.x);
  op.offset.y = (y - target.y);
}

/* DRAW MAP */
const mapLayer = new Layer();

mapLayer.draw = function(ctx) {
  ctx.save()
  ctx.translate(VIEW_BORDER, VIEW_BORDER);

  // apply world transforms
  ctx.scale(scale, scale);
  ctx.translate(-view.x, -view.y);

  // draw map
  ctx.drawImage(map.image, 0, 0);
}

/* RESIZE MAP */
mapLayer.resize = function(width, height, old_width, old_height) {
  const scaleFactor = Math.max(width / old_width, height / old_height);

  // update view size
  view.width  = width;
  view.height = height;
  
  // enforce min zoom
  scale = Math.max(
    scale * scaleFactor, // maintain previous zoom
    (stage.width - 2 * VIEW_BORDER) / Math.max(map.width, map.height)
  );
  // enforce view boundaries
  update_view(view.x * scaleFactor, view.y * scaleFactor);
}

mapLayer.updateMap = function(width, height) {
  // zoom to show whole map
  scale = (stage.width - 2 * VIEW_BORDER) / Math.max(map.width, map.height);

  // enforce view boundaries
  update_view();
}

/* MOUSE EVENTS */
mapLayer.wheel = function(x, y, dx, dy, ev) {
  const minScale = (stage.width - 2 * VIEW_BORDER) / Math.max(map.width, map.height);
  const oldScale = scale;

  scale = Math.max(scale - dy * 0.0001, minScale);
  const scaleFactor = scale / oldScale;

  // center transform on mouse position
  update_view(view.x + x / oldScale - x / scale,
              view.y + y / oldScale - y / scale);

  // TODO: more linear scaling curve

  // scroll if at max zoom
  if (scale == oldScale) {
    ev.preventDefault();
  }
}

stage.addLayer(mapLayer);

/* DRAW BOUNDS */
const boundsLayer = new Layer();

// screen properties
const SC_WIDTH  = 1024;
const SC_HEIGHT = 600;

// screen positions
const screens = {
  // screens shape
  screens: [{x:  0, y: 0}, {x: 1, y: 0},
            {x:  1, y: 1}, {x: 2, y: 1}],
  shape: { x: 3, y: 2 },
  // rect
  x: 0,
  y: 0,
  width : 3 * SC_WIDTH,
  height: 2 * SC_HEIGHT,
  scale: 1.00,
};

boundsLayer.updateMap = function(ctx) {
  // default transforms
  screens.x = 0;
  screens.y = 0;

  // enforce map boundaries
  screens.scale = Math.min(
    2.00,
    map.width  / (screens.width  - VIEW_BORDER),
    map.height / (screens.height - VIEW_BORDER),
  );
}

/*  */
function draw_handles(ctx, rect) {
  const {x, y} = to_screen(rect.x, rect.y);
  const width  = rect.width *  (rect.scale ?? 1.00) * scale;
  const height = rect.height * (rect.scale ?? 1.00) * scale;

  // draw transform boundary
  ctx.setLineDash([]);
  ctx.lineWidth = SELECT_BORDER;
  ctx.strokeStyle = "#FFF";

  ctx.strokeRect(
    x + SELECT_BORDER / 2,
    y + SELECT_BORDER / 2,
    width - SELECT_BORDER,
    height - SELECT_BORDER
  );

  // draw scale handles
  ctx.fillStyle = "#F00";

  for (const handle of [{x: x, y: y},
                        {x: x + width - SELECT_BORDER, y},
                        {x: x, y: y + height - SELECT_BORDER},
                        {x: x + width - SELECT_BORDER, y: y + height - SELECT_BORDER}]) {
    ctx.fillRect(
      handle.x - (SCALE_HANDLE - SELECT_BORDER) / 2,
      handle.y - (SCALE_HANDLE - SELECT_BORDER) / 2,
      SCALE_HANDLE,
      SCALE_HANDLE
    );
  }
}

boundsLayer.mousedown = function(x, y, button) {
  // convert to world coordinates
  const {x: wx, y: wy} = to_world(x, y);

  if (button == 0) { // left click
    // check transform handles of selection
    if (op.target) {
      const tx = op.target.x;
      const ty = op.target.y;
      const tw = op.target.width  * (op.target.scale ?? 1);
      const th = op.target.height * (op.target.scale ?? 1);
      
      const HW2 = SCALE_HANDLE / (scale * 2);

      // check scale handles
      for (const handle of [{x: tx, y: ty},
                            {x: tx + tw - SELECT_BORDER, y: ty},
                            {x: tx, y: ty + th - SELECT_BORDER},
                            {x: tx + tw - SELECT_BORDER, y: ty + th - SELECT_BORDER}]) {
        // AABB
        if (wx >= handle.x - HW2 && wx < handle.x + HW2
         && wy >= handle.y - HW2 && wy < handle.y + HW2) {
          console.log(`BEGIN SCALE !!!`);
          set_op(op.target, OP_SCALE, x, y);
        }
      }
    }

    // otherwise, check all screens
    if (op.type == OP_NONE) {
      for (let i = 0; i < screens.screens.length; i++) {
        const sx = screens.x + screens.screens[i].x * SC_WIDTH  * screens.scale;
        const sy = screens.y + screens.screens[i].y * SC_HEIGHT * screens.scale;
        const sw = SC_WIDTH  * screens.scale;
        const sh = SC_HEIGHT * screens.scale;

        if  (wx >= sx && wx < sx + sw
          && wy >= sy && wy < sy + sh) {
          console.log(`PEEK SC0${i}`);
          console.log(`BEGIN TRANS !!! ${screens}`);

          set_op(screens, OP_TRANS, wx, wy);
          break;
        }
      }
    }

    // TODO: check peek

    // otherwise, pan
    if (op.type == OP_NONE) {
      // start pan
      console.log("BEGIN PAN !!!");

      op.type   = OP_PAN;
      op.target = null;
      
      op.start.x = view.x;
      op.start.y = view.y;

      op.offset.x = (wx - view.x);
      op.offset.y = (wy - view.y);
    }
  }
}

boundsLayer.mousemove = function(x, y, buttons) {
  // convert to world coordinates
  const {x: wx, y: wy} = to_world(x, y);

  // TODO: preview transforms here
  switch (op.type) {
    case OP_TRANS:
      op.target.x = wx - op.offset.x;
      op.target.y = wy - op.offset.y;
      break;

    case OP_PAN:
      // 
      update_view(op.start.x - x / scale + op.offset.x,
                  op.start.y - y / scale + op.offset.y);
      break;
  }
}

boundsLayer.mouseup = function(x, y, button) {
  // TODO: resolve transform here
  console.log("Resolve.");
  op.type   = OP_NONE;
}

boundsLayer.draw = function(ctx) {
  // draw screens
  const {x: sx, y: sy} = to_screen(screens.x, screens.y);
  const sw = screens.width * screens.scale * scale;
  const sh = screens.height * screens.scale * scale;

  ctx.fillStyle = "#FFF5";

  for (const screen of screens.screens) {
    ctx.fillRect(
      sx + (sw / screens.shape.x) * screen.x,
      sy + (sh / screens.shape.y) * screen.y,
      sw / screens.shape.x,
      sh / screens.shape.y
    );
  }

  // draw screens grid
  ctx.lineWidth = SCREEN_BORDER;
  ctx.setLineDash([1, 2]);
  ctx.strokeStyle = "#FFF";
  ctx.beginPath();

  // vertical lines
  for (let i = 1; i < screens.shape.x; i++) {
    ctx.moveTo(sx + (sw / screens.shape.x) * i, sy);
    ctx.lineTo(sx + (sw / screens.shape.x) * i, sy + sh);
  }

  // horizontal lines
  for (let i = 1; i < screens.shape.y; i++) {
    ctx.moveTo(sx,      sy + (sh / screens.shape.y) * i);
    ctx.lineTo(sx + sw, sy + (sh / screens.shape.y) * i);
  }

  ctx.stroke();

  // draw screens outline
  ctx.setLineDash([]);
  ctx.strokeRect(sx + SCREEN_BORDER / 2, sy + SCREEN_BORDER / 2, sw - SCREEN_BORDER, sh - SCREEN_BORDER);


  /*
  ctx.fillStyle = "#FFF5";

  for (const screen of screens.screens) {
    ctx.fillRect(
      sx + (sw / screens.shape.x) * screen.x,
      sy + (sh / screens.shape.y) * screen.y,
      sw / screens.shape.x,
      sh / screens.shape.y
    );
    */

/*
      (-view.x + screens.x + screen.x * SC_WIDTH  * screens.scale) * scale,
      (-view.y + screens.y + screen.y * SC_HEIGHT * screens.scale) * scale,
      SC_WIDTH  * screens.scale * scale,
      SC_HEIGHT * screens.scale * scale
    );
  }
    */

  // draw transform handles on selection
  if (op.target)
    draw_handles(ctx, op.target, SELECT_BORDER)

  // draw view border
  ctx.strokeStyle = "#000";
  ctx.lineWidth = VIEW_BORDER;
  ctx.setLineDash([]);

  ctx.strokeRect(
    VIEW_BORDER / 2 - Math.min(0, view.x) * scale,
    VIEW_BORDER / 2 - Math.min(0, view.y) * scale,
    Math.min(
      map.width  * scale + VIEW_BORDER,
      stage.width - VIEW_BORDER
    ),
    Math.min(
      map.height * scale + VIEW_BORDER,
      stage.height - VIEW_BORDER
    )
  );
}

stage.addLayer(boundsLayer);

map.register(stage);

const mapSelect = document.getElementById("map-select");
mapSelect.addEventListener("click", openMapsModal);

const mapUpload = document.getElementById("map-upload");
mapUpload.addEventListener("change", uploadMap);

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
