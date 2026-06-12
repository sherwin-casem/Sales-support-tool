"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api/browser-client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("SALES_REP");

  async function loadUsers() {
    const response = await apiFetch<{ data: UserRow[] }>("/api/v1/admin/users");
    setUsers(response.data);
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    await apiFetch("/api/v1/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, password, role }),
    });
    setEmail("");
    setName("");
    setPassword("");
    await loadUsers();
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-slate-900">User management</h1>

        <form onSubmit={(event) => void handleCreate(event)} className="mt-6 space-y-3 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Invite user</h2>
          <Input id="user-email" label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input id="user-name" label="Name" required value={name} onChange={(e) => setName(e.target.value)} />
          <Input id="user-password" label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          <Select id="user-role" label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="SALES_REP">Sales rep</option>
            <option value="MANAGER">Manager</option>
            <option value="ADMIN">Admin</option>
          </Select>
          <Button type="submit">Create user</Button>
        </form>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Active</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-slate-100">
                  <td className="px-4 py-3">{user.name}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">{user.role}</td>
                  <td className="px-4 py-3">{user.isActive ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </AppShell>
  );
}
