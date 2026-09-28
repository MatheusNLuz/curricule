export function createLogoutRedirectResponse() {
  return new Response(null, {
    status: 303,
    headers: { Location: "/login" },
  });
}
