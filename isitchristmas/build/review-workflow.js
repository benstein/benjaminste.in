export const meta = {
  name: 'isitchristmas-review',
  description: 'Adversarial peer review of every shipped algorithm: audit honesty, probe fragility, curate writeup color',
  phases: [{ title: 'Peer review', detail: '3 lenses per algorithm (auditor, fragility, curator)' }],
};

const ALGOS = /*__ALGOS__*/ null; // [{id, name, cohort, derive, file, methodology, flavor}]

function auditorPrompt(a) {
  return `Read /tmp/iic/algos/${a.file}. The node gate has already certified this algorithm passes ~148,000 correctness samples, so do NOT re-test correctness.

Your job is an HONESTY audit. Its registered methodology says: "${a.methodology}". Does the vote() code honestly and accurately do what that says? For derive "${a.derive}":
  - "scratch": confirm it genuinely derives the calendar date from the integer ctx.localMs with arithmetic — no Date, Intl, getters, or string parsing hiding in there.
  - "extract": confirm the exotic part of the method (per its name "${a.name}") is real and is where the interesting work happens, not faked.
  - "intl": confirm it passes timeZone explicitly.

Write {id:${a.id}, honest:boolean, mismatch:(string or null), note:(one dry sentence)} to /tmp/iic/reviews/${a.id}-auditor.json. Then return {id:${a.id}, lens:"auditor", honest:boolean}.`;
}

function fragilityPrompt(a) {
  return `Read /tmp/iic/algos/${a.file}. It is certified correct across 1970..2200 in every real timezone, including December DST zones and leap years. Do NOT re-test that range.

Find this approach's ACHILLES HEEL: the one assumption it leans on hardest, or where it would break if pushed beyond its certified range (pre-1970 negative epoch, years past 2200, Gregorian-only assumptions, floating-point precision, fixed table bounds, recursion depth). Be specific and technical.

Write {id:${a.id}, achillesHeel:(one sentence), severity:("cosmetic"|"beyond-range"|"real")} to /tmp/iic/reviews/${a.id}-fragility.json. severity "real" means you believe it fails somewhere INSIDE the certified range — only claim that if you can name a concrete (localDate, timezone) you expect to fail. Return {id:${a.id}, lens:"fragility", severity:string, counterexample:(string or null)}.`;
}

function curatorPrompt(a) {
  return `Read /tmp/iic/algos/${a.file} — the code, the methodology, and the flavor line. This is algorithm #${a.id} "${a.name}" in the "${a.cohort}" cohort of a parody site that decides whether it's December 25 using 100+ independent algorithms.

Write ONE sharp, dry sentence for a public technical writeup that captures what is clever, elegant, or gloriously cursed about THIS specific way of deciding if it's Christmas. Make it specific to this algorithm, not generic. Voice rules: no emojis, no marketing tone, no "it's not X, it's Y", no forced rule-of-three lists, at most one em-dash. Also rate it one of: "elegant", "clever", "cursed", "unhinged".

Write {id:${a.id}, rating:string, oneLiner:string} to /tmp/iic/reviews/${a.id}-curator.json. Return {id:${a.id}, lens:"curator", rating:string, oneLiner:string}.`;
}

const ACK = { type: 'object', additionalProperties: true, required: ['id', 'lens'], properties: { id: { type: 'number' }, lens: { type: 'string' } } };

phase('Peer review');
log('Peer-reviewing ' + ALGOS.length + ' algorithms with 3 lenses each (' + (ALGOS.length * 3) + ' reviewers)...');

const merged = await parallel(
  ALGOS.map((a) => async () => {
    const [aud, frag, cur] = await parallel([
      () => agent(auditorPrompt(a), { label: 'audit #' + a.id, phase: 'Peer review', schema: ACK, agentType: 'general-purpose' }),
      () => agent(fragilityPrompt(a), { label: 'fragility #' + a.id, phase: 'Peer review', schema: ACK, agentType: 'general-purpose' }),
      () => agent(curatorPrompt(a), { label: 'curate #' + a.id, phase: 'Peer review', schema: ACK, agentType: 'general-purpose' }),
    ]);
    return {
      id: a.id, cohort: a.cohort,
      honest: aud ? aud.honest : null,
      severity: frag ? frag.severity : null,
      counterexample: frag ? frag.counterexample : null,
      rating: cur ? cur.rating : null,
      oneLiner: cur ? cur.oneLiner : null,
    };
  })
);

const valid = merged.filter(Boolean);
const dishonest = valid.filter((r) => r.honest === false);
const realBugs = valid.filter((r) => r.severity === 'real');
log('Review complete. ' + valid.length + ' reviewed, ' + dishonest.length + ' honesty flags, ' + realBugs.length + ' claimed in-range bugs.');

return {
  reviewed: valid.length,
  honestyFlags: dishonest.map((r) => r.id),
  claimedRealBugs: realBugs.map((r) => ({ id: r.id, counterexample: r.counterexample })),
  ratings: valid.reduce((acc, r) => { if (r.rating) acc[r.rating] = (acc[r.rating] || 0) + 1; return acc; }, {}),
  highlights: valid.filter((r) => r.oneLiner).map((r) => ({ id: r.id, cohort: r.cohort, rating: r.rating, oneLiner: r.oneLiner })),
};
