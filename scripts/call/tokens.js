import { getFileImage } from "/scripts/call/files.js";

// cached tokens list
let tokens_cache = {};

export async function getTokens(lazy) {
    if (lazy)
        return Object.values(tokens_cache);

    const response = await fetch("/api/Tokens");

    return response.json().then(tokens => {
        if (!response.ok)
            return Promise.reject(response);

        console.log(`Fetched tokens.`);

        // update cache
        tokens_cache = tokens.reduce((acc, token) => ({
            ...acc,
            [token.TokenId]: token,
        }), {});

        return tokens;
    }).catch(err => {
        console.error("Failed to fetch tokens!", err);
        return Object.values(tokens_cache);
    });
}

export async function getToken(id, lazy) {
    if (lazy && tokens_cache[id])
        return tokens_cache[id];

    return fetch(`/api/Tokens/${id}`).then(async response => {
        if (!response.ok)
            return Promise.reject(response);

        const token = await response.json();
        
        console.log(`Fetched token "${id}".`);

        tokens_cache[id] = token;
        return token;
    }).catch(err => {
        console.error(`Failed to fetch token "${id}"!`, err);
        return tokens_cache[id];
    });
}

export async function setToken(token) {
    const response = await fetch(`/api/Tokens/${token.TokenId}?creator=gamemaster`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(token),
    });

    if (response.ok) {
        console.log(`Updated token "${token.TokenId}".`)
        tokens_cache[token.TokenId] = token;
    } else {
        console.error(`Failed to update token "${token.TokenId}"!`, response);
    }

    return tokens_cache[token.TokenId];
}

export async function getTokenImage(token, lazy=true) {
    return getFileImage(token.FileId, lazy).then((file) => ({
        ...file,
        ...token,
    }));
}

