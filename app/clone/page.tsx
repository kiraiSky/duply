"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { TopBar } from "../components/TopBar";
import { Button } from "../components/Button";

type TemplateMeta = {
  name: string;
  exported_at: string;
  pipelines: number;
  fields: number;
  activity_types: number;
  saved_filters?: number;
};

type LogLine = { type: "log" | "error" | "done"; msg?: string; created?: number; skipped?: number };

const logTypeStyle: Record<string, { color: string }> = {
  log: { color: "#9e9e9e" },
  error: { color: "#e63b3b" },
  done: { color: "#25c466" },
};

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
    fetch("/api/templates").then((response) => response.json()).then(setTemplates);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
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
    <>
      <TopBar title="Clonar para Cliente" />
      <div style={{ padding: "28px 24px", maxWidth: 560 }}>
        <p style={{ fontSize: 13, color: "var(--fg-secondary)", marginBottom: 24 }}>
          Selecione um template e replique a estrutura na conta do cliente.
        </p>

        {templates.length === 0 ? (
          <div
            style={{
              background: "#fff7e8",
              border: "1px solid #fde8c0",
              borderRadius: 6,
              padding: "14px 16px",
              fontSize: 13,
              color: "#d9891a",
            }}
          >
            Nenhum template salvo ainda.{" "}
            <Link href="/export" style={{ color: "#2b8fd8", fontWeight: 500 }}>
              Exporte um primeiro.
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="pm-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Field label="Template">
                <select
                  className="pm-input"
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  required
                >
                  <option value="">Selecione...</option>
                  {templates.map((template) => (
                    <option key={template.name} value={template.name}>
                      {template.name} - {template.pipelines} pipelines - {template.fields} campos -{" "}
                      {template.saved_filters ?? 0} filtros
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="API Token do cliente">
                <input
                  type="password"
                  className="pm-input"
                  placeholder="Token da conta destino"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                />
              </Field>

              <Field label="Domínio do cliente">
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="text"
                    className="pm-input"
                    placeholder="clientedominio"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    required
                  />
                  <span style={{ fontSize: 12, color: "var(--fg-muted)", whiteSpace: "nowrap" }}>
                    .pipedrive.com
                  </span>
                </div>
              </Field>

              <Button
                variant="primary"
                type="submit"
                disabled={running}
                style={{ width: "100%", justifyContent: "center" }}
              >
                {running ? "Clonando..." : "Iniciar Clone"}
              </Button>
            </div>
          </form>
        )}

        {log.length > 0 && (
          <div style={{ marginTop: 16, background: "#1a1a1a", borderRadius: 8, overflow: "hidden" }}>
            <div
              style={{
                padding: "10px 14px",
                borderBottom: "1px solid #2a2a2a",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: running ? "#f5a623" : done ? "#25c466" : "#9e9e9e",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#666",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {running ? "em execução..." : done ? "concluído" : "parado"}
              </span>
            </div>
            <div
              ref={logRef}
              style={{
                height: 240,
                overflowY: "auto",
                padding: "12px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              {log.map((line, index) => (
                <div
                  key={index}
                  style={{
                    fontSize: 12,
                    fontFamily: "var(--font-mono)",
                    color: logTypeStyle[line.type]?.color ?? "#9e9e9e",
                    lineHeight: 1.6,
                  }}
                >
                  {line.type === "done"
                    ? `OK clone concluído - ${line.created} criados, ${line.skipped} ignorados`
                    : line.msg}
                </div>
              ))}
            </div>
          </div>
        )}

        {done && (
          <div
            style={{
              marginTop: 12,
              background: "#edfbf3",
              border: "1px solid #a1ebc5",
              borderRadius: 6,
              padding: "12px 14px",
              fontSize: 13,
              color: "#148a43",
              fontWeight: 500,
            }}
          >
            Clone finalizado com sucesso.
          </div>
        )}
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="pm-label">{label}</label>
      {children}
    </div>
  );
}
