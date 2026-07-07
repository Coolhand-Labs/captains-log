import { WIDGET_CAPTURE_URL } from '../config/constants';

/**
 * Capture-to-draft transport (the architectural keystone).
 *
 * coolhand-js widgets are pointed at WIDGET_CAPTURE_URL via the SDK's `apiUrl`
 * init option (see coolhand-adapter.ts) — a reserved-.invalid sentinel that only
 * this wrapper answers. Widget submissions are decoded into the current item's
 * FeedbackDraft and NEVER forwarded; the PRD requires atomic "Submit & Next"
 * (retry without advancing) and "Skip" that sends nothing, so captainslog owns
 * all real submission (services/feedback-encoder.ts). This also makes demo mode
 * zero-network for free.
 *
 * A synthesized success response keeps the widgets' create-then-PATCH lifecycle
 * intact: they store the returned id in data-coolhand-feedback-id and PATCH it on
 * later edits, which routes updates back to the same captured record.
 */

/** Unwrapped `llm_request_log_feedback` body as the widgets send it. */
export interface WidgetWirePayload {
  like?: boolean | null;
  original_output?: string;
  revised_output?: string;
  explanation?: string;
  focus_section?: string;
  focus_range?: { start: number; end: number };
  partial_id?: string;
  client_unique_id?: string;
  creator_unique_id?: string;
  workload_hashid?: string;
  collector?: string;
}

export interface CapturedFeedback {
  kind: 'create' | 'update';
  /** Synthesized numeric id (create) or the id from the PATCH URL (update). */
  feedbackId: number;
  payload: WidgetWirePayload;
}

type CaptureHandler = (captured: CapturedFeedback) => void;

let handler: CaptureHandler | null = null;
let nextId = 1;
let installed = false;

/** The session store registers here; unhandled captures are dropped (safe in demo). */
export function setFeedbackCaptureHandler(h: CaptureHandler | null): void {
  handler = h;
}

async function readBody(input: RequestInfo | URL, init?: RequestInit): Promise<WidgetWirePayload> {
  try {
    const raw =
      init?.body ?? (input instanceof Request ? await input.clone().text() : undefined);
    if (typeof raw !== 'string') return {};
    const parsed = JSON.parse(raw) as { llm_request_log_feedback?: WidgetWirePayload };
    return parsed.llm_request_log_feedback ?? {};
  } catch {
    return {};
  }
}

export function installFeedbackTransport(): void {
  if (installed) return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    // Scoped: only widget traffic to the capture sentinel; everything else —
    // including the encoder's real Coolhand submissions — passes through.
    if (!url.startsWith(WIDGET_CAPTURE_URL)) {
      return originalFetch(input, init);
    }

    const method = (
      init?.method ?? (input instanceof Request ? input.method : 'GET')
    ).toUpperCase();
    const payload = await readBody(input, init);

    const isUpdate = method === 'PATCH';
    const idFromUrl = Number(url.slice(WIDGET_CAPTURE_URL.length).replace(/^\//, ''));
    const feedbackId = isUpdate && Number.isFinite(idFromUrl) ? idFromUrl : nextId++;

    handler?.({ kind: isUpdate ? 'update' : 'create', feedbackId, payload });

    // Shape matches coolhand-js's FeedbackApiResponse so the widget lifecycle
    // (data-coolhand-feedback-id storage, success states) behaves as in production.
    const now = new Date().toISOString();
    return new Response(
      JSON.stringify({ id: feedbackId, like: payload.like ?? null, created_at: now, updated_at: now }),
      { status: isUpdate ? 200 : 201, headers: { 'Content-Type': 'application/json' } },
    );
  };
}
