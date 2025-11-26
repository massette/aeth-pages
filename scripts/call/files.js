let files_cache = {};

export async function getFile(id, lazy) {
    return {
        "FileId": id,
        "Owner" : "gamemaster",
    };
}

export async function getFiles(lazy) {
    if (lazy)
        return files_cache;

    const response = await fetch("/api/Files/list");

    return response.json().then(files => {
        if (!response.ok)
            return Promise.reject(response);

        console.log("Fetched files.");

        files_cache = files.reduce((acc, file) => ({
            ...acc,
            [file.FileId]: file,
        }));

        return files;
    }).catch(err => {
        console.error("Failed to fetch files!", err);
        return Object.values(files_cache);
    });
}

export async function setFile(data) {
    const id = data.get("FileId");
    const response = await fetch(`/api/Files/images/${id}?userid=gamemaster`, {
        method: "POST",
        body: data,
    });

    if (response.ok) {
        console.log(`Updated file "${id}".`);

        // update cache
        files_cache[id] = {
            "FileId": id,
            "Owner": "gamemaster",
        };
    } else {
        console.log(`Failed to update file ${id}!`, repsonse);
    }

    return files_cache[id];
}

export async function getFileImage(id, lazy=true) {
    return new Promise((resolve, reject) => {
        const image = new Image();

        image.src = `/api/Files/images/${id}`;
        image.addEventListener("load", async () => resolve({
            ...(await getFile(id, lazy)),

            image,
            width : image.naturalWidth,
            height: image.naturalHeight,
        }));

        image.addEventListener("error", () => reject(id));
    });
}
