"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DuplyIcon, DuplyWordmark } from "./DuplyLogo";

const navItems = [
  { section: "Main" },
  { id: "export",    href: "/export",    icon: "upload",           label: "Export" },
  { id: "templates", href: "/templates", icon: "layers",           label: "Templates",  badge: null },
  { id: "clone",     href: "/clone",     icon: "copy",             label: "Clone" },
  { section: "Config" },
  // { id: "settings",  href: "/settings",  icon: "settings",        label: "Settings" },
] as const;

const icons: Record<string, string> = {
  upload:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
  layers:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
  copy:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  settings:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
};

function NavIcon({ name }: { name: string }) {
  return <span dangerouslySetInnerHTML={{ __html: icons[name] ?? "" }} style={{ display: "inline-flex", flexShrink: 0 }} />;
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div style={{
      width: "var(--sidebar-width)",
      background: "var(--bg-sidebar)",
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      height: "100vh",
      position: "sticky",
      top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 8 }}>
        <DuplyIcon size={28} />
        <DuplyWordmark />
        <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.35)", marginLeft: 2, marginTop: 2 }}>for Pipedrive</span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
        {navItems.map((item, i) => {
          if ("section" in item) {
            return (
              <div key={i} style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", textTransform: "uppercase", padding: "12px 16px 4px" }}>
                {item.section}
              </div>
            );
          }
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link key={item.id} href={item.href} style={{ textDecoration: "none" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 16px", fontSize: 13, fontWeight: 500,
                color: isActive ? "white" : "rgba(255,255,255,0.65)",
                background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
                cursor: "pointer", transition: "all 150ms",
                borderLeft: isActive ? "3px solid #25c466" : "3px solid transparent",
              }}>
                <NavIcon name={item.icon} />
                <span style={{ flex: 1 }}>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#3d5a75", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "white", flexShrink: 0 }}>
          JD
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>João Dono</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Pro plan</div>
        </div>
      </div>
    </div>
  );
}
