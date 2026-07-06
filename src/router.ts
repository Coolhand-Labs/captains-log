import { signal } from '@preact/signals';

export type Route = 'landing' | 'configure' | 'review' | 'reward';

function parse(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').split('?')[0];
  switch (path) {
    case 'configure':
      return 'configure';
    case 'review':
      return 'review';
    case 'reward':
      return 'reward';
    default:
      return 'landing';
  }
}

export const route = signal<Route>(parse(window.location.hash));

window.addEventListener('hashchange', () => {
  route.value = parse(window.location.hash);
});

export function navigate(to: Route): void {
  window.location.hash = to === 'landing' ? '/' : `/${to}`;
  // hashchange doesn't fire when the hash is unchanged (e.g. boot-time redirects).
  route.value = to;
}
