(() => {
  const stored = localStorage.getItem("selectedFile");
  if (stored) {
    const data = JSON.parse(stored);
    console.log("Dữ liệu nhận:", data);
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

    // ---- State
    let pdfDoc = null;
    let currentPage = 1;
    let totalPages = 0;
    let scale = 1.2;
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

        const containerEl = document.getElementById("page-container");
        const headerEl = document.querySelector("header"); // dùng nếu bạn muốn fit theo chiều cao ở nơi khác
        let viewport = page.getViewport({ scale: 1.0 });

        const containerW = Math.max(1, containerEl.clientWidth - 16);
        const cssScale = clamp(containerW / viewport.width, 0.25, 4);

        const dpr = Math.max(1, window.devicePixelRatio || 1);
        const outputScale = dpr;

        viewport = page.getViewport({ scale: cssScale * outputScale });

        const renderWidth = Math.floor(viewport.width);
        const renderHeight = Math.floor(viewport.height);
        canvas.width = renderWidth;
        canvas.height = renderHeight;
        canvas.style.width = Math.floor(renderWidth / outputScale) + "px";
        canvas.style.height = Math.floor(renderHeight / outputScale) + "px";

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
        await renderPage(1, "width");
      } catch (err) {
        console.error("Load PDF error:", err);
        alert("Không tải được PDF. Kiểm tra BASE_URL/FILE_NAME hoặc CORS.");
      } finally {
        showLoader(false);
      }
    }

    prevBtn.addEventListener("click", () => queueRender(currentPage - 1));
    nextBtn.addEventListener("click", () => queueRender(currentPage + 1));
    pageInput.addEventListener("change", (e) => {
      const num = parseInt(e.target.value, 10) || 1;
      queueRender(num);
    });

    window.addEventListener("keydown", (e) => {
      if (!pdfDoc) return;
      if (["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
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
          scale = clamp(scale + 0.1, 0.25, 4);
          renderPage(currentPage);
          break;
        case "-":
        case "_":
          e.preventDefault();
          scale = clamp(scale - 0.1, 0.25, 4);
          renderPage(currentPage);
          break;
        case "1":
          e.preventDefault();
          renderPage(currentPage, "width");
          break;
        case "2":
          e.preventDefault();
          renderPage(currentPage, "page");
          break;
        default:
          break;
      }
    });

    window.addEventListener("resize", () => {
      if (pdfDoc) renderPage(currentPage);
    });

    let lastWidth = document.getElementById("page-container").clientWidth;
    let resizeTimer = null;

    function scheduleRerender() {
      if (!pdfDoc) return;

      const w = document.getElementById("page-container").clientWidth;
      if (Math.abs(w - lastWidth) < 8) return;
      lastWidth = w;

      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        renderPage(currentPage);
      }, 150);
    }

    window.addEventListener("resize", scheduleRerender);
    window.addEventListener("orientationchange", () => {
      lastWidth = 0;
      scheduleRerender();
    });

    loadPdf(PDF_URL);
  }
})();
