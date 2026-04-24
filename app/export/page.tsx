"use client";

import { useState } from "react";
import Link from "next/link";

type Result = { name: string; pipelines: number; fields: number; activity_types: number };

export default function ExportPage() {
  const [token, setToken] = useState("");
  const [domain, setDomain] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    const res = await fetch("/api/export", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, domain, name }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Erro desconhecido");
    } else {
      setResult(data);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/" className="text-gray-400 hover:text-gray-700 text-sm">← Início</Link>
      </div>

      <h1 className="text-xl font-bold">Exportar Template</h1>

      <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-6 space-y-4">
        <Field label="API Token da conta de origem" htmlFor="token">
          <input
            id="token"
            type="password"
            className="input"
            placeholder="1a2b3c..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
          />
        </Field>

        <Field label="Domínio Pipedrive" htmlFor="domain">
          <div className="flex items-center gap-1">
            <input
              id="domain"
              type="text"
              className="input"
              placeholder="suaempresa"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              required
            />
            <span className="text-gray-400 text-sm whitespace-nowrap">.pipedrive.com</span>
          </div>
        </Field>

        <Field label="Nome do template" htmlFor="name">
          <input
            id="name"
            type="text"
            className="input"
            placeholder="crm-vendas"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Field>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {loading ? "Exportando..." : "Exportar"}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 space-y-2">
          <p className="font-semibold text-green-800">✓ Template exportado: {result.name}</p>
          <ul className="text-sm text-green-700 space-y-1">
            <li>{result.pipelines} pipeline(s)</li>
            <li>{result.fields} campo(s) customizado(s)</li>
            <li>{result.activity_types} tipo(s) de atividade</li>
          </ul>
          <Link
            href="/clone"
            className="inline-block mt-2 text-sm text-blue-600 hover:underline"
          >
            → Clonar para um cliente
          </Link>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
    </div>
  );
}
