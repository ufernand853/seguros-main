import { useEffect, useMemo, useState, type ReactNode } from "react";

const BASE_ROLES = ["Administrador", "Operaciones", "Consultas"];

type UserStatus = "Activo" | "Suspendido" | "Invitación pendiente";

type UserRecord = {
  id: string;
  name: string;
  email: string;
  roles: string[];
  status: UserStatus;
  lastAccess?: string | null;
  team?: string;
};

const INITIAL_USERS: UserRecord[] = [
  {
    id: "usr-001",
    name: "María González",
    email: "maria.gonzalez@segurosdemo.com",
    roles: ["Administrador"],
    status: "Activo",
    lastAccess: "2024-10-12T11:20:00Z",
    team: "Backoffice",
  },
  {
    id: "usr-002",
    name: "Javier Pereira",
    email: "javier.pereira@segurosdemo.com",
    roles: ["Operaciones"],
    status: "Activo",
    lastAccess: "2024-10-15T08:45:00Z",
    team: "Siniestros",
  },
  {
    id: "usr-003",
    name: "Lucía Cabrera",
    email: "lucia.cabrera@segurosdemo.com",
    roles: ["Consultas"],
    status: "Invitación pendiente",
    lastAccess: null,
    team: "Comercial",
  },
  {
    id: "usr-004",
    name: "Diego Hernández",
    email: "diego.hernandez@segurosdemo.com",
    roles: ["Operaciones"],
    status: "Suspendido",
    lastAccess: "2024-09-30T17:15:00Z",
    team: "Operaciones",
  },
];

export default function UserMaintenance() {
  const [users, setUsers] = useState<UserRecord[]>(INITIAL_USERS);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("todos");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "todos">("todos");
  const [selectedId, setSelectedId] = useState<string>(INITIAL_USERS[0]?.id ?? "");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState(BASE_ROLES[0]);
  const [inviteTeam, setInviteTeam] = useState("");
  const [roleToAssign, setRoleToAssign] = useState(BASE_ROLES[0]);
  const [formError, setFormError] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const inviteStatus: UserStatus = "Invitación pendiente";

  const roleOptions = useMemo(() => {
    const unique = new Map<string, string>();
    [...BASE_ROLES, ...users.flatMap((user) => user.roles)].forEach((role) => {
      const value = role.trim();
      if (!value) return;
      const key = value.toLowerCase();
      if (!unique.has(key)) unique.set(key, value);
    });
    return Array.from(unique.values()).sort((a, b) => a.localeCompare(b, "es"));
  }, [users]);

  useEffect(() => {
    if (!roleOptions.includes(inviteRole) && roleOptions.length) {
      setInviteRole(roleOptions[0]);
    }
  }, [inviteRole, roleOptions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const byStatus = statusFilter === "todos" ? users : users.filter((user) => user.status === statusFilter);
    const byRole = roleFilter === "todos" ? byStatus : byStatus.filter((user) => user.roles.some((role) => role === roleFilter));

    return byRole
      .filter((user) =>
        !q || user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q) || user.team?.toLowerCase().includes(q),
      )
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [users, search, roleFilter, statusFilter]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId("");
      return;
    }
    const exists = filtered.some((user) => user.id === selectedId);
    if (!exists) setSelectedId(filtered[0].id);
  }, [filtered, selectedId]);

  const selectedUser = filtered.find((user) => user.id === selectedId) ?? filtered[0];

  useEffect(() => {
    setSaveFeedback(null);
  }, [selectedUser]);

  const stats = useMemo(() => {
    const totalRoles = new Set(users.flatMap((user) => user.roles)).size;
    const actives = users.filter((user) => user.status === "Activo").length;
    const pending = users.filter((user) => user.status === "Invitación pendiente").length;
    const suspended = users.filter((user) => user.status === "Suspendido").length;
    return { totalRoles, actives, pending, suspended };
  }, [users]);

  const formatDate = (value?: string | null) => {
    if (!value) return "Sin accesos";
    return new Intl.DateTimeFormat("es-UY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  };

  const assignRoleToUser = (role: string) => {
    const trimmed = role.trim();
    if (!trimmed || !selectedUser) return;
    setUsers((prev) =>
      prev.map((user) =>
        user.id === selectedUser.id && !user.roles.includes(trimmed)
          ? { ...user, roles: [...user.roles, trimmed] }
          : user,
      ),
    );
  };

  const removeRoleFromUser = (role: string) => {
    if (!selectedUser) return;
    setUsers((prev) =>
      prev.map((user) =>
        user.id === selectedUser.id
          ? { ...user, roles: user.roles.filter((item) => item !== role) }
          : user,
      ),
    );
  };

  const updateUserStatus = (status: UserStatus) => {
    if (!selectedUser) return;
    setUsers((prev) => prev.map((user) => (user.id === selectedUser.id ? { ...user, status } : user)));
  };

  const handleApplyChanges = () => {
    if (!selectedUser) return;
    setSaveFeedback(`Cambios aplicados para ${selectedUser.name}.`);
  };

  const handleSaveInvite = () => {
    setFormError(null);
    if (!inviteName.trim() || !inviteEmail.trim()) {
      setFormError("Nombre y email son obligatorios");
      return;
    }
    const newUser: UserRecord = {
      id: `usr-${Date.now()}`,
      name: inviteName.trim(),
      email: inviteEmail.trim(),
      roles: [inviteRole],
      status: inviteStatus,
      lastAccess: null,
      team: inviteTeam.trim() || undefined,
    };
    setUsers((prev) => [...prev, newUser].sort((a, b) => a.name.localeCompare(b.name, "es")));
    setInviteName("");
    setInviteEmail("");
    setInviteTeam("");
    setSelectedId(newUser.id);
    setShowInvite(false);
  };

  return (
    <div className="flex-1 flex flex-col gap-6">
      <header className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Configuración</p>
            <h1 className="text-2xl font-bold text-slate-900">Mantenimiento de usuarios y roles</h1>
            <p className="mt-2 text-slate-600 max-w-2xl">
              Gestiona los accesos del equipo, asigna roles y controla el estado de las cuentas. Todos los cambios se
              aplican en tiempo real para la sesión actual.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowInvite((prev) => !prev)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-100"
          >
            <span className="text-lg">＋</span>
            {showInvite ? "Cerrar formulario" : "Invitar usuario"}
          </button>
        </div>

        <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ResumenCard title="Usuarios activos" value={stats.actives.toString()} subtitle="Con acceso vigente" />
          <ResumenCard title="Invitaciones pendientes" value={stats.pending.toString()} subtitle="En espera de registro" />
          <ResumenCard title="Suspendidos" value={stats.suspended.toString()} subtitle="No pueden ingresar" />
          <ResumenCard title="Roles vigentes" value={stats.totalRoles.toString()} subtitle="Catálogo de permisos" />
        </dl>
      </header>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label htmlFor="user-search" className="block text-sm font-semibold text-slate-700 mb-2">
              Buscar usuario
            </label>
            <input
              id="user-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nombre, email o equipo"
              className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div>
            <label htmlFor="role-filter" className="block text-sm font-semibold text-slate-700 mb-2">
              Rol
            </label>
            <select
              id="role-filter"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="todos">Todos</option>
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="status-filter" className="block text-sm font-semibold text-slate-700 mb-2">
              Estado
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as UserStatus | "todos")}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="todos">Todos</option>
              <option value="Activo">Activo</option>
              <option value="Suspendido">Suspendido</option>
              <option value="Invitación pendiente">Invitación pendiente</option>
            </select>
          </div>
        </div>

        {showInvite && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
            <h2 className="text-sm font-semibold text-indigo-700">Invitar nuevo usuario</h2>
            <p className="text-xs text-indigo-600 mb-3">Se enviará un correo con los pasos para activar la cuenta.</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="flex flex-col text-sm text-slate-700 gap-1">
                Nombre y apellido
                <input
                  value={inviteName}
                  onChange={(event) => setInviteName(event.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="Ej. Ana Rodríguez"
                />
              </label>
              <label className="flex flex-col text-sm text-slate-700 gap-1">
                Email corporativo
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="usuario@segurosdemo.com"
                />
              </label>
              <label className="flex flex-col text-sm text-slate-700 gap-1">
                Rol inicial
                <select
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col text-sm text-slate-700 gap-1 md:col-span-3">
                Equipo / Sector (opcional)
                <input
                  value={inviteTeam}
                  onChange={(event) => setInviteTeam(event.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="Backoffice, Comercial, Siniestros"
                />
              </label>
            </div>

            {formError && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                {formError}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-3 items-center">
              <button
                type="button"
                onClick={handleSaveInvite}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                Enviar invitación
              </button>
              <span className="text-xs text-slate-500">La cuenta quedará como "Invitación pendiente" hasta que se active.</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 md:p-6 min-h-0">
            <div className="overflow-auto -mx-4 md:mx-0">
              <table className="min-w-full divide-y divide-slate-200">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Usuario</th>
                    <th className="px-4 py-3">Roles</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Último acceso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
                  {filtered.map((user) => (
                    <tr
                      key={user.id}
                      onClick={() => setSelectedId(user.id)}
                      className={`cursor-pointer transition-colors hover:bg-indigo-50 ${
                        user.id === selectedUser?.id ? "bg-indigo-50" : "bg-white"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{user.name}</div>
                        <div className="text-xs text-slate-500">{user.email}</div>
                        {user.team && <div className="text-xs text-slate-500">Equipo: {user.team}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((role) => (
                            <RolePill key={`${user.id}-${role}`} role={role} />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={user.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatDate(user.lastAccess)}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                        No hay usuarios que coincidan con los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 md:p-6 flex flex-col gap-4 min-h-0">
            <h2 className="text-lg font-semibold text-slate-900">Detalle del usuario</h2>
            {selectedUser ? (
              <div className="flex flex-col gap-4 text-sm text-slate-700">
                <div>
                  <div className="text-xl font-bold text-slate-900">{selectedUser.name}</div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">{selectedUser.id}</div>
                  <div className="text-slate-600">{selectedUser.email}</div>
                  {selectedUser.team && <div className="text-slate-500 text-xs">Equipo: {selectedUser.team}</div>}
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedUser.roles.map((role) => (
                    <span
                      key={`${selectedUser.id}-role-${role}`}
                      className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700"
                    >
                      {role}
                      <button
                        type="button"
                        aria-label={`Quitar rol ${role}`}
                        onClick={() => removeRoleFromUser(role)}
                        className="text-indigo-400 hover:text-rose-600"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <DetailItem label="Estado" value={<StatusBadge status={selectedUser.status} />} />
                  <DetailItem label="Último acceso" value={formatDate(selectedUser.lastAccess)} />
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-col gap-3">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Asignar rol</label>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <select
                        value={roleToAssign}
                        onChange={(event) => setRoleToAssign(event.target.value)}
                        className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 flex-1"
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => assignRoleToUser(roleToAssign)}
                        className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                      >
                        Añadir rol
                      </button>
                    </div>
                  </div>

                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => updateUserStatus("Activo")}
                    className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                  >
                    Activar acceso
                  </button>
                  <button
                    type="button"
                    onClick={() => updateUserStatus("Suspendido")}
                    className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700"
                  >
                    Suspender acceso
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleApplyChanges}
                  className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                >
                  Aplicar cambios
                </button>

                {saveFeedback && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    {saveFeedback}
                  </div>
                )}

                <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600">
                  Si cambias los roles, recuerda actualizar las políticas de permisos en el backend para que el cambio tenga efecto.
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500">Selecciona un usuario para ver y editar sus roles.</div>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}

type ResumenCardProps = {
  title: string;
  value: string;
  subtitle: string;
};

function ResumenCard({ title, value, subtitle }: ResumenCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</dt>
      <dd className="mt-2 text-2xl font-bold text-slate-900">{value}</dd>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}

type StatusBadgeProps = { status: UserStatus };

function StatusBadge({ status }: StatusBadgeProps) {
  const config: Record<UserStatus, { bg: string; text: string }> = {
    Activo: { bg: "bg-emerald-100", text: "text-emerald-700" },
    Suspendido: { bg: "bg-rose-100", text: "text-rose-700" },
    "Invitación pendiente": { bg: "bg-amber-100", text: "text-amber-700" },
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${config[status].bg} ${config[status].text}`}>
      {status}
    </span>
  );
}

type RolePillProps = { role: string };

function RolePill({ role }: RolePillProps) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
      {role}
    </span>
  );
}

type DetailItemProps = {
  label: string;
  value: ReactNode;
};

function DetailItem({ label, value }: DetailItemProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}
