const DEFAULT_API_BASE = "http://179.27.98.202:4000";
const API_BASE = import.meta.env.VITE_API_URL ?? DEFAULT_API_BASE;

type LoginResponse = {
  user: { id: string; name: string; email: string; role?: string };
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
};

async function handleResponse(res: Response) {
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = data?.error ?? "Error inesperado";
    throw new Error(message);
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
        `No se pudo conectar con el API en ${API_BASE}. Verifica que el backend esté en marcha y que la variable VITE_API_URL apunte a la URL correcta (p. ej. ${DEFAULT_API_BASE} para http://179.27.98.202:5173/login).`,
      );
    }
    throw error;
  }
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

export type CreateClientPayload = {
  name: string;
  document: string;
  city?: string | null;
  contacts?: { name: string; email?: string | null; phone?: string | null }[];
};

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

export type ClientListItem = {
  id: string;
  name: string;
  document?: string;
  city?: string | null;
};

export async function apiListClients(accessToken: string): Promise<{ items: ClientListItem[] }> {
  return request("/clients", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
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
  title: string;
  due_date?: string;
  status?: string;
  priority?: string | null;
  owner?: string | null;
  client_name?: string | null;
};

export async function apiListTasks(accessToken: string): Promise<{ items: TaskItem[] }> {
  return request("/tasks", {
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

export const apiConfig = { API_BASE };
