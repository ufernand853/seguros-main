export type DemoUser = {
  email: string;
  password: string;
  name: string;
  role?: string;
};

const DEMO_USERS: DemoUser[] = [
  {
    email: "ejecutivo@segurosdemo.com",
    password: "Demo1234",
    name: "Ejecutivo Comercial",
    role: "ejecutivo",
  },
  {
    email: "operaciones@segurosdemo.com",
    password: "Operaciones!",
    name: "Operador Backoffice",
    role: "operaciones",
  },
];

export function authenticateWithDemoUser(
  email: string,
  password: string,
): DemoUser | null {
  const normalizedEmail = email.trim().toLowerCase();
  const match = DEMO_USERS.find(
    (u) => u.email.toLowerCase() === normalizedEmail && u.password === password,
  );
  return match ?? null;
}
