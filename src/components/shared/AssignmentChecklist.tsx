type AssignmentChecklistItem = {
  id: number;
  label: string;
  checked: boolean;
  disabled?: boolean;
};

function AssignmentChecklist({
  items,
  onToggle,
  emptyText,
}: {
  items: AssignmentChecklistItem[];
  onToggle: (itemId: number, checked: boolean) => void;
  emptyText?: string;
}) {
  if (items.length === 0) {
    return emptyText ? <p>{emptyText}</p> : null;
  }

  return (
    <div className='flex flex-col gap-2'>
      {items.map((item) => (
        <label
          key={item.id}
          className='flex items-center gap-2 rounded-lg border border-border-soft bg-soft-bg px-3 py-2'
        >
          <input
            type='checkbox'
            className='h-4 w-4 accent-green-500'
            checked={item.checked}
            disabled={item.disabled}
            onChange={(event) => onToggle(item.id, event.target.checked)}
          />
          <span className={item.disabled ? "opacity-70" : undefined}>
            {item.label}
          </span>
        </label>
      ))}
    </div>
  );
}

export default AssignmentChecklist;
