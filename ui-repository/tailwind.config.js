module.exports = {
    future: {},
    mode: "jit",
    content: [
        "./public/index.html",
        "./src/**/*.html",
        "./src/**/*.{js,jsx,ts,tsx,vue}",
        "./node_modules/@describo/**/*.vue",
    ],
    theme: {
        extend: {
            colors: {
                "nyingarn-dark": "#4a6163",
                "nyingarn-light": "#f9f9f9",
            },
        },
    },
    variants: {},
    plugins: [],
};
