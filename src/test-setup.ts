import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/preact';
import * as axeMatchers from 'vitest-axe/matchers';

expect.extend(axeMatchers);

// jsdom does not implement modal dialogs; the AuthModal uses the native
// <dialog> element (Basecoat pattern). Minimal shim for tests.
HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
  this.removeAttribute('open');
  this.dispatchEvent(new Event('close'));
};

afterEach(() => {
  cleanup();
});
