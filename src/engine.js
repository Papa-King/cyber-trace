export const DIFFICULTIES = {
  demo: { label: "Demo", timeMultiplier: 1, escapeMultiplier: 0, errorMultiplier: 0, scoreMultiplier: 1, untimed: true },
  rookie: { label: "Rookie", timeMultiplier: 1.35, escapeMultiplier: 0.7, errorMultiplier: 0.5, scoreMultiplier: 0.85 },
  operative: { label: "Operative", timeMultiplier: 1, escapeMultiplier: 1, errorMultiplier: 1, scoreMultiplier: 1 },
  expert: { label: "Expert", timeMultiplier: 0.72, escapeMultiplier: 1.6, errorMultiplier: 1.7, scoreMultiplier: 1.25 },
};

export const PHASES = [
  {
    id: "intercept",
    title: "Intercept traffic",
    kicker: "PHASE 01 / 03",
    description: "Filter captured logs to locate GHOST's relay. Type each shell command exactly.",
    terminalMode: "SHELL / LOG ANALYSIS",
    duration: 75,
    startPlayer: 12,
    startSuspect: 18,
    progressPerTask: 2.6,
    escapePerTask: 0.5,
    escapeRate: 0.18,
    targets: [
      "tail -n 20 comms.log",
      "grep -i ghost comms.log",
      "rg '{{relay}}' relay.log",
      "sort -u contacts.txt",
      "jq -r '.route' {{packet}}",
      "grep '{{district}}' traffic.log",
      "cut -d, -f2 sightings.csv",
      "sha256sum packet.bin",
    ],
    results: [
      { summary: "Relay PORT-04 identified", lines: ["23:44:09  alias=GHOST", "23:44:12  relay=PORT-04  packet=signal.json"], reveal: { relay: "PORT-04", packet: "signal.json" } },
      { summary: "GHOST linked to the relay", lines: ["GHOST  ->  PORT-04", "cipher packet 0x7FA2 recovered"] },
      { summary: "East district connection found", lines: ["{{relay}}  ->  NEON-04", "sector=EAST  link=LIVE"], reveal: { district: "NEON-04", sector: "EAST" } },
      { summary: "Contact list narrowed", lines: ["NEON-04  /  driver masked", "PORT-04  /  relay live"] },
      { summary: "Escape route decoded", lines: ["EAST  >  B12  >  EXIT-09", "route confidence: 98%"], reveal: { choke: "B12", exit: "EXIT-09" } },
      { summary: "Vehicle found on camera C17", lines: ["C17  /  plate GH-09", "23:47:19  eastbound"], reveal: { camera: "C17", plate: "GH-09" } },
      { summary: "Plate GH-09 corroborated", lines: ["GH-09  /  eastbound", "second sighting matches C17"] },
      { summary: "Packet integrity verified", lines: ["7fa290bc10e4  packet.bin", "INTEGRITY: VERIFIED"] },
    ],
    successTitle: "Relay located",
    successCopy: "The intercepted route points to the east district camera network.",
  },
  {
    id: "breach",
    title: "Query CCTV network",
    kicker: "PHASE 02 / 03",
    description: "Query camera records to rebuild the route. Match case, spaces, and punctuation.",
    terminalMode: "SQL / CAMERA INDEX",
    duration: 90,
    progressPerTask: 3.5,
    escapePerTask: 0.8,
    escapeRate: 0.22,
    targets: [
      "SELECT id FROM cameras WHERE zone='{{sector}}';",
      "SELECT plate FROM sightings WHERE cam='{{camera}}';",
      "SELECT route FROM traffic WHERE plate='{{plate}}';",
      "SELECT time FROM hits WHERE cam='{{camera}}';",
      "SELECT node FROM relays WHERE status='LIVE';",
      "SELECT * FROM alerts WHERE target='GHOST';",
      "SELECT exit_id FROM routes WHERE plate='{{plate}}';",
    ],
    results: [
      { summary: "Camera C17 selected", lines: ["C17  |  NEON-04", "C18  |  SOUTH-11"] },
      { summary: "Plate GH-09 confirmed", lines: ["GH-09  |  cam={{camera}}", "visual match: 98%"] },
      { summary: "Vehicle route reconstructed", lines: ["NEON-04  ->  B12  ->  EXIT-09", "last seen 23:47:19"] },
      { summary: "C17 timestamp confirmed", lines: ["23:47:19  |  cam={{camera}}", "frame status: VALID"] },
      { summary: "Relay remains active", lines: ["PORT-04  |  LIVE", "uplink to city grid confirmed"] },
      { summary: "Field resources authorized", lines: ["CT-0917  |  WARRANT ACTIVE", "UNIT-7  |  DRONE D2 READY"], reveal: { warrant: "CT-0917", unit: "UNIT-7", drone: "D2" } },
      { summary: "Exit 09 is the final route", lines: ["EXIT-09  |  one open lane", "field intercept recommended"] },
    ],
    successTitle: "Camera trail confirmed",
    successCopy: "GHOST's vehicle appears on Neon Avenue. Field units are moving into position.",
  },
  {
    id: "capture",
    title: "Direct the capture",
    kicker: "PHASE 03 / 03",
    description: "Issue dispatch scripts under pressure. Each wrong key buys GHOST more time.",
    terminalMode: "SCRIPT / FIELD OPERATIONS",
    duration: 86,
    progressPerTask: 4,
    escapePerTask: 1.2,
    escapeRate: 0.3,
    targets: [
      "const target = 'GHOST';",
      "ops.verifyWarrant('{{warrant}}');",
      "ops.camera('{{camera}}').track(target);",
      "ops.drone('{{drone}}').follow(target);",
      "ops.dispatch('{{unit}}', '{{choke}}');",
      "ops.block('{{exit}}');",
      "ops.units('SOUTH').hold();",
      "ops.confirm(target, '{{camera}}');",
      "ops.closePerimeter(2);",
      "ops.arrest(target);",
    ],
    results: [
      { summary: "Target variable loaded", lines: ["target=GHOST", "field channel initialized"] },
      { summary: "Warrant verified", lines: ["{{warrant}}  |  VALID", "operation authorized"] },
      { summary: "Camera lock established", lines: ["{{camera}}  |  GHOST in frame", "visual feed: LIVE"] },
      { summary: "Drone D2 tracking", lines: ["{{drone}}  |  altitude stable", "target track: LOCKED"] },
      { summary: "Unit 7 moving to B12", lines: ["{{unit}}  |  en route {{choke}}", "ETA 00:14"] },
      { summary: "Exit 09 sealed", lines: ["{{exit}}  |  BLOCKED", "remaining routes: 1"] },
      { summary: "South team holding", lines: ["SOUTH  |  HOLD", "crossfire risk: LOW"] },
      { summary: "Identity confirmed", lines: ["GHOST  |  confirmed by {{camera}}", "confidence: 99%"] },
      { summary: "Perimeter closed", lines: ["radius=2  |  SEALED", "remaining routes: 0"] },
      { summary: "GHOST taken into custody", lines: ["ARREST CONFIRMED", "case CT-0917  |  CLOSED"] },
    ],
    successTitle: "Target contained",
    successCopy: "The arrest order is confirmed. GHOST has no escape route.",
  },
];

export const DEMO_PHASE = {
  id: "demo",
  title: "Rapid trace",
  kicker: "DEMO RUN / 03 COMMANDS",
  description: "Find the signal, trace the vehicle, and dispatch the intercept team.",
  terminalMode: "SHELL / SIGNAL SEARCH",
  modes: ["SHELL / SIGNAL SEARCH", "SQL / TRAFFIC INDEX", "SCRIPT / FIELD OPS"],
  prompts: [
    "Find GHOST's last camera hit in the intercepted traffic.",
    "Query the vehicle's route from the plate you recovered.",
    "Dispatch the waiting unit to the choke point.",
  ],
  duration: 300,
  startPlayer: 0,
  startSuspect: 80,
  progressPerTask: 33,
  escapePerTask: 0,
  escapeRate: 0,
  targets: [
    "rg 'GHOST' comms.log",
    "SELECT route FROM traffic WHERE plate='{{plate}}';",
    "ops.dispatch('{{unit}}', '{{choke}}');",
  ],
  results: [
    { summary: "GHOST matched on camera C17", lines: ["23:47:19  relay=PORT-04  cam=C17", "plate=GH-09  /  eastbound visual match"], reveal: { relay: "PORT-04", camera: "C17", plate: "GH-09" } },
    { summary: "Route through B12 confirmed", lines: ["GH-09  >  NEON-04  >  B12", "UNIT-7 standing by at the junction"], reveal: { choke: "B12", unit: "UNIT-7" } },
    { summary: "GHOST taken into custody", lines: ["UNIT-7  |  B12  |  INTERCEPT COMPLETE", "GHOST  |  IN CUSTODY"] },
  ],
};

export function createRun(now = 0, difficultyId = "operative") {
  const difficulty = DIFFICULTIES[difficultyId];
  if (!difficulty) throw new Error(`Unknown difficulty: ${difficultyId}`);
  const firstPhase = difficultyId === "demo" ? DEMO_PHASE : PHASES[0];
  return {
    status: "idle",
    difficulty: difficultyId,
    phaseIndex: 0,
    taskIndex: 0,
    timeLeft: Math.round(firstPhase.duration * difficulty.timeMultiplier),
    playerProgress: firstPhase.startPlayer,
    suspectProgress: firstPhase.startSuspect,
    totalTyped: 0,
    correctTyped: 0,
    completedChars: 0,
    combo: 0,
    bestCombo: 0,
    score: 0,
    startedAt: now,
    finishedAt: null,
    elapsedBeforePause: 0,
    phaseStartedAt: now,
    transitionStartedAt: null,
    phaseStats: [],
    intel: {},
    lastResult: null,
  };
}

export function currentPhase(state) { return state.difficulty === "demo" ? DEMO_PHASE : PHASES[state.phaseIndex]; }

export function resolveTemplate(template, intel) {
  return template.replace(/\{\{([a-zA-Z]+)\}\}/g, (placeholder, key) => {
    if (!(key in intel)) throw new Error(`Missing investigation clue: ${key}`);
    return intel[key];
  });
}

export function currentTarget(state) {
  return resolveTemplate(currentPhase(state).targets[state.taskIndex], state.intel);
}

export function startRun(now = performance.now(), difficultyId = "operative") {
  const state = createRun(now, difficultyId);
  state.status = "playing";
  return state;
}

export function accuracy(state) {
  return state.totalTyped === 0 ? 100 : Math.round((state.correctTyped / state.totalTyped) * 100);
}

export function wpm(state, now = performance.now()) {
  const minutes = Math.max(((state.finishedAt ?? now) - state.startedAt - state.elapsedBeforePause) / 60000, 1 / 60);
  return Math.round((state.correctTyped / 5) / minutes);
}

export function registerKeystroke(state, isCorrect) {
  state.totalTyped += 1;
  if (isCorrect) state.correctTyped += 1;
  else {
    state.combo = 0;
    const difficulty = DIFFICULTIES[state.difficulty];
    state.suspectProgress = Math.min(100, state.suspectProgress + 0.7 * difficulty.errorMultiplier);
    state.score = Math.max(0, state.score - Math.round(35 * difficulty.errorMultiplier));
    if (state.suspectProgress >= 100) state.status = "lost";
  }
}

export function completeTask(state, now = performance.now()) {
  if (state.status !== "playing") return "lost";
  const phase = currentPhase(state);
  const difficulty = DIFFICULTIES[state.difficulty];
  const target = currentTarget(state);
  const result = phase.results[state.taskIndex];
  Object.assign(state.intel, result.reveal ?? {});
  state.lastResult = {
    command: target,
    summary: result.summary,
    lines: result.lines.map((line) => resolveTemplate(line, state.intel)),
  };
  state.completedChars += target.length;
  state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.playerProgress = Math.min(99, state.playerProgress + phase.progressPerTask);
  state.suspectProgress = Math.min(100, state.suspectProgress + phase.escapePerTask * difficulty.escapeMultiplier);
  state.score += Math.round(280 + target.length * 12 + state.combo * 35 + (state.timeLeft / difficulty.timeMultiplier) * 2);
  state.taskIndex += 1;
  if (state.suspectProgress >= 100) {
    state.status = "lost";
    return "lost";
  }
  if (state.taskIndex >= phase.targets.length) {
    state.phaseStats.push({ accuracy: accuracy(state), combo: state.bestCombo, timeLeft: state.timeLeft });
    state.status = state.difficulty === "demo" || state.phaseIndex === PHASES.length - 1 ? "won" : "transition";
    if (state.status === "transition") state.transitionStartedAt = now;
    if (state.status === "won") {
      state.finishedAt = now;
      state.playerProgress = 100;
    }
    return "phase-complete";
  }
  return "task-complete";
}

export function advancePhase(state, now = performance.now()) {
  if (state.status !== "transition") return;
  if (state.transitionStartedAt !== null) {
    state.elapsedBeforePause += Math.max(0, now - state.transitionStartedAt);
    state.transitionStartedAt = null;
  }
  state.phaseIndex += 1;
  state.taskIndex = 0;
  const phase = currentPhase(state);
  state.timeLeft = Math.round(phase.duration * DIFFICULTIES[state.difficulty].timeMultiplier);
  state.phaseStartedAt = now;
  state.status = "playing";
}

export function tick(state, deltaSeconds) {
  if (state.status !== "playing") return null;
  if (DIFFICULTIES[state.difficulty].untimed) return null;
  state.timeLeft = Math.max(0, state.timeLeft - deltaSeconds);
  state.suspectProgress = Math.min(100, state.suspectProgress + deltaSeconds * currentPhase(state).escapeRate * DIFFICULTIES[state.difficulty].escapeMultiplier);
  if (state.timeLeft <= 0 || state.suspectProgress >= 100) {
    state.status = "lost";
    return "lost";
  }
  return null;
}

export function resultSummary(state, now = performance.now()) {
  const elapsedMs = Math.max(0, (state.finishedAt ?? now) - state.startedAt - state.elapsedBeforePause);
  const acc = accuracy(state);
  const multiplier = DIFFICULTIES[state.difficulty].scoreMultiplier;
  const baseScore = state.score + (state.status === "won" ? Math.round(acc * 18 + state.bestCombo * 45) : 0);
  const finalScore = Math.round(baseScore * multiplier);
  const grade = state.status !== "won" ? "—" : state.difficulty === "demo" ? "S" :
    baseScore >= 32000 && acc >= 97 ? "S" :
      baseScore >= 27000 && acc >= 90 ? "A" :
        baseScore >= 21000 && acc >= 80 ? "B" : "C";
  return { elapsedMs, accuracy: acc, wpm: wpm(state, now), score: finalScore, grade, bestCombo: state.bestCombo, difficulty: state.difficulty };
}

export function formatTime(seconds) {
  const safe = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}
