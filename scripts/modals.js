import { getFiles, getFile, setFile, getFileImage } from "/scripts/call/files.js";
import { getMaps, getMap, setMap, getActive } from "/scripts/call/maps.js";
import { getTokens, getToken, setToken } from "/scripts/call/tokens.js";

const overlay = document.getElementById("overlay");

export class Modal {
    root;
    body;
    next;

    form;
    response;
    init;
    process = (data => data);

    constructor(title, init, process) {
        this.root = document.createElement("div");
        this.root.className = "modal";

        // construct header
        const header = document.createElement("div");
        header.className = "modal-header";
        
        const headerTitle = document.createElement("div");
        headerTitle.className = "modal-title";
        headerTitle.textContent = title;
        header.appendChild(headerTitle);

        const headerExit = document.createElement("button");
        headerExit.className = "modal-exit button button-discard";
        headerExit.textContent = "\u{2716}";
        headerExit.addEventListener("click", (ev) => this.reject());
        header.appendChild(headerExit);

        this.root.appendChild(header);

        // construct body
        this.body = document.createElement("div");
        this.body.className = "modal-body";

        this.root.appendChild(this.body);

        // construct footer
        const footer = document.createElement("div");
        footer.className = "modal-footer";
        
        const submit = document.createElement("button");
        submit.className = "button button-accept";
        submit.textContent = "CONFIRM";
        submit.addEventListener("click", (ev) => this.submit());
        footer.appendChild(submit);

        this.root.appendChild(footer);

        // set callbacks
        this.init = init;
        this.process = process;

        // reset modal
        this.body.innerHTML = "";
        if (this.init)
            this.init(this);
    }

    addPreview(id) {
        const preview = document.createElement("div");
        preview.className = "modal-preview";

        const image = document.createElement("img");
        image.src = `/api/Files/images/${id}`;

        preview.appendChild(image);
        this.body.appendChild(preview);
        
        return image;
    }

    addRadioList(labels, name, active) {
        const entries = Object.entries(labels);

        this.form = document.createElement("form");
        this.form.className = "modal-list";

        if (Array.isArray(labels)) {
            active = labels.includes(active) ? active : labels[0];
            
            for (let i = 0; i < labels.length; i++)
                this.addRadioItem(labels[i], labels[i], name, labels[i] == active);
        } else {
            const entries = Object.entries(labels);
            active = labels[active] ? active : entries[0][0];

            for (const [key, value] of entries)
                this.addRadioItem(key, value, name, key == active);
        }

        this.body.appendChild(this.form);

        return this.form;
    }

    addRadioItem(label, payload, name, checked) {
        if (typeof payload == "function") {
            const field = document.createElement("button");
            field.className = "button";
            field.type = "button";
            field.textContent = label;
            field.addEventListener("click", payload);

            this.form.appendChild(field);
            return field;
        } else {
            const field = document.createElement("div");
            const id = `radio_${name}-${label}`;
            field.className = "modal-list-item";

            const fieldControl = document.createElement("input");
            fieldControl.id = id;
            fieldControl.className = "field-control";
            fieldControl.type = "radio";
            fieldControl.checked = checked;
            fieldControl.name = name;
            fieldControl.value = payload;
            field.appendChild(fieldControl);

            const fieldLabel = document.createElement("label");
            fieldLabel.className = "field-label button";
            fieldLabel.htmlFor = id;
            fieldLabel.textContent = label;
            field.appendChild(fieldLabel);

            this.form.appendChild(field);
            return field;
        }
    }

    addForm() {
        const form = new Form();

        this.form = form.root;
        this.body.appendChild(form.root);

        return form;
    }

    open(next) {
        // await form result
        if (!this.response) {
            this.response = {
                accept: null,
                reject: null,
            };

            this.response.promise = new Promise((resolve, reject) => {
                this.response.accept = resolve;
                this.response.reject = reject;
            });
        }

        if (next)
            this.next = next;

        overlay.replaceChildren(this.root);

        return this.response.promise;
    }

    reject() {
        this.response.reject("Operation cancelled.");
        this.close();
    }

    async submit() {
        const result = (this.process) ? await this.process(new FormData(this.form))
                                      : new FormData(this.form);

        if (result) {
            this.response.accept(result);
            this.close();
        }
    }

    close() {
        // reset modal
        this.body.innerHTML = "";
        this.response = null;

        if (this.init)
            this.init(this);

        if (this.next) {
            this.next.open();
        } else {
            this.root.remove();
        }

        this.next = null;
    }
}

class Form {
    root;
    ids = [];

    constructor() {
        this.root = document.createElement("form");
        this.root.className = "modal-form";
    }

    addField(name, type, label) {
        const field = document.createElement("div");
        const control_id = `field_${name}`;
        field.className = "modal-field";

        const fieldLabel = document.createElement("label");
        fieldLabel.className = "field-label";
        fieldLabel.textContent = label;
        fieldLabel.htmlFor = control_id;
        field.appendChild(fieldLabel);

        const fieldResult = document.createElement("input");
        fieldResult.className = "field-result";
        fieldResult.type = "text";
        fieldResult.readOnly = true;
        field.appendChild(fieldResult);

        const fieldControl = document.createElement("input");
        fieldControl.className = "field-control";
        fieldControl.id = control_id;
        field.appendChild(fieldControl);

        switch (type) {
            case "text":
                fieldControl.classList.add("field-control-wide");
                fieldControl.name = name;
                fieldControl.type = "text";
                break;

            case "number":
                fieldControl.name = name;
                fieldControl.type = "number";
                break;

            case "file":
                fieldControl.type = "button";
                fieldControl.className = "field-control button";
                fieldControl.value = "Upload..."

                const upload = document.createElement("input");
                upload.className = "hidden";
                upload.type = "file";
                upload.accept = "image/*";
                upload.name = name;
                field.appendChild(upload);

                fieldControl.addEventListener("click", async (ev) => {
                    upload.click();
                });

                upload.addEventListener("change", (ev) => {
                    fieldResult.value = ev.target.files[0].name;
                });
                break;

            default:
                fieldControl.type = "button";
                fieldControl.className = "field-control button";
                fieldControl.value = "Select...";

                fieldResult.name = name;
                fieldControl.addEventListener("click", async (ev) => {
                    fieldResult.value = await type(ev);
                });
        }

        this.root.appendChild(field);
    }
}

/* FILES */
export const newFile = new Modal("NEW: File", async (modal) => {
    const form = modal.addForm();
    form.addField("FileId", "text", "File ID");
    form.addField("file", "file", "File");
}, async (data) => setFile(data));

export const selectFile = new Modal("SELECT: File", async (modal) => {
    const files = await getFiles();

    const preview = modal.addPreview(files[0].FileId);
    const form = modal.addRadioList(files.map(file => file.FileId), "FileId", files[0].FileId);
    const uploadButton = modal.addRadioItem("Upload new file...", async () => {
        // add to radio list
        const file = await newFile.open(modal);
        const fileButton = modal.addRadioItem(file.FileId, file.FileId, "FileId", false);

        // move upload button to end of list
        form.appendChild(uploadButton);
        fileButton.firstChild.click();
    });

    // update preview
    form.addEventListener("input", (ev) => {
        const new_id = (new FormData(form)).get("FileId");
        preview.src = `/api/Files/images/${new_id}`;
    });
}, async data => getFile(data.get("FileId")));

/* MAPS */
export const newMap = new Modal("NEW: Map", async (modal) => {
    const form = modal.addForm();
    form.addField("MapId", "text", "Map ID");
    form.addField("FileId", async () => {
        const file = await selectFile.open(modal);
        return file.FileId;
    }, "File");
    form.addField("GridSizePixels", "number", "Grid Size");
}, async (data) => setMap({
    "MapId": data.get("MapId"),
    "FileId": data.get("FileId"),
    "GridSizePixels": data.get("GridSizePixels"),
}));

export const selectMap = new Modal("SELECT: Map", async (modal) => {
    const maps = await getMaps();
    const files = maps.reduce((acc, map) => ({
        ...acc,
        [map.MapId]: map.FileId,
    }), {});

    const active_map = await getActive(true);

    // create modal
    let preview = modal.addPreview(active_map.FileId);
    const form = modal.addRadioList(maps.map(map => map.MapId), "MapId", active_map.MapId);
    const uploadButton = modal.addRadioItem("Create new map...", async () => {
        // add to radio list
        const map = await newMap.open(modal);
        const mapButton = modal.addRadioItem(map.MapId, map.MapId, "MapId", false);

        //
        files[map.MapId] = map.FileId;

        // move upload button to end of list
        form.appendChild(uploadButton);
        mapButton.firstChild.click();
    }); 

    // update preview
    form.addEventListener("input", async (ev) => {
        const id = (new FormData(form)).get("MapId");

        // load new image in background
        getFileImage(files[id]).then(({image}) => {
            preview.replaceWith(image);
            preview = image;
        });
    });
}, async data => getMap(data.get("MapId")));

export const newToken = new Modal("NEW: Token", async (modal) => {
    const form = modal.addForm();
    form.addField("TokenId", "text", "Token ID");
    form.addField("FileId", async () => {
        const file = await selectFile.open(modal);
        return file.FileId;
    }, "File");
}, async (data) => setToken({
    "TokenId": data.get("TokenId"),
    "FileId": data.get("FileId"),
}));

export const selectToken = new Modal("SELECT: Token", async (modal) => {
    const tokens = await getTokens();
    const files = tokens.reduce((acc, token) => ({
        ...acc,
        [token.TokenId]: token.FileId,
    }), {});

    let preview = modal.addPreview(tokens[0].FileId);
    const form = modal.addRadioList(tokens.map(token => token.TokenId), "TokenId", tokens[0].TokenId);
    const uploadButton = modal.addRadioItem("Upload new token...", async () => {
        // add to radio list
        const token = await newToken.open(modal);
        const tokenButton = modal.addRadioItem(token.TokenId, token.TokenId, "TokenId", false);

        files[token.TokenId] = token.FileId;

        // move upload button to end of list
        form.appendChild(uploadButton);
        tokenButton.firstChild.click();
    });

    // update preview
    form.addEventListener("input", (ev) => {
        const id = (new FormData(form)).get("TokenId");

        getFileImage(files[id]).then(({image}) => {
            preview.replaceWith(image);
            preview = image;
        });
    });
}, async data => getToken(data.get("TokenId")));

export const newEntity = new Modal("NEW: Entity", async (modal) => {
    const form = modal.addForm();
    form.addField("x", "number", "X");
    form.addField("y", "number", "Y");
    form.addField("TokenId", async () => {
        const token = await selectToken.open(modal);
        return token.TokenId;
    }, "Token");
}, async (data) => createEntity({
    "TokenId": data.get("TokenId"),
    "x": data.get("x"),
    "y": data.get("y"),
}));
