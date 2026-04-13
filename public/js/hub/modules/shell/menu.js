/*
  public/js/hub/modules/shell/menu.js

  Controls the top-right Hub menu and its animation.
*/

export function createMenuController({ menu, menuTrigger, menuPanel, animationMs }) {
  let menuCloseTimer = null;

  function resetMenuTimer() {
    if (menuCloseTimer) {
      window.clearTimeout(menuCloseTimer);
      menuCloseTimer = null;
    }
  }

  function openMenuPanel() {
    resetMenuTimer();
    menuTrigger.setAttribute("aria-expanded", "true");
    menuPanel.dataset.state = "closed";
    menuPanel.getBoundingClientRect();
    menuPanel.dataset.state = "opening";
    menuCloseTimer = window.setTimeout(() => {
      menuPanel.dataset.state = "open";
      menuCloseTimer = null;
    }, animationMs);
  }

  function closeMenuPanel() {
    if (menuPanel.dataset.state === "closed" || menuPanel.dataset.state === "closing") {
      return;
    }

    resetMenuTimer();
    menuTrigger.setAttribute("aria-expanded", "false");
    menuPanel.dataset.state = "open";
    menuPanel.getBoundingClientRect();
    menuPanel.dataset.state = "closing";
    menuCloseTimer = window.setTimeout(() => {
      menuPanel.dataset.state = "closed";
      menuCloseTimer = null;
    }, animationMs);
  }

  function toggleMenuPanel() {
    if (menuPanel.dataset.state === "open" || menuPanel.dataset.state === "opening") {
      closeMenuPanel();
      return;
    }

    if (menuPanel.dataset.state !== "open") {
      openMenuPanel();
    }
  }

  document.addEventListener("click", (event) => {
    if (!menu.contains(event.target)) {
      closeMenuPanel();
    }
  });

  return {
    closeMenuPanel,
    openMenuPanel,
    resetMenuTimer,
    toggleMenuPanel
  };
}

export function bindMenuTrigger({ menuController, menuTrigger }) {
  menuTrigger.addEventListener("click", () => {
    menuController.toggleMenuPanel();
  });
}
