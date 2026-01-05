import assert from "node:assert/strict";
import test from "node:test";
import { buildPolicyRoleEntries, normalizeRoleAssignments } from "./policyRoles.js";

test("normalizeRoleAssignments dedupes clients per role", () => {
  const assignments = normalizeRoleAssignments({
    asegurados: ["c1", "c1", "  ", "c2"],
    tomadores: ["c3", "c3"],
    cesionarios: null,
  });

  assert.deepStrictEqual(assignments.asegurados, ["c1", "c2"]);
  assert.deepStrictEqual(assignments.tomadores, ["c3"]);
  assert.deepStrictEqual(assignments.cesionarios, []);
});

test("buildPolicyRoleEntries allows multiple roles per client", () => {
  const assignments = normalizeRoleAssignments({
    asegurados: ["cliente-1"],
    tomadores: ["cliente-1", "cliente-2"],
    cesionarios: ["cliente-2"],
  });

  const entries = buildPolicyRoleEntries("poliza-1", assignments);

  assert.equal(entries.length, 4);
  assert.ok(entries.some((entry) => entry.role === "asegurado" && entry.client_id === "cliente-1"));
  assert.ok(entries.some((entry) => entry.role === "tomador" && entry.client_id === "cliente-1"));
  assert.ok(entries.some((entry) => entry.role === "tomador" && entry.client_id === "cliente-2"));
  assert.ok(entries.some((entry) => entry.role === "cesionario" && entry.client_id === "cliente-2"));
});
