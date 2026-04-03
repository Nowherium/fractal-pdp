type ToastMessage = {
  id: number;
  message: string;
};

function ToastViewport({ toasts }: { toasts: ToastMessage[] }) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      aria-live='polite'
      className='pointer-events-none fixed right-4 top-4 z-50 flex max-w-[min(24rem,calc(100vw-2rem))] flex-col gap-2'
      role='status'
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className='rounded-lg border border-[#2d7a35] bg-[#102814] px-3 py-2 text-[0.9em] font-bold text-[#d7ffd9] shadow-lg'
        >
          ✅ {toast.message}
        </div>
      ))}
    </div>
  );
}

export default ToastViewport;
