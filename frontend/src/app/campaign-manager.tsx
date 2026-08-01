"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type CampaignStatus = "PENDING" | "PROCESSING" | "SENT" | "FAILED";

type Campaign = {
  id: string;
  subject: string;
  message: string;
  recipientEmail: string;
  status: CampaignStatus;
  errorMessage: string | null;
  createdAt: string;
};

type CampaignForm = {
  subject: string;
  message: string;
  recipientEmail: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const initialForm: CampaignForm = { subject: "", message: "", recipientEmail: "" };

const statusStyles: Record<CampaignStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-600/20",
  PROCESSING: "bg-sky-50 text-sky-700 ring-sky-600/20",
  SENT: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  FAILED: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

const statusLabels: Record<CampaignStatus, string> = {
  PENDING: "Na fila",
  PROCESSING: "Enviando",
  SENT: "Enviado",
  FAILED: "Falhou",
};

export function CampaignManager() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [form, setForm] = useState<CampaignForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadCampaigns = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/campaigns`, { cache: "no-store" });
      if (!response.ok) throw new Error("Não foi possível carregar as campanhas.");

      const data: { campaigns: Campaign[] } = await response.json();
      setCampaigns(data.campaigns);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Erro ao carregar campanhas.");
    }
  }, []);

  useEffect(() => {
    const initialLoadId = window.setTimeout(() => void loadCampaigns(), 0);
    const intervalId = window.setInterval(() => void loadCampaigns(), 2_000);
    return () => {
      window.clearTimeout(initialLoadId);
      window.clearInterval(intervalId);
    };
  }, [loadCampaigns]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`${API_URL}/api/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data: { error?: string } = await response.json();

      if (!response.ok) throw new Error(data.error ?? "Não foi possível criar a campanha.");

      setForm(initialForm);
      setNotice("Campanha adicionada à fila de envio.");
      await loadCampaigns();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erro ao criar campanha.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <p className="mb-2 text-sm font-semibold tracking-widest text-indigo-600 uppercase">RenderLab</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Campanhas de e-mail</h1>
          <p className="mt-2 text-slate-600">
            Cadastre o envio e acompanhe o processamento da fila em tempo real.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Nova campanha</h2>
          <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            <label className="grid gap-1.5 text-sm font-medium">
              Assunto
              <input required value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none ring-indigo-500 focus:ring-2" placeholder="Novidades da semana" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              E-mail do destinatário
              <input required type="email" value={form.recipientEmail} onChange={(event) => setForm({ ...form, recipientEmail: event.target.value })} className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none ring-indigo-500 focus:ring-2" placeholder="cliente@exemplo.com" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
              Mensagem
              <textarea required rows={4} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} className="resize-y rounded-lg border border-slate-300 px-3 py-2.5 outline-none ring-indigo-500 focus:ring-2" placeholder="Escreva a mensagem da campanha." />
            </label>
            <div className="flex items-center gap-3 sm:col-span-2">
              <button disabled={isSubmitting} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
                {isSubmitting ? "Adicionando..." : "Adicionar à fila"}
              </button>
              {notice && <p className="text-sm text-emerald-700">{notice}</p>}
              {error && <p className="text-sm text-rose-700">{error}</p>}
            </div>
          </form>
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold">Campanhas enviadas</h2>
            <span className="text-sm text-slate-500">Atualiza a cada 2 segundos</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-3 font-medium">Assunto</th>
                  <th className="px-6 py-3 font-medium">Destinatário</th>
                  <th className="px-6 py-3 font-medium">Criada em</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td className="max-w-64 px-6 py-4">
                      <p className="truncate font-medium">{campaign.subject}</p>
                      <p className="truncate text-slate-500">{campaign.message}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{campaign.recipientEmail}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(campaign.createdAt))}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusStyles[campaign.status]}`}>
                        {statusLabels[campaign.status]}
                      </span>
                      {campaign.errorMessage && <p className="mt-1 max-w-48 text-xs text-rose-600">{campaign.errorMessage}</p>}
                    </td>
                  </tr>
                ))}
                {campaigns.length === 0 && (
                  <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-500">Nenhuma campanha cadastrada.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
