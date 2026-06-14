"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/browser-client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
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
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <PageHeader
          eyebrow="Administration"
          title="User management"
          description="Invite team members and manage roles within your organization."
        />

        <Card>
          <CardHeader>
            <CardTitle>Invite user</CardTitle>
          </CardHeader>
          <form onSubmit={(event) => void handleCreate(event)} className="space-y-4">
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
        </Card>

        <Card padding="none">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Team members</h2>
          </div>
          <DataTable className="rounded-none border-0">
            <DataTableHead>
              <DataTableHeaderCell>Name</DataTableHeaderCell>
              <DataTableHeaderCell>Email</DataTableHeaderCell>
              <DataTableHeaderCell>Role</DataTableHeaderCell>
              <DataTableHeaderCell>Status</DataTableHeaderCell>
            </DataTableHead>
            <DataTableBody>
              {users.map((user) => (
                <DataTableRow key={user.id}>
                  <DataTableCell className="font-medium text-slate-900">{user.name}</DataTableCell>
                  <DataTableCell>{user.email}</DataTableCell>
                  <DataTableCell>
                    <Badge variant="brand">{user.role.replace("_", " ")}</Badge>
                  </DataTableCell>
                  <DataTableCell>
                    <Badge variant={user.isActive ? "success" : "default"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </Card>
      </div>
    </main>
  );
}
