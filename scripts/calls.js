import activeMap from "/scripts/map.js";

/* API */
export async function uploadFile(data) {
  const id = data.get("FileId");
  const response = await fetch(`/api/Files/${id}?userid=gamemaster`, {
    method: "POST",
    body: data,
  });

  if (!response.ok) {
    console.log("File upload failed!");
    console.log(response);
  }

  return response;
}

export async function uploadMap(map) {
  const response = await fetch(`/api/Maps/${map.MapId}?creator=gamemaster`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(map),
  });

  if (!response.ok) {
    console.log("Map creation failed!");
    console.log(response);
  }

  return response;
}

export async function setMap(map) {
  // set active map server side
  fetch(`/api/maps/{id}/is-active?setter=gamemaster}`, { method: "POST" });

  // update stored map
  activeMap.id = map.MapId;
  activeMap.image.src = `/api/Files/${map.FileId}`;
}

export async function getMaps() {
  const response = await fetch("/api/maps");
  return await response.json();
}

// screen properties
const SC_WIDTH  = 1024;
const SC_HEIGHT = 600;

export async function setViewport(screens) {
  const x = screens.x + screens.screens[0].x * SC_WIDTH  * screens.scale;
  const y = screens.y + screens.screens[0].y * SC_HEIGHT * screens.scale;
  const width  = SC_WIDTH  * screens.scale;
  const height = SC_HEIGHT * screens.scale;

  const response = await fetch("/api/maps/set-viewport/noid", {
    method: "POST",
    headers: {
    "Content-Type": "application/json",
    },
    body: JSON.stringify({x, y, width, height}),
  });

  return response;
}

async function getImages() {
  // not sure how this endpoint works
  const response = await fetch("/api/Files/list?prefix=images");

  const files = await response.json();
  return files;
}

/* MODALS */
const modalsStack = document.getElementById("overlay");

function makeModal(title, body, reject, buttons) {
  const modal = document.createElement("div");
  modal.className = "modal";

  // construct header
  const modalTitle = document.createElement("div");
  modalTitle.className = "modal-title";
  modalTitle.textContent = title;

  const modalExit = document.createElement("button");
  modalExit.className = "modal-exit button button-discard";
  modalExit.textContent = "\u{2716}";
  modalExit.addEventListener("click", function(ev) {
    reject("Operation canceled.");
  });

  const modalHeader = document.createElement("div");
  modalHeader.className = "modal-header";
  modalHeader.appendChild(modalTitle);
  modalHeader.appendChild(modalExit);

  // style modal body
  const modalBody = document.createElement("div");
  modalBody.className = "modal-body";
  if (body) modalBody.appendChild(body);

  // construct modal
  modal.appendChild(modalHeader);
  modal.appendChild(modalBody);

  // construct footer
  if (buttons) {
    const modalFooter = document.createElement("div");
    modalFooter.className = "modal-footer";
    modalFooter.append(...buttons);

    modal.appendChild(modalFooter);
  }

  // add to page
  modalsStack.appendChild(modal);

  return modal;
}

export async function openNewImageModal(pre) {
  pre = pre ?? "";
  const formId = `form-${modalsStack.childElementCount}`;

  // construct modal contents
  const content = document.createElement("form");
  content.className = "layout-form";
  
  // construct field 'id'
  const idLabel = document.createElement("label");
  idLabel.className = "field-label";
  idLabel.textContent = "File ID";
  idLabel.htmlFor = `${formId}_id`;

  const idControl = document.createElement("input");
  idControl.className = "field-control field-control-wide";
  idControl.id = `${formId}_id`
  idControl.type = "text";
  idControl.name = "FileId";

  const idField = document.createElement("div");
  idField.className = "modal-field";
  idField.appendChild(idLabel);
  idField.appendChild(idControl);

  content.appendChild(idField);

  // construct field 'file'
  const fileLabel = document.createElement("label");
  fileLabel.className = "field-label";
  fileLabel.textContent = "File";
  fileLabel.htmlFor = `${formId}_file`;

  const fileResult = document.createElement("input");
  fileResult.className = "field-result";
  fileResult.type = "text";
  fileResult.readOnly = true;

  const fileControl = document.createElement("button");
  fileControl.className = "field-control button";
  fileControl.id = `${formId}_file`;
  fileControl.type = "button";
  fileControl.textContent = "Upload file...";

  const fileFile = document.createElement("input");
  fileFile.className = "hidden";
  fileFile.type = "file";
  fileFile.accept = "image/*";
  fileFile.name = "file";

  fileControl.addEventListener("click", async function(ev) {
    fileFile.click();
  });

  fileFile.addEventListener("change", (ev) => {
    fileResult.value = ev.target.files[0].name;
  });

  const fileField = document.createElement("div");
  fileField.className = "modal-field";
  fileField.appendChild(fileLabel);
  fileField.appendChild(fileResult);
  fileField.appendChild(fileControl);
  fileField.appendChild(fileFile);

  content.appendChild(fileField);

  // construct submit button
  const submit = document.createElement("button");
  submit.className = "button button-accept";
  submit.textContent = "CONFIRM";

  // show modal
  let modal;

  const response = new Promise(function(resolve, reject) {
    modal = makeModal(`${pre}NEW: File`, content, reject, [submit]);

    submit.addEventListener("click", async function(ev) {
      // get map data
      const data = new FormData(content);

      // try to create map
      const imageResponse = await uploadFile(data);

      // close modal on success
      if (imageResponse.ok) {
        // return map data
        resolve({
          "FileId": data.get("FileId"),
          "Owner": "gamemaster",
        });
      }
    });
  }).finally(result => {
    modal.remove()
  });

  return response;
}

export async function openImagesModal(pre) {
  const formId = `form-${modalsStack.childElementCount}`;

  // query server for map list
  const images = await getImages();
  let selected = 0;

  // construct image preview
  const previewImage = document.createElement("img");
  previewImage.src = `/api/Files/${images[0].FileId}`;

  const preview = document.createElement("div");
  preview.className = "modal-preview";
  preview.appendChild(previewImage);

  // upload new image
  const newImage = document.createElement("button");
  newImage.className = "button";
  newImage.type = "button";
  newImage.textContent = "Upload new image...";

  // construct map list
  const list = document.createElement("form");
  list.className = "modal-list";
  
  for (const [i, image] of images.entries()) {
    const control = document.createElement("input");
    control.className = "field-control";
    control.id = `${formId}_image-${i}`;
    control.type = "radio";
    control.checked = (i == 0);
    control.name = "index";
    control.value = i;

    const label = document.createElement("label");
    label.className = "field-label button";
    label.type = "radio";
    label.textContent = image.FileId;
    label.htmlFor = `${formId}_image-${i}`;

    const field = document.createElement("div");
    field.className = "modal-list-item";
    field.appendChild(control);
    field.appendChild(label);

    list.appendChild(field);
  }

  list.appendChild(newImage);

  // update selection on change
  list.addEventListener("input", function(ev) {
    const data = new FormData(list);

    const i = data.get("index");
    previewImage.src = `/api/Files/${images[i].FileId}`;
  });

  // construct modal contents
  const content = document.createElement("div");
  content.className = "layout-list-preview";
  content.appendChild(preview);
  content.appendChild(list);

  // construct submit button
  const submit = document.createElement("button");
  submit.className = "button button-accept";
  submit.textContent = "CONFIRM";

  // show modal
  let modal;

  const response = new Promise(function(resolve, reject) {
    modal = makeModal("SELECT: Image", content, reject, [submit]);

    newImage.addEventListener("click", async function(ev) {
      // get information for new map
      try {
        const imageResponse = await openNewImageModal("SELECT > ");
        const image = await imageResponse;

        // return map
        resolve(image);
        
        // update selection
      } catch (err) {
        console.log(`Map creation failed: ${err}`)
      }
    });

    submit.addEventListener("click", async function(ev) {
      // get selected image
      const data = new FormData(list);
      const i = data.get("index");

      // return selected image
      resolve(images[i]);
    });
  }).finally(result => {
    modal.remove()
  });

  return response;
}

export async function openNewMapModal(pre) {
  pre = pre ?? "";
  const formId = `form-${modalsStack.childElementCount}`;

  // construct modal contents
  const content = document.createElement("form");
  content.className = "layout-form";
  
  // construct field 'id'
  const idLabel = document.createElement("label");
  idLabel.className = "field-label";
  idLabel.textContent = "Map ID";
  idLabel.htmlFor = `${formId}_id`;

  const idControl = document.createElement("input");
  idControl.className = "field-control field-control-wide";
  idControl.id = `${formId}_id`
  idControl.type = "text";
  idControl.name = "MapId";

  const idField = document.createElement("div");
  idField.className = "modal-field";
  idField.appendChild(idLabel);
  idField.appendChild(idControl);

  content.appendChild(idField);

  // construct field 'file'
  const fileLabel = document.createElement("label");
  fileLabel.className = "field-label";
  fileLabel.textContent = "File";
  fileLabel.htmlFor = `${formId}_file`;

  const fileResult = document.createElement("input");
  fileResult.className = "field-result";
  fileResult.type = "text";
  fileResult.readOnly = true;
  fileResult.name = "FileId";

  const fileControl = document.createElement("button");
  fileControl.className = "field-control button";
  fileControl.id = `${formId}_file`;
  fileControl.type = "button";
  fileControl.textContent = "Select file...";

  fileControl.addEventListener("click", async function(ev) {
    try {
      const fileResponse = await openImagesModal("NEW > ");
      const file = await fileResponse;

      // update fileResult
      fileResult.value = file.FileId;
    } catch (err) {
      console.log(`File select failed: ${err}`)
    }
  });

  const fileField = document.createElement("div");
  fileField.className = "modal-field";
  fileField.appendChild(fileLabel);
  fileField.appendChild(fileResult);
  fileField.appendChild(fileControl);

  content.appendChild(fileField);

  // construct field 'grid-size'
  const gridLabel = document.createElement("label");
  gridLabel.className = "field-label";
  gridLabel.textContent = "Grid Size";
  gridLabel.htmlFor = `${formId}_grid`;

  const gridPadding = document.createElement("div");
  gridPadding.className = "field-result";

  const gridControl = document.createElement("input");
  gridControl.className = "field-control";
  gridControl.id = `${formId}_grid`;
  gridControl.type = "number";
  gridControl.name = "GridSizePixels";

  const gridField = document.createElement("div");
  gridField.className = "modal-field";
  gridField.appendChild(gridLabel);
  gridField.appendChild(gridPadding);
  gridField.appendChild(gridControl);

  content.appendChild(gridField);

  // construct submit button
  const submit = document.createElement("button");
  submit.className = "button button-accept";
  submit.textContent = "CONFIRM";

  // show modal
  let modal;

  const response = new Promise(function(resolve, reject) {
    modal = makeModal(`${pre}NEW: Map`, content, reject, [submit]);

    submit.addEventListener("click", async function(ev) {
      // get map data
      const data = new FormData(content);
      const map = {
        "MapId": data.get("MapId"),
        "FileId": data.get("FileId"),
        "GridSizePixels": data.get("GridSizePixels"),
      };

      // try to create map
      const mapResponse = await uploadMap(map);

      // close modal on success
      if (mapResponse.ok) {
        // return map data
        resolve(map);
      }
    });
  }).finally(result => {
    modal.remove()
  });

  return response;
}

export async function openMapsModal() {
  const formId = `form-${modalsStack.childElementCount}`;

  // query server for map list
  const maps = await getMaps();
  let selected = 0;

  // construct map preview
  const previewImage = document.createElement("img");
  previewImage.src = activeMap.image.src;

  const preview = document.createElement("div");
  preview.className = "modal-preview";
  preview.appendChild(previewImage);

  // construct map list
  const list = document.createElement("form");
  list.className = "modal-list";
  
  console.log(maps);
  for (const [i, map] of maps.entries()) {
    const control = document.createElement("input");
    control.className = "field-control";
    control.id = `${formId}_map-${i}`;
    control.type = "radio";
    control.checked = (map.MapId == activeMap.id);
    control.name = "index";
    control.value = i;

    const label = document.createElement("label");
    label.className = "field-label button";
    label.type = "radio";
    label.textContent = map.MapId;
    label.htmlFor = `${formId}_map-${i}`;

    const field = document.createElement("div");
    field.className = "modal-list-item";
    field.appendChild(control);
    field.appendChild(label);

    list.appendChild(field);
  }

 // create new map
  const newMap = document.createElement("button");
  newMap.className = "button";
  newMap.type = "button";
  newMap.textContent = "Create new map...";

  list.appendChild(newMap);

  // update selection on change
  list.addEventListener("input", function(ev) {
    const data = new FormData(list);

    const i = data.get("index");
    previewImage.src = `/api/Files/${maps[i].FileId}`;
  });

  // construct modal contents
  const content = document.createElement("div");
  content.className = "layout-list-preview";
  content.appendChild(preview);
  content.appendChild(list);

  // construct submit button
  const submit = document.createElement("button");
  submit.className = "button button-accept";
  submit.textContent = "CONFIRM";

  // show modal
  let modal;

  const response = new Promise(function(resolve, reject) {
    modal = makeModal("SELECT: Map", content, reject, [submit]);

    newMap.addEventListener("click", async function(ev) {
      // get information for new map
      try {
        // create new map
        const mapResponse = await openNewMapModal("SELECT > ");
        const map = await mapResponse;

        // update active map
        setMap(map);

        // close modal
        resolve(map);
      } catch (err) {
        console.log(`Map creation failed: ${err}`)
      }
    });

    submit.addEventListener("click", async function(ev) {
      // get selected map
      const data = new FormData(list);
      const i = data.get("index");

      // update active map
      setMap(maps[i]);
      
      // close modal
      resolve(maps[i]);
    });
  }).finally(result => {
    modal.remove()
  });

  return response;
}
