(() => {
  const stored = localStorage.getItem("selectedFile");
  if (!stored) return;

  const data = JSON.parse(stored);
  document.getElementById("fileName").textContent = data.name;
  document.title = data.name;

  const BASE_URL = "https://cuongkk.github.io/Tai-lieu-/";
  const DEFAULT_FILE = data.file + ".pdf";

  function getFileFromQuery() {
    const u = new URL(window.location.href);
    return u.searchParams.get("file");
  }
  const FILE_NAME = getFileFromQuery() || DEFAULT_FILE;
  const PDF_URL = new URL(FILE_NAME, BASE_URL).toString();

  // ---- PDF.js worker
  if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  // ---- DOM
  const canvas = document.getElementById("pdfCanvas");
  const ctx = canvas.getContext("2d");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const pageInput = document.getElementById("pageInput");
  const pageCountEl = document.getElementById("pageCount");
  const loader = document.getElementById("loader");
  const containerEl = document.getElementById("page-container");

  // ---- State
  let pdfDoc = null;
  let currentPage = 1;
  let totalPages = 0;

  // zoomMode: "fitWidth" | "fitPage" | "custom"
  let zoomMode = "fitWidth";
  let customScale = 1.0; // chỉ dùng khi zoomMode = "custom"

  let rendering = false;
  let pendingPage = null;

  // ---- Helpers
  function showLoader(on) {
    loader.style.display = on ? "inline-block" : "none";
  }
  function clamp(v, min, max) {
    return Math.min(Math.max(v, min), max);
  }
  function updateButtons() {
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;

    pageInput.max = totalPages || 1;
    pageInput.value = currentPage;
    pageCountEl.textContent = totalPages || 0;
  }

  function computeScale(viewportAt1) {
    // scale hiển thị trên CSS (không nhân dpr)
    const containerW = Math.max(1, containerEl.clientWidth - 16);
    const containerH = Math.max(1, containerEl.clientHeight - 16);

    if (zoomMode === "fitWidth") {
      return clamp(containerW / viewportAt1.width, 0.25, 4);
    }
    if (zoomMode === "fitPage") {
      const sW = containerW / viewportAt1.width;
      const sH = containerH / viewportAt1.height;
      return clamp(Math.min(sW, sH), 0.25, 4);
    }
    // custom
    return clamp(customScale, 0.25, 4);
  }

  async function renderPage(num) {
    if (!pdfDoc) return;

    if (rendering) {
      pendingPage = num;
      return;
    }
    rendering = true;
    showLoader(true);

    try {
      const page = await pdfDoc.getPage(num);

      // Viewport 1.0 để tính toán
      let viewport = page.getViewport({ scale: 1.0 });

      // Tính scale CSS theo mode
      const cssScale = computeScale(viewport);

      // DPR để render nét
      const dpr = Math.max(1, window.devicePixelRatio || 1);

      // Viewport thật để render
      viewport = page.getViewport({ scale: cssScale * dpr });

      // Cấu hình canvas (pixel)
      const renderWidth = Math.floor(viewport.width);
      const renderHeight = Math.floor(viewport.height);
      canvas.width = renderWidth;
      canvas.height = renderHeight;

      // Kích thước hiển thị (CSS px)
      canvas.style.width = Math.floor(renderWidth / dpr) + "px";
      canvas.style.height = Math.floor(renderHeight / dpr) + "px";

      // Reset any transforms
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      await page.render({ canvasContext: ctx, viewport }).promise;

      currentPage = num;
      updateButtons();
    } catch (err) {
      console.error("Render error:", err);
      alert("Không thể hiển thị trang. Kiểm tra URL PDF hoặc CORS.");
    } finally {
      rendering = false;
      showLoader(false);

      if (pendingPage != null && pendingPage !== currentPage) {
        const next = pendingPage;
        pendingPage = null;
        renderPage(next);
      } else {
        pendingPage = null;
      }
    }
  }

  function queueRender(num) {
    num = clamp(num, 1, totalPages || 1);
    renderPage(num);
  }

  async function loadPdf(url) {
    try {
      showLoader(true);
      const loading = window.pdfjsLib.getDocument({ url });
      pdfDoc = await loading.promise;
      totalPages = pdfDoc.numPages;
      currentPage = 1;
      updateButtons();
      await renderPage(1);
    } catch (err) {
      console.error("Load PDF error:", err);
      alert("Không tải được PDF. Kiểm tra BASE_URL/FILE_NAME hoặc CORS.");
    } finally {
      showLoader(false);
    }
  }

  // ---- Events
  prevBtn.addEventListener("click", () => queueRender(currentPage - 1));
  nextBtn.addEventListener("click", () => queueRender(currentPage + 1));

  // Khi đổi số trang: Enter sẽ blur() để thoát INPUT, tránh kẹt focus
  pageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const num = parseInt(pageInput.value, 10) || 1;
      pageInput.blur();
      queueRender(num);
    }
  });
  pageInput.addEventListener("change", (e) => {
    const num = parseInt(e.target.value, 10) || 1;
    queueRender(num);
  });

  window.addEventListener("keydown", (e) => {
    if (!pdfDoc) return;

    // Đừng chặn phím nếu đang gõ trong input/textarea
    const tag = document.activeElement.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    switch (e.key) {
      case "ArrowLeft":
      case "PageUp":
        e.preventDefault();
        queueRender(currentPage - 1);
        break;
      case "ArrowRight":
      case "PageDown":
        e.preventDefault();
        queueRender(currentPage + 1);
        break;
      case "+":
      case "=":
        e.preventDefault();
        zoomMode = "custom";
        customScale = clamp(customScale + 0.1, 0.25, 4);
        renderPage(currentPage);
        break;
      case "-":
      case "_":
        e.preventDefault();
        zoomMode = "custom";
        customScale = clamp(customScale - 0.1, 0.25, 4);
        renderPage(currentPage);
        break;
      case "1": // fit width
        e.preventDefault();
        zoomMode = "fitWidth";
        renderPage(currentPage);
        break;
      case "2": // fit page
        e.preventDefault();
        zoomMode = "fitPage";
        renderPage(currentPage);
        break;
      default:
        break;
    }
  });

  // Chỉ DÙNG MỘT cơ chế re-render khi đổi kích thước
  let resizeTimer = null;
  let lastWidth = containerEl.clientWidth;
  window.addEventListener("resize", () => {
    const w = containerEl.clientWidth;
    if (Math.abs(w - lastWidth) < 8) return;
    lastWidth = w;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (pdfDoc) renderPage(currentPage);
    }, 150);
  });
  window.addEventListener("orientationchange", () => {
    lastWidth = 0;
    if (pdfDoc) renderPage(currentPage);
  });

  loadPdf(PDF_URL);
})();
