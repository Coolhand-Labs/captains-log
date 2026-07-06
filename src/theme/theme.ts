/**
 * Theme boundary: ALL flavor copy (demo ship framing, quips, celebratory text)
 * lives behind this interface. Swapping the Star Trek demo theme for a neutral
 * or custom one means providing another Theme object — no screen code changes.
 */
export interface Theme {
  /** App display name in the header. */
  appName: string;
  /** Ship/organization framing line shown in the header during demo. */
  shipHeader: string;
  landingTagline: string;
  landingDemoCta: string;
  landingConnectCta: string;
  /** Headline pool for the reward screen; one is picked per session. */
  rewardHeadlines: string[];
  /** Rotating quips / Easter eggs for the reward screen. */
  quips: string[];
  submittedToast: string;
  timeUpMessage: string;
  /** Copy for the "fresh items arrived" continue offer. */
  freshItemsPrompt: string;
}
