import type { LabelHTMLAttributes, ReactNode } from "react";

function Field({
  label,
  className = "",
  children,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement> & {
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <label
      className={[
        "flex flex-col gap-2 rounded-[10px] border border-border-main bg-[#141414] p-[14px]",
        className,
      ].join(" ")}
      {...props}
    >
      <span className='text-[0.92em] tracking-[0.02em] text-accent-blue'>
        {label}
      </span>
      {children}
    </label>
  );
}

export default Field;
