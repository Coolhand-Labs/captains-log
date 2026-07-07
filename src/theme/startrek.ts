import type { Theme } from './theme';

export const startrekTheme: Theme = {
  appName: "captain's log",
  shipHeader: 'USS Coolhand · NCC-2047',
  landingTagline:
    'Move from babysitting AI turn-by-turn to reviewing final outputs — one at a time, time-boxed, with feedback that actually improves the process.',
  landingDemoCta: 'Try Demo',
  landingConnectCta: 'Connect Your Data',
  rewardHeadlines: [
    'Captain, the logs have been reviewed.',
    'Stardate secured. Outstanding work, Captain.',
    'The bridge crew salutes your diligence.',
    'Another shift in the captain’s chair, flawlessly logged.',
  ],
  quips: [
    'Engineering reports morale up 12% since you stopped micromanaging the replicators.',
    'Starfleet regulation 42-B: no captain shall review logs for more than two hours a day.',
    'The computer has logged your feedback. Resistance to improvement is futile.',
    'Number One suggests you take the rest of the shift off. You’ve earned it.',
    'Warp core efficiency improves measurably when captains review instead of hover.',
    'Your feedback has been transmitted to Starfleet Command (or, well, your backend).',
  ],
  submittedToast: '✓ Logged',
  timeUpMessage: 'Time’s up, Captain — finish this entry and head to the bridge.',
  freshItemsPrompt: 'New reports have arrived from the away team. Keep reviewing?',
};
