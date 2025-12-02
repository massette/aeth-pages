import { getFileImage } from "/scripts/call/files.js";

// cached maps list
let maps_cache = {};

export async function getMaps(lazy) {
    if (lazy)
        return Object.values(maps_cache);

    const response = await fetch("/api/Maps");

    return response.json().then(maps => {
        if (!response.ok)
            return Promise.reject(response);

        console.log(`Fetched maps.`);

        // update cache
        maps_cache = maps.reduce((acc, map) => ({
            ...acc,
            [map.MapId]: map,
        }), {});

        return maps;
    }).catch(err => {
        console.error("Failed to fetch maps!", err);
        return Object.value(maps_cache);
    });
}

export async function getMap(id, lazy) {
    if (lazy && maps_cache[id])
        return maps_cache[id];

    const response = await fetch(`/api/Maps/${id}`);

    return response.json().then(map => {
        if (!response.ok)
            return Promise.reject(response);

        console.log(`Fetched map "${id}".`);

        maps_cache[id] = map;
        return map;
    }).catch(err => {
        console.error(`Failed to fetch map "${id}"!`, err);
        return maps_cache[id];
    });
}

export async function setMap(map) {
    const response = await fetch(`/api/Maps/${map.MapId}?creator=gamemaster`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(map),
    });

    if (response.ok) {
        console.log(`Updated map "${map.MapId}".`)
        maps_cache[map.MapId] = map;
    } else {
        console.error(`Failed to update map "${map.MapId}"!`, response);
    }

    return maps_cache[map.MapId];
}

export async function getMapImage(map, lazy=true) {
    return getFileImage(map.FileId, lazy).then((file) => ({
        ...file,
        ...map,
    }));
}

export async function getMapEntities(map) {}

let active_cache;
let listeners = [];
export async function registerStage(stage) {
    listeners.push(stage);

    if (stage.updateMap && active_cache) {
        await stage.updateMap(active_cache);
        stage.render();
    }
}

export async function getActive(lazy) {
    if (lazy && active_cache)
        return active_cache;

    // get active map from server
    const response = await fetch("/api/Maps/active-map");

    return response.json().then(map => {
        if (!response.ok)
            return Promise.reject(response);

        console.log(`Fetched active map "${map.MapId}".`);
        active_cache = map;

        listeners.forEach(async stage => {
            await stage.call("updateMap", active_cache);
            console.log("DONE CALL");
            stage.render();
            console.log("DONE DRAW");
        });

        return map;
    }).catch(err => {
        console.error("Failed to fetch active map!", err);
        return active_cache;
    });
}

export async function setActive(map) {
    // set active map on server
    const response = await fetch(`/api/Maps/${map.MapId}/is-active?setter=gamemaster`, { method: "POST" });
    
    if (response.ok) {
        console.log(`Updated active map "${map.MapId}".`);
        active_cache = maps_cache[map.MapId];
    } else {
        console.error("Failed to update active map!", response);
    }

    listeners.forEach(async stage => {
        await stage.call("updateMap", active_cache);
        console.log("DONE CALL");
        stage.render();
        console.log("DONE DRAW");
    });

    return active_cache;
}
