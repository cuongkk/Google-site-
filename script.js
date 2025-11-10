const listButton = document.querySelector(".inner-list");

if (listButton) {
  const buttons = listButton.querySelectorAll(".inner-group");

  buttons.forEach((btn) => {
    btn.addEventListener("mousedown", async () => {
      const fileName = btn.querySelector(".inner-label").innerText;

      const fileData = { name: fileName, file: fileName };
      localStorage.setItem("selectedFile", JSON.stringify(fileData));

      window.location.href = "page.html";
    });
  });
}
