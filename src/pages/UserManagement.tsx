import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import {
  apiCreateUser,
  apiDeleteUser,
  apiListUsers,
  apiUpdateUser,
  type CreateUserPayload,
  type UpdateUserPayload,
  type UserItem,
} from "../services/api";

type UserFormState = {
  name: string;
  email: string;
  password: string;
  role: CreateUserPayload["role"];
};

const ROLE_OPTIONS: CreateUserPayload["role"][] = ["admin", "operador", "consulta"];

export default function UserManagement() {
  const { token, user, isAdmin } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormState>({
    name: "",
    email: "",
    password: "",
    role: "operador",
  });

  const myUserId = user?.id;

  const loadUsers = () => {
    if (!token || !isAdmin) return;
    setLoading(true);
    setError(null);
    apiListUsers(token)
      .then((data) => setUsers(data.items ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar los usuarios"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, [token, isAdmin]);

  const resetForm = () => {
    setSelectedId(null);
    setForm({ name: "", email: "", password: "", role: "operador" });
  };

  const handleSelect = (item: UserItem) => {
    setSelectedId(item.id);
    setForm({
      name: item.name,
      email: item.email,
      password: "",
      role: (item.role as CreateUserPayload["role"]) ?? "consulta",
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      setError("Debes iniciar sesión para administrar usuarios.");
      return;
    }
    if (!isAdmin) {
      setError("Solo los administradores pueden administrar usuarios.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (selectedId) {
        const payload: UpdateUserPayload = {
          name: form.name,
          role: form.role,
          ...(form.password ? { password: form.password } : {}),
        };
        await apiUpdateUser(selectedId, payload, token);
        setSuccess("Usuario actualizado correctamente.");
      } else {
        if (!form.email || !form.password || !form.name) {
          setError("Nombre, email y contraseña son obligatorios.");
          setSaving(false);
          return;
        }
        const payload: CreateUserPayload = {
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
        };
        await apiCreateUser(payload, token);
        setSuccess("Usuario creado correctamente.");
      }
      resetForm();
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el usuario");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token || !isAdmin) return;
    if (id === myUserId) {
      setError("No puedes eliminar tu propio usuario.");
      return;
    }
    const confirm = window.confirm("¿Eliminar este usuario? Esta acción no se puede deshacer.");
    if (!confirm) return;
    setError(null);
    setSuccess(null);
    try {
      await apiDeleteUser(id, token);
      if (selectedId === id) resetForm();
      loadUsers();
      setSuccess("Usuario eliminado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el usuario");
    }
  };

  const roleSummary = useMemo(() => {
    return ROLE_OPTIONS.map((role) => ({
      role,
      count: users.filter((u) => u.role === role).length,
    }));
  }, [users]);

  if (!isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md text-center space-y-3 bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
          <h1 className="text-xl font-bold text-slate-900">Configuración de usuarios</h1>
          <p className="text-slate-600">Solo los administradores pueden acceder al mantenimiento de usuarios.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-6">
      <header className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Configuración</p>
        <h1 className="text-2xl font-bold text-slate-900">Mantenimiento de usuarios</h1>
        <p className="mt-2 text-slate-600">
          Administra las cuentas internas con roles de <strong>administrador</strong>, <strong>operador</strong> y{" "}
          <strong>consulta</strong>. Los administradores pueden crear, editar o eliminar usuarios.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-700">
          {roleSummary.map((item) => (
            <span
              key={item.role}
              className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 border border-slate-200"
            >
              <span className="font-semibold capitalize">{item.role}</span>
              <span className="text-slate-500">({item.count})</span>
            </span>
          ))}
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 border border-indigo-100 text-indigo-700">
            Total: {users.length}
          </span>
        </div>
      </header>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error}</div>}
      {success && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">{success}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-6">
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Usuarios registrados</p>
              <h2 className="text-lg font-bold text-slate-900">Listado y acciones</h2>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              Nuevo usuario
            </button>
          </div>

          <div className="mt-4 overflow-auto -mx-4 md:mx-0">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                      Cargando usuarios…
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                      No hay usuarios cargados.
                    </td>
                  </tr>
                ) : (
                  users.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-indigo-50 cursor-pointer ${
                        selectedId === item.id ? "bg-indigo-50" : "bg-white"
                      }`}
                      onClick={() => handleSelect(item)}
                    >
                      <td className="px-4 py-3 font-semibold text-slate-900">{item.name}</td>
                      <td className="px-4 py-3">{item.email}</td>
                      <td className="px-4 py-3 capitalize">{item.role ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDelete(item.id);
                          }}
                          disabled={item.id === myUserId}
                          className={`text-sm font-semibold ${
                            item.id === myUserId
                              ? "text-slate-400 cursor-not-allowed"
                              : "text-rose-600 hover:text-rose-700"
                          }`}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
                {selectedId ? "Editar usuario" : "Alta de usuario"}
              </p>
              <h2 className="text-lg font-bold text-slate-900">
                {selectedId ? "Actualiza datos y rol" : "Completa los datos obligatorios"}
              </h2>
            </div>
            {selectedId && (
              <button type="button" onClick={resetForm} className="text-sm text-slate-500 hover:text-slate-700">
                Cancelar edición
              </button>
            )}
          </div>

          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Nombre y apellido
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="Ej. Ana Martínez"
                required
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Email corporativo
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-slate-100 disabled:text-slate-500"
                placeholder="usuario@compania.com"
                required
                disabled={!!selectedId}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Contraseña {selectedId ? "(deja vacío para no cambiar)" : "(obligatoria)"}
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder={selectedId ? "Mantener contraseña" : "Establece una contraseña segura"}
                required={!selectedId}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Rol
              <select
                value={form.role}
                onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value as CreateUserPayload["role"] }))}
                className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                {ROLE_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value === "admin" ? "Administrador" : value === "operador" ? "Operador" : "Consulta"}
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-500">
                Administrador: acceso total. Operador: operaciones y edición. Consulta: solo lectura.
              </span>
            </label>

            <div className="flex flex-wrap gap-3 items-center">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
              >
                {isSaving ? "Guardando..." : selectedId ? "Actualizar usuario" : "Crear usuario"}
              </button>
              <p className="text-xs text-slate-500">Los cambios se aplican inmediatamente.</p>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
