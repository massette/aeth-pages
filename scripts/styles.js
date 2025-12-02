const style = getComputedStyle(document.body);
const U_REM = parseFloat(style.fontSize);

export const LAYOUT = Object.freeze({
    "VIEW": Object.freeze({
        "BORDER": 0.20 * U_REM,
    }),

    "SCREEN": Object.freeze({
        "WIDTH" : 1024,
        "HEIGHT": 600,
        "BORDER": 0.15 * U_REM,
    }),

    "SELECT": Object.freeze({
        "BORDER": 0.15 * U_REM,
    }),

    "HANDLE": 0.50 * U_REM,
});

export const COLORS = Object.freeze({
    "FG": style.getPropertyValue("--color-fg"),
    "BG": style.getPropertyValue("--color-bg"),

    "SCREEN": Object.freeze({
        "STROKE": "#785EF0",
        "FILL"  : "#785EF055",
    }),

    "SELECT": Object.freeze({
        "STROKE": "#FFF",
        "FILL"  : "#FFF",
    }),
});
