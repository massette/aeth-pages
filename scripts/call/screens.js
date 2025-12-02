const cache = [
    {
        x: 0,
        y: 0,
        width: 1024,
        height: 600,
    },
];

export async function getScreensState() {
    return fetch("/api/Screens/layout").then(response => {
        if (!response.ok)
            return Promise.reject(response);

        return response.json();
    }).catch(err => {
        console.log("Failed to fetch screens state!", err);
    });
}
