type OptionalSelectOption = {
  value: number;
  label: string;
};

function OptionalItemSelect({
  label,
  value,
  options,
  noneLabel = "Aucun",
  disabled = false,
  onChange,
}: {
  label: string;
  value: number | "";
  options: OptionalSelectOption[];
  noneLabel?: string;
  disabled?: boolean;
  onChange: (value: number | null) => void;
}) {
  return (
    <label className='flex flex-col gap-2 rounded-[10px] border border-border-main bg-[#141414] p-[14px]'>
      <span className='text-[0.92em] tracking-[0.02em] text-accent-blue'>
        {label}
      </span>
      <select
        className='w-full rounded-lg border border-border-strong bg-[#111] px-3 py-2.5 text-[#f1f1f1]'
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(
            event.target.value === "" ? null : Number(event.target.value),
          )
        }
      >
        <option value=''>{noneLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default OptionalItemSelect;
