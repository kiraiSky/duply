export function DuplyIcon({ size = 28 }: { size?: number }) {
  const s = size / 40;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect x={14 * s / s} y={14 * s / s} width={20 * s / s} height={20 * s / s} rx={4 * s / s} fill="rgba(255,255,255,0.18)" />
      <rect x={6 * s / s} y={6 * s / s} width={20 * s / s} height={20 * s / s} rx={4 * s / s} fill="#25c466" />
    </svg>
  );
}

export function DuplyWordmark({ dark = false }: { dark?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 0 }}>
      <span style={{
        fontFamily: "var(--font-sans)",
        fontSize: 18,
        fontWeight: 800,
        letterSpacing: "-0.04em",
        color: dark ? "var(--gray-900)" : "white",
      }}>Dup</span>
      <span style={{
        fontFamily: "var(--font-sans)",
        fontSize: 18,
        fontWeight: 800,
        letterSpacing: "-0.04em",
        color: "#25c466",
      }}>ly</span>
    </span>
  );
}
