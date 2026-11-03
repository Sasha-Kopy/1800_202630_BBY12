<<<<<<< HEAD
import { onUser, logOut } from "./authentication.js";

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
=======
// import 'bootstrap/dist/css/bootstrap.min.css';
// import 'bootstrap';

// If you have custom global styles, import them as well:
// import '../styles/style.css';

function sayHello() {

}
// document.addEventListener('DOMContentLoaded', sayHello);
>>>>>>> 6b3b6b808228a70cc1f772f811b6ce7bd445e98a
