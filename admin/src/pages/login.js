import { authMessage, signInAdmin } from "../modules/auth.js";

export function setupLoginPage() {
  const loginForm = document.querySelector("#login-form");
  const loginError = document.querySelector("#login-error");

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginError.textContent = "";
    const email = document.querySelector("#email").value.trim();
    const password = document.querySelector("#password").value;

    try {
      await signInAdmin(email, password);
    } catch (error) {
      loginError.textContent = authMessage(error);
    }
  });
}