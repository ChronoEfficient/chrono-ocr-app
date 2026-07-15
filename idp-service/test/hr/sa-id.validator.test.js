import test from "node:test";
import assert from "node:assert/strict";
import {
  validateIdDocument
} from "../../src/hr/validators/sa-id.validator.js";

test("rejects a missing ID number", () => {
  const result = validateIdDocument({
    fields: {
      id_number: null
    }
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.issues, [
    "ID number was not extracted."
  ]);
});

test("rejects an ID number that is not 13 digits", () => {
  const result = validateIdDocument({
    fields: {
      id_number: "12345"
    }
  });

  assert.equal(result.valid, false);
  assert.ok(
    result.issues.includes(
      "South African ID number must contain exactly 13 digits."
    )
  );
});

test("derives date of birth, gender and citizenship", () => {
  const result = validateIdDocument({
    fields: {
      id_number: "6308125520085",
      date_of_birth: "1963-08-12",
      gender: "MALE",
      citizenship_status: "CITIZEN"
    }
  });

  assert.deepEqual(result.derivedData, {
    date_of_birth: "1963-08-12",
    gender: "MALE",
    citizenship_status: "CITIZEN"
  });
});

test("detects the known checksum failure", () => {
  const result = validateIdDocument({
    fields: {
      id_number: "6308125520085",
      date_of_birth: "1963-08-12",
      gender: "MALE",
      citizenship_status: "CITIZEN"
    }
  });

  assert.equal(result.valid, false);
  assert.ok(
    result.issues.includes(
      "South African ID number failed checksum validation."
    )
  );
});

test("detects an extracted date-of-birth mismatch", () => {
  const result = validateIdDocument({
    fields: {
      id_number: "6308125520085",
      date_of_birth: "1964-01-01",
      gender: "MALE",
      citizenship_status: "CITIZEN"
    }
  });

  assert.ok(
    result.issues.some((issue) =>
      issue.includes(
        "does not match the ID-number date"
      )
    )
  );
});

test("detects an extracted gender mismatch", () => {
  const result = validateIdDocument({
    fields: {
      id_number: "6308125520085",
      date_of_birth: "1963-08-12",
      gender: "FEMALE",
      citizenship_status: "CITIZEN"
    }
  });

  assert.ok(
    result.issues.some((issue) =>
      issue.includes(
        "does not match the ID-number gender"
      )
    )
  );
});
