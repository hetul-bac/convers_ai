"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Download, FileUp, Plus, Upload, Users } from "lucide-react";

type ContactRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  tags: string[];
};

type ContactsWorkspaceProps = {
  initialContacts: ContactRow[];
};

export function ContactsWorkspace({
  initialContacts,
}: ContactsWorkspaceProps) {
  const [contacts, setContacts] = useState(initialContacts);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [tags, setTags] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stats = useMemo(
    () => ({
      total: contacts.length,
      emailReach: contacts.filter((contact) => contact.email).length,
      phoneReach: contacts.filter((contact) => contact.phone).length,
    }),
    [contacts],
  );

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setTags("");
  };

  const handleCreate = () => {
    startTransition(async () => {
      setMessage(null);
      setError(null);

      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          tags,
        }),
      });

      const payload = (await response.json()) as ContactRow | { error: string };

      if (!response.ok || "error" in payload) {
        setError("error" in payload ? payload.error : "Failed to create contact.");
        return;
      }

      setContacts((current) =>
        [...current, payload].sort((left, right) =>
          (left.name ?? left.email ?? left.phone ?? "").localeCompare(
            right.name ?? right.email ?? right.phone ?? "",
          ),
        ),
      );
      setMessage("Contact created.");
      resetForm();
    });
  };

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = () => {
    const file = fileInputRef.current?.files?.[0];

    if (!file) {
      return;
    }

    startTransition(async () => {
      setMessage(null);
      setError(null);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/contacts/import", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as
        | { inserted: ContactRow[] }
        | { error: string };

      if (!response.ok || "error" in payload) {
        setError("error" in payload ? payload.error : "CSV import failed.");
        fileInputRef.current!.value = "";
        return;
      }

      setContacts((current) =>
        [...current, ...payload.inserted].sort((left, right) =>
          (left.name ?? left.email ?? left.phone ?? "").localeCompare(
            right.name ?? right.email ?? right.phone ?? "",
          ),
        ),
      );
      setMessage(`${payload.inserted.length} contacts imported from CSV.`);
      fileInputRef.current!.value = "";
    });
  };

  const downloadCsv = () => {
    window.location.href = "/api/contacts/export";
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <article className="surface-panel p-5">
          <p className="text-sm text-slate-500">Total Contacts</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {stats.total}
          </p>
        </article>
        <article className="surface-panel p-5">
          <p className="text-sm text-slate-500">Email Reach</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {stats.emailReach}
          </p>
        </article>
        <article className="surface-panel p-5">
          <p className="text-sm text-slate-500">Phone Reach</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {stats.phoneReach}
          </p>
        </article>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)]">
        <section className="surface-panel p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-[#3182ce]">
            Create Contact
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            Add a contact manually
          </h2>

          <div className="mt-6 grid gap-5">
            <label className="text-sm font-medium text-slate-800">
              Name
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#f8fbff] px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#3182ce] focus:ring-2 focus:ring-[#3182ce]/20"
                onChange={(event) => setName(event.target.value)}
                value={name}
              />
            </label>

            <label className="text-sm font-medium text-slate-800">
              Email
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#f8fbff] px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#3182ce] focus:ring-2 focus:ring-[#3182ce]/20"
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                value={email}
              />
            </label>

            <label className="text-sm font-medium text-slate-800">
              Phone
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#f8fbff] px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#3182ce] focus:ring-2 focus:ring-[#3182ce]/20"
                onChange={(event) => setPhone(event.target.value)}
                value={phone}
              />
            </label>

            <label className="text-sm font-medium text-slate-800">
              Tags
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#f8fbff] px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#3182ce] focus:ring-2 focus:ring-[#3182ce]/20"
                onChange={(event) => setTags(event.target.value)}
                placeholder="vip, newsletter, support"
                value={tags}
              />
            </label>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              className="inline-flex items-center gap-2 rounded-full bg-[#3182ce] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2769a8] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPending}
              onClick={handleCreate}
              type="button"
            >
              <Plus className="h-4 w-4" />
              {isPending ? "Saving..." : "Add Contact"}
            </button>
          </div>
        </section>

        <section className="surface-panel p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-[#3182ce]">
            CSV Tools
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            Import or export contacts
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Use columns `name,email,phone,tags`. For multiple tags, separate them
            with `|` or commas.
          </p>

          <input
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileChange}
            ref={fileInputRef}
            type="file"
          />

          <div className="mt-8 grid gap-4">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#3182ce] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2769a8] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPending}
              onClick={handleUpload}
              type="button"
            >
              <Upload className="h-4 w-4" />
              Upload CSV
            </button>

            <button
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              onClick={downloadCsv}
              type="button"
            >
              <Download className="h-4 w-4" />
              Download Contacts CSV
            </button>

            <div className="surface-muted flex items-start gap-3 px-4 py-4 text-sm text-slate-700">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ebf5ff] text-[#3182ce]">
                <FileUp className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-950">CSV template</p>
                <p className="mt-1 text-slate-600">
                  `name,email,phone,tags`
                </p>
                <p className="mt-1 text-slate-600">
                  `John Doe,john@example.com,+15551234567,vip|newsletter`
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <section className="surface-panel overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ebf5ff] text-[#3182ce]">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">
              Contact directory
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Your current audience for campaigns and outbound messaging.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50/80 text-left text-xs uppercase tracking-[0.2em] text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Phone</th>
                <th className="px-6 py-4 font-medium">Tags</th>
              </tr>
            </thead>
            <tbody>
              {contacts.length === 0 ? (
                <tr>
                  <td className="px-6 py-16 text-center text-sm text-slate-500" colSpan={4}>
                    No contacts yet. Add one manually or upload a CSV.
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className="border-t border-slate-100 text-sm text-slate-700"
                  >
                    <td className="px-6 py-4 font-medium text-slate-950">
                      {contact.name ?? "Unnamed contact"}
                    </td>
                    <td className="px-6 py-4">{contact.email ?? "—"}</td>
                    <td className="px-6 py-4">{contact.phone ?? "—"}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {contact.tags.length === 0 ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          contact.tags.map((tag) => (
                            <span
                              key={`${contact.id}-${tag}`}
                              className="accent-chip inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]"
                            >
                              {tag}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
