import type { Plugin } from 'vite';

/**
 * Dev-server mock of the Coolhand OAuth contract (PRD §9.3, docs/coolhand-issues/04).
 * Coolhand OAuth does not exist yet; this middleware lets the full authorization-code
 * + PKCE flow run end-to-end locally. Serve-only — never part of the build output.
 */
export function mockOAuthPlugin(): Plugin {
  return {
    name: 'captainslog-mock-oauth',
    apply: 'serve',
    configureServer(server) {
      // GET /oauth/authorize → immediately redirect back with a fake code.
      server.middlewares.use('/mock-oauth/authorize', (req, res) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const redirectUri = url.searchParams.get('redirect_uri') ?? '/';
        const state = url.searchParams.get('state') ?? '';
        const location = `${redirectUri}?code=mock-auth-code&state=${encodeURIComponent(state)}`;
        res.statusCode = 302;
        res.setHeader('Location', location);
        res.end();
      });

      // POST /oauth/token → issue a fake bearer token (also handles refresh grant).
      server.middlewares.use('/mock-oauth/token', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            access_token: `mock-access-${Date.now()}`,
            refresh_token: 'mock-refresh-token',
            token_type: 'Bearer',
            expires_in: 3600,
          }),
        );
      });
    },
  };
}
