let cache = [];

export async function getScreensState(lazy) {
    if (lazy)
        return cache;

    return fetch("/api/Screens/layout").then(response => {
        if (!response.ok)
            return Promise.reject(response);

        console.log("Fetched screens state.");
        cache = response.json();

        return cache
    }).catch(err => {
        console.log("Failed to fetch screens state!", err);

        return cache;
    });
}

export async function setScreensState(screens) {
    const requests = screens.map(screen => fetch(`/api/Maps/set-viewport/${screen.id}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(screen),
    }));

    return Promise.all(requests).then(results => {
        console.log("Updated screens state.");
        cache = screens;

        return cache;
    }).catch(err => {
        console.log("Failed to update screens state!", screens, err);

        return cache;
    })
}
