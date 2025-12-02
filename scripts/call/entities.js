let entities_cache = {};

export async function getEntities(lazy) {
    if (lazy)
        return Object.values(entities_cache)

    return fetch("/api/Entities").then(async response => {
        if (!response.ok)
            return Promise.reject(response);

        const entities = await response.json();

        console.log("Fetched entities.");
        entities_cache = entities.reduce((acc, entity) => ({
            ...acc,
            [entity.EntityId]: entity,
        }), {});

        return entities;
    }).catch(err => {
        console.error("Failed to fetch entities!", err);
        return Object.values(entities_cache);
    });
}

export async function getEntity(id, lazy) {
    if (lazy && entities_cache[id])
        return entities_cache[id];

    return fetch(`/api/Entities/${id}`).then(async response => {
        if (!response.ok)
            return Promise.reject(response);

        const entity = await response.json();

        console.log(`Fetched token "${id}".`);

        entities_cache[id] = entity;
        return entity;
    }).catch(err => {
        console.error(`Failed to fetch entity!`, err);
        return entities_cache[id];
    });
}

export async function createEntity(entity) {
    return fetch(`/api/Entities/create?creator=gamemaster`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(entity),
    }).then(async response => {
        if (!response.ok)
            return Promise.rejct(response);

        const { EntityId: id } = await response.json();
        entity.EntityId = id;

        console.log(`Created entity "${id}".`);

        entities_cache[id] = entity;
        return id;
    }).catch(err => {
        console.error("Failed to create entity!", err);
    });
}

export async function updateEntity(entity) {
    return fetch(`/api/Entities/move`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(entity),
    }).then(async response => {
        if (!response.ok)
            return Promise.reject(response);

        console.log("Updated entity.");
        entities_cache[entity.EntityId].x = entity.x;
        entities_cache[entity.EntityId].y = entity.y;

        return entities_cache[entity.EntityId];
    }).catch(err => {
        console.error("Failed to update entity!", err);
        return entities_cache[entity.EntityId];
    });
}

export async function killEntity(id) {
    return fetch(`/api/Entities/delete`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
    }).then(async response => {
        if (!response.ok)
            return Promise.reject(response);

        console.log("Deleted entity.");
        delete entities_cache[id];
    }).catch(err => {
        console.log("Failed to delete entity!", err);
    });
}

export async function clearEntities(lazy) {
    return getEntities(lazy).then(entities => {
        const requests = entities.map(entity => killEntity(entity.EntityId));
        return Promise.all(requests);
    });
}
