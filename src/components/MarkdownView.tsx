import type { JSX } from 'preact';
import { useMemo } from 'preact/hooks';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface Props {
  markdown: string;
  class?: string;
}

/** Markdown → sanitized HTML (PRD §9.1: original_output is Markdown). */
export function renderMarkdown(markdown: string): string {
  return DOMPurify.sanitize(marked.parse(markdown, { async: false }));
}

export function MarkdownView({ markdown, class: className }: Props): JSX.Element {
  const html = useMemo(() => renderMarkdown(markdown), [markdown]);
  return (
    <div class={`cl-markdown ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: html }} />
  );
}
