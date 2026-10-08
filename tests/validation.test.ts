import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeDNI,
  validateDNI,
  validatePhone,
  validateBirthDate,
  validateRequired,
  getFirstValidationError,
} from "../src/utils/validation.ts";

test("normalizeDNI removes non-numeric characters", () => {
  assert.equal(normalizeDNI("35.123.456"), "35123456");
  assert.equal(normalizeDNI(" 12-345-678 "), "12345678");
  assert.equal(normalizeDNI("abc76543210xyz"), "76543210");
});

test("validateDNI validates correct DNI formats", () => {
  assert.equal(validateDNI("35.123.456").isValid, true);
  assert.equal(validateDNI("12345").isValid, false);
  assert.equal(validateDNI("11111111").isValid, false);
  assert.equal(validateDNI("12345678").isValid, false);
});

test("validatePhone checks minimum 10 digits", () => {
  assert.equal(validatePhone("1122334455").isValid, true);
  assert.equal(validatePhone("+54 9 11 2233-4455").isValid, true);
  assert.equal(validatePhone("123456789").isValid, false);
});

test("validateBirthDate handles past, future and invalid age boundaries", () => {
  const validBirth = "1995-05-15";
  assert.equal(validateBirthDate(validBirth).isValid, true);

  const futureBirth = "2099-01-01";
  assert.equal(validateBirthDate(futureBirth).isValid, false);

  const tooYoung = new Date().toISOString();
  assert.equal(validateBirthDate(tooYoung).isValid, false);
});

test("getFirstValidationError extracts first failing error message", () => {
  const results = [
    { isValid: true },
    { isValid: false, error: "DNI inválido" },
    { isValid: false, error: "Teléfono inválido" },
  ];
  assert.equal(getFirstValidationError(results), "DNI inválido");
});
