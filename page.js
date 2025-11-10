/* ===========================
   page.js — PDF viewer logic
   =========================== */

(() => {
  /* ---------- 0) Polyfill chiều cao viewport thực (iOS Safari) ---------- */
  const setAppHeight = () => {
    const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    document.documentElement.style.setProperty("--vvh", vh + "px");
  };
  setAppHeight();
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", setAppHeight);
  }
  window.addEventListener("resize", setAppHeight);
  window.addEventListener("orientationchange", () => setTimeout(setAppHeight, 200));
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) setTimeout(setAppHeight, 60);
  });

  /* ---------- 1) Lấy thông tin file ---------- */
  const stored = localStorage.getItem("selectedFile");
  let data = null;
  if (stored) {
    try {
      data = JSON.parse(stored);
    } catch (_) {}
  }

  function getFileFromQuery() {
    const u = new URL(window.location.href);
    return u.searchParams.get("file"); // ví dụ ?file=abc.pdf
  }

  const BASE_URL = "https://cuongkk.github.io/Tai-lieu-/";
  const DEFAULT_FILE = data ? data.file + ".pdf" : null;

  const FILE_NAME = getFileFromQuery() || DEFAULT_FILE;
  if (!FILE_NAME) {
    console.warn("Không tìm thấy tên file. Hãy đặt localStorage.selectedFile hoặc ?file=xxx.pdf");
    return;
  }
  const PDF_URL = new URL(FILE_NAME, BASE_URL).toString();

  // Cập nhật tiêu đề
  const fileNameEl = document.getElementById("fileName");
  if (fileNameEl) fileNameEl.textContent = data?.name || FILE_NAME;
  document.title = data?.name || FILE_NAME;

  /* ---------- 2) Cấu hình PDF.js worker ---------- */
  if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  /* ---------- 3) DOM refs ---------- */
  const canvas = document.getElementById("pdfCanvas");
  const ctx = canvas.getContext("2d");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const pageInput = document.getElementById("pageInput");
  const pageCountEl = document.getElementById("pageCount");
  const loader = document.getElementById("loader");
  const containerEl = document.getElementById("page-container");

  /* ---------- 4) State ---------- */
  let pdfDoc = null;
  let currentPage = 1;
  let totalPages = 0;

  // zoomMode: "fitWidth" | "fitPage" | "custom"
  let zoomMode = "fitWidth";
  let customScale = 1.0; // dùng khi zoomMode="custom"

  let rendering = false;
  let pendingPage = null;

  /* ---------- 5) Helpers ---------- */
  const showLoader = (on) => {
    if (!loader) return;
    loader.style.display = on ? "inline-block" : "none";
  };

  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  const updateButtons = () => {
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
    if (pageInput) {
      pageInput.max = totalPages || 1;
      pageInput.value = currentPage;
    }
    if (pageCountEl) pageCountEl.textContent = totalPages || 0;
  };

  const computeScale = (viewportAt1) => {
    // scale CSS (chưa nhân DPR)
    const containerStyles = getComputedStyle(containerEl);
    // lấy kích thước trong (tránh scrollbar)
    const containerW = Math.max(1, containerEl.clientWidth);
    const containerH = Math.max(1, containerEl.clientHeight);

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
  };

  /* ---------- 6) Render ---------- */
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

      // viewport 1.0 để tính scale
      let viewport = page.getViewport({ scale: 1.0 });

      // scale CSS theo mode + DPR cho hình nét
      const cssScale = computeScale(viewport);
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      viewport = page.getViewport({ scale: cssScale * dpr });

      // cấu hình canvas (pixel)
      const renderWidth = Math.floor(viewport.width);
      const renderHeight = Math.floor(viewport.height);
      canvas.width = renderWidth;
      canvas.height = renderHeight;

      // kích thước hiển thị (CSS px)
      canvas.style.width = Math.floor(renderWidth / dpr) + "px";
      canvas.style.height = Math.floor(renderHeight / dpr) + "px";

      // reset transform
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

  const queueRender = (num) => {
    num = clamp(num, 1, totalPages || 1);
    renderPage(num);
  };

  /* ---------- 7) Load PDF ---------- */
  async function loadPdf(url) {
    try {
      showLoader(true);
      const loading = window.pdfjsLib.getDocument({ url });
      pdfDoc = await loading.promise;
      totalPages = pdfDoc.numPages;
      currentPage = 1;
      updateButtons();

      // render lần đầu
      await renderPage(1);

      // đảm bảo lần đầu fit đúng kích thước viewport thực (iOS)
      requestAnimationFrame(() => {
        renderPage(currentPage);
      });
    } catch (err) {
      console.error("Load PDF error:", err);
      alert("Không tải được PDF. Kiểm tra BASE_URL/FILE_NAME hoặc CORS.");
    } finally {
      showLoader(false);
    }
  }

  /* ---------- 8) Events ---------- */
  if (prevBtn) prevBtn.addEventListener("click", () => queueRender(currentPage - 1));
  if (nextBtn) nextBtn.addEventListener("click", () => queueRender(currentPage + 1));

  if (pageInput) {
    // Enter để chuyển trang + blur để thoát input (trả phím mũi tên lại)
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
  }

  // Phím tắt (không bắt khi đang gõ trong input/textarea)
  window.addEventListener("keydown", (e) => {
    if (!pdfDoc) return;
    const tag = document.activeElement?.tagName;
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
      case "=": // zoom in
        e.preventDefault();
        zoomMode = "custom";
        customScale = clamp(customScale + 0.1, 0.25, 4);
        renderPage(currentPage);
        break;
      case "-":
      case "_": // zoom out
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

  // Debounce resize nhẹ để không phải chạm/nhấn đúp mới fit
  let resizeTimer = null;
  window.addEventListener("resize", () => {
    if (!pdfDoc) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      renderPage(currentPage);
    }, 120);
  });

  window.addEventListener("orientationchange", () => {
    if (!pdfDoc) return;
    setTimeout(() => renderPage(currentPage), 200);
  });

  window.addEventListener("pageshow", (e) => {
    if (e.persisted && pdfDoc) {
      setTimeout(() => renderPage(currentPage), 60);
    }
  });

  loadPdf(PDF_URL);
})();
