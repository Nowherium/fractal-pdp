import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant =
  | "primary"
  | "success"
  | "danger"
  | "muted"
  | "tab"
  | "tab-active";

type ButtonSize = "sm" | "md";

const variantClassNames: Record<ButtonVariant, string> = {
  primary: "border-none bg-accent-cyan text-page hover:bg-accent-cyan-dark",
  success: "border-none bg-[#4caf50] text-white hover:bg-[#45a049]",
  danger: "border-none bg-[#f44336] text-white hover:bg-[#d32f2f]",
  muted: "border-none bg-[#555] text-white hover:bg-[#777]",
  tab: "border border-solid border-border-softest bg-table-bg text-white hover:bg-input-bg",
  "tab-active":
    "border border-solid border-border-softest bg-accent-cyan text-black",
};

const sizeClassNames: Record<ButtonSize, string> = {
  sm: "px-2 py-1 text-[0.9em]",
  md: "px-2.5 py-1.5 text-[0.95em]",
};

function Button({
  variant = "primary",
  size = "sm",
  className = "",
  children,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}) {
  return (
    <button
      type={type}
      className={[
        "mt-[5px] cursor-pointer rounded-[3px] font-bold disabled:cursor-not-allowed disabled:opacity-60",
        sizeClassNames[size],
        variantClassNames[variant],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
