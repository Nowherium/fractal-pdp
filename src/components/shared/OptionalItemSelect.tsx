import Field from "../ui/Field";

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
    <Field label={label}>
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
    </Field>
  );
}

export default OptionalItemSelect;
