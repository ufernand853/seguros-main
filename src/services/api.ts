const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

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

export async function apiLogin(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res);
}

export async function apiRefresh(refreshToken: string): Promise<{ accessToken: string; expiresInSeconds: number }> {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  return handleResponse(res);
}

export type CreateClientPayload = {
  name: string;
  document: string;
  city?: string | null;
  contacts?: { name: string; email?: string | null; phone?: string | null }[];
};

export async function apiCreateClient(payload: CreateClientPayload, accessToken: string) {
  const res = await fetch(`${API_BASE}/clients`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export type ClientListItem = {
  id: string;
  name: string;
  document?: string;
  city?: string | null;
};

export async function apiListClients(accessToken: string): Promise<{ items: ClientListItem[] }> {
  const res = await fetch(`${API_BASE}/clients`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return handleResponse(res);
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
  const res = await fetch(`${API_BASE}/pipeline`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return handleResponse(res);
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
  const res = await fetch(`${API_BASE}/tasks`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return handleResponse(res);
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
  const res = await fetch(`${API_BASE}/renewals`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return handleResponse(res);
}

export const apiConfig = { API_BASE };
