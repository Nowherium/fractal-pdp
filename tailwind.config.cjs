/* global module */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"Courier New"', "Courier", "monospace"],
      },
      maxWidth: {
        page: "1400px",
      },
      boxShadow: {
        panel: "2px 2px 10px rgba(0, 0, 0, 0.5)",
      },
      colors: {
        page: "#121212",
        bodytext: "#e0e0e0",
        panel: "#1e1e1e",
        "panel-alt": "#1a1a1a",
        "table-bg": "#111111",
        "input-bg": "#222222",
        "soft-bg": "#181818",
        "softer-bg": "#161616",
        "border-main": "#333333",
        "border-strong": "#444444",
        "border-soft": "#3b3b3b",
        "accent-cyan": "#00bcd4",
        "accent-cyan-dark": "#008ba3",
        "accent-blue": "#81d4fa",
        "accent-green": "#69f0ae",
        "accent-yellow": "#ffd54f",
        "accent-orange": "#ffb74d",
        "accent-red": "#ff5252",
      },
    },
  },
  plugins: [],
};
