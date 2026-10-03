import { loadUsersTable } from "../../modules/users.js";

export async function loadUsersView() {
  await loadUsersTable();
}