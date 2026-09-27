export function getLoginUrl(nextPath = "/") {
  const safePath = nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/";
  return `/login?${new URLSearchParams({ next: safePath }).toString()}`;
}

export function getOAuthCallbackUrl(nextPath: string | null = "/") {
  return nextPath?.startsWith("/") && !nextPath.startsWith("//") && !nextPath.includes("\\")
    ? nextPath
    : "/";
}

export async function readApiError(response: Response, fallback: string) {
  try {
    const payload = await response.clone().json() as { error?: unknown };
    if (typeof payload.error === "string" && payload.error.trim()) return payload.error;
  } catch {
    // Some network/proxy failures return an empty or non-JSON response.
  }

  if (response.status === 401) return "Sua sessão expirou. Entre novamente para continuar.";
  if (response.status === 403) return "Você não tem permissão para acessar este conteúdo.";
  if (response.status === 404) return "Não encontramos esta análise.";
  if (response.status >= 500) return "O serviço está indisponível no momento. Tente novamente em instantes.";

  return fallback;
}

export function getFetchErrorMessage(error: unknown, fallback: string) {
  if (error instanceof TypeError) {
    return "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.";
  }

  return error instanceof Error && error.message ? error.message : fallback;
}
