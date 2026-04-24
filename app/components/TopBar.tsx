"use client";

import { useState } from "react";
import { Button } from "./Button";

type Props = {
  title: string;
  action?: { label: string; onClick: () => void };
};

function IconBtn({ icon }: { icon: string }) {
  const [hov, setHov] = useState(false);
  const svgs: Record<string, string> = {
    bell: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
    "help-circle": `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  };
  return (
    <button
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 32, height: 32, border: "1px solid #e0e0e0", borderRadius: 4,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", color: "#666", background: hov ? "#f5f5f5" : "white",
        transition: "background 150ms",
      }}
      dangerouslySetInnerHTML={{ __html: svgs[icon] ?? "" }}
    />
  );
}

export function TopBar({ title, action }: Props) {
  return (
    <div style={{
      height: "var(--topbar-height)",
      background: "white",
      borderBottom: "1px solid #e8e8e8",
      display: "flex", alignItems: "center",
      padding: "0 20px", gap: 12, flexShrink: 0,
    }}>
      <div style={{ flex: 1, fontSize: 16, fontWeight: 600, color: "#1a1a1a" }}>{title}</div>
      <IconBtn icon="bell" />
      <IconBtn icon="help-circle" />
      {action && (
        <Button variant="primary" onClick={action.onClick}>
          + {action.label}
        </Button>
      )}
    </div>
  );
}
