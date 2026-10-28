import assert from "node:assert/strict";
import {
  DEMO_PHASE, DIFFICULTIES, PHASES, accuracy, advancePhase, completeTask, currentTarget, formatTime,
  registerKeystroke, resultSummary, startRun, tick,
} from "../src/engine.js";

function typeTarget(state, now = 0) {
  for (const char of currentTarget(state)) registerKeystroke(state, true);
  return completeTask(state, now);
}

assert.equal(PHASES.length, 3, "three distinct phases are required");
assert.deepEqual(PHASES.map((phase) => phase.id), ["intercept", "breach", "capture"]);
assert.ok(PHASES.every((phase) => phase.targets.length >= 7));
assert.ok(PHASES.every((phase) => phase.targets.every((target) => /^[\x20-\x7E]+$/.test(target))), "all targets should be typeable English code");
assert.ok(PHASES.every((phase) => phase.results.length === phase.targets.length), "every command should produce evidence");
assert.deepEqual(Object.keys(DIFFICULTIES), ["demo", "rookie", "operative", "expert"]);
assert.equal(DEMO_PHASE.targets.length, 3);
assert.ok(DEMO_PHASE.targets.every((target) => /^[\x20-\x7E]+$/.test(target)));
const demo = startRun(0, "demo");
assert.equal(currentTarget(demo), "rg 'GHOST' comms.log");
assert.equal(tick(demo, 1000), null, "the presentation run has no timer pressure");
typeTarget(demo, 100);
assert.equal(demo.status, "playing");
assert.equal(demo.intel.relay, "PORT-04");
assert.equal(currentTarget(demo), "SELECT route FROM traffic WHERE plate='GH-09';");
typeTarget(demo, 200);
assert.equal(demo.status, "playing");
assert.equal(currentTarget(demo), "ops.dispatch('UNIT-7', 'B12');");
assert.equal(typeTarget(demo, 300), "phase-complete");
assert.equal(demo.status, "won", "the third correct command captures GHOST");
assert.equal(demo.finishedAt, 300, "completion time is recorded with the final command");
assert.equal(demo.playerProgress, 100);
assert.equal(demo.lastResult.summary, "GHOST taken into custody");
assert.equal(resultSummary(demo, 300).grade, "S");
assert.deepEqual(resultSummary(demo, 300), resultSummary(demo, 13700), "watching the full ending cannot change the result");
assert.equal(resultSummary(demo, 13700).elapsedMs, 300);
assert.equal(resultSummary(demo, 13700).wpm, resultSummary(demo, 300).wpm);

const easyStart = startRun(0, "rookie");
const normalStart = startRun(0);
const hardStart = startRun(0, "expert");
assert.ok(easyStart.timeLeft > normalStart.timeLeft && normalStart.timeLeft > hardStart.timeLeft, "timers should scale by difficulty");
for (const run of [easyStart, normalStart, hardStart]) tick(run, 10);
assert.ok(easyStart.suspectProgress < normalStart.suspectProgress && normalStart.suspectProgress < hardStart.suspectProgress, "escape pressure should scale by difficulty");
for (const run of [easyStart, normalStart, hardStart]) registerKeystroke(run, false);
assert.ok(easyStart.suspectProgress < normalStart.suspectProgress && normalStart.suspectProgress < hardStart.suspectProgress, "mistake pressure should scale by difficulty");
assert.throws(() => startRun(0, "unknown"), /Unknown difficulty/);

function finishFast(difficultyId) {
  const run = startRun(0, difficultyId);
  for (let phaseIndex = 0; phaseIndex < PHASES.length; phaseIndex += 1) {
    while (run.status === "playing") typeTarget(run, phaseIndex * 1000);
    if (run.status === "transition") advancePhase(run, phaseIndex * 1000);
  }
  return run;
}

const easyWin = resultSummary(finishFast("rookie"), 120000);
const normalWin = resultSummary(finishFast("operative"), 120000);
const expertWin = resultSummary(finishFast("expert"), 120000);
assert.deepEqual([easyWin.grade, normalWin.grade, expertWin.grade], ["S", "S", "S"], "each difficulty should permit a top grade");
assert.ok(easyWin.score < normalWin.score && normalWin.score < expertWin.score, "higher difficulty should earn a score bonus");

const state = startRun(0);
assert.equal(state.status, "playing");
assert.equal(currentTarget(state), "tail -n 20 comms.log");
registerKeystroke(state, true);
registerKeystroke(state, false);
assert.equal(accuracy(state), 50);
assert.equal(state.combo, 0);

typeTarget(state, 100);
assert.equal(state.intel.relay, "PORT-04");
assert.match(state.lastResult.lines.join(" "), /signal\.json/);
typeTarget(state, 100);
assert.equal(currentTarget(state), "rg 'PORT-04' relay.log", "the next command should use recovered evidence");
while (state.taskIndex < PHASES[0].targets.length) typeTarget(state, 100);
assert.equal(state.status, "transition", "phase one should transition");
const traceAfterIntercept = state.playerProgress;
const escapeAfterIntercept = state.suspectProgress;
advancePhase(state, 1100);
assert.equal(state.phaseIndex, 1);
assert.equal(state.status, "playing");
assert.equal(state.playerProgress, traceAfterIntercept, "trace progress should continue across phases");
assert.equal(state.suspectProgress, escapeAfterIntercept, "escape progress should continue across phases");
assert.equal(state.elapsedBeforePause, 1000, "phase transition time should not count as active typing time");
assert.equal(currentTarget(state), "SELECT id FROM cameras WHERE zone='EAST';");

while (state.taskIndex < PHASES[1].targets.length) typeTarget(state, 1200);
assert.equal(state.intel.warrant, "CT-0917");
advancePhase(state, 1700);
assert.equal(state.elapsedBeforePause, 1500);
while (state.status === "playing") typeTarget(state, 1800);
assert.equal(state.status, "won", "completing phase three should win");
assert.equal(state.finishedAt, 1800);
assert.equal(resultSummary(state, 15200).elapsedMs, 300, "phase transition time and ending animation are excluded");
assert.equal(state.playerProgress, 100);
assert.equal(state.lastResult.summary, "GHOST taken into custody");
assert.equal(resultSummary(state, 120000).grade, "S");

const slow = startRun(0);
for (let phaseIndex = 0; phaseIndex < PHASES.length; phaseIndex += 1) {
  tick(slow, PHASES[phaseIndex].duration - 1);
  while (slow.status === "playing") typeTarget(slow, phaseIndex * 1000);
  if (slow.status === "transition") advancePhase(slow, phaseIndex * 1000);
}
assert.equal(slow.status, "won");
assert.ok(slow.suspectProgress > 95 && slow.suspectProgress < 100, "slow play should visibly approach escape");
assert.equal(resultSummary(slow, 120000).grade, "A", "time should distinguish an A from a fast S run");

const pressured = startRun(0);
for (let phaseIndex = 0; phaseIndex < PHASES.length; phaseIndex += 1) {
  tick(pressured, PHASES[phaseIndex].duration - 1);
  const remaining = phaseIndex === 2 ? PHASES[phaseIndex].targets.length - 1 : PHASES[phaseIndex].targets.length;
  while (pressured.taskIndex < remaining) typeTarget(pressured, phaseIndex * 1000);
  if (pressured.status === "transition") advancePhase(pressured, phaseIndex * 1000);
}
for (let i = 0; i < 5; i += 1) registerKeystroke(pressured, false);
assert.equal(pressured.status, "lost", "typing mistakes near the deadline should let the suspect escape");

const losing = startRun(0);
assert.equal(tick(losing, PHASES[0].duration + 1), "lost");
assert.equal(losing.status, "lost");
assert.equal(formatTime(65), "01:05");
assert.equal(formatTime(-1), "00:00");

console.log("✓ engine: three-command demo capture, evidence chain, difficulty scaling, grades, win/loss and replay verified");
