const DEFAULT_API_BASE = "/api";
const API_BASE = (import.meta.env.VITE_API_URL ?? DEFAULT_API_BASE).replace(/\/$/, "");

type LoginResponse = {
  user: { id: string; name: string; email: string; role?: string };
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
};

async function handleResponse(res: Response) {
  const text = await res.text();
  let data: any = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  const isHtml = text.trimStart().startsWith("<");

  if (!res.ok) {
    const message =
      data?.error ??
      (!text
        ? `Error ${res.status}: ${res.statusText || "Error inesperado"}`
        : isHtml
          ? `El servidor devolvió HTML en vez de JSON (status ${res.status}). Verifica la URL del API (${API_BASE}) y que el backend esté disponible.`
          : text);
    const error = new Error(message) as Error & { status?: number; body?: unknown };
    error.status = res.status;
    error.body = data ?? text;
    throw error;
  }

  if (text && data === null) {
    const preview = text.slice(0, 200);
    const reason = isHtml
      ? `El servidor devolvió HTML en vez de JSON válido. Verifica la URL del API (${API_BASE}) y que el backend responda en JSON.`
      : `La respuesta del servidor no es JSON válido: ${preview}`;
    throw new Error(reason);
  }

  return data;
}

async function request(path: string, options: RequestInit) {
  try {
    const res = await fetch(`${API_BASE}${path}`, options);
    return handleResponse(res);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        `No se pudo conectar con el API en ${API_BASE}. Verifica que el backend esté en marcha y que la variable VITE_API_URL apunte a la URL correcta (p. ej. http://localhost:4000/api o simplemente /api).`,
      );
    }
    throw error;
  }
}

async function requestBlob(path: string, options: RequestInit): Promise<Blob> {
  try {
    const res = await fetch(`${API_BASE}${path}`, options);
    if (!res.ok) {
      const text = await res.text();
      let message = text;
      if (text) {
        try {
          const data = JSON.parse(text);
          message = data?.error ?? text;
        } catch {
          message = text;
        }
      }
      throw new Error(message || `Error ${res.status}: ${res.statusText || "Error inesperado"}`);
    }
    return await res.blob();
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        `No se pudo conectar con el API en ${API_BASE}. Verifica que el backend esté en marcha y que la variable VITE_API_URL apunte a la URL correcta (p. ej. http://localhost:4000/api o simplemente /api).`,
      );
    }
    throw error;
  }
}

function encodePathSegment(value: string) {
  return encodeURIComponent(value);
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.readAsDataURL(file);
  });
}

export async function apiLogin(email: string, password: string): Promise<LoginResponse> {
  return request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export async function apiRefresh(refreshToken: string): Promise<{ accessToken: string; expiresInSeconds: number }> {
  return request("/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
}

export type UserItem = {
  id: string;
  name: string;
  email: string;
  roles?: string[];
  role?: string;
  status?: "Activo" | "Suspendido";
  lastAccess?: string | null;
  team?: string | null;
};

export async function apiListUsers(accessToken: string): Promise<{ items: UserItem[] }> {
  return request("/users", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function apiDeleteUser(userId: string, accessToken: string): Promise<{ ok: boolean }> {
  return request(`/users/${userId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export type CreateClientPayload = {
  name: string;
  document: string;
  city?: string | null;
  department?: string | null;
  country?: string | null;
  address?: string | null;
  contacts?: { name: string; email?: string | null; phone?: string | null }[];
  apoderados?: ApoderadoItem[];
  laboralHistorial?: LaboralHistorialItem[];
};

export type UpdateClientPayload = Partial<CreateClientPayload>;

export async function apiCreateClient(payload: CreateClientPayload, accessToken: string) {
  return request("/clients", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
}

export type ClientDocumentItem = {
  id: string;
  client_id: string;
  name: string;
  size?: number | null;
  type?: string | null;
  category?: string | null;
  label?: string | null;
  group?: string | null;
  created_at?: string | null;
};

export type ClientDocumentUpload = {
  file: File;
  category?: string;
  label?: string;
  group?: string;
};

export async function apiListClientDocuments(
  clientId: string,
  accessToken: string,
): Promise<{ items: ClientDocumentItem[] }> {
  return request(`/clients/${encodePathSegment(clientId)}/documents`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function apiUploadClientDocuments(
  clientId: string,
  documents: ClientDocumentUpload[],
  accessToken: string,
): Promise<{ items: ClientDocumentItem[] }> {
  const payload = await Promise.all(
    documents.map(async (doc) => ({
      name: doc.file.name,
      size: doc.file.size,
      type: doc.file.type || "application/octet-stream",
      category: doc.category ?? "otros",
      label: doc.label ?? "",
      group: doc.group ?? null,
      content_base64: await readFileAsBase64(doc.file),
    })),
  );

  return request(`/clients/${encodePathSegment(clientId)}/documents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ documents: payload }),
  });
}

export async function apiDownloadClientDocument(
  clientId: string,
  documentId: string,
  accessToken: string,
): Promise<Blob> {
  return requestBlob(`/clients/${encodePathSegment(clientId)}/documents/${encodePathSegment(documentId)}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function apiDeleteClientDocument(
  clientId: string,
  documentId: string,
  accessToken: string,
): Promise<{ ok: boolean }> {
  return request(`/clients/${encodePathSegment(clientId)}/documents/${encodePathSegment(documentId)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function apiUpdateClient(
  clientId: string,
  payload: UpdateClientPayload,
  accessToken: string,
): Promise<ClientListItem> {
  return request(`/clients/${encodePathSegment(clientId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
}

export type ClientListItem = {
  id: string;
  name: string;
  document?: string;
  city?: string | null;
  department?: string | null;
  country?: string | null;
  address?: string | null;
  contacts?: ContactInfo[];
  policies?: PolicySummary[];
  apoderados?: ApoderadoItem[];
  laboralHistorial?: LaboralHistorialItem[];
};

export type ContactInfo = { id?: string; name?: string; email?: string | null; phone?: string | null };
export type PolicySummary = {
  id: string;
  type?: string | null;
  policy_number?: string | null;
  insurer_id?: string | null;
  insurer?: string | null;
  status?: string | null;
  premium?: number | null;
  next_renewal?: string | null;
  roles?: string[];
};

export async function apiListClients(accessToken: string): Promise<{ items: ClientListItem[] }> {
  return request("/clients", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export type ClientSummary = ClientListItem & {
  address?: string | null;
  direccion?: string | null;
  tasks?: TaskItem[];
  opportunity?: PipelineItem | null;
  renewal?: RenewalItem | null;
  nextTask?: TaskItem | null;
};

export type ApoderadoItem = {
  figura: string;
  tipoPersona: string;
  nombre: string;
  documentoTipo: string;
  documento: string;
  telefono: string;
  email: string;
  direccion: string;
  notas: string;
};

export type LaboralHistorialItem = {
  tipoEmpresa: string;
  tipoVinculo: string;
  nombreEmpresa: string;
  fechaIngreso: string;
  nominal: string;
  promedio: string;
};

export async function apiGetClientSummary(clientId: string, accessToken: string): Promise<ClientSummary> {
  try {
    return await request(`/clients/${encodePathSegment(clientId)}/summary`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch (error) {
    const errorWithStatus = error as Error & { status?: number };
    if (errorWithStatus.status !== 404) {
      throw error;
    }
    try {
      return await request(`/clients/${encodePathSegment(clientId)}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    } catch (fallbackError) {
      const fallbackWithStatus = fallbackError as Error & { status?: number };
      if (fallbackWithStatus.status === 404) {
        throw new Error("Cliente no encontrado. Verifica el identificador y vuelve a intentar.");
      }
      throw fallbackError;
    }
  }
}

export type PipelineItem = {
  id: string;
  client_id?: string;
  client_name?: string | null;
  stage?: string;
  probability?: number | null;
  amount?: number | null;
  owner?: string | null;
  updated_at?: string;
};

export async function apiListPipeline(accessToken: string): Promise<{ items: PipelineItem[] }> {
  return request("/pipeline", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export type TaskItem = {
  id: string;
  client_id?: string | null;
  title: string;
  due_date?: string;
  status?: string;
  priority?: string | null;
  owner_id?: string | null;
  owner_name?: string | null;
  client_name?: string | null;
};

export type CreateTaskPayload = {
  title: string;
  client_id?: string | null;
  owner_id?: string | null;
  due_date?: string | null;
  status?: string;
};

export type UpdateTaskPayload = Partial<{
  title: string;
  client_id: string | null;
  owner_id: string | null;
  due_date: string | null;
  status: string;
}>;

export async function apiCreateTask(payload: CreateTaskPayload, accessToken: string): Promise<TaskItem> {
  return request("/tasks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function apiUpdateTask(
  taskId: string,
  payload: UpdateTaskPayload,
  accessToken: string,
): Promise<TaskItem> {
  return request(`/tasks/${taskId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function apiListTasks(accessToken: string): Promise<{ items: TaskItem[] }> {
  return request("/tasks", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export type EmployeeItem = {
  id: string;
  name: string;
  role?: string | null;
  email?: string | null;
};

export type Employee = EmployeeItem;

export async function apiListEmployees(accessToken: string): Promise<{ items: EmployeeItem[] }> {
  return request("/employees", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export type RenewalItem = {
  id: string;
  client_name?: string | null;
  policy_number?: string | null;
  renewal_date?: string;
  premium?: number | null;
  status?: string;
  owner?: string | null;
};

export async function apiListRenewals(accessToken: string): Promise<{ items: RenewalItem[] }> {
  return request("/renewals", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export type ProductionCompanyBreakdown = {
  nombre: string;
  automotor: number;
  hogar: number;
  vida: number;
  caucion: number;
  bonificacion: string;
};

export type ProductionProducer = {
  id: string;
  periodo?: string | null;
  nombre: string;
  localidad?: string | null;
  correo?: string | null;
  celular?: string | null;
  companias: ProductionCompanyBreakdown[];
  objetivoMensual: number;
  produccionMes: number;
  produccionAnual: number;
  seguimiento?: string | null;
};

export async function apiListProductionPeriods(accessToken: string): Promise<{ items: string[] }> {
  return request("/production/periods", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function apiListProduction(
  period: string,
  accessToken: string,
): Promise<{ items: ProductionProducer[] }> {
  const search = new URLSearchParams({ period });
  return request(`/production?${search.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export type InsurerListItem = {
  id: string;
  name: string;
  country?: string | null;
  lines?: string[];
  status?: string | null;
  rating?: number | null;
  annual_premium?: number | null;
  annual_premium_usd?: number | null;
  annual_premium_pesos?: number | null;
  active_policies?: number | null;
  loss_ratio?: number | null;
  bcu_exchange_rate?: number | null;
  contact?: { name?: string | null; email?: string | null; phone?: string | null } | null;
  key_deals?: string[];
  last_review?: string | null;
  notes?: string | null;
  created_at?: string;
};

export type PolicyRoleClient = {
  id: string;
  name?: string | null;
  document?: string | null;
  city?: string | null;
};

export type PolicyRoles = {
  asegurados: PolicyRoleClient[];
  tomadores: PolicyRoleClient[];
  cesionarios: PolicyRoleClient[];
};

export type PolicyItem = {
  id: string;
  type?: string | null;
  policy_number?: string | null;
  insurer_id?: string | null;
  status?: string | null;
  premium?: number | null;
  next_renewal?: string | null;
  roles?: PolicyRoles;
};

export type CreatePolicyPayload = {
  type?: string | null;
  policy_number?: string | null;
  insurer_id?: string | null;
  status?: string | null;
  premium?: number | null;
  next_renewal?: string | null;
  asegurados?: string[];
  tomadores?: string[];
  cesionarios?: string[];
};

export type PolicyDocumentItem = {
  id: string;
  policy_id?: string | null;
  name: string;
  size?: number | null;
  type?: string | null;
  category?: string | null;
  label?: string | null;
  created_at?: string | null;
};

export type PolicyDocumentUpload = {
  file: File;
  category?: string;
  label?: string;
};

export type CreateInsurerPayload = {
  name: string;
  country?: string | null;
  lines?: string[];
  status?: string | null;
  rating?: number | null;
  annual_premium?: number | null;
  annual_premium_usd?: number | null;
  annual_premium_pesos?: number | null;
  active_policies?: number | null;
  loss_ratio?: number | null;
  bcu_exchange_rate?: number | null;
  contact?: { name?: string | null; email?: string | null; phone?: string | null } | null;
  key_deals?: string[];
  last_review?: string | null;
  notes?: string | null;
};

export async function apiListInsurers(accessToken: string): Promise<{ items: InsurerListItem[] }> {
  return request("/insurers", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function apiCreateInsurer(payload: CreateInsurerPayload, accessToken: string): Promise<InsurerListItem> {
  return request("/insurers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function apiUpdateInsurer(
  insurerId: string,
  payload: CreateInsurerPayload,
  accessToken: string,
): Promise<InsurerListItem> {
  return request(`/insurers/${insurerId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function apiDeleteInsurer(insurerId: string, accessToken: string): Promise<{ ok: boolean }> {
  return request(`/insurers/${insurerId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function apiListPolicies(accessToken: string): Promise<{ items: PolicyItem[] }> {
  return request("/policies", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function apiCreatePolicy(payload: CreatePolicyPayload, accessToken: string): Promise<PolicyItem> {
  return request("/policies", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function apiUpdatePolicy(
  policyId: string,
  payload: CreatePolicyPayload,
  accessToken: string,
): Promise<PolicyItem> {
  return request(`/policies/${policyId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function apiListPolicyDocuments(
  policyId: string,
  accessToken: string,
): Promise<{ items: PolicyDocumentItem[] }> {
  return request(`/policies/${encodePathSegment(policyId)}/documents`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function apiUploadPolicyDocuments(
  policyId: string,
  documents: PolicyDocumentUpload[],
  accessToken: string,
): Promise<{ items: PolicyDocumentItem[] }> {
  const payload = await Promise.all(
    documents.map(async (doc) => ({
      name: doc.file.name,
      size: doc.file.size,
      type: doc.file.type || "application/octet-stream",
      category: doc.category ?? "otros",
      label: doc.label ?? "",
      content_base64: await readFileAsBase64(doc.file),
    })),
  );

  return request(`/policies/${encodePathSegment(policyId)}/documents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ documents: payload }),
  });
}

export async function apiDeletePolicyDocument(
  policyId: string,
  documentId: string,
  accessToken: string,
): Promise<{ ok: boolean }> {
  return request(`/policies/${encodePathSegment(policyId)}/documents/${encodePathSegment(documentId)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export type ClaimItem = {
  id: string;
  client_id: string;
  client_name?: string | null;
  client_document?: string | null;
  policy_id?: string | null;
  policy_type?: string | null;
  insurer_name?: string | null;
  type?: string | null;
  event_date?: string | null;
  event_time?: string | null;
  location?: string | null;
  description?: string | null;
  priority?: string | null;
  channel?: string | null;
  status?: string | null;
  third_party_damage?: boolean;
  tow_needed?: boolean;
  internal_owner?: string | null;
  notify_client?: boolean;
  notify_broker?: boolean;
  notes?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  created_at?: string | null;
};

export type CreateClaimPayload = {
  client_id: string;
  policy_id: string;
  type: string;
  event_date: string;
  event_time?: string | null;
  location: string;
  description: string;
  priority?: string | null;
  channel?: string | null;
  internal_owner?: string | null;
  third_party_damage?: boolean;
  tow_needed?: boolean;
  notify_client?: boolean;
  notify_broker?: boolean;
  notes?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
};

export const apiListClaims = async (accessToken: string): Promise<{ items: ClaimItem[] }> =>
  request("/claims", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export async function apiCreateClaim(payload: CreateClaimPayload, accessToken: string): Promise<{ item: ClaimItem }> {
  return request("/claims", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
}

export const apiConfig = { API_BASE };
