export function getProfileInitials(name?: string | null, email?: string | null) {
  const normalizedName = name?.trim().replace(/\s+/gu, "") ? name.trim().split(/\s+/u).filter(Boolean) : [];
  const emailPrefix = email?.trim().split("@")[0]?.split(/[._-]+/u).filter(Boolean)[0] ?? "";
  const parts = normalizedName.length > 0 ? normalizedName : emailPrefix ? [emailPrefix] : [];
  const initials = parts.length > 1
    ? `${Array.from(parts[0])[0]}${Array.from(parts.at(-1)!)[0]}`
    : Array.from(parts[0] ?? "U")[0];

  return initials.toLocaleUpperCase("pt-BR") || "U";
}

export function getPreferredProfileName(existingName?: string | null, providerName?: string | null) {
  const existing = existingName?.trim().replace(/\s+/gu, " ") || null;
  const provider = providerName?.trim().replace(/\s+/gu, " ") || null;
  const existingHasSurname = (existing?.split(" ").length ?? 0) > 1;
  const providerHasSurname = (provider?.split(" ").length ?? 0) > 1;

  if (existingHasSurname && provider && !providerHasSurname) return existing;
  return provider || existing;
}

export function getSafeProfileImage(image?: string | null) {
  if (!image) return null;

  try {
    return new URL(image).protocol === "https:" ? image : null;
  } catch {
    return null;
  }
}
