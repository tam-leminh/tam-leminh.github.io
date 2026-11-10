document.addEventListener("DOMContentLoaded", function () {
  const toggle = document.getElementById("light-toggle");
  if (toggle) {
    toggle.closest(".theme-picker").hidden = false;
    toggle.addEventListener("click", () => {
      setTheme(nextTheme());
    });
  }
  updateThemeControls();
});
