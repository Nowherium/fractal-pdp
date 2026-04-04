import type { InputHTMLAttributes } from "react";

type ToggleProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "size"
> & {
  label: string;
  srLabel?: string;
};

function Toggle({
  label,
  srLabel,
  className = "",
  checked,
  disabled,
  ...props
}: ToggleProps) {
  return (
    <label
      className={[
        "inline-flex items-center gap-2 rounded-full border border-border-main bg-[#161616] px-3 py-1.5 text-[0.85rem] text-[#d7e3f4] transition-colors",
        checked ? "border-accent-cyan/60 bg-[#10202a] text-accent-cyan" : "",
        disabled
          ? "cursor-not-allowed opacity-60"
          : "cursor-pointer hover:border-accent-cyan/40",
        className,
      ].join(" ")}
    >
      <span className='relative inline-flex h-5 w-9 items-center'>
        <input
          type='checkbox'
          className='peer sr-only'
          aria-label={srLabel ?? label}
          checked={checked}
          disabled={disabled}
          {...props}
        />
        <span className='absolute inset-0 rounded-full bg-[#2d3748] transition-colors peer-checked:bg-accent-cyan peer-disabled:bg-[#2a2a2a]' />
        <span className='absolute left-[2px] h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4 peer-disabled:bg-[#c0c0c0]' />
      </span>
      <span className='select-none font-medium'>{label}</span>
    </label>
  );
}

export default Toggle;
