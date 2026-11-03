import { onUser, logOut } from "./authentication.js";
import "./home.js"; // budget status card

const authButtons = document.getElementById("authButtons");
const userBox = document.getElementById("userBox");
const greeting = document.getElementById("greeting");

// Both boxes start hidden so the wrong one never flashes before Firebase responds
onUser((user) => {
  authButtons.classList.toggle("d-none", Boolean(user));
  userBox.classList.toggle("d-none", !user);
  if (user) greeting.textContent = `Hi, ${user.displayName || user.email}`;
});

document.getElementById("logoutBtn").addEventListener("click", () => logOut());
