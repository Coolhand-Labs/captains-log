import coolhand from 'coolhand';
import type { ReviewItem } from '../types/review';
import { runtimeConfig } from '../config/runtime-config';
import { WIDGET_CAPTURE_URL } from '../config/constants';
import { creatorUniqueId } from '../state/session';

/**
 * Thin lifecycle layer over the coolhand-js singleton (the UMD bundle exposes
 * ONLY its default export — never value-import named exports).
 *
 * Widgets are used purely for capture UI: init() points them at the local
 * capture sentinel via the SDK's `apiUrl` option, and feedback-transport.ts
 * turns their submissions into drafts. The api key passed to init() is inert
 * for widget traffic (real submission auth lives in feedback-encoder.ts).
 *
 * One element cannot host both primitives: partial feedback refuses
 * input/textarea, and edit capture only works ON input/textarea — hence the
 * Review screen's Annotate/Edit mode toggle.
 */

export const PARTIAL_FEEDBACKS_ATTR = 'data-coolhand-partial-feedbacks';
const WIDGET_STYLE_ATTR = 'data-coolhand-widget-style';

let initialized = false;

export function ensureCoolhandInit(): void {
  if (initialized) return;
  initialized = true;
  coolhand.init(runtimeConfig.value.coolhandApiKey || 'captainslog-intercepted', {
    apiUrl: WIDGET_CAPTURE_URL,
    autoAttach: false,
    enableFingerprint: false,
    autoHighlight: false,
    explanationSample: 1,
    colorScheme: 'dark',
    creatorUniqueId: creatorUniqueId(),
  });
}

/** Saved per item so highlights survive Annotate → Edit → Annotate toggles. */
const savedPartialAttrs = new Map<string, string>();

export function attachAnnotate(el: HTMLElement, item: ReviewItem): void {
  ensureCoolhandInit();
  const saved = savedPartialAttrs.get(item.id);
  if (saved) el.setAttribute(PARTIAL_FEEDBACKS_ATTR, saved);
  coolhand.attachPartialFeedback(el, {
    workloadId: item.workload_id,
    clientUniqueId: item.id,
    showSummaryPixel: false,
    explanationSample: 1,
  });
}

export function detachAnnotate(el: HTMLElement, item: ReviewItem): void {
  const attr = el.getAttribute(PARTIAL_FEEDBACKS_ATTR);
  if (attr) savedPartialAttrs.set(item.id, attr);
  coolhand.detachPartialFeedback(el);
}

export function attachEdit(el: HTMLTextAreaElement, item: ReviewItem): void {
  ensureCoolhandInit();
  // Hidden style: no widget chrome, but debounced revised_output capture stays on.
  el.setAttribute(WIDGET_STYLE_ATTR, 'hidden');
  coolhand.attach(el, {
    workloadId: item.workload_id,
    clientUniqueId: item.id,
  });
}

export function detachEdit(el: HTMLElement): void {
  coolhand.detach(el);
}

export function clearSavedPartials(itemId: string): void {
  savedPartialAttrs.delete(itemId);
}
