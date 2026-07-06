/**
 * Star Trek demo data (PRD §5). Flavor only — swappable with the theme.
 * Raw fixtures DELIBERATELY include forbidden metadata (model, provider,
 * temperature…) to prove sanitizeItem() strips it before anything reaches the UI.
 */

export interface RawDemoItem extends Record<string, unknown> {
  id: string;
  workload_id: string;
  workload_name: string;
  original_output: string;
  prompt: string;
  input_data: unknown;
  created_at: string;
  already_reviewed_by_creator: boolean;
  // Forbidden fields — must never survive sanitization:
  model: string;
  provider: string;
  temperature: number;
  total_tokens: number;
}

interface WorkloadSpec {
  id: string;
  name: string;
  experimental: boolean;
  prompt: string;
  outputs: string[];
  inputData: (i: number) => unknown;
}

const WORKLOADS: WorkloadSpec[] = [
  {
    id: 'engineering-report-generation',
    name: 'Engineering Report Generation',
    experimental: false,
    prompt:
      'Draft a concise engineering maintenance report from the following warp core telemetry. Use headings for Summary, Findings, and Recommendations.',
    inputData: (i) => ({
      system: 'warp_core',
      readings: [
        { sensor: 'plasma_temp_k', value: 1.2e6 + i * 1000 },
        { sensor: 'dilithium_alignment_pct', value: 98.2 - i * 0.3 },
        { sensor: 'coolant_flow_lps', value: 440 + i },
      ],
      shift: i % 3 === 0 ? 'alpha' : i % 3 === 1 ? 'beta' : 'gamma',
    }),
    outputs: [
      `# Warp Core Status\n\n## Summary\nThe warp core is operating within nominal parameters. Plasma temperature holds steady and coolant flow remains consistent across the shift.\n\n## Findings\n- Dilithium crystal alignment measured at **98.2%**, slightly below the 98.5% maintenance threshold.\n- Minor harmonic oscillation detected in the plasma injectors during the beta shift.\n- Coolant flow variance under 0.5% — well within tolerance.\n\n## Recommendations\n1. Schedule dilithium realignment within the next 72 hours.\n2. Monitor injector harmonics for another two shifts before intervention.`,
      `# Warp Core Status\n\n## Summary\nRoutine telemetry review complete. One advisory raised on coolant pump 3.\n\n## Findings\n- Coolant pump 3 shows a 2% efficiency decline over five days.\n- Plasma temperature stable at 1.2 MK.\n- No anomalies in the antimatter containment field.\n\n## Recommendations\n1. Replace coolant pump 3 impeller at next scheduled maintenance.\n2. No further action required.`,
      `# Impulse Engine Diagnostics\n\n## Summary\nPost-refit diagnostics on the impulse assembly completed without critical faults.\n\n## Findings\n- Thrust vectoring response 4ms slower than spec; recalibration advised.\n- Fusion reactor output nominal at 97% rated capacity.\n\n## Recommendations\n1. Recalibrate thrust vector actuators.\n2. Re-run diagnostics after recalibration.`,
    ],
  },
  {
    id: 'captains-daily-brief',
    name: "Captain's Daily Brief",
    experimental: false,
    prompt:
      "Compose the captain's daily briefing from department reports. Keep it under 200 words, lead with anything requiring the captain's decision.",
    inputData: (i) => ({
      stardate: `47${634 + i}.4`,
      departments: ['engineering', 'medical', 'science', 'security'],
      flagged_items: i % 2 === 0 ? ['crew_rotation_approval'] : [],
    }),
    outputs: [
      `# Daily Brief — Stardate 47634.4\n\n**Requires your decision:** Crew rotation for the gamma shift awaits approval; Lt. Torres recommends swapping two engineering ensigns to balance experience.\n\n**Science:** Long-range sensors picked up an unusual subspace signature in the Deneb sector. Analysis continues; no course change recommended yet.\n\n**Medical:** Sickbay reports all crew fit for duty. Annual physicals are 82% complete.\n\n**Security:** No incidents. Routine phaser recertification proceeds on schedule.`,
      `# Daily Brief — Stardate 47635.4\n\n**No decisions pending today.**\n\n**Engineering:** Warp core maintenance window proposed for 1400–1600; no impact on cruise speed.\n\n**Science:** The subspace signature from yesterday resolved into a natural pulsar echo. File closed.\n\n**Medical:** Two minor plasma-burn cases treated and released.\n\n**Security:** Cargo bay 2 inventory audit complete; all items accounted for.`,
      `# Daily Brief — Stardate 47636.1\n\n**Requires your decision:** Starfleet Command requests our ETA at Starbase 214 be moved up 12 hours. Engineering confirms warp 7 is sustainable but recommends against warp 8.\n\n**Science:** Stellar cartography has completed the Deneb sector survey — 14 new objects catalogued.\n\n**Medical & Security:** Nothing to report.`,
    ],
  },
  {
    id: 'away-team-report',
    name: 'Away Team Report',
    experimental: false,
    prompt:
      'Summarize the away mission from the team logs: objective, events, personnel status, and follow-ups. Neutral tone, past tense.',
    inputData: (i) => ({
      mission_id: `AT-${1100 + i}`,
      location: i % 2 === 0 ? 'Vega Colony surface' : 'Derelict freighter SS Corvallen',
      team_size: 4 + (i % 2),
    }),
    outputs: [
      `# Away Mission AT-1100 — Vega Colony\n\n## Objective\nAssess storm damage to the colony's atmospheric processors and deliver medical supplies.\n\n## Events\nThe team beamed down at 0900 and completed the processor inspection in three hours. Two of six units require replacement filtration cores. Medical supplies were delivered to the colony infirmary.\n\n## Personnel\nAll team members returned aboard in good health.\n\n## Follow-ups\n- Fabricate replacement filtration cores (engineering, 2 days).\n- Schedule follow-up delivery within one week.`,
      `# Away Mission AT-1101 — SS Corvallen\n\n## Objective\nInvestigate the drifting freighter's distress beacon and determine crew status.\n\n## Events\nBoarding parties found the vessel abandoned with escape pods launched. The log core was recovered intact. Residual ion trail suggests the pods headed toward the Tellar system.\n\n## Personnel\nNo injuries. Ensign Park reported minor EV-suit malfunction, resolved aboard.\n\n## Follow-ups\n- Decrypt and review the recovered log core.\n- Notify Starfleet of probable pod trajectory.`,
    ],
  },
  {
    id: 'crew-schedule-optimization',
    name: 'Crew Schedule Optimization',
    experimental: true,
    prompt:
      'Given staffing constraints and crew preferences, propose next week’s shift schedule. Explain trade-offs briefly and flag any regulation conflicts.',
    inputData: (i) => ({
      week_of: `2371-W${20 + i}`,
      constraints: { min_bridge_officers: 3, max_consecutive_shifts: 2 },
      preference_submissions: 41 + i,
    }),
    outputs: [
      `# Proposed Shift Schedule — Week 20\n\n## Summary\nAll 42 duty preferences were honored except three conflicts on gamma shift, resolved by seniority.\n\n## Schedule Highlights\n- Bridge: standard 3-officer rotation, no changes.\n- Engineering: Lt. Barclay moved to beta shift per request; coverage maintained.\n- Sickbay: double coverage during the scheduled plasma-conduit maintenance.\n\n## Trade-offs\nEnsign Ro works two consecutive gamma shifts (within regulation limit of two). No regulation conflicts detected.`,
      `# Proposed Shift Schedule — Week 21\n\n## Summary\nSchedule accommodates the Starbase 214 layover; 78% of preferences honored.\n\n## Schedule Highlights\n- Shore-leave rotation staggered across all departments in three blocks.\n- Security maintains full complement during docking operations.\n\n## Trade-offs\n**Flag:** Chief O'Halloran is scheduled for three consecutive shifts on docking day, exceeding the two-shift regulation. Recommend captain's waiver or a swap with Lt. Chen.`,
      `# Proposed Shift Schedule — Week 22\n\n## Summary\nPost-layover normalization week. All preferences honored; no conflicts.\n\n## Schedule Highlights\n- Return to standard alpha/beta/gamma rotation.\n- Two ensigns begin bridge-officer certification rotations.\n\n## Trade-offs\nNone. No regulation conflicts detected.`,
    ],
  },
];

const DAY_MS = 24 * 60 * 60 * 1000;
const ITEMS_PER_WORKLOAD = 12;

export interface DemoWorkloadMeta {
  id: string;
  name: string;
  experimental: boolean;
}

export const demoWorkloads: DemoWorkloadMeta[] = WORKLOADS.map(({ id, name, experimental }) => ({
  id,
  name,
  experimental,
}));

/** Items spread across the trailing 7 days so every time-window option has data. */
export function buildDemoItems(now = Date.now()): RawDemoItem[] {
  const items: RawDemoItem[] = [];
  for (const w of WORKLOADS) {
    for (let i = 0; i < ITEMS_PER_WORKLOAD; i++) {
      const ageMs = (i / ITEMS_PER_WORKLOAD) * 7 * DAY_MS + (i % 5) * 37 * 60 * 1000;
      items.push({
        id: `${w.id}-${i + 1}`,
        workload_id: w.id,
        workload_name: w.name,
        original_output: w.outputs[i % w.outputs.length],
        prompt: w.prompt,
        input_data: w.inputData(i),
        created_at: new Date(now - ageMs).toISOString(),
        // A few pre-reviewed items exercise the dedup filter end-to-end.
        already_reviewed_by_creator: i % 6 === 5,
        model: 'demo-model-do-not-show',
        provider: 'demo-provider-do-not-show',
        temperature: 0.7,
        total_tokens: 1234,
      });
    }
  }
  return items;
}
