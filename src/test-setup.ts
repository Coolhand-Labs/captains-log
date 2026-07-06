import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/preact';
import * as axeMatchers from 'vitest-axe/matchers';

expect.extend(axeMatchers);

afterEach(() => {
  cleanup();
});
