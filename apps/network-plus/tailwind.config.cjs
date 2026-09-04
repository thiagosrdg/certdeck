/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("@certdeck/engine/tailwind-preset")],
  content: ["./index.html", "./src/**/*.{ts,tsx}", "../../packages/engine/src/**/*.{ts,tsx}"],
};
