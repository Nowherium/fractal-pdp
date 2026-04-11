import { useState, useEffect } from "react";
import Button from "./ui/Button";
import Field from "./ui/Field";
import Panel from "./ui/Panel";

const fieldInputClassName =
  "w-full rounded-lg border border-border-strong bg-[#111] px-3 py-2.5 text-left text-[#f1f1f1]";

function AdminPage({ closePage }: { closePage: () => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("read");
  const [error, setError] = useState("");

  const fetchUsers = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/users", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setUsers(data);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async () => {
    setError("");
    const token = localStorage.getItem("token");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        username: newUsername,
        password: newPassword,
        role: newRole,
      }),
    });

    if (res.ok) {
      setNewUsername("");
      setNewPassword("");
      setNewRole("read");
      fetchUsers();
    } else {
      setError("Erreur lors de la création de l'utilisateur (nom déjà pris ?)");
    }
  };

  const handleUpdateRole = async (id: number, role: string) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/users/${id}/role`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      fetchUsers();
    }
  };

  return (
    <Panel>
      <Button className='mt-0' variant='muted' onClick={closePage}>
        ← Retour
      </Button>
      <h2>Administration des utilisateurs</h2>

      <div className='mt-6 space-y-4 rounded-lg border border-border-soft p-4'>
        <h3>Créer un utilisateur</h3>
        {error && <p className='text-accent-red'>{error}</p>}
        <div className='grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4'>
          <Field label="Nom d'utilisateur">
            <input
              type='text'
              className={fieldInputClassName}
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
            />
          </Field>
          <Field label='Mot de passe'>
            <input
              type='password'
              className={fieldInputClassName}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </Field>
          <Field label='Rôle'>
            <select
              className={fieldInputClassName}
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
            >
              <option value='read'>Read (Lecture seule)</option>
              <option value='read-write'>Read-Write (Modification)</option>
              <option value='admin'>Admin</option>
            </select>
          </Field>
        </div>
        <Button
          onClick={handleCreateUser}
          disabled={!newUsername || !newPassword}
        >
          Créer l'utilisateur
        </Button>
      </div>

      <div className='mt-8'>
        <h3>Utilisateurs existants</h3>
        <div className='mt-4 flex flex-col gap-2'>
          {users.map((user) => (
            <div
              key={user.id}
              className='flex items-center justify-between rounded-lg border border-border-soft bg-soft-bg p-3'
            >
              <div>
                <strong className='text-[#f1f1f1]'>{user.username}</strong>
                <span className='ml-2 text-sm text-gray-400'>
                  (ID: {user.id})
                </span>
              </div>
              <select
                className='rounded border border-border-strong bg-[#111] px-2 py-1 text-sm text-[#f1f1f1]'
                value={user.role}
                onChange={(e) => handleUpdateRole(user.id, e.target.value)}
              >
                <option value='read'>Read</option>
                <option value='read-write'>Read-Write</option>
                <option value='admin'>Admin</option>
              </select>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

export default AdminPage;
