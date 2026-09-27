import assert from "node:assert/strict";
import test from "node:test";
import { validateLogin, validateRegistration } from "./form-validation.ts";

test("rejects a login with an invalid email address", () => {
  assert.deepEqual(validateLogin({ email: "matheus", password: "senha-valida" }), {
    email: "Digite um e-mail válido.",
  });
});

test("rejects a registration with a short password", () => {
  assert.deepEqual(validateRegistration({ name: "Matheus", email: "matheus@email.com", password: "1234567" }), {
    password: "A senha precisa ter pelo menos 8 caracteres.",
  });
});

test("rejects whitespace-only required fields", () => {
  assert.deepEqual(validateRegistration({ name: "  ", email: "  ", password: "        " }), {
    name: "Digite seu nome.",
    email: "Digite seu e-mail.",
    password: "A senha precisa ter pelo menos 8 caracteres.",
  });
});

test("accepts valid login and registration fields", () => {
  assert.deepEqual(validateLogin({ email: "matheus@email.com", password: "senha" }), {});
  assert.deepEqual(validateRegistration({ name: "Matheus", email: "matheus@email.com", password: "senha-valida" }), {});
});
