"use client";

import Link from "next/link";
import { TopBar } from "./components/TopBar";

const cards = [
  {
    href: "/export",
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
    title: "Exportar Template",
    desc: "Conecte a conta de origem e salve a estrutura como template reutilizável.",
    accent: "#25c466",
    accentBg: "#edfbf3",
  },
  {
    href: "/templates",
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
    title: "Templates",
    desc: "Visualize, edite e gerencie os templates salvos.",
    accent: "#7b4fd8",
    accentBg: "#f2eefd",
  },
  {
    href: "/clone",
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
    title: "Clonar para Cliente",
    desc: "Escolha um template e replique para a conta do cliente.",
    accent: "#2b8fd8",
    accentBg: "#eaf4fd",
  },
];

export default function Home() {
  return (
    <>
      <TopBar title="Dashboard" />
      <div style={{ padding: "28px 24px", maxWidth: 860 }}>
        <p style={{ fontSize: 13, color: "var(--fg-secondary)", marginBottom: 24 }}>
          Clone pipelines, campos e atividades do Pipedrive em segundos.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {cards.map((c) => (
            <Link key={c.href} href={c.href} style={{ textDecoration: "none" }}>
              <div className="pm-card" style={{
                padding: "20px",
                cursor: "pointer",
                transition: "box-shadow 150ms, border-color 150ms",
              }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = c.accent;
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.10)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--border-default)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-sm)";
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: c.accentBg, color: c.accent,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 14,
                }} dangerouslySetInnerHTML={{ __html: c.icon }} />
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-primary)", marginBottom: 6 }}>{c.title}</div>
                <div style={{ fontSize: 13, color: "var(--fg-secondary)", lineHeight: 1.5 }}>{c.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
