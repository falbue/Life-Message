document.addEventListener("DOMContentLoaded", () => {
  const textarea = document.getElementById("inputMessage");
  const handle = document.querySelector(".resize-handle");

  let startY;
  let startHeight;

  const initialHeight = textarea.offsetHeight;
  const maxResizeHeight = window.innerHeight * 0.4;

  function startDrag(e) {
    startY = e.clientY || e.touches?.[0].clientY;
    startHeight = parseInt(
      document.defaultView.getComputedStyle(textarea).height,
      10,
    );

    document.documentElement.addEventListener("mousemove", doDrag, false);
    document.documentElement.addEventListener("mouseup", stopDrag, false);

    document.documentElement.addEventListener("touchmove", doDrag, {
      passive: false,
    });
    document.documentElement.addEventListener("touchend", stopDrag, false);
  }

  function doDrag(e) {
    e.preventDefault();
    const clientY = e.clientY || e.touches?.[0].clientY;
    const newHeight = startHeight - (clientY - startY);

    if (newHeight >= initialHeight && newHeight <= maxResizeHeight) {
      textarea.style.height = `${newHeight}px`;
    }
  }

  function stopDrag() {
    document.documentElement.removeEventListener("mousemove", doDrag, false);
    document.documentElement.removeEventListener("mouseup", stopDrag, false);
    document.documentElement.removeEventListener("touchmove", doDrag, false);
    document.documentElement.removeEventListener("touchend", stopDrag, false);
  }

  handle.addEventListener("mousedown", startDrag);
  handle.addEventListener("touchstart", startDrag, { passive: false });

  textarea.addEventListener("input", autoResize);

  function autoResize() {
    if (parseInt(textarea.style.height, 10) < maxResizeHeight) {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, maxResizeHeight);
      textarea.style.height = `${newHeight}px`;
    }
  }

  autoResize();
});

if ("visualViewport" in window) {
  window.visualViewport.addEventListener("resize", () => {
    document.documentElement.style.setProperty(
      "--vh",
      `${window.visualViewport.height}px`,
    );
  });
} else {
  window.addEventListener("resize", () => {
    document.documentElement.style.setProperty(
      "--vh",
      `${window.innerHeight}px`,
    );
  });
}
