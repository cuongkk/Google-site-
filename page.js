(() => {
  const stored = localStorage.getItem("selectedFile");
  if (stored) {
    const data = JSON.parse(stored);
    console.log("Dữ liệu nhận:", data);
    document.getElementById("fileName").textContent = data.name;

    const BASE_URL = "https://cuongkk.github.io/Tai-lieu-/";
    const DEFAULT_FILE = data.file + ".pdf";

    // ---- Lấy tên file từ query (?file=abc.pdf) nếu có, không thì dùng mặc định
    function getFileFromQuery() {
      const u = new URL(window.location.href);
      return u.searchParams.get("file");
    }
    const FILE_NAME = getFileFromQuery() || DEFAULT_FILE; // <— JS quyết định tên file ở đây
    const PDF_URL = new URL(FILE_NAME, BASE_URL).toString();

    // ---- Gán tên file lên HTML (chỉ hiển thị)
    const fileNameEl = document.getElementById("fileName");
    if (fileNameEl) fileNameEl.textContent = FILE_NAME;

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
    const zoomInBtn = document.getElementById("zoomInBtn");
    const zoomOutBtn = document.getElementById("zoomOutBtn");
    const fitWidthBtn = document.getElementById("fitWidthBtn");
    const fitPageBtn = document.getElementById("fitPageBtn");
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
      // Chỉ disable khi thật sự ở đầu/cuối
      prevBtn.disabled = currentPage <= 1;
      nextBtn.disabled = currentPage >= totalPages;

      pageInput.max = totalPages || 1;
      pageInput.value = currentPage;
      pageCountEl.textContent = totalPages || 0;
    }

    // ---- Render
    async function renderPage(num, fitMode = null) {
      if (!pdfDoc) return;

      if (rendering) {
        pendingPage = num;
        return;
      }
      rendering = true;
      showLoader(true);

      try {
        const page = await pdfDoc.getPage(num);

        let viewport = page.getViewport({ scale: 1.0 });
        const containerW = document.getElementById("container").clientWidth - 32;
        const containerH = window.innerHeight - document.querySelector("header").offsetHeight - 32;

        if (fitMode === "width") {
          scale = clamp(containerW / viewport.width, 0.25, 4);
        } else if (fitMode === "page") {
          const sW = containerW / viewport.width;
          const sH = containerH / viewport.height;
          scale = clamp(Math.min(sW, sH), 0.25, 4);
        }

        viewport = page.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

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
        }
      }
    }

    function queueRender(num) {
      num = clamp(num, 1, totalPages || 1);
      renderPage(num);
    }

    // ---- Load PDF theo URL đã ghép từ JS
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

    // ---- Sự kiện
    prevBtn.addEventListener("click", () => queueRender(currentPage - 1));
    nextBtn.addEventListener("click", () => queueRender(currentPage + 1));
    pageInput.addEventListener("change", (e) => {
      const num = parseInt(e.target.value, 10) || 1;
      queueRender(num);
    });
    zoomInBtn.addEventListener("click", () => {
      scale = clamp(scale + 0.1, 0.25, 4);
      renderPage(currentPage);
    });
    zoomOutBtn.addEventListener("click", () => {
      scale = clamp(scale - 0.1, 0.25, 4);
      renderPage(currentPage);
    });
    fitWidthBtn.addEventListener("click", () => renderPage(currentPage, "width"));
    fitPageBtn.addEventListener("click", () => renderPage(currentPage, "page"));

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

    // ---- Khởi chạy
    loadPdf(PDF_URL);

    localStorage.removeItem("selectedFile");
  }
})();
