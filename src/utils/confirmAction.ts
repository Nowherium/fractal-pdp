export function confirmAction(message: string, action: () => void) {
  if (window.confirm(message)) {
    action();
  }
}
