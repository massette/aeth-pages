import { canvas as screensCanvas, screens } from "/scripts/screens.js";
import { canvas as tokensCanvas } from "/scripts/tokens.js";
import { canvas as peekCanvas } from "/scripts/peek.js";

import { getMaps, getActive, setActive } from "/scripts/call/maps.js";
import { Modal, selectMap, selectToken } from "/scripts/modals.js";
import { createEntity } from "/scripts/call/entities.js";

screensCanvas.attach("screens-stage");
tokensCanvas.attach("tokens-stage");
peekCanvas.attach("peek-stage");

screens.peek = peekCanvas;

const mapsButton = document.getElementById("map-select");
mapsButton.addEventListener("click", async () =>
    selectMap.open().then(map => setActive(map)));

const tokensButton = document.getElementById("token-select");
tokensButton.addEventListener("click", async () =>
    selectToken.open()
        .then(token => createEntity(token))
        .then(entity => tokensCanvas.call("updateEntities", entity))
        .then(_ => tokensCanvas.render()));
