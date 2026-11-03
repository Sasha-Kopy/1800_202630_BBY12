import { signUp, showError, hideError } from "./authentication.js";

const form = document.getElementById("signupForm");
const button = form.querySelector("button[type=submit]");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();
  if (!form.reportValidity()) return;

  button.disabled = true;
  try {
    await signUp(
      form.elements.signupName.value.trim(),
      form.elements.signupEmail.value.trim(),
      form.elements.signupPassword.value
    );
    location.href = "index.html"; // only after the display name is saved
  } catch (err) {
    showError(err);
    button.disabled = false;
  }
});