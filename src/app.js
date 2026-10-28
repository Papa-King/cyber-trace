import {
  DIFFICULTIES, PHASES, accuracy, advancePhase, completeTask, currentPhase, currentTarget,
  formatTime, registerKeystroke, resultSummary, startRun, tick, wpm,
} from "./engine.js?v=finish-time-1";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const screens = { start: $("#start-screen"), game: $("#game-screen"), result: $("#result-screen") };
const introScreen = $("#intro-screen");
const introBeats = [
  { kicker: "CONTROL / RADIO", title: "Unauthorized relay on Neon-04.", feed: "RELAY / LIVE" },
  { kicker: "EYE IN SKY / LIVE", title: "GHOST is moving eastbound.", feed: "VEHICLE / VISUAL" },
  { kicker: "CONTROL / TO YOU", title: "Trace his route. Units are standing by.", feed: "FIELD LINK / READY" },
];
const introBeatDurations = [2800, 2800, 3200];
const introDuration = introBeatDurations.reduce((total, duration) => total + duration, 0);
const input = $("#game-input");
const targetText = $("#target-text");
const feedback = $("#input-feedback");
const inputWrap = $(".input-wrap");
let state = null;
let lastFrame = 0;
let raf = 0;
let soundEnabled = true;
let motionEnabled = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let pausedAt = 0;
let lastInputLength = 0;
let audioContext = null;
let hudAccumulator = 0;
let introTimers = [];
let introProgressFrame = 0;
let introStartTime = 0;
let successTimers = [];

function showScreen(name) {
  Object.entries(screens).forEach(([key, element]) => { element.hidden = key !== name; });
}

function clearIntro() {
  introTimers.forEach(clearTimeout);
  introTimers = [];
  cancelAnimationFrame(introProgressFrame);
  introScreen.hidden = true;
  setIntroProgress(0);
}

function clearSuccessSequence() {
  successTimers.forEach(clearTimeout);
  successTimers = [];
  const sequence = $("#success-sequence");
  sequence.hidden = true;
  sequence.classList.remove("is-playing", "is-secured", "is-static");
  sequence.dataset.shot = "map";
}

function setSuccessMoment(index) {
  const moments = [
    { shot: "map", feed: "SATELLITE / EAST GRID", status: "LIVE TRACE / PORT-04", title: "Closing on B12.", subtitle: "Following GHOST's signal across the city grid.", target: "SIGNAL ACTIVE" },
    { shot: "map", feed: "B12 / TARGET FIXED", status: "LAST LOCATION / CONFIRMED", title: "Target located.", subtitle: "Camera C17 places GHOST at the junction.", target: "LOCKED" },
    { shot: "wide", feed: "CAM C17 / LIVE VISUAL", status: "VISUAL CONTACT / 23:47", title: "GHOST in sight.", subtitle: "Black sedan stopped. UNIT-7 moving in.", target: "VISUAL CONFIRMED" },
    { shot: "close", feed: "UNIT-7 / CUSTODY CONFIRMED", status: "INTERCEPT COMPLETE / CASE CLOSED", title: "GHOST secured.", subtitle: "The suspect is in custody.", target: "IN CUSTODY" },
  ];
  const moment = moments[index];
  $("#success-feed").textContent = moment.feed;
  $("#success-status").textContent = moment.status;
  $("#success-title").textContent = moment.title;
  $("#success-subtitle").textContent = moment.subtitle;
  $("#success-target-state").textContent = moment.target;
  $("#success-sequence").dataset.shot = moment.shot;
  $("#success-sequence").classList.toggle("is-secured", index === moments.length - 1);
}

function openSuccessSequence() {
  cancelAnimationFrame(raf);
  clearSuccessSequence();
  const sequence = $("#success-sequence");
  sequence.hidden = false;
  document.documentElement.dataset.scene = "secured";
  $("#success-skip").focus();
  if (!motionEnabled) {
    sequence.classList.add("is-static");
    setSuccessMoment(3);
    return;
  }
  sequence.classList.add("is-playing");
  setSuccessMoment(0);
  successTimers.push(setTimeout(() => setSuccessMoment(1), 3300));
  successTimers.push(setTimeout(() => setSuccessMoment(2), 5100));
  successTimers.push(setTimeout(() => setSuccessMoment(3), 9200));
  successTimers.push(setTimeout(() => showResult(true), 13400));
}

function setIntroProgress(percent) {
  const value = Math.max(0, Math.min(100, Math.floor(percent)));
  $("#intro-progress-fill").style.width = `${value}%`;
  $("#intro-progress-label").textContent = `${value}%`;
  $(".intro-progress").setAttribute("aria-valuenow", String(value));
}

function updateIntroProgress(now) {
  const percent = ((now - introStartTime) / introDuration) * 100;
  setIntroProgress(percent);
  if (percent < 100 && !introScreen.hidden) introProgressFrame = requestAnimationFrame(updateIntroProgress);
}

function setIntroBeat(index) {
  introScreen.dataset.step = String(index);
  const beat = introBeats[index];
  $("#intro-kicker").textContent = beat.kicker;
  $("#intro-title").textContent = beat.title;
  $("#intro-feed-line").textContent = beat.feed;
  $("#intro-continue").hidden = motionEnabled || index !== introBeats.length - 1;
  if (motionEnabled) {
    $(".intro-caption").animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 180, easing: "ease-out" });
    if (index > 0) $(".intro-cut-flash").animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: 180, easing: "ease-out" });
  }
}

function openIntro() {
  clearIntro();
  introScreen.hidden = false;
  document.documentElement.dataset.scene = "intro";
  $("#intro-skip").focus();
  if (!motionEnabled) { setIntroBeat(introBeats.length - 1); setIntroProgress(100); $("#intro-continue").focus(); return; }
  setIntroBeat(0);
  introStartTime = performance.now();
  introProgressFrame = requestAnimationFrame(updateIntroProgress);
  let elapsed = 0;
  for (let index = 1; index < introBeats.length; index += 1) {
    elapsed += introBeatDurations[index - 1];
    introTimers.push(setTimeout(() => setIntroBeat(index), elapsed));
  }
  introTimers.push(setTimeout(() => {
    setIntroProgress(100);
    introTimers.push(setTimeout(startGame, 700));
  }, introDuration));
}

function beep(type = "key") {
  if (!soundEnabled) return;
  try {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const map = { key: [540, .018, .018], success: [760, .06, .04], error: [150, .07, .035], win: [880, .16, .055] };
    const [frequency, duration, volume] = map[type];
    osc.frequency.value = frequency;
    osc.type = type === "error" ? "sawtooth" : "sine";
    gain.gain.setValueAtTime(volume, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + duration);
    osc.connect(gain).connect(audioContext.destination);
    osc.start(); osc.stop(audioContext.currentTime + duration);
  } catch { /* Audio feedback is optional. */ }
}

function startGame() {
  clearIntro();
  clearSuccessSequence();
  cancelAnimationFrame(raf);
  state = startRun(performance.now(), $('input[name="difficulty"]:checked').value);
  lastFrame = performance.now();
  lastInputLength = 0;
  hudAccumulator = 0;
  showScreen("game");
  $("#result-screen").classList.remove("failure");
  $("#transition-screen").hidden = true;
  $("#pause-screen").hidden = true;
  setupPhase();
  addLog("CASE ACTIVE", "Secure trace established");
  input.focus();
  raf = requestAnimationFrame(loop);
}

function returnToStart() {
  clearIntro();
  clearSuccessSequence();
  cancelAnimationFrame(raf);
  state = null;
  document.documentElement.dataset.scene = "idle";
  $("#map-coordinate").textContent = "51° / EAST GRID\nTRACKING: ACTIVE";
  showScreen("start");
  $("#start-button").focus();
}

function setupPhase() {
  const phase = currentPhase(state);
  const isDemo = state.difficulty === "demo";
  const mapScene = isDemo ? "intercept" : phase.id;
  document.documentElement.dataset.scene = mapScene;
  $("#map-coordinate").textContent = {
    intercept: "51° / EAST GRID\nRELAY SCAN: ACTIVE",
    breach: "51° / EAST GRID\nCCTV GRID: LIVE",
    capture: "51° / EAST GRID\nPERIMETER: CLOSING",
  }[mapScene];
  $("#phase-kicker").textContent = isDemo ? phase.kicker : `${phase.kicker} · ${DIFFICULTIES[state.difficulty].label.toUpperCase()}`;
  $("#phase-title").textContent = phase.title;
  $("#phase-description").textContent = phase.description;
  $("#terminal-mode").textContent = phase.terminalMode;
  $(".timer-block span").textContent = isDemo ? "NO TIME LIMIT" : "TIME LEFT";
  $("#log-list").innerHTML = "";
  addLog(`PHASE ${state.phaseIndex + 1}`, phase.title);
  prepareTask();
  updateHUD(performance.now());
}

function prepareTask() {
  input.value = "";
  lastInputLength = 0;
  feedback.textContent = "Awaiting input…";
  feedback.className = "input-feedback";
  inputWrap.classList.remove("error");
  renderOutput();
  renderTarget("");
  const phase = currentPhase(state);
  const isDemo = state.difficulty === "demo";
  const stageIndex = isDemo ? state.taskIndex : state.phaseIndex;
  $$(".stage-node").forEach((node, index) => {
    node.classList.toggle("active", index === stageIndex);
    node.classList.toggle("done", index < stageIndex);
  });
  $$(".stage-line").forEach((line, index) => line.classList.toggle("done", index < stageIndex));
  if (isDemo) {
    document.documentElement.dataset.scene = ["intercept", "breach", "capture"][stageIndex];
    $("#phase-description").textContent = phase.prompts[stageIndex];
    $("#terminal-mode").textContent = phase.modes[stageIndex];
  }
  $("#task-count").textContent = `COMMAND ${state.taskIndex + 1} / ${phase.targets.length}`;
  updateHUD(performance.now());
}

function renderOutput() {
  const result = state.lastResult;
  $("#output-status").textContent = result ? "DECODED" : "AWAITING DATA";
  $("#output-lines").textContent = result ? result.lines.join("\n") : "No evidence yet. Run the command below.";
}

function renderTarget(typed) {
  const target = currentTarget(state);
  if (!target) return;
  targetText.textContent = "";
  [...target].forEach((char, index) => {
    const span = document.createElement("span");
    span.textContent = char;
    if (index < typed.length) span.className = typed[index] === char ? "typed" : "wrong";
    else if (index === typed.length) span.className = "current";
    else span.className = "pending";
    targetText.append(span);
  });
}

function handleInput() {
  if (!state || state.status !== "playing") return;
  const typed = input.value;
  const target = currentTarget(state);
  if (typed.length > lastInputLength) {
    for (let i = lastInputLength; i < typed.length; i += 1) registerKeystroke(state, typed[i] === target[i]);
  }
  if (state.status === "lost") { showResult(false); return; }
  lastInputLength = typed.length;
  const validPrefix = target.startsWith(typed);
  inputWrap.classList.toggle("error", !validPrefix);
  feedback.className = `input-feedback${validPrefix ? "" : " error"}`;
  feedback.textContent = validPrefix ? `${typed.length} / ${target.length} characters matched` : "Input mismatch — correct the line to continue";
  renderTarget(typed);
  beep(validPrefix ? "key" : "error");
  updateHUD(performance.now());
  if (typed === target) {
    const outcome = completeTask(state, performance.now());
    beep("success");
    addLog("EVIDENCE", state.lastResult.summary);
    if (outcome === "lost") showResult(false);
    else if (outcome === "phase-complete") handlePhaseComplete();
    else prepareTask();
  }
}

function handlePhaseComplete() {
  cancelAnimationFrame(raf);
  if (state.status === "won") { openSuccessSequence(); return; }
  const phase = currentPhase(state);
  $("#transition-title").textContent = phase.successTitle;
  $("#transition-copy").textContent = phase.successCopy;
  $("#transition-accuracy").textContent = `${accuracy(state)}%`;
  $("#transition-combo").textContent = String(state.bestCombo);
  $("#transition-screen").hidden = false;
  $("#continue-button").focus();
}

function continueGame() {
  if (!state || state.status !== "transition") return;
  advancePhase(state, performance.now());
  $("#transition-screen").hidden = true;
  lastFrame = performance.now();
  setupPhase();
  input.focus();
  raf = requestAnimationFrame(loop);
}

function togglePause() {
  if (!state || !["playing", "paused"].includes(state.status)) return;
  if (state.status === "playing") {
    state.status = "paused";
    pausedAt = performance.now();
    cancelAnimationFrame(raf);
    $("#pause-screen").hidden = false;
    $("#resume-button").focus();
  } else {
    state.elapsedBeforePause += performance.now() - pausedAt;
    state.status = "playing";
    $("#pause-screen").hidden = true;
    lastFrame = performance.now();
    input.focus();
    raf = requestAnimationFrame(loop);
  }
}

function loop(now) {
  if (!state || state.status !== "playing") return;
  const delta = Math.min((now - lastFrame) / 1000, .1);
  lastFrame = now;
  const outcome = tick(state, delta);
  hudAccumulator += delta;
  if (hudAccumulator >= .1 || outcome) {
    updateHUD(now);
    hudAccumulator = 0;
  }
  if (outcome === "lost") showResult(false);
  else raf = requestAnimationFrame(loop);
}

function updateHUD(now) {
  if (!state) return;
  const isDemo = state.difficulty === "demo";
  $("#timer").textContent = isDemo ? "∞" : formatTime(state.timeLeft);
  $(".timer-block").classList.toggle("danger", !isDemo && state.timeLeft < 10);
  $("#wpm").textContent = wpm(state, now);
  $("#accuracy").textContent = `${accuracy(state)}%`;
  $("#combo").textContent = `×${state.combo}`;
  const player = Math.round(state.playerProgress);
  const suspect = Math.round(state.suspectProgress);
  $("#player-percent").textContent = `${player}%`;
  $("#suspect-percent").textContent = `${suspect}%`;
  $("#player-bar").style.width = `${player}%`;
  $("#suspect-bar").style.width = `${suspect}%`;
  $("#police-marker").style.left = `${8 + player * .78}%`;
  $("#suspect-marker").style.left = `${8 + suspect * .78}%`;
  $("#trace-path").style.strokeDasharray = `${Math.max(6, player - 8)} ${108 - Math.max(6, player - 8)}`;
  $("#city-trace-route").style.strokeDasharray = `${Math.min(100, Math.round(20 + player * .8))} 100`;
  const meters = Math.max(0, Math.round((100 - player) * 8 + Math.max(0, suspect - player) * 6));
  $("#distance-label").textContent = player >= 95 ? "INTERCEPT READY" : `GAP ${meters}m`;
}

function addLog(label, message) {
  const list = $("#log-list");
  const item = document.createElement("li");
  const elapsed = state ? Math.floor(((state.finishedAt ?? performance.now()) - state.startedAt - state.elapsedBeforePause) / 1000) : 0;
  item.innerHTML = `<time>${formatTime(elapsed)}</time><span><strong>${escapeHTML(label)}</strong> · ${escapeHTML(message)}</span>`;
  list.prepend(item);
  while (list.children.length > 4) list.lastElementChild.remove();
}

function showResult(won) {
  cancelAnimationFrame(raf);
  clearSuccessSequence();
  state.status = won ? "won" : "lost";
  const summary = resultSummary(state, performance.now());
  showScreen("result");
  document.documentElement.dataset.scene = won ? "secured" : "escaped";
  $("#map-coordinate").textContent = won ? "51° / EAST GRID\nTARGET: SECURED" : "51° / EAST GRID\nSIGNAL: LOST";
  $("#result-screen").classList.toggle("failure", !won);
  $("#result-kicker").textContent = won ? "CASE CLOSED // TARGET SECURED" : "TRACE LOST // TARGET ESCAPED";
  $("#result-title").textContent = won ? "Target secured" : "Trace lost";
  $("#result-copy").textContent = won ? (state.difficulty === "demo" ? "GHOST's route was traced and UNIT-7 completed the intercept." : "GHOST's digital trail is locked. The city grid is secure.") : "GHOST slipped beyond camera range. Reset your pace and establish a new trace.";
  const difficulty = DIFFICULTIES[state.difficulty];
  $("#final-difficulty").textContent = state.difficulty === "demo" ? "DEMO · 3 COMMANDS" : `${difficulty.label.toUpperCase()} · ${difficulty.scoreMultiplier}× SCORE`;
  $("#final-score").textContent = summary.score.toLocaleString("en-US");
  $("#final-grade").textContent = summary.grade;
  $("#final-wpm").textContent = summary.wpm;
  $("#final-accuracy").textContent = `${summary.accuracy}%`;
  $("#final-combo").textContent = summary.bestCombo;
  $("#final-time").textContent = formatTime(summary.elapsedMs / 1000);
  beep(won ? "win" : "error");
  $("#replay-button").focus();
}

function escapeHTML(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

$("#start-button").addEventListener("click", openIntro);
$("#intro-skip").addEventListener("click", startGame);
$("#intro-continue").addEventListener("click", startGame);
$("#success-skip").addEventListener("click", () => showResult(true));
$("#continue-button").addEventListener("click", continueGame);
$("#resume-button").addEventListener("click", togglePause);
$("#replay-button").addEventListener("click", startGame);
$("#difficulty-button").addEventListener("click", returnToStart);
$$('input[name="difficulty"]').forEach((option) => option.addEventListener("change", () => {
  const descriptions = {
    demo: "Three commands to capture GHOST · no time limit",
    rookie: "More time · slower escape · lighter mistake penalty",
    operative: "Balanced pursuit · standard timing",
    expert: "Less time · faster escape · heavier mistake penalty",
  };
  $("#difficulty-description").textContent = descriptions[option.value];
}));
input.addEventListener("input", handleInput);
$("#sound-toggle").addEventListener("click", (event) => {
  soundEnabled = !soundEnabled;
  event.currentTarget.setAttribute("aria-pressed", String(soundEnabled));
  event.currentTarget.setAttribute("aria-label", soundEnabled ? "Mute sound" : "Enable sound");
});
$("#motion-toggle").addEventListener("click", (event) => {
  motionEnabled = !motionEnabled;
  document.documentElement.dataset.motion = motionEnabled ? "full" : "reduced";
  event.currentTarget.setAttribute("aria-pressed", String(motionEnabled));
  event.currentTarget.setAttribute("aria-label", motionEnabled ? "Reduce motion" : "Enable motion");
});
document.addEventListener("keydown", (event) => {
  if (!$("#success-sequence").hidden) {
    if (event.key === "Tab") { event.preventDefault(); $("#success-skip").focus(); }
    else if (event.key === "Escape" || (event.key === "Enter" && !(event.target instanceof HTMLButtonElement))) { event.preventDefault(); showResult(true); }
    return;
  }
  if (!introScreen.hidden) {
    if (event.key === "Tab") {
      const controls = $("#intro-continue").hidden ? [$("#intro-skip")] : [$("#intro-skip"), $("#intro-continue")];
      const current = controls.indexOf(document.activeElement);
      controls[(current + (event.shiftKey ? controls.length - 1 : 1)) % controls.length].focus();
      event.preventDefault();
      return;
    }
    if (event.key === "Escape") { event.preventDefault(); startGame(); }
    else if (event.key === "Enter" && !(event.target instanceof HTMLButtonElement)) startGame();
    return;
  }
  if (event.key === "Escape" && state && ["playing", "paused"].includes(state.status)) { event.preventDefault(); togglePause(); return; }
  if (event.key === "Enter") {
    if (event.target instanceof HTMLButtonElement) return;
    if (!screens.start.hidden) openIntro();
    else if (!$("#transition-screen").hidden) continueGame();
    else if (!screens.result.hidden) startGame();
  }
});

if (!motionEnabled) {
  document.documentElement.dataset.motion = "reduced";
  $("#motion-toggle").setAttribute("aria-pressed", "false");
  $("#motion-toggle").setAttribute("aria-label", "Enable motion");
}

document.documentElement.dataset.scene = "idle";
window.__CYBER_TRACE__ = { PHASES, getState: () => state, startGame, showResult };
