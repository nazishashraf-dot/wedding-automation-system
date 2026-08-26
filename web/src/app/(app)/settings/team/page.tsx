"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { ApiError, TeamMember, inviteTeamMember, listTeamUsers } from "@/lib/api";
import { formatDate } from "@/lib/format";
import SectionHeading from "@/components/SectionHeading";
import Badge from "@/components/Badge";
import { btnPrimary, cardClass, inputClass } from "@/lib/ui";

export default function TeamPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [invited, setInvited] = useState(false);

  async function refresh() {
    try {
      const data = await listTeamUsers();
      setMembers(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load team members");
    }
  }

  useEffect(() => {
    // Owner-only page — the API also rejects this for assistants, this is
    // just so they never see the form at all.
    if (user && user.role !== "owner") {
      router.replace("/settings");
      return;
    }
    if (user?.role === "owner") refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setInvited(false);
    try {
      await inviteTeamMember({ name, email, password });
      setName("");
      setEmail("");
      setPassword("");
      setInvited(true);
      await refresh();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Failed to invite team member");
    } finally {
      setSubmitting(false);
    }
  }

  if (!user || user.role !== "owner") return null;

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-4xl font-semibold text-wine-600 sm:text-5xl">Team</h1>

      <section className={cardClass}>
        <SectionHeading>Invite Team Member</SectionHeading>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-plum-600">Name</label>
            <input
              required
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-plum-600">Email</label>
            <input
              required
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-plum-600">
              Temporary password
            </label>
            <input
              required
              type="text"
              minLength={8}
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {formError && <p className="text-sm text-rose-700 sm:col-span-3">{formError}</p>}
          {invited && (
            <p className="text-sm text-sage-700 sm:col-span-3">
              Team member invited — share the email and temporary password with them directly.
            </p>
          )}
          <div className="sm:col-span-3">
            <button type="submit" disabled={submitting} className={btnPrimary}>
              {submitting ? "Inviting..." : "Invite"}
            </button>
          </div>
        </form>
        <p className="mt-3 text-xs text-plum-400">
          New team members are added as assistants: they can create and edit clients, weddings,
          tasks, vendors, and meetings, but can&apos;t delete weddings/clients/vendors or invite
          others.
        </p>
      </section>

      <section className={cardClass}>
        <SectionHeading>Team Members</SectionHeading>
        {error && <p className="mb-2 text-sm text-rose-700">{error}</p>}
        {members && members.length === 0 && (
          <p className="text-sm text-plum-400">No team members yet.</p>
        )}
        {members && members.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gold-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-ivory-100 text-xs uppercase tracking-wide text-plum-400">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Role</th>
                  <th className="px-3 py-2 font-medium">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-100">
                {members.map((m) => (
                  <tr key={m.id}>
                    <td className="px-3 py-2 font-medium text-plum">{m.name}</td>
                    <td className="px-3 py-2 text-plum-600">{m.email}</td>
                    <td className="px-3 py-2">
                      <Badge tone={m.role === "owner" ? "gold" : "neutral"}>{m.role}</Badge>
                    </td>
                    <td className="px-3 py-2 text-plum-400">{formatDate(m.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
