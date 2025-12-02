import { canvas } from "/scripts/screens.js";
import { getMaps, getActive, setActive } from "/scripts/call/maps.js";
import { Modal, selectMap } from "/scripts/modals.js";

canvas.attach("screens-stage");

const button = document.getElementById("test");
button.addEventListener("click", async () =>
    selectMap.open().then(map => setActive(map)));
