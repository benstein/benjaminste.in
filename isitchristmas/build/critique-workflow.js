export const meta = {
  name: 'isitchristmas-critique',
  description: 'Critique the writeup draft across four lenses before it ships',
  phases: [{ title: 'Critique', detail: 'voice-tells, technical accuracy, HN skeptic, konklone credit' }],
};

const DRAFT = '/tmp/iic/writeup/draft.md';

const TELLS = `Ben's anti-LLM-tells rules (the writeup MUST avoid these):
1. Invented day-of-week / time-of-day vignettes used as rhetorical color ("on a Tuesday morning", "it's 11pm and...").
2. Em-dashes as a default device, especially the dramatic-pause-before-payoff and 2-3 per paragraph. One per paragraph max.
3. "It's not X, it's Y" / "X is not Y. It's Z." as a reflex flip. Once per piece max, only when the contrast does real work.
4. Tricolons / rule-of-three for rhythm ("we read it, we sort it, we surface it"). Cut the third item if it's there for cadence.
5. "Not just X, but Y" / "more than just a Z".
6. Rhetorical questions the same sentence answers ("What does this mean? It means X.").
7. Throat-clearing openers ("Here's the thing", "Let me be real", "Honestly", "Look,").
8. "Imagine [cinematic scene]" openers.
9. "Genuinely / honestly / frankly / truly / literally / actually" as emphasis (once per doc max).
10. LLM vocab: delve, tapestry, navigate (figurative), robust, leverage, in the realm of, at its core, underscores, multifaceted, nuanced, ever-evolving, landscape (figurative), journey (figurative), unlock (figurative), elevate, empower, unleash, harness, cutting-edge, seamless, holistic, bespoke, curated, paradigm, ecosystem (figurative).
11. Hedging filler ("it's worth noting that", "it's important to remember").
12. Four+ adjacent sentences with the same grammatical shape.
13. "X. Comma. Pivot." three-short-sentence wrap-ups ("It works. It's reliable. Nobody's excited.").
14. Concluding summaries that restate the piece ("In short", "All told", "The bottom line").`;

const VOICE = {
  type: 'object', additionalProperties: true, required: ['findings'],
  properties: {
    findings: { type: 'array', items: { type: 'object', additionalProperties: true, properties: { quote: { type: 'string' }, tell: { type: 'string' }, fix: { type: 'string' } } } },
    overallVerdict: { type: 'string' },
  },
};
const ACC = {
  type: 'object', additionalProperties: true, required: ['claims'],
  properties: {
    claims: { type: 'array', items: { type: 'object', additionalProperties: true, properties: { claim: { type: 'string' }, status: { type: 'string' }, correction: { type: 'string' } } } },
  },
};
const HN = {
  type: 'object', additionalProperties: true, required: ['predictedTopComments'],
  properties: {
    predictedTopComments: { type: 'array', items: { type: 'string' } },
    overclaims: { type: 'array', items: { type: 'string' } },
    missing: { type: 'array', items: { type: 'string' } },
    strengths: { type: 'array', items: { type: 'string' } },
    frontPageOdds: { type: 'string' },
  },
};
const CREDIT = {
  type: 'object', additionalProperties: true, required: ['creditAdequate'],
  properties: { creditAdequate: { type: 'boolean' }, issues: { type: 'array', items: { type: 'string' } }, suggestions: { type: 'array', items: { type: 'string' } } },
};

phase('Critique');
log('Critiquing the writeup draft across four lenses...');

const [voice, accuracy, hn, credit] = await parallel([
  () => agent(`Read ${DRAFT}. You are a ruthless copy editor enforcing one writer's specific anti-AI-tells rules. Find EVERY instance in the draft that hits one of these tells and quote it exactly with a concrete rewrite.

${TELLS}

Return {findings:[{quote, tell, fix}], overallVerdict}. Be exhaustive and specific; quote real sentences from the draft, not paraphrases.`, { label: 'voice-tells', phase: 'Critique', schema: VOICE, agentType: 'general-purpose' }),

  () => agent(`Read ${DRAFT}. You verify technical and factual accuracy for a public writeup about a site that decides "is it Christmas?" using 121 independent algorithms that vote.

Ground truth you can consult:
  - /tmp/iic/writeup/facts.json (the hard numbers)
  - /tmp/iic/manifest.json (every algorithm's id, name, cohort, derive, methodology, flavor)
  - /Users/ben/Work/benjaminste.in/isitchristmas/algorithms.js and engine.js (the actual shipped code)
  - /tmp/iic/harness.js (the correctness gate); you may run "node /tmp/iic/harness.js --selftest" or test files.

Check every concrete claim in the draft (counts, timings, how the consensus works, the timezone logic, what the gate tests, cohort names/sizes, any named algorithm's behavior). Flag anything wrong, exaggerated, or unverifiable.

Return {claims:[{claim, status:("ok"|"wrong"|"unverifiable"), correction}]}.`, { label: 'accuracy', phase: 'Critique', schema: ACC, agentType: 'general-purpose' }),

  () => agent(`Read ${DRAFT}. You are a jaded, technically sharp Hacker News reader who has seen a thousand "I built X with AI" posts. This post wants the front page.

Predict the actual top comments (supportive AND skeptical). Identify overclaims that would get torn apart, anything important that's missing, and what genuinely lands. Be honest about its front-page odds and what would move them.

Return {predictedTopComments:[...], overclaims:[...], missing:[...], strengths:[...], frontPageOdds}.`, { label: 'hn-skeptic', phase: 'Critique', schema: HN, agentType: 'general-purpose' }),

  () => agent(`Read ${DRAFT}. The site is a tribute to isitchristmas.com by Eric Mill (@konklone on Bluesky: https://bsky.app/profile/konklone.com). Check that Eric Mill is credited generously, accurately, and respectfully, and that the tone never punches down at or mocks the original (the joke is on the over-engineering, not on the original, which is a beloved 15+ year project). Confirm the "open the developer console" nod is framed as homage. Flag anything that reads as taking credit for the original idea.

Return {creditAdequate:boolean, issues:[...], suggestions:[...]}.`, { label: 'konklone-credit', phase: 'Critique', schema: CREDIT, agentType: 'general-purpose' }),
]);

return { voice: voice, accuracy: accuracy, hn: hn, credit: credit };
