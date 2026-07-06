import type { JSX } from 'preact';
import { signal } from '@preact/signals';

interface ToastEntry {
  id: number;
  text: string;
}

const toasts = signal<ToastEntry[]>([]);
let toastId = 0;

export function showToast(text: string, durationMs = 1500): void {
  const id = ++toastId;
  toasts.value = [...toasts.value, { id, text }];
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }, durationMs);
}

export function ToastHost(): JSX.Element {
  return (
    <div class="cl-toasts" role="status" aria-live="polite">
      {toasts.value.map((t) => (
        <div key={t.id} class="cl-toast cl-fade-in">
          {t.text}
        </div>
      ))}
    </div>
  );
}
