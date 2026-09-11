export const ROLE_PATHS = Object.freeze({
  Admin: "/admin",
  Teacher: "/teacher",
  Student: "/student",
});

export function getAssignedRoles(user) {
  const source = Array.isArray(user?.roles)
    ? user.roles
    : Array.isArray(user?.userRoles)
      ? user.userRoles
      : [];

  return [...new Set(source
    .map((entry) => entry?.name ?? entry?.bezeichnung ?? entry?.role?.name)
    .filter((role) => Object.hasOwn(ROLE_PATHS, role)))];
}

export function resolvePostAuth(user) {
  const roles = getAssignedRoles(user);
  if (roles.length === 0) return { kind: "none", roles };
  if (roles.length === 1) return { kind: "single", role: roles[0], roles };
  return { kind: "multiple", roles };
}

export function storeAuthenticatedIdentity(token, user) {
  localStorage.setItem("token", token);
  sessionStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
  sessionStorage.removeItem("activeRole");
  localStorage.removeItem("role");
}

export function storeActiveRole(role) {
  if (!Object.hasOwn(ROLE_PATHS, role)) throw new Error("Invalid role");
  sessionStorage.setItem("activeRole", role);
  localStorage.removeItem("role");
}

export function clearAuthenticatedIdentity() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("role");
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("activeRole");
}
