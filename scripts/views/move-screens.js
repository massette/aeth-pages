import { Stage, Layer } from "/scripts/canvas.js";
import map from "/scripts/map.js";
import { openMapsModal, uploadMap } from "/scripts/calls.js";
import { setPeek } from "/scripts/views/move-tokens.js";

/* CONSTANTS */
const style = getComputedStyle(document.body);

// unit constants
const U_REM = parseFloat(style.fontSize);

/*  */
const element = document.getElementById("views-stage");
const stage = new Stage(element);

// layout constants
const VIEW_BORDER   = 0.20 * U_REM;
const SCREEN_BORDER = 0.10 * U_REM;
const SELECT_BORDER = 0.20 * U_REM;

const SCALE_HANDLE  = 0.50 * U_REM;

//
const COLOR_FG = style.getPropertyValue("--color-fg");
const COLOR_BG = style.getPropertyValue("--color-bg");

// view transform
const view = {
  x: 0,
  y: 0,
  width: stage.width,
  height: stage.height,
};

let scale  = 1.00;

function updateView(x, y) {
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

function toWorld(x, y) {
  return {
    x: (x - VIEW_BORDER) / scale + view.x,
    y: (y - VIEW_BORDER) / scale + view.y,
  }
}

function toScreen(wx, wy) {
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

const LEFT  = 0;
const RIGHT = 1;
const TOP    = 2;
const BOTTOM = 3;

const op = {
  type  : OP_NONE,
  target: null,
  
  start : {x: 0, y: 0, scale: 1},
  offset: {x: 0, y: 0},

  anchor: {x: LEFT, y: TOP},
};

function setOp(target, type, x, y) {
  op.type   = type;
  op.target = target;
  
  op.start.x = target.x;
  op.start.y = target.y;
  op.start.scale = target.scale;

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
  updateView(view.x * scaleFactor, view.y * scaleFactor);
}

mapLayer.updateMap = function(width, height) {
  // zoom to show whole map
  scale = (stage.width - 2 * VIEW_BORDER) / Math.max(map.width, map.height);

  // enforce view boundaries
  updateView();
}

/* MOUSE EVENTS */
mapLayer.wheel = function(x, y, dx, dy, ev) {
  const minScale = (stage.width - 2 * VIEW_BORDER) / Math.max(map.width, map.height);
  const oldScale = scale;

  scale = Math.max(scale - dy * 0.0001, minScale);
  const scaleFactor = scale / oldScale;

  // center transform on mouse position
  updateView(view.x + x / oldScale - x / scale,
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
  screens: [{x:  0, y: 0}, {x: 0, y: 1},
            {x:  1, y: 1}, {x: 1, y: 2}],
  shape: { x: 2, y: 3 },
  // rect
  x: 0,
  y: 0,
  width : 2 * SC_WIDTH,
  height: 3 * SC_HEIGHT,
  scale: 1.00,
};

let currentScreen = 0;

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
function drawHandles(ctx, rect) {
  const {x, y} = toScreen(rect.x, rect.y);
  const width  = rect.width *  (rect.scale ?? 1.00) * scale;
  const height = rect.height * (rect.scale ?? 1.00) * scale;

  // draw transform boundary
  ctx.setLineDash([]);
  ctx.lineWidth = SELECT_BORDER;
  ctx.strokeStyle = "#785EF0";

  ctx.strokeRect(
    x + SELECT_BORDER / 2,
    y + SELECT_BORDER / 2,
    width - SELECT_BORDER,
    height - SELECT_BORDER
  );

  // draw scale handles
  ctx.fillStyle = "#785EF0";

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
  const {x: wx, y: wy} = toWorld(x, y);

  if (button == 0) { // left click
    // check transform handles of selection
    if (op.target) {
      const tx = op.target.x;
      const ty = op.target.y;
      const tw = op.target.width  * (op.target.scale ?? 1);
      const th = op.target.height * (op.target.scale ?? 1);
      
      const HW2 = 1.5 * SCALE_HANDLE / (scale * 2);

      // check scale handles
      for (const handle of [{x: tx, y: ty,
                             ax: RIGHT, ay: BOTTOM},
                            {x: tx + tw - SELECT_BORDER, y: ty,
                             ax: LEFT , ay: BOTTOM},
                            {x: tx, y: ty + th - SELECT_BORDER,
                             ax: RIGHT, ay: TOP},
                            {x: tx + tw - SELECT_BORDER, y: ty + th - SELECT_BORDER,
                             ax: LEFT , ay: TOP}]) {
        // AABB
        if (wx >= handle.x - HW2 && wx < handle.x + HW2
         && wy >= handle.y - HW2 && wy < handle.y + HW2) {
          // begin scale
          setOp(op.target, OP_SCALE, wx, wy);

          op.anchor.x = handle.ax;
          op.anchor.y = handle.ay;
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
          // update peek
          setPeek(screens, i);
          currentScreen = i;

          // begin translate
          setOp(screens, OP_TRANS, wx, wy);
                  
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
  const {x: wx, y: wy} = toWorld(x, y);

  // TODO: preview transforms here
  switch (op.type) {
    case OP_TRANS:
      //
      op.target.scale = Math.min(
        op.target.scale,
        map.width / op.target.width,
        map.height / op.target.height
      );

      op.target.x = Math.min(
        Math.max(0, wx - op.offset.x),
        map.width - op.target.width  * op.target.scale
      );
      op.target.y = Math.min(
        Math.max(0, wy - op.offset.y),
        map.height - op.target.height * op.target.scale
      );

      break;

    case OP_SCALE:
      const ax = (op.anchor.x == LEFT) ? op.start.x : op.start.x + op.target.width  * op.start.scale;
      const ay = (op.anchor.y == TOP ) ? op.start.y : op.start.y + op.target.height * op.start.scale;

      op.target.scale = Math.min(
        Math.max(
          Math.abs(ax - wx) / op.target.width,
          Math.abs(op.start.y - wy) / op.target.height
        ),
        ((op.anchor.x == LEFT) ? map.width  - ax : ax) / op.target.width ,
        ((op.anchor.y == TOP ) ? map.height - ay : ay) / op.target.height
      );

      if (op.anchor.x == RIGHT) 
        op.target.x = ax - op.target.width * op.target.scale;

      if (op.anchor.y == BOTTOM)
        op.target.y = ay - op.target.height * op.target.scale;

      break;

    case OP_PAN:
      // 
      updateView(op.start.x - x / scale + op.offset.x,
                  op.start.y - y / scale + op.offset.y);
      break;
  }

  setPeek(screens, currentScreen);
}

boundsLayer.mouseup = function(x, y, button) {
  // TODO: resolve transform here
  op.type   = OP_NONE;
}

boundsLayer.draw = function(ctx) {
  // draw screens
  const {x: sx, y: sy} = toScreen(screens.x, screens.y);
  const sw = screens.width * screens.scale * scale;
  const sh = screens.height * screens.scale * scale;

  ctx.fillStyle = "#785EF055";

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
  ctx.strokeStyle = "#785EF0";
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
    drawHandles(ctx, op.target, SELECT_BORDER)

  // draw view border
  ctx.strokeStyle = COLOR_FG;
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

/*
const mapUpload = document.getElementById("map-upload");
mapUpload.addEventListener("change", uploadMap);
*/
