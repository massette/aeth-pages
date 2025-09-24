import activeMap from "/scripts/map.js";

/* API */
export async function uploadMap(ev) {
  const file = ev.target.files[0];

  // return if no file
  if (!file)
    return;

  // construct form
  const data = new FormData();
  data.append("file", file);

  const parts = file.name.split(".");
  parts.pop();

  // same id for both,
  // may need a more robust solution in the future
  const id = parts.join(".");

  // attempt upload
  const imageResponse = await fetch(`/api/files/images/${id}?userid=gamemaster`, {
    method: "POST",
    body: data,
  });

  // report status
  if (!imageResponse.ok)
    console.log(`Upload failed! Error ${imageResponse.status}.`);
  else
    console.log(`Upload succeeded`,await imageResponse.json())
  const mapId = parts.join();
  
  const map_response = await fetch(`/api/maps/${mapId}?creator=gamemaster`, {
      method: "POST",
      headers: {
          'Content-Type': "application/json",
      },
      body: JSON.stringify({
          MapId: mapId,
          GridSizePixels: 16, // TODO: change
          FileId: parts.join("."),
          OwnerId: "gamemaster",
      }),
  })
    
    if (!map_response.ok) {
        console.log(`Map creation failed! Error ${map_response.status}.`);
        console.log(map_response);
    }
    else
        console.log(`Map creation succeeded`)
}

function setMap(map) {
  // TODO: update active map on server side

  // update map image
  activeMap.image.src = `/api/files/images/${map.fileId}`;
}

async function getMaps() {
  const response = await fetch("/api/maps");
  return await response.json();
}

/* MODALS */
function makeModal(name) {
  const modal = document.createElement("div");

  const title = document.createElement("div");
  title.className = "modal-title";
  title.textContent = name ?? "New Modal";

  const exit = document.createElement("button");
  exit.addEventListener("click", (ev) => modal.remove());
  exit.className = "modal-exit button button-discard";
  exit.textContent = "\u{2716}";

  const header = document.createElement("div");
  header.className = "modal-header";
  header.appendChild(title);
  header.appendChild(exit);

  const content = document.createElement("div");
  content.className = "modal-body";

  modal.className = "modal";
  modal.appendChild(header);
  modal.appendChild(content);

  const container = document.getElementById("overlay");
  container.appendChild(modal);

  return modal;
}

export async function openMapsModal() {
  const modal = makeModal("Select Map...");
  const content = modal.getElementsByClassName("modal-body")[0];

  // indicate loading
  content.textContent = "LOADING ...";

  // query server for map list
  const maps = await getMaps();

  // list existing maps
  const list = document.createElement("div");

  for (const map of maps) {
    const entry = document.createElement("button");
    entry.className = "button";
    entry.textContent = map.mapId;
    entry.addEventListener("click", function(ev) {
      setMap(map)
      modal.remove();
    });

    list.appendChild(entry);
  }

  // or, upload new map
  const newMap = document.createElement("button");
  newMap.className = "modal-submit button";
  newMap.textContent = "Upload a new map...";
  newMap.addEventListener("click", function(ev) {
    const trigger = document.getElementById("image-upload");
    trigger.click();

    modal.remove();
  });

  // clear modal on load
  content.textContent = "";

  content.appendChild(list);
  content.appendChild(newMap);
}
