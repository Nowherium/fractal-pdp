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
  const [view, setView] = useState<"users" | "logs">("users");

  const [logs, setLogs] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const token = localStorage.getItem("token");

  const fetchUsers = async () => {
    const res = await fetch("/api/users", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setUsers(await res.json());
  };

  const fetchLogs = async () => {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: "50",
    });
    if (searchQuery) queryParams.append("search", searchQuery);

    const res = await fetch(`/api/logs?${queryParams.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const result = await res.json();
      setLogs(result.data);
      setTotalPages(result.meta.totalPages || 1);
    }
  };

  useEffect(() => {
    if (view === "users") fetchUsers();
  }, [view]);

  useEffect(() => {
    if (view === "logs") fetchLogs();
  }, [view, page, searchQuery]);

  const handleCreateUser = async () => {
    setError("");
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
      setError("Erreur lors de la création de l'utilisateur.");
    }
  };

  const handleUpdateRole = async (id: number, role: string) => {
    const res = await fetch(`/api/users/${id}/role`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ role }),
    });
    if (res.ok) fetchUsers();
  };

  const handleDeleteUser = async (id: number) => {
    if (!window.confirm("Supprimer cet utilisateur définitivement ?")) return;

    const res = await fetch(`/api/users/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      fetchUsers();
    } else {
      alert("Impossible de supprimer cet utilisateur.");
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setPage(1);
  };

  return (
    <Panel>
      <div className="mb-4 flex items-center justify-between">
        <Button className="mt-0" variant="muted" onClick={closePage}>
          ← Retour
        </Button>
        <div className="flex gap-2">
          <Button
            variant={view === "users" ? "primary" : "muted"}
            onClick={() => setView("users")}
          >
            Utilisateurs
          </Button>
          <Button
            variant={view === "logs" ? "primary" : "muted"}
            onClick={() => {
              setView("logs");
              setPage(1);
            }}
          >
            Logs d'audit
          </Button>
        </div>
      </div>

      <h2>Administration {view === "users" ? "des utilisateurs" : "des logs"}</h2>

      {view === "users" ? (
        <>
          <div className="mt-6 rounded-lg border border-border-soft p-4 space-y-4">
            <h3>Créer un compte</h3>
            {error && <p className="text-accent-red">{error}</p>}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
              <Field label="Nom d'utilisateur">
                <input
                  type="text"
                  className={fieldInputClassName}
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                />
              </Field>
              <Field label="Mot de passe">
                <input
                  type="password"
                  className={fieldInputClassName}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </Field>
              <Field label="Rôle">
                <select
                  className={fieldInputClassName}
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                >
                  <option value="read">Read (Lecture seule)</option>
                  <option value="read-write">Read-Write (Modif)</option>
                  <option value="admin">Admin</option>
                </select>
              </Field>
            </div>
            <Button onClick={handleCreateUser} disabled={!newUsername || !newPassword}>
              Créer l'utilisateur
            </Button>
          </div>

          <div className="mt-8">
            <h3>Liste des utilisateurs</h3>
            <div className="mt-4 flex flex-col gap-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-lg border border-border-soft bg-soft-bg p-3"
                >
                  <div>
                    <strong className="text-[#f1f1f1]">{user.username}</strong>
                    <span className="ml-2 text-sm text-gray-400">(ID: {user.id})</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <select
                      className="rounded border border-border-strong bg-[#111] px-2 py-1 text-sm text-[#f1f1f1]"
                      value={user.role}
                      onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                    >
                      <option value="read">Read</option>
                      <option value="read-write">Read-Write</option>
                      <option value="admin">Admin</option>
                    </select>
                    {user.id !== 1 && (
                      <Button
                        className="mt-0 !bg-[#111] !text-accent-red !border-accent-red hover:!bg-accent-red hover:!text-white"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        ✕
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="Rechercher un utilisateur, une action ou une donnée JSON..."
              className={fieldInputClassName}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <Button type="submit" variant="primary" className="mt-0">
              Chercher
            </Button>
            {searchQuery && (
              <Button
                type="button"
                variant="muted"
                className="mt-0"
                onClick={() => {
                  setSearchInput("");
                  setSearchQuery("");
                  setPage(1);
                }}
              >
                Effacer
              </Button>
            )}
          </form>

          <div className="flex flex-col gap-2">
            {logs.length === 0 ? (
              <p>Aucun log trouvé pour cette recherche.</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="rounded-lg border border-border-soft bg-soft-bg p-3 text-sm">
                  <div className="mb-2 flex justify-between border-b border-border-soft pb-1">
                    <span className="font-bold text-accent-green">{log.action_type}</span>
                    <span className="text-gray-400">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  <div className="text-gray-300">
                    <strong>Par :</strong> {log.username || "Système"}
                  </div>
                  <details className="mt-1 cursor-pointer">
                    <summary className="text-xs text-gray-500 hover:text-gray-300">Détails JSON</summary>
                    <pre className="mt-2 overflow-x-auto rounded bg-black p-2 text-[10px] text-gray-400">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </details>
                </div>
              ))
            )}
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-border-soft p-3">
              <Button
                variant="muted"
                className="mt-0"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Précédent
              </Button>
              <span className="text-sm text-gray-300">
                Page {page} sur {totalPages}
              </span>
              <Button
                variant="muted"
                className="mt-0"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Suivant →
              </Button>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

export default AdminPage;import { useState, useEffect } from "react";
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
  const [view, setView] = useState<"users" | "logs">("users");

  const [logs, setLogs] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const token = localStorage.getItem("token");

  const fetchUsers = async () => {
    const res = await fetch("/api/users", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setUsers(await res.json());
  };

  const fetchLogs = async () => {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: "50",
    });
    if (searchQuery) queryParams.append("search", searchQuery);

    const res = await fetch(`/api/logs?${queryParams.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const result = await res.json();
      setLogs(result.data);
      setTotalPages(result.meta.totalPages || 1);
    }
  };

  useEffect(() => {
    if (view === "users") fetchUsers();
  }, [view]);

  useEffect(() => {
    if (view === "logs") fetchLogs();
  }, [view, page, searchQuery]);

  const handleCreateUser = async () => {
    setError("");
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
      setError("Erreur lors de la création de l'utilisateur.");
    }
  };

  const handleUpdateRole = async (id: number, role: string) => {
    const res = await fetch(`/api/users/${id}/role`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ role }),
    });
    if (res.ok) fetchUsers();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setPage(1);
  };

  return (
    <Panel>
      <div className="mb-4 flex items-center justify-between">
        <Button className="mt-0" variant="muted" onClick={closePage}>
          ← Retour
        </Button>
        <div className="flex gap-2">
          <Button
            variant={view === "users" ? "primary" : "muted"}
            onClick={() => setView("users")}
          >
            Utilisateurs
          </Button>
          <Button
            variant={view === "logs" ? "primary" : "muted"}
            onClick={() => {
              setView("logs");
              setPage(1);
            }}
          >
            Logs d'audit
          </Button>
        </div>
      </div>

      <h2>Administration {view === "users" ? "des utilisateurs" : "des logs"}</h2>

      {view === "users" ? (
        <>
          <div className="mt-6 rounded-lg border border-border-soft p-4 space-y-4">
            <h3>Créer un compte</h3>
            {error && <p className="text-accent-red">{error}</p>}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
              <Field label="Nom d'utilisateur">
                <input
                  type="text"
                  className={fieldInputClassName}
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                />
              </Field>
              <Field label="Mot de passe">
                <input
                  type="password"
                  className={fieldInputClassName}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </Field>
              <Field label="Rôle">
                <select
                  className={fieldInputClassName}
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                >
                  <option value="read">Read (Lecture seule)</option>
                  <option value="read-write">Read-Write (Modif)</option>
                  <option value="admin">Admin</option>
                </select>
              </Field>
            </div>
            <Button onClick={handleCreateUser} disabled={!newUsername || !newPassword}>
              Créer l'utilisateur
            </Button>
          </div>

          <div className="mt-8">
            <h3>Liste des utilisateurs</h3>
            <div className="mt-4 flex flex-col gap-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-lg border border-border-soft bg-soft-bg p-3"
                >
                  <div>
                    <strong className="text-[#f1f1f1]">{user.username}</strong>
                    <span className="ml-2 text-sm text-gray-400">(ID: {user.id})</span>
                  </div>
                  <select
                    className="rounded border border-border-strong bg-[#111] px-2 py-1 text-sm text-[#f1f1f1]"
                    value={user.role}
                    onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                  >
                    <option value="read">Read</option>
                    <option value="read-write">Read-Write</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="Rechercher un utilisateur, une action ou une donnée JSON..."
              className={fieldInputClassName}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <Button type="submit" variant="primary" className="mt-0">
              Chercher
            </Button>
            {searchQuery && (
              <Button
                type="button"
                variant="muted"
                className="mt-0"
                onClick={() => {
                  setSearchInput("");
                  setSearchQuery("");
                  setPage(1);
                }}
              >
                Effacer
              </Button>
            )}
          </form>

          <div className="flex flex-col gap-2">
            {logs.length === 0 ? (
              <p>Aucun log trouvé pour cette recherche.</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="rounded-lg border border-border-soft bg-soft-bg p-3 text-sm">
                  <div className="mb-2 flex justify-between border-b border-border-soft pb-1">
                    <span className="font-bold text-accent-green">{log.action_type}</span>
                    <span className="text-gray-400">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  <div className="text-gray-300">
                    <strong>Par :</strong> {log.username || "Système"}
                  </div>
                  <details className="mt-1 cursor-pointer">
                    <summary className="text-xs text-gray-500 hover:text-gray-300">Détails JSON</summary>
                    <pre className="mt-2 overflow-x-auto rounded bg-black p-2 text-[10px] text-gray-400">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </details>
                </div>
              ))
            )}
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-border-soft p-3">
              <Button
                variant="muted"
                className="mt-0"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Précédent
              </Button>
              <span className="text-sm text-gray-300">
                Page {page} sur {totalPages}
              </span>
              <Button
                variant="muted"
                className="mt-0"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Suivant →
              </Button>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

export default AdminPage;
