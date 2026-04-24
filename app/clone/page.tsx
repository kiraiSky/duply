"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

type TemplateMeta = {
  name: string;
  exported_at: string;
  pipelines: number;
  fields: number;
  activity_types: number;
};

type LogLine = { type: "log" | "error" | "done"; msg?: string; created?: number; skipped?: number };

export default function ClonePage() {
  const [templates, setTemplates] = useState<TemplateMeta[]>([]);
  const [selected, setSelected] = useState("");
  const [token, setToken] = useState("");
  const [domain, setDomain] = useState("");
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [log, setLog] = useState<LogLine[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then(setTemplates);
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLog([]);
    setDone(false);
    setRunning(true);

    const res = await fetch("/api/clone", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, domain, templateName: selected }),
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done: streamDone, value } = await reader.read();
      if (streamDone) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const json: LogLine = JSON.parse(line.slice(5).trim());
        setLog((prev) => [...prev, json]);
        if (json.type === "done") setDone(true);
      }
    }

    setRunning(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/" className="text-gray-400 hover:text-gray-700 text-sm">← Início</Link>
      </div>

      <h1 className="text-xl font-bold">Clonar para Cliente</h1>

      {templates.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 text-sm text-yellow-800">
          Nenhum template salvo ainda.{" "}
          <Link href="/export" className="underline">Exporte um primeiro.</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Template</label>
            <select
              className="input"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              required
            >
              <option value="">Selecione...</option>
              {templates.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name} — {t.pipelines} pipelines · {t.fields} campos ·{" "}
                  {t.activity_types} atividades
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">API Token do cliente</label>
            <input
              type="password"
              className="input"
              placeholder="Token da conta destino"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Domínio do cliente</label>
            <div className="flex items-center gap-1">
              <input
                type="text"
                className="input"
                placeholder="clientedominio"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                required
              />
              <span className="text-gray-400 text-sm whitespace-nowrap">.pipedrive.com</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={running}
            className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition"
          >
            {running ? "Clonando..." : "Iniciar Clone"}
          </button>
        </form>
      )}

      {log.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-4 text-sm font-mono">
          <div
            ref={logRef}
            className="h-64 overflow-y-auto space-y-1"
          >
            {log.map((line, i) => (
              <div
                key={i}
                className={
                  line.type === "error"
                    ? "text-red-400"
                    : line.type === "done"
                    ? "text-green-400 font-semibold"
                    : "text-gray-300"
                }
              >
                {line.type === "done"
                  ? `✓ Clone concluído: ${line.created} criados, ${line.skipped} ignorados`
                  : line.msg}
              </div>
            ))}
          </div>
        </div>
      )}

      {done && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-800 text-sm font-medium">
          Clone finalizado com sucesso.
        </div>
      )}
    </div>
  );
}
