export function getProfileInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim().split("@")[0] || "";
  const parts = source.split(/[\s._-]+/u).filter(Boolean);
  const initials = parts.length > 1
    ? `${Array.from(parts[0])[0]}${Array.from(parts.at(-1)!)[0]}`
    : Array.from(parts[0] ?? "U").slice(0, 2).join("");

  return initials.toLocaleUpperCase("pt-BR") || "U";
}

export function getSafeProfileImage(image?: string | null) {
  if (!image) return null;

  try {
    return new URL(image).protocol === "https:" ? image : null;
  } catch {
    return null;
  }
}
