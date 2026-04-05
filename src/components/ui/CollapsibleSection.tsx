import type { ReactNode } from "react";

interface CollapsibleSectionProps {
  title: ReactNode;
  helperText?: ReactNode;
  open: boolean;
  onToggle: (open: boolean) => void;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
}

function CollapsibleSection({
  title,
  helperText = "Cliquer pour replier ou déplier",
  open,
  onToggle,
  className = "",
  contentClassName = "mt-2",
  children,
}: CollapsibleSectionProps) {
  return (
    <details
      open={open}
      onToggle={(event) => onToggle(event.currentTarget.open)}
      className={[
        "rounded-md border border-border-main/70 bg-[#252525] px-3 py-2",
        className,
      ].join(" ")}
    >
      <summary className='flex cursor-pointer list-none items-center justify-between gap-3 rounded-md text-sm font-semibold text-[#f1f1f1] transition-colors hover:text-accent-cyan'>
        <span className='flex items-center gap-2'>{title}</span>
        <span className='flex items-center gap-2 text-[0.78rem] font-normal text-[#9ea7b3]'>
          <span>{helperText}</span>
          <span aria-hidden='true'>{open ? "▾" : "▸"}</span>
        </span>
      </summary>
      <div className={contentClassName}>{children}</div>
    </details>
  );
}

export default CollapsibleSection;
