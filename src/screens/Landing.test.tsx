import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/preact';
import { Landing } from './Landing';
import { startrekTheme } from '../theme/startrek';
import { entryPoints, type EntryPoint } from '../config/entry-points';
import { resetSession } from '../state/session';
import { signOut } from '../services/auth/auth';
import * as oauth from '../services/auth/oauth';

const coolhandEntry: EntryPoint = {
  type: 'oauth',
  id: 'coolhand',
  label: 'Sign in with Coolhand',
  authorizeUrl: 'https://coolhandlabs.example/oauth/authorize',
  tokenUrl: 'https://coolhandlabs.example/oauth/token',
  clientId: 'coolhand-client',
  reviewQueueUrl: 'https://coolhandlabs.example/captain/review-queue',
};

const acmeEntry: EntryPoint = {
  type: 'oauth',
  id: 'acme',
  label: 'Sign in with Acme',
  authorizeUrl: 'https://acme.example/oauth/authorize',
  tokenUrl: 'https://acme.example/oauth/token',
  clientId: 'acme-client',
  reviewQueueUrl: 'https://acme.example/captain/review-queue',
};

beforeEach(() => {
  resetSession();
  signOut();
  document.body.innerHTML = '';
  vi.spyOn(oauth, 'beginOAuthLogin').mockResolvedValue();
});

describe('Landing entry points', () => {
  it('renders a button per configured entry point, in order', () => {
    entryPoints.value = [{ type: 'demo' }, coolhandEntry];
    const { getByText } = render(<Landing theme={startrekTheme} />);
    expect(getByText(startrekTheme.landingDemoCta)).toBeTruthy();
    expect(getByText('Sign in with Coolhand')).toBeTruthy();
  });

  it('omits the Try Demo button when the config omits a demo entry', () => {
    entryPoints.value = [coolhandEntry];
    const { queryByText } = render(<Landing theme={startrekTheme} />);
    expect(queryByText(startrekTheme.landingDemoCta)).toBeNull();
  });

  it('clicking each oauth entry begins login with that entry specifically', () => {
    entryPoints.value = [{ type: 'demo' }, coolhandEntry, acmeEntry];
    const { getByText } = render(<Landing theme={startrekTheme} />);

    fireEvent.click(getByText('Sign in with Acme'));
    expect(oauth.beginOAuthLogin).toHaveBeenCalledWith(acmeEntry, false);

    fireEvent.click(getByText('Sign in with Coolhand'));
    expect(oauth.beginOAuthLogin).toHaveBeenCalledWith(coolhandEntry, false);
  });

  it('opens the custom-backend modal from its link', () => {
    entryPoints.value = [{ type: 'demo' }];
    const { getByText } = render(<Landing theme={startrekTheme} />);
    fireEvent.click(getByText(startrekTheme.landingCustomBackendCta));
    expect(getByText('Custom Backend')).toBeTruthy();
  });
});
