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

/** Basecoat toaster anatomy; lifecycle stays Preact-managed (no Basecoat JS). */
export function ToastHost(): JSX.Element {
  return (
    <div class="toaster">
      {toasts.value.map((t) => (
        <div
          key={t.id}
          class="toast cl-fade-in"
          role="status"
          aria-atomic="true"
          data-category="success"
        >
          <div class="toast-content">
            <section>
              <h2>{t.text}</h2>
            </section>
          </div>
        </div>
      ))}
    </div>
  );
}
