import Toggle from "../ui/Toggle";

type ExchangeModeToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

function ExchangeModeToggle({ checked, onChange }: ExchangeModeToggleProps) {
  return (
    <div
      className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${
        checked
          ? "border-accent-cyan/40 bg-[#0f1d24]"
          : "border-[#5a3a24] bg-[#221814]"
      }`}
    >
      <div className='flex flex-wrap items-center gap-2'>
        <Toggle
          label='échange ville <=> persos'
          srLabel='Activer les échanges entre la ville et les persos'
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className='text-[0.82rem] text-[#c4ceda]'>
          {checked
            ? "Le stock perso est transféré depuis/vers la ville."
            : "Les stocks perso sont modifiés localement, sans échange avec la ville."}
        </span>
      </div>

      <span
        aria-live='polite'
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.78rem] font-semibold ${
          checked
            ? "bg-[#12343a] text-[#7ee0ea]"
            : "bg-[#4a2418] text-[#ffbe98]"
        }`}
      >
        {checked ? (
          <>✅ Mode actif</>
        ) : (
          <>
            <span role='img' aria-label='warning'>
              ⚠️
            </span>
            Mode inactif
          </>
        )}
      </span>
    </div>
  );
}

export default ExchangeModeToggle;
