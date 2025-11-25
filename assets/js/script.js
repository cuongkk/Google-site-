const innerList = document.querySelector(".section-1 .inner-content");

if (innerList) {
  const sublist = innerList.querySelector(".inner-sublist");
  innerList.addEventListener("click", () => {
    sublist.classList.toggle("active");
  });
}
const innerLink = document.querySelector(".inner-group .inner-link");

if (innerLink) {
  innerLink.addEventListener("click", () => {
    console.log("clicked");
    window.location.href = "https://khunghinh.net/p/daihoigialai";
  });
}
// const listButton = document.querySelector(".inner-list");

// if (listButton) {
//   const buttons = listButton.querySelectorAll(".inner-group");

//   buttons.forEach((btn) => {
//     btn.addEventListener("mousedown", async () => {
//       const fileName = btn.querySelector(".inner-label").innerText;

//       const fileData = { name: fileName, file: fileName };
//       localStorage.setItem("selectedFile", JSON.stringify(fileData));

//       window.location.href = "page.html";
//     });
//   });
// }

// const pageSection = document.querySelector(".page-section");

// if (pageSection) {
//   var stored = localStorage.getItem("selectedFile");
//   var data = stored ? JSON.parse(stored) : null;
//   var BASE_URL = "https://cuongkk.github.io/Tai-lieu-/";
//   var DEFAULT_FILE = data ? data.file + ".pdf" : "";
//   if (data) {
//     var nameEl = document.getElementById("fileName");
//     if (nameEl) nameEl.textContent = data.name || "—";
//     document.title = data.name || document.title;
//   }
//   function getFileFromQuery() {
//     try {
//       var u = new URL(window.location.href);
//       return u.searchParams.get("file");
//     } catch (e) {
//       return null;
//     }
//   }
//   var FILE_NAME = getFileFromQuery() || DEFAULT_FILE;
//   var PDF_URL = FILE_NAME ? new URL(FILE_NAME, BASE_URL).toString() : null;

//   // ====== PDF.js worker ======
//   if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) {
//     window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
//   }

//   // ====== DOM ======
//   var container = document.getElementById("page-container");
//   var loader = document.getElementById("loader");

//   // ====== State / Config ======
//   var pdfDoc = null;
//   var totalPages = 0;
//   var currentPage = 1;
//   var FIT_ON_RESIZE = false; // có muốn re-render khi resize không

//   // ====== Helpers ======
//   function showLoader(on) {
//     if (loader) loader.style.display = on ? "block" : "none";
//   }

//   // tính chiều cao khả dụng (viewport)
//   function vh() {
//     return Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
//   }

//   // tính chiều rộng khả dụng (viewport)
//   function ww() {
//     return Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
//   }

//   // tính khung hiển thị
//   function computeCssH() {
//     return vh() - 70; // trừ header và đệm
//   }

//   // ====== Footer indicator ======
//   var pageIndicator = document.getElementById("pageIndicator");
//   function updatePageIndicator() {
//     if (!pageIndicator) return;
//     pageIndicator.textContent = currentPage + " / " + totalPages;
//   }

//   // ====== Render một trang (fit chiều cao, không dãn ngang) ======
//   function renderPage(num, canvas) {
//     return pdfDoc.getPage(num).then(function (page) {
//       var vp1 = page.getViewport({ scale: 1 });
//       var dpr = Math.max(1, window.devicePixelRatio || 1);

//       var cssH = computeCssH();
//       var cssScale = cssH / vp1.height;
//       var pixelScale = cssScale * dpr;

//       var viewport = page.getViewport({ scale: pixelScale });

//       // canvas thực (pixel)
//       canvas.width = Math.floor(viewport.width);
//       canvas.height = Math.floor(viewport.height);

//       // canvas hiển thị (CSS)
//       var finalCssH = Math.floor(cssH);
//       var finalCssW = Math.floor(vp1.width * cssScale);
//       canvas.style.height = finalCssH + "px";
//       canvas.style.width = finalCssW + "px";
//       canvas.style.flex = "0 0 auto";
//       canvas.style.display = "block";

//       var ctx = canvas.getContext("2d", { alpha: false });
//       return page.render({ canvasContext: ctx, viewport: viewport }).promise;
//     });
//   }

//   // ====== Cập nhật layout container và pageShell ======
//   function layoutShells() {
//     var cssH = computeCssH();
//     var cssW = ww();
//     container.style.width = cssW + "px";
//     container.style.height = cssH + "px";
//   }

//   // ====== Tạo pageShell chứa canvas (full màn hình) ======
//   function createPageShell(placeholderHeightPx) {
//     var shell = document.createElement("div");
//     shell.className = "pageShell";

//     var screenW = ww();
//     var screenH = computeCssH();

//     // shell full màn hình
//     shell.style.backgroundColor = "#1D9EEF";
//     shell.style.minWidth = screenW + "px";
//     shell.style.height = screenH + "px";
//     shell.style.display = "flex";
//     shell.style.alignItems = "center";
//     shell.style.justifyContent = "center";
//     shell.style.boxSizing = "border-box";

//     // có thể chỉnh nền/khung ở đây
//     // shell.style.background = "#f8f8f8";
//     // shell.style.borderRadius = "12px";
//     // shell.style.padding = "8px";

//     var canvas = document.createElement("canvas");
//     canvas.className = "pageCanvas";
//     canvas.style.height = placeholderHeightPx + "px";
//     canvas.style.width = "auto";
//     canvas.style.flex = "0 0 auto";
//     canvas.style.display = "block";

//     shell.appendChild(canvas);
//     return shell;
//   }

//   // ====== Load PDF & render tuần tự ======
//   function loadPdf(url) {
//     if (!url) {
//       alert('Không có URL PDF. Hãy set localStorage "selectedFile" hoặc thêm ?file=... vào URL.');
//       return;
//     }
//     showLoader(true);
//     var loading = window.pdfjsLib.getDocument({ url: url });
//     loading.promise
//       .then(function (doc) {
//         pdfDoc = doc;
//         totalPages = pdfDoc.numPages;
//         container.innerHTML = "";
//         updatePageIndicator();

//         var cssH = computeCssH();
//         var placeholderH = Math.floor(cssH * 0.98);

//         // tạo pageShell cho từng trang
//         for (var i = 1; i <= totalPages; i++) {
//           var shell = createPageShell(placeholderH);
//           container.appendChild(shell);
//         }

//         // render tuần tự
//         var index = 0;
//         (function next() {
//           if (index >= totalPages) {
//             showLoader(false);
//             var first = container.children[0];
//             if (first) first.scrollIntoView({ behavior: "auto", inline: "center" });
//             return;
//           }
//           var shell = container.children[index];
//           var canvas = shell.querySelector(".pageCanvas");
//           renderPage(index + 1, canvas)
//             .then(function () {
//               index++;
//               next();
//             })
//             .catch(function (err) {
//               console.error("Render error at page", index + 1, err);
//               index++;
//               next();
//             });
//         })();
//       })
//       .catch(function (err) {
//         console.error("Load PDF error:", err);
//         alert("Không tải được PDF. Kiểm tra BASE_URL/FILE_NAME hoặc CORS.");
//         showLoader(false);
//       });
//   }

//   // ====== Vuốt trái/phải để chuyển trang ======
//   var startX = 0,
//     startTime = 0,
//     touchActive = false;
//   var SWIPE_DIST = 60;
//   var SWIPE_TIME = 600;

//   container.addEventListener(
//     "touchstart",
//     function (e) {
//       if (e.touches.length !== 1) return;
//       touchActive = true;
//       startX = e.touches[0].clientX;
//       startTime = Date.now();
//     },
//     { passive: true }
//   );

//   container.addEventListener(
//     "touchend",
//     function (e) {
//       if (!touchActive) return;
//       touchActive = false;
//       var dx = e.changedTouches[0].clientX - startX;
//       var dt = Date.now() - startTime;
//       if (Math.abs(dx) > SWIPE_DIST && dt < SWIPE_TIME) {
//         if (dx < 0 && currentPage < totalPages) currentPage++;
//         else if (dx > 0 && currentPage > 1) currentPage--;
//         var shell = container.children[currentPage - 1];
//         if (shell) {
//           shell.scrollIntoView({ behavior: "smooth", inline: "center" });
//           updatePageIndicator();
//         }
//       }
//     },
//     { passive: true }
//   );

//   // ====== Resize ======
//   var resizeTimer = null;
//   window.addEventListener("resize", function () {
//     if (!pdfDoc) return;
//     clearTimeout(resizeTimer);
//     resizeTimer = setTimeout(function () {
//       layoutShells(); // cập nhật kích thước shell + container
//       if (FIT_ON_RESIZE) {
//         showLoader(true);
//         var shells = Array.prototype.slice.call(container.children);
//         (function rerenderAll(idx) {
//           if (idx >= shells.length) {
//             var shell = container.children[currentPage - 1];
//             if (shell) shell.scrollIntoView({ behavior: "auto", inline: "center" });
//             updatePageIndicator();
//             showLoader(false);
//             return;
//           }
//           var canvas = shells[idx].querySelector(".pageCanvas");
//           renderPage(idx + 1, canvas)
//             .then(function () {
//               rerenderAll(idx + 1);
//             })
//             .catch(function () {
//               rerenderAll(idx + 1);
//             });
//         })(0);
//       } else {
//         var shell = container.children[currentPage - 1];
//         if (shell) shell.scrollIntoView({ behavior: "auto", inline: "center" });
//         updatePageIndicator();
//       }
//     }, 120);
//   });

//   if (window.visualViewport) {
//     window.visualViewport.addEventListener("resize", function () {
//       window.dispatchEvent(new Event("resize"));
//     });
//   }
//   window.addEventListener("orientationchange", function () {
//     setTimeout(function () {
//       window.dispatchEvent(new Event("resize"));
//     }, 200);
//   });

//   // ====== Start ======
//   if (PDF_URL) loadPdf(PDF_URL);
// }
