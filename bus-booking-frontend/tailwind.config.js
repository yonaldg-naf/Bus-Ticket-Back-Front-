/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  darkMode: "class",
  theme: {
    container: {
      center: true,
      // Slightly tighter horizontal padding so the page looks wider at all sizes
      padding: {
        DEFAULT: "0.5rem",
        sm: "0.75rem",
        md: "1rem",
        lg: "1.25rem",
        xl: "1.75rem",
        "2xl": "2rem",
      },
      // Wider container widths so the layout occupies more horizontal space on desktop
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1100px",   // wider than default; reduces big side gutters on laptops
        xl: "1320px",   // comfortably wide for large desktops
        "2xl": "1500px" // generous max for very wide screens without going full-bleed
      },
    },
    extend: {
      colors: {
        brand: {
          black: "#000000",
          graphite: "#1F1F1F",
          text: "#000000",
          textMuted: "#6E6E6E",
          bg: "#FAFAFA",
          card: "#FFFFFF",
          border: "#E5E5E5",
          accent: "#6A5AF9",
          success: "#00C26E",
          error: "#FF4A4A",
          warning: "#FFB020",
          info: "#3B82F6",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "Apple Color Emoji",
          "Segoe UI Emoji",
        ],
      },
      borderRadius: {
        lg: "14px",
        xl: "18px",
        "2xl": "22px",
      },
      boxShadow: {
        card: "0 2px 6px rgba(0,0,0,0.04)",
        soft: "0 4px 16px rgba(0,0,0,0.06)",
        ring: "0 0 0 3px rgba(106,90,249,0.15)",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      spacing: {
        15: "3.75rem",
      },
    },
  },
  plugins: [],
};
