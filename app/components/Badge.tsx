type BadgeStatus = "active" | "syncing" | "pending" | "error" | "paused" | "beta";

const styles: Record<BadgeStatus, { bg: string; color: string; dot: string }> = {
  active:  { bg: "#edfbf3", color: "#148a43", dot: "#25c466" },
  syncing: { bg: "#eaf4fd", color: "#2075b8", dot: "#2b8fd8" },
  pending: { bg: "#fff7e8", color: "#d9891a", dot: "#f5a623" },
  error:   { bg: "#fdeaea", color: "#c52a2a", dot: "#e63b3b" },
  paused:  { bg: "#f5f5f5", color: "#444",    dot: "#9e9e9e" },
  beta:    { bg: "#f2eefd", color: "#6438c2", dot: "#7b4fd8" },
};

export function Badge({ status, label }: { status: BadgeStatus; label: string }) {
  const s = styles[status] ?? styles.paused;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11, fontWeight: 600, borderRadius: 50,
      padding: "3px 9px", background: s.bg, color: s.color,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
      {label}
    </span>
  );
}
