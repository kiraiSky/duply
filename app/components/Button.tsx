"use client";

import { useState } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

const variantStyles: Record<Variant, React.CSSProperties> = {
  primary:   { background: "#25c466", color: "white", border: "none" },
  secondary: { background: "white",   color: "#1a1a1a", border: "1px solid #e0e0e0" },
  danger:    { background: "#e63b3b", color: "white", border: "none" },
  ghost:     { background: "transparent", color: "#1a1a1a", border: "none" },
};
const hoverBg: Record<Variant, string> = {
  primary: "#1aad54", secondary: "#f5f5f5", danger: "#c52a2a", ghost: "#f5f5f5",
};
const sizeStyles: Record<Size, React.CSSProperties> = {
  sm: { padding: "5px 10px", fontSize: 12 },
  md: { padding: "7px 14px", fontSize: 13 },
  lg: { padding: "10px 20px", fontSize: 14 },
};

type Props = {
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
  type?: "button" | "submit";
};

export function Button({ variant = "primary", size = "md", disabled, onClick, children, style = {}, type = "button" }: Props) {
  const [hovered, setHovered] = useState(false);
  const v = variantStyles[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        fontFamily: "var(--font-sans)", fontWeight: 600,
        borderRadius: "var(--radius-md)", cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 150ms", opacity: disabled ? 0.45 : 1, whiteSpace: "nowrap",
        ...v, ...sizeStyles[size],
        ...(hovered && !disabled ? { background: hoverBg[variant] } : {}),
        ...style,
      }}
    >
      {children}
    </button>
  );
}
