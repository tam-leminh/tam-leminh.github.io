// Apply the saved appearance in the head to avoid flashing the default theme.
const siteThemes = ["light", "dark", "classic"];
const nextTheme = () => {
  const current = document.documentElement.getAttribute("data-theme");
  return siteThemes[(siteThemes.indexOf(current) + 1) % siteThemes.length];
};

const updateThemeControls = () => {
  const toggle = document.getElementById("light-toggle");
  if (toggle) {
    const label = `Switch to ${nextTheme()} theme`;
    toggle.setAttribute("aria-label", label);
    toggle.title = label;
  }
};

const setTheme = (theme, persist = true) => {
  if (!siteThemes.includes(theme)) return;

  document.documentElement.setAttribute("data-theme", theme);

  if (persist) {
    try {
      localStorage.setItem("theme", theme);
    } catch (error) {
      // The selector still works when the browser blocks local storage.
    }
  }

  updateThemeControls();

  if (typeof medium_zoom !== "undefined") {
    medium_zoom.update({
      background: getComputedStyle(document.documentElement)
        .getPropertyValue("--global-bg-color").trim() + "ee",
    });
  }
};

let savedTheme;
try {
  savedTheme = localStorage.getItem("theme");
} catch (error) {
  // Fall back to the system preference if storage is unavailable.
}

const preferredTheme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
  ? "dark"
  : "light";

// Also handles the old selector's stored "null" value and stale preferences.
setTheme(siteThemes.includes(savedTheme) ? savedTheme : preferredTheme, false);
