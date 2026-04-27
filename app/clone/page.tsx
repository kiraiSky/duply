"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { TopBar } from "../components/TopBar";
import { Button } from "../components/Button";
import type { Template } from "@/template/schema";
import type { ExportSelection } from "@/exporter";

type TemplateMeta = {
  name: string;
  exported_at: string;
  pipelines: number;
  fields: number;
  activity_types: number;
  saved_filters?: number;
};

type LogLine = { type: "log" | "error" | "done"; msg?: string; created?: number; skipped?: number };

type Step = "form" | "selection" | "running";

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
  const [step, setStep] = useState<Step>("form");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [template, setTemplate] = useState<Template | null>(null);
  const [selection, setSelection] = useState<ExportSelection | null>(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [log, setLog] = useState<LogLine[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/templates").then((r) => r.json()).then(setTemplates);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  async function handleLoadPreview(e: React.FormEvent) {
    e.preventDefault();
    setPreviewError("");
    setLoadingPreview(true);
    try {
      const res = await fetch("/api/clone/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ templateName: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao carregar template");
      setTemplate(data.template);
      setSelection(data.selection);
      setStep("selection");
    } catch (err: unknown) {
      setPreviewError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleClone() {
    setLog([]);
    setDone(false);
    setRunning(true);
    setStep("running");
    const res = await fetch("/api/clone", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, domain, templateName: selected, selection }),
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

  function toggleRef(
    category: keyof Omit<ExportSelection, "custom_fields">,
    ref: string,
  ) {
    if (!selection) return;
    const current = selection[category] as string[];
    const next = current.includes(ref)
      ? current.filter((r) => r !== ref)
      : [...current, ref];
    setSelection({ ...selection, [category]: next });
  }

  function toggleFieldRef(
    entity: keyof ExportSelection["custom_fields"],
    ref: string,
  ) {
    if (!selection) return;
    const current = selection.custom_fields[entity];
    const next = current.includes(ref)
      ? current.filter((r) => r !== ref)
      : [...current, ref];
    setSelection({
      ...selection,
      custom_fields: { ...selection.custom_fields, [entity]: next },
    });
  }

  const totalSelected = selection
    ? selection.pipelines.length +
      Object.values(selection.custom_fields).reduce((a, b) => a + b.length, 0) +
      selection.activity_types.length +
      selection.lead_labels.length +
      selection.saved_filters.length
    : 0;

  return (
    <>
      <TopBar title="Clonar para Cliente" />
      <div style={{ padding: "28px 24px", maxWidth: 600 }}>
        <p style={{ fontSize: 13, color: "var(--fg-secondary)", marginBottom: 24 }}>
          Selecione um template, configure as credenciais do cliente e escolha o que deseja clonar.
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
          <>
            {/* Step 1: Form */}
            <form onSubmit={handleLoadPreview} className="pm-card" style={{ padding: 24 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Field label="Template">
                  <select
                    className="pm-input"
                    value={selected}
                    onChange={(e) => {
                      setSelected(e.target.value);
                      setTemplate(null);
                      setSelection(null);
                      if (step !== "form") setStep("form");
                    }}
                    required
                  >
                    <option value="">Selecione...</option>
                    {templates.map((t) => (
                      <option key={t.name} value={t.name}>
                        {t.name} — {t.pipelines} pipelines · {t.fields} campos ·{" "}
                        {t.saved_filters ?? 0} filtros
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
                  variant="secondary"
                  type="submit"
                  disabled={loadingPreview || step === "running"}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {loadingPreview ? "Carregando..." : "Carregar itens para seleção →"}
                </Button>
              </div>
            </form>

            {previewError && (
              <div
                style={{
                  marginTop: 12,
                  background: "#fdeaea",
                  border: "1px solid #f8c5c5",
                  borderRadius: 6,
                  padding: "12px 14px",
                  fontSize: 13,
                  color: "#c52a2a",
                }}
              >
                {previewError}
              </div>
            )}

            {/* Step 2: Selection funnel */}
            {(step === "selection" || step === "running") && template && selection && (
              <div className="pm-card" style={{ marginTop: 16, padding: 24 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                    marginBottom: 20,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-primary)" }}>
                      O que deseja clonar?
                    </div>
                    <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 4 }}>
                      Marque apenas os itens que devem ser criados na conta do cliente.
                    </div>
                  </div>
                  <div
                    style={{
                      background: "#f0faf4",
                      border: "1px solid #a1ebc5",
                      borderRadius: 8,
                      padding: "8px 14px",
                      textAlign: "center",
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#148a43" }}>
                      {totalSelected}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>selecionados</div>
                  </div>
                </div>

                {/* Pipelines */}
                <CheckSection
                  title="Pipelines e Etapas"
                  items={template.pipelines.map((p) => ({
                    ref: p.ref,
                    label: `${p.name} (${p.stages.length} etapas)`,
                    checked: selection.pipelines.includes(p.ref),
                    onToggle: () => toggleRef("pipelines", p.ref),
                  }))}
                  disabled={step === "running"}
                />

                {/* Custom Fields */}
                {(
                  [
                    ["deal", "Campos — Negócio"],
                    ["person", "Campos — Pessoa"],
                    ["organization", "Campos — Organização"],
                    ["product", "Campos — Produto"],
                    ["lead", "Campos — Lead"],
                  ] as const
                )
                  .filter(([entity]) => template.custom_fields[entity].length > 0)
                  .map(([entity, title]) => {
                    const fields = template.custom_fields[entity] as Array<{ ref: string; name: string }>;
                    const selectedRefs = selection.custom_fields[entity] as string[];
                    return (
                      <CheckSection
                        key={entity}
                        title={title}
                        items={fields.map((f) => ({
                          ref: f.ref,
                          label: f.name,
                          checked: selectedRefs.includes(f.ref),
                          onToggle: () => toggleFieldRef(entity, f.ref),
                        }))}
                        disabled={step === "running"}
                      />
                    );
                  })}

                {/* Activity Types */}
                <CheckSection
                  title="Tipos de Atividade"
                  items={template.activity_types.map((a) => ({
                    ref: a.ref,
                    label: a.name,
                    checked: selection.activity_types.includes(a.ref),
                    onToggle: () => toggleRef("activity_types", a.ref),
                  }))}
                  disabled={step === "running"}
                />

                {/* Lead Labels */}
                <CheckSection
                  title="Labels de Lead"
                  items={(template.lead_labels ?? []).map((l) => ({
                    ref: l.ref,
                    label: l.name,
                    checked: selection.lead_labels.includes(l.ref),
                    onToggle: () => toggleRef("lead_labels", l.ref),
                  }))}
                  disabled={step === "running"}
                />

                {/* Saved Filters */}
                <CheckSection
                  title="Filtros Salvos"
                  hint="Desmarcados por padrão — filtros dependem de outras estruturas existirem."
                  items={(template.saved_filters ?? []).map((f) => ({
                    ref: f.ref,
                    label: f.name,
                    checked: selection.saved_filters.includes(f.ref),
                    onToggle: () => toggleRef("saved_filters", f.ref),
                  }))}
                  disabled={step === "running"}
                />

                {step === "selection" && (
                  <Button
                    variant="primary"
                    type="button"
                    disabled={totalSelected === 0}
                    onClick={handleClone}
                    style={{ width: "100%", justifyContent: "center", marginTop: 20 }}
                  >
                    Iniciar Clone ({totalSelected} itens)
                  </Button>
                )}
              </div>
            )}
          </>
        )}

        {/* Log */}
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
              {log.map((line, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 12,
                    fontFamily: "var(--font-mono)",
                    color: logTypeStyle[line.type]?.color ?? "#9e9e9e",
                    lineHeight: 1.6,
                  }}
                >
                  {line.type === "done"
                    ? `OK clone concluído — ${line.created} criados, ${line.skipped} ignorados`
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

function CheckSection({
  title,
  items,
  hint,
  disabled,
}: {
  title: string;
  items: Array<{ ref: string; label: string; checked: boolean; onToggle: () => void }>;
  hint?: string;
  disabled?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <div style={{ marginTop: 18 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "var(--fg-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      {hint && (
        <div style={{ fontSize: 11, color: "var(--fg-muted)", marginBottom: 8 }}>{hint}</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((item) => (
          <label
            key={item.ref}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              border: "1px solid var(--border-default)",
              borderRadius: 8,
              padding: "9px 12px",
              cursor: disabled ? "default" : "pointer",
              background: item.checked ? "#f5fff8" : "white",
              opacity: disabled ? 0.7 : 1,
            }}
          >
            <input
              type="checkbox"
              checked={item.checked}
              onChange={item.onToggle}
              disabled={disabled}
            />
            <span style={{ fontSize: 13, color: "var(--fg-primary)" }}>{item.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
