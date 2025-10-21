const button = document.querySelectorAll(".inner-group");

button.forEach((btn) => {
  btn.addEventListener("click", () => {
    btn.style.backgroundColor = "red";
  });
});
