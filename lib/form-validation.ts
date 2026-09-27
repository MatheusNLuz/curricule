export type FieldName = "name" | "email" | "password";
export type FieldErrors = Partial<Record<FieldName, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLogin(fields: { email: string; password: string }): FieldErrors {
  const errors: FieldErrors = {};
  const email = fields.email.trim();

  if (!email) errors.email = "Digite seu e-mail.";
  else if (!EMAIL_PATTERN.test(email)) errors.email = "Digite um e-mail válido.";

  if (!fields.password.trim()) errors.password = "Digite sua senha.";

  return errors;
}

export function validateRegistration(fields: { name: string; email: string; password: string }): FieldErrors {
  const errors: FieldErrors = {};
  const name = fields.name.trim();
  const email = fields.email.trim();
  const password = fields.password.trim();

  if (!name) errors.name = "Digite seu nome.";
  else if (name.length > 120) errors.name = "Use no máximo 120 caracteres.";

  if (!email) errors.email = "Digite seu e-mail.";
  else if (!EMAIL_PATTERN.test(email)) errors.email = "Digite um e-mail válido.";
  else if (email.length > 254) errors.email = "Use um e-mail com até 254 caracteres.";

  if (password.length < 8) errors.password = "A senha precisa ter pelo menos 8 caracteres.";
  else if (password.length > 128) errors.password = "Use uma senha com até 128 caracteres.";

  return errors;
}
