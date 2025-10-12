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
const VIEW_BORDER   = 0.20 * U_REM;
const SCREEN_BORDER = 0.10 * U_REM;

const SCALE_HANDLE  = 0.50 * U_REM;

// view transform
const view = {
  x: 0,
  y: 0,
  width: stage.width,
  height: stage.height,
};

let scale  = 1.00;

function viewClamp(x, y) {
  return {
    x: (stage.width < map.width * scale)
     ? Math.min(Math.max(x, 0), map.width  - (view.width - VIEW_BORDER) / scale )
     : (map.width  - (stage.width  - VIEW_BORDER) / scale) / 2,
    y: (stage.height < map.height * scale)
     ? Math.min(Math.max(y, 0), map.height - (view.height - VIEW_BORDER) / scale)
     : (map.height - (stage.height - VIEW_BORDER) / scale) / 2,
  };
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
  ctx.translate(VIEW_BORDER / 2, VIEW_BORDER / 2);

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

  view.x *= scaleFactor;
  view.y *= scaleFactor;

  // enforce view boundaries
  ({ x: view.x, y: view.y } = viewClamp(view.x, view.y));
}

mapLayer.updateMap = function(width, height) {
  // zoom to show whole map
  scale = (stage.width - 2 * VIEW_BORDER) / Math.max(map.width, map.height);

  // enforce view boundaries
  ({ x: view.x, y: view.y } = viewClamp(view.x, view.y));
}

/* MOUSE EVENTS */
mapLayer.wheel = function(x, y, dx, dy, ev) {
  const minScale = (stage.width - 2 * VIEW_BORDER) / Math.max(map.width, map.height);
  const oldScale = scale;

  scale = Math.max(scale - dy * 0.0001, minScale);
  const scaleFactor = scale / oldScale;

  // center transform on mouse position
  view.x += x / oldScale - x / scale;
  view.y += y / oldScale - y / scale;

  // TODO: more linear scaling curve

  // enforce view boundaries
  ({ x: view.x, y: view.y } = viewClamp(view.x, view.y));

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
function draw_handles(ctx, rect, border) {
  border = border ?? 1;

  const x = (VIEW_BORDER + border) / 2 + (rect.x - view.x) * scale;
  const y = (VIEW_BORDER + border) / 2 + (rect.y - view.y) * scale;
  const width  = rect.width  * (rect.scale ?? 1.00) * scale - border;
  const height = rect.height * (rect.scale ?? 1.00) * scale - border;

  // draw transform boundary
  ctx.setLineDash([]);
  ctx.lineWidth = border;
  ctx.strokeStyle = "#FFF";

  ctx.strokeRect(x, y, width, height);

  // draw scale handles
  ctx.fillStyle = "#F00";

  for (const handle of [{x: x, y: y}, {x: x + width, y},
                 {x: x, y: y + height}, {x: x + width, y: y + height}]) {
    ctx.fillRect(
      handle.x - SCALE_HANDLE / 2,
      handle.y - SCALE_HANDLE / 2,
      SCALE_HANDLE,
      SCALE_HANDLE
    );
  }

  /*
  // top-left
  ctx.fillRect(
    -view.x / scale + rect.x * scale + (border - SCALE_HANDLE) / 2,
    -view.y / scale + rect.y * scale + (border - SCALE_HANDLE) / 2,
    SCALE_HANDLE,
    SCALE_HANDLE
  );

  // top-right
  ctx.fillRect(
    -view.x / scale + (rect.x + rect.width ) * scale + (border - SCALE_HANDLE) / 2,
    -view.y / scale + rect.y * scale + (border - SCALE_HANDLE) / 2,
    SCALE_HANDLE,
    SCALE_HANDLE
  );

  // bottom-left
  ctx.fillRect(
    -view.x / scale + rect.x * scale + (border - SCALE_HANDLE) / 2,
    -view.y / scale + (rect.y + rect.height) * scale + (border - SCALE_HANDLE) / 2,
    SCALE_HANDLE,
    SCALE_HANDLE
  );

  // bottom-right
  ctx.fillRect(
    -view.x / scale + (rect.x + rect.width ) * scale + (border - SCALE_HANDLE) / 2,
    -view.y / scale + (rect.y + rect.height) * scale + (border - SCALE_HANDLE) / 2,
    SCALE_HANDLE,
    SCALE_HANDLE
  );
  */
}

boundsLayer.mousedown = function(x, y, button) {
  // convert to world coordinates
  const wx = x / scale + view.x,
        wy = y / scale + view.y;

  if (button == 0) { // left click
    // check transform handles of selection
    if (op.target) {
      // TODO: check rotation handle
      
      // check scale handles
      for (const handle of [{x: op.target.x, y: op.target.y}, {x: op.target.x + op.target.width, y: op.target.y},
                            {x: op.target.x, y: op.target.y + op.target.width}, {x: op.target.x + op.target.width, sy: op.target.y + op.target.height}]) {
        // AABB
        if  (wx >= handle.x - SCALE_HANDLE / 2 && wx < handle.x + SCALE_HANDLE / 2
          && wy >= handle.y - SCALE_HANDLE / 2 && wy < handle.y + SCALE_HANDLE / 2) {
          console.log(`BEGIN SCALE !!! ${target}`);


          return;
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
  const wx = x / scale + view.x,
        wy = y / scale + view.y;

  // TODO: preview transforms here
  switch (op.type) {
    case OP_TRANS:
      op.target.x = wx - op.offset.x;
      op.target.y = wy - op.offset.y;
      break;

    case OP_PAN:
      view.x = op.start.x - x / scale + op.offset.x;
      view.y = op.start.y - y / scale + op.offset.y;

      // enforce view bounds
      ({ x: view.x, y: view.y } = viewClamp(op.start.x - x / scale + op.offset.x,
                                            op.start.y - y / scale + op.offset.y));
      break;
  }
}

boundsLayer.mouseup = function(x, y, button) {
  // TODO: resolve transform here
  console.log("Resolve.");
  op.type   = OP_NONE;
}

boundsLayer.draw = function(ctx) {
  // draw transform handles on selection
  if (op.target)
    draw_handles(ctx, op.target, SCREEN_BORDER);

  // draw screens
  ctx.fillStyle = "#FFF5";

  for (const screen of screens.screens) {
    ctx.fillRect(
      (-view.x + screens.x + screen.x * SC_WIDTH  * screens.scale) * scale,
      (-view.y + screens.y + screen.y * SC_HEIGHT * screens.scale) * scale,
      SC_WIDTH  * screens.scale * scale,
      SC_HEIGHT * screens.scale * scale
    );
  }

  ctx.lineWidth = SCREEN_BORDER;
  ctx.setLineDash([1, 2]);
  ctx.strokeStyle = "#FFF";
  ctx.beginPath();

  // vertical lines
  for (let i = 1; i < screens.shape.x; i++) {
    ctx.moveTo((-view.x + screens.x + i * SC_WIDTH * screens.scale) * scale,
               (-view.y + screens.y) * scale);
    ctx.lineTo((-view.x + screens.x + i * SC_WIDTH * screens.scale) * scale,
               (-view.y + screens.y + screens.height * screens.scale) * scale);
  }

  // horizontal lines
  for (let i = 1; i < screens.shape.y; i++) {
    // TODO
    ctx.moveTo((-view.x + screens.x) * scale,
               (-view.y + screens.y + i * SC_HEIGHT * screens.scale) * scale);
    ctx.lineTo((-view.x + screens.x + screens.width * screens.scale) * scale,
               (-view.y + screens.y + i * SC_HEIGHT * screens.scale) * scale);
  }

  // draw lines
  ctx.stroke()

  // draw view border
  ctx.strokeStyle = "#000";
  ctx.lineWidth = VIEW_BORDER;
  ctx.setLineDash([]);

  ctx.strokeRect(
    Math.max(VIEW_BORDER / 2, -view.x * scale),
    Math.max(VIEW_BORDER / 2, -view.y * scale),
    (stage.width  < map.width  * scale + 2 * VIEW_BORDER)
      ? stage.width - VIEW_BORDER
      : map.width * scale + VIEW_BORDER,
    (stage.height < map.height * scale + 2 * VIEW_BORDER)
      ? stage.height - VIEW_BORDER
      : map.height * scale + VIEW_BORDER
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
