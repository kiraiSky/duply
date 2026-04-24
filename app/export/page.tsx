"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TopBar } from "../components/TopBar";
import { Button } from "../components/Button";

type Option = { ref: string; label: string };
type Field = {
  ref: string;
  name: string;
  field_type: string;
  field_group_id?: number | null;
  field_group_name?: string | null;
  options?: Option[];
};
type Pipeline = { ref: string; name: string; stages: Array<{ ref: string; name: string }> };
type ActivityType = { ref: string; name: string; icon_key: string; color?: string | null };
type LeadLabel = { ref: string; name: string; color: string };
type SavedFilter = { ref: string; name: string; type: string };

type TemplatePreview = {
  version: "1.0";
  exported_at: string;
  pipelines: Pipeline[];
  custom_fields: {
    deal: Field[];
    person: Field[];
    organization: Field[];
    product: Field[];
    lead: Field[];
  };
  activity_types: ActivityType[];
  lead_labels: LeadLabel[];
  saved_filters: SavedFilter[];
};

type ExportSelection = {
  pipelines: string[];
  custom_fields: {
    deal: string[];
    person: string[];
    organization: string[];
    product: string[];
    lead: string[];
  };
  activity_types: string[];
  lead_labels: string[];
  saved_filters: string[];
};

type PreviewResult = {
  template: TemplatePreview;
  selection: ExportSelection;
};

type SaveResult = {
  name: string;
  pipelines: number;
  fields: number;
  activity_types: number;
  saved_filters: number;
};

type ExportCategories = {
  pipelines: boolean;
  fields_deal: boolean;
  fields_person: boolean;
  fields_org: boolean;
  fields_product: boolean;
  fields_lead: boolean;
  activity_types: boolean;
  lead_labels: boolean;
  filters: boolean;
};

const DEFAULT_CATEGORIES: ExportCategories = {
  pipelines: true,
  fields_deal: true,
  fields_person: true,
  fields_org: true,
  fields_product: true,
  fields_lead: false,
  activity_types: true,
  lead_labels: true,
  filters: false,
};

const CATEGORY_LABELS: { key: keyof ExportCategories; label: string; hint?: string }[] = [
  { key: "pipelines", label: "Pipelines e etapas" },
  { key: "fields_deal", label: "Campos de Negócio" },
  { key: "fields_person", label: "Campos de Pessoa" },
  { key: "fields_org", label: "Campos de Organização" },
  { key: "fields_product", label: "Campos de Produto" },
  { key: "fields_lead", label: "Campos de Lead" },
  { key: "activity_types", label: "Tipos de atividade" },
  { key: "lead_labels", label: "Lead labels" },
  { key: "filters", label: "Filtros salvos", hint: "Lento — faz uma chamada por filtro" },
];

const ENTITY_LABELS: Record<keyof TemplatePreview["custom_fields"], string> = {
  deal: "Negócio",
  person: "Pessoa",
  organization: "Organização",
  product: "Produto",
  lead: "Lead",
};

export default function ExportPage() {
  const [token, setToken] = useState("");
  const [domain, setDomain] = useState("");
  const [name, setName] = useState("");
  const [categories, setCategories] = useState<ExportCategories>(DEFAULT_CATEGORIES);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<TemplatePreview | null>(null);
  const [selection, setSelection] = useState<ExportSelection | null>(null);
  const [result, setResult] = useState<SaveResult | null>(null);

  const selectedStats = useMemo(() => {
    if (!selection) return null;
    return {
      pipelines: selection.pipelines.length,
      fields: Object.values(selection.custom_fields).flat().length,
      activity_types: selection.activity_types.length,
      saved_filters: selection.saved_filters.length,
    };
  }, [selection]);

  async function loadPreview(e: React.FormEvent) {
    e.preventDefault();
    setPreviewLoading(true);
    setError("");
    setResult(null);

    const res = await fetch("/api/export/preview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, domain, categories }),
    });
    const data = (await res.json()) as PreviewResult | { error?: string };
    setPreviewLoading(false);

    if (!res.ok || !("template" in data)) {
      setError(("error" in data && data.error) || "Erro ao carregar itens");
      return;
    }

    setPreview(data.template);
    setSelection(data.selection);
  }

  async function saveTemplate() {
    if (!preview || !selection) return;
    setSaving(true);
    setError("");
    setResult(null);

    const res = await fetch("/api/export", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, template: preview, selection }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Erro ao exportar");
      return;
    }

    setResult(data);
  }

  function toggleList<K extends keyof ExportSelection>(key: K, ref: string) {
    if (!selection) return;
    const current = selection[key];
    if (!Array.isArray(current)) return;
    const next = current.includes(ref) ? current.filter((item) => item !== ref) : [...current, ref];
    setSelection({ ...selection, [key]: next });
  }

  function renameGroup(entity: keyof TemplatePreview["custom_fields"], currentName: string, newName: string) {
    if (!preview || !newName.trim() || newName === currentName) return;
    setPreview({
      ...preview,
      custom_fields: {
        ...preview.custom_fields,
        [entity]: preview.custom_fields[entity].map((f) =>
          (f.field_group_name ?? "Sem grupo") === currentName
            ? { ...f, field_group_name: newName.trim() }
            : f,
        ),
      },
    });
  }

  function toggleField(entity: keyof ExportSelection["custom_fields"], ref: string) {
    if (!selection) return;
    const current = selection.custom_fields[entity];
    setSelection({
      ...selection,
      custom_fields: {
        ...selection.custom_fields,
        [entity]: current.includes(ref)
          ? current.filter((item) => item !== ref)
          : [...current, ref],
      },
    });
  }

  return (
    <>
      <TopBar title="Exportar Template" />
      <div style={{ padding: "28px 24px", maxWidth: 860 }}>
        <p style={{ fontSize: 13, color: "var(--fg-secondary)", marginBottom: 24 }}>
          Conecte a conta de origem, carregue os itens do CRM e escolha o que entra no template.
          Tudo vem marcado por padrão, exceto os filtros.
        </p>

        <form onSubmit={loadPreview} className="pm-card" style={{ padding: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Field label="API Token da conta de origem">
              <input
                type="password"
                className="pm-input"
                placeholder="1a2b3c..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              />
            </Field>

            <Field label="Domínio Pipedrive">
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="text"
                  className="pm-input"
                  placeholder="suaempresa"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  required
                />
                <span style={{ fontSize: 12, color: "var(--fg-muted)", whiteSpace: "nowrap" }}>
                  .pipedrive.com
                </span>
              </div>
            </Field>

            <Field label="Nome do template">
              <input
                type="text"
                className="pm-input"
                placeholder="crm-vendas"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>

            <div>
              <label className="pm-label" style={{ marginBottom: 8, display: "block" }}>O que exportar</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
                {CATEGORY_LABELS.map(({ key, label, hint }) => (
                  <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", color: "var(--fg-primary)" }}>
                    <input
                      type="checkbox"
                      checked={categories[key]}
                      onChange={(e) => setCategories({ ...categories, [key]: e.target.checked })}
                    />
                    <span>{label}{hint && <span style={{ fontSize: 11, color: "var(--fg-muted)", marginLeft: 4 }}>({hint})</span>}</span>
                  </label>
                ))}
              </div>
            </div>

            <Button
              variant="secondary"
              type="submit"
              disabled={previewLoading || saving}
              style={{ width: "100%", justifyContent: "center" }}
            >
              {previewLoading ? "Carregando..." : "Carregar itens para seleção"}
            </Button>
          </div>
        </form>

        {error && (
          <div
            style={{
              marginTop: 16,
              background: "#fdeaea",
              border: "1px solid #f8c5c5",
              borderRadius: 6,
              padding: "12px 14px",
              fontSize: 13,
              color: "#c52a2a",
            }}
          >
            {error}
          </div>
        )}

        {preview && selection && (
          <div className="pm-card" style={{ marginTop: 16, padding: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                marginBottom: 18,
              }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-primary)" }}>
                  Selecione o conteúdo do template
                </div>
                <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 4 }}>
                  Tipos de atividade agora vêm todos da conta. Filtros começam desmarcados por padrão.
                </div>
              </div>
              {selectedStats && (
                <div style={{ display: "flex", gap: 16 }}>
                  {[
                    { label: "Pipelines", value: selectedStats.pipelines },
                    { label: "Campos", value: selectedStats.fields },
                    { label: "Atividades", value: selectedStats.activity_types },
                    { label: "Filtros", value: selectedStats.saved_filters },
                  ].map((stat) => (
                    <div key={stat.label} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#148a43" }}>{stat.value}</div>
                      <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Section
              title={`Pipelines (${preview.pipelines.length})`}
              items={preview.pipelines.map((pipeline) => ({
                ref: pipeline.ref,
                label: `${pipeline.name} · ${pipeline.stages.length} etapa(s)`,
                checked: selection.pipelines.includes(pipeline.ref),
                onToggle: () => toggleList("pipelines", pipeline.ref),
              }))}
            />

            <div style={{ marginTop: 18, fontSize: 12, color: "var(--fg-muted)", background: "#fffbea", border: "1px solid #f5e49a", borderRadius: 6, padding: "8px 12px" }}>
              ⚠ A API do Pipedrive não expõe nomes de grupos — os campos aparecem como "Grupo N". Clique no nome do grupo para renomeá-lo antes de exportar. A organização dos grupos não é clonável e precisa ser refeita manualmente na conta destino.
            </div>
            {(["deal", "person", "organization", "product", "lead"] as const).map((entity) => (
              <FieldGroupSection
                key={entity}
                title={`Campos de ${ENTITY_LABELS[entity]} (${preview.custom_fields[entity].length})`}
                fields={preview.custom_fields[entity]}
                selectedRefs={selection.custom_fields[entity]}
                onToggle={(ref) => toggleField(entity, ref)}
                onRenameGroup={(currentName, newName) => renameGroup(entity, currentName, newName)}
              />
            ))}

            <Section
              title={`Tipos de atividade (${preview.activity_types.length})`}
              items={preview.activity_types.map((activityType) => ({
                ref: activityType.ref,
                label: activityType.name,
                checked: selection.activity_types.includes(activityType.ref),
                onToggle: () => toggleList("activity_types", activityType.ref),
              }))}
            />

            <Section
              title={`Lead labels (${preview.lead_labels.length})`}
              items={preview.lead_labels.map((leadLabel) => ({
                ref: leadLabel.ref,
                label: leadLabel.name,
                checked: selection.lead_labels.includes(leadLabel.ref),
                onToggle: () => toggleList("lead_labels", leadLabel.ref),
              }))}
            />

            <Section
              title={`Filtros (${preview.saved_filters.length})`}
              hint="Desmarcado por padrão porque filtros dependem mais de contexto."
              items={preview.saved_filters.map((filter) => ({
                ref: filter.ref,
                label: `${filter.name} · ${filter.type}`,
                checked: selection.saved_filters.includes(filter.ref),
                onToggle: () => toggleList("saved_filters", filter.ref),
              }))}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
              <Button variant="primary" onClick={saveTemplate} disabled={saving || !name.trim()}>
                {saving ? "Exportando..." : "Exportar seleção"}
              </Button>
            </div>
          </div>
        )}

        {result && (
          <div
            style={{
              marginTop: 16,
              background: "#edfbf3",
              border: "1px solid #a1ebc5",
              borderRadius: 6,
              padding: "16px 18px",
            }}
          >
            <div style={{ fontWeight: 600, color: "#148a43", marginBottom: 10 }}>
              Template exportado: {result.name}
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              {[
                { label: "Pipelines", value: result.pipelines },
                { label: "Campos", value: result.fields },
                { label: "Atividades", value: result.activity_types },
                { label: "Filtros", value: result.saved_filters },
              ].map((stat) => (
                <div key={stat.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#148a43" }}>{stat.value}</div>
                  <div style={{ fontSize: 11, color: "#1aad54" }}>{stat.label}</div>
                </div>
              ))}
            </div>
            <Link
              href="/clone"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                marginTop: 14,
                fontSize: 13,
                color: "#2b8fd8",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              → Clonar para um cliente
            </Link>
          </div>
        )}
      </div>
    </>
  );
}

function FieldGroupSection({
  title,
  fields,
  selectedRefs,
  onToggle,
  onRenameGroup,
}: {
  title: string;
  fields: Field[];
  selectedRefs: string[];
  onToggle: (ref: string) => void;
  onRenameGroup: (currentName: string, newName: string) => void;
}) {
  if (fields.length === 0) return null;

  const groups = fields.reduce<Array<{ name: string; items: Field[] }>>((acc, field) => {
    const groupName = field.field_group_name?.trim() || "Sem grupo";
    const existing = acc.find((g) => g.name === groupName);
    if (existing) existing.items.push(field);
    else acc.push({ name: groupName, items: [field] });
    return acc;
  }, []);

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-muted)", marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {groups.map((group) => (
          <div key={group.name}>
            <GroupNameEditor name={group.name} onRename={(newName) => onRenameGroup(group.name, newName)} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {group.items.map((field) => (
                <label
                  key={field.ref}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    border: "1px solid var(--border-default)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    cursor: "pointer",
                    background: selectedRefs.includes(field.ref) ? "#f5fff8" : "white",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedRefs.includes(field.ref)}
                    onChange={() => onToggle(field.ref)}
                  />
                  <span style={{ fontSize: 13, color: "var(--fg-primary)" }}>
                    {field.name} · {field.field_type}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GroupNameEditor({ name, onRename }: { name: string; onRename: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);

  function commit() {
    setEditing(false);
    onRename(value);
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setValue(name); setEditing(false); } }}
        style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-secondary)", border: "none", borderBottom: "1px solid #25c466", outline: "none", background: "transparent", marginBottom: 8, padding: "0 2px", width: "100%", fontFamily: "var(--font-sans)" }}
      />
    );
  }

  return (
    <button
      onClick={() => { setValue(name); setEditing(true); }}
      title="Clique para renomear o grupo"
      style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 8, fontFamily: "var(--font-sans)" }}
    >
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-secondary)" }}>{name}</span>
      <span style={{ fontSize: 10, color: "#aaa" }}>✎</span>
    </button>
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

function Section({
  title,
  items,
  hint,
}: {
  title: string;
  items: Array<{ ref: string; label: string; checked: boolean; onToggle: () => void }>;
  hint?: string;
}) {
  if (items.length === 0) return null;

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-muted)", marginBottom: 8 }}>
        {title}
      </div>
      {hint && <div style={{ fontSize: 12, color: "var(--fg-muted)", marginBottom: 8 }}>{hint}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item) => (
          <label
            key={item.ref}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              border: "1px solid var(--border-default)",
              borderRadius: 8,
              padding: "10px 12px",
              cursor: "pointer",
              background: item.checked ? "#f5fff8" : "white",
            }}
          >
            <input type="checkbox" checked={item.checked} onChange={item.onToggle} />
            <span style={{ fontSize: 13, color: "var(--fg-primary)" }}>{item.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
