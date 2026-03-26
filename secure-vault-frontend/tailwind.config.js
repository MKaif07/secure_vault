/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        vault: {
          black: "#0a0a0a",
          gray: "#1a1a1a",
          accent: "#f0f0f0", // White/Silver for the "Anvil" look
        },
      },
      boxShadow: {
        brutal: "4px 4px 0px 0px rgba(240, 240, 240, 1)",
      },
    },
  },
  test: {
    environment: "jsdom",
  },
  plugins: [],
};
