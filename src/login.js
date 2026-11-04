import { logIn, onUser, showError, hideError } from "./authentication.js";

const form = document.getElementById("loginForm");
const button = form.querySelector("button[type=submit]");

// Already logged in? Skip the form.
onUser((user) => {
  if (user) location.href = "index.html";
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();
  if (!form.reportValidity()) return;

  button.disabled = true;
  try {
    await logIn(form.elements.loginEmail.value.trim(), form.elements.loginPassword.value);
    location.href = "index.html";
  } catch (err) {
    showError(err);
    button.disabled = false;
  }
});