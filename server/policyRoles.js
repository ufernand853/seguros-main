export const POLICY_ROLES = ["asegurado", "tomador", "cesionario"];

export const POLICY_ROLE_KEYS = {
  asegurado: "asegurados",
  tomador: "tomadores",
  cesionario: "cesionarios",
};

function normalizeRoleList(list) {
  if (!Array.isArray(list)) return [];
  const filtered = list
    .filter((value) => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
  return Array.from(new Set(filtered));
}

export function normalizeRoleAssignments(input = {}) {
  return {
    asegurados: normalizeRoleList(input.asegurados),
    tomadores: normalizeRoleList(input.tomadores),
    cesionarios: normalizeRoleList(input.cesionarios),
  };
}

export function buildPolicyRoleEntries(policyId, roleAssignments) {
  const entries = [];
  POLICY_ROLES.forEach((role) => {
    const key = POLICY_ROLE_KEYS[role];
    const clientIds = roleAssignments?.[key] ?? [];
    clientIds.forEach((clientId) => {
      entries.push({ policy_id: policyId, client_id: clientId, role });
    });
  });
  return entries;
}
