"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";

type Verdict = "SEALED" | "SURVIVES" | "DISPUTED";
type Phase = "edit" | "attack" | "verdict" | "record";
type Source = "PROGRAMME TEST" | "COUNTER-READING";
type Token = { id: string; text: string; area: string; punctuation?: boolean; editablePunctuation?: boolean };
type Patch = {
  id: string;
  label: string;
  area: string;
  slot: string;
  order?: number;
  tags: string[];
  whisper: string;
  hidesTokens?: string[];
  punctuation?: boolean;
  breaksTask?: string;
};
type Attack = {
  id: string;
  title: string;
  move: string;
  opening: string;
  sealTags: string[];
  disputeTags?: string[];
  area: string;
  source: Source;
  ruling?: "WORDING FAILURE" | "CONTESTANT CHEEK" | "GREG OVERRIDE" | "CONTESTED";
  rulingNote?: string;
};
type TaskDefinition = {
  id: string;
  number: string;
  file: string;
  short: string;
  tokens: Token[];
  supportLine: string;
  areas: Record<string, { cursor: string; prompt: string }>;
  slots: Record<string, { anchor: string; placement: "before" | "after" }>;
  patches: Patch[];
  attacks: Attack[];
  weirdTargets: string[];
  weirdMap: Record<string, string>;
  programmeRecord: string;
};
type Claim = { patchId: string; verdict: "SEALED" };
type Outcome = { verdict: Verdict; message: string; patchId?: string; label?: string };
type Snapshot = { label: string; patches: string[] };

const CAMEL: TaskDefinition = {
  id: "camel",
  number: "01",
  file: "task-01.camel.mt",
  short: "Get this camel through the smallest gap.",
  tokens: [
    { id: "get", text: "Get", area: "passage" },
    { id: "this", text: "this", area: "object" },
    { id: "camel", text: "camel", area: "object" },
    { id: "through", text: "through", area: "passage" },
    { id: "the", text: "the", area: "gap" },
    { id: "smallest", text: "smallest", area: "gap" },
    { id: "gap", text: "gap", area: "gap" },
    { id: "period", text: ".", area: "gap", punctuation: true },
  ],
  supportLine: "You have 10 minutes. Your time starts now.",
  areas: {
    object: { cursor: "CAMEL", prompt: "Change what must remain true of the camel." },
    passage: { cursor: "THROUGH", prompt: "Change which thing must do the moving." },
    gap: { cursor: "GAP", prompt: "Change which opening is allowed to count." },
  },
  slots: {
    "object-prefix": { anchor: "camel", placement: "before" },
    "object-suffix": { anchor: "camel", placement: "after" },
    "gap-prefix": { anchor: "gap", placement: "before" },
    "append-rule": { anchor: "period", placement: "after" },
  },
  patches: [
    { id: "whole", label: "whole", area: "object", slot: "object-prefix", order: 20, tags: ["integrity"], whisper: "Keeps the camel connected. It does not explicitly protect the stuffing." },
    { id: "one-piece", label: "in one piece", area: "object", slot: "object-suffix", order: 10, tags: ["integrity"], whisper: "Protects continuity, not necessarily the contents." },
    { id: "contents", label: "with all original contents inside", area: "object", slot: "object-suffix", order: 20, tags: ["contents"], whisper: "Tracks the stuffing as well as the shell." },
    { id: "unaltered", label: "unaltered", area: "object", slot: "object-prefix", order: 30, tags: ["integrity", "contents", "strong"], whisper: "Powerful. It may also prohibit harmless manipulation." },
    { id: "mostly", label: "mostly", area: "object", slot: "object-prefix", order: 10, tags: ["softener"], whisper: "Short, tempting, and generous to loopholes." },
    { id: "moving-camel", label: "Only the camel may move through the gap.", area: "passage", slot: "append-rule", order: 10, tags: ["camel-moves"], whisper: "Fixes which side of the relation must travel." },
    { id: "neither-moves", label: "Neither the camel nor the gap may move.", area: "passage", slot: "append-rule", order: 40, tags: [], whisper: "Secure. Also impossible to perform.", breaksTask: "The task requires the camel to pass through the gap, but this amendment prevents either side of that relation from moving." },
    { id: "physical", label: "physical", area: "gap", slot: "gap-prefix", tags: ["physical-gap"], whisper: "Fixes the noun category, not the opening's history." },
    { id: "fixed-gap", label: "The gap must remain fixed in place.", area: "gap", slot: "append-rule", order: 20, tags: ["gap-fixed"], whisper: "Stops the opening from doing the travelling." },
    { id: "present-at-start", label: "The gap must already exist when the task is read.", area: "gap", slot: "append-rule", order: 30, tags: ["start-set"], whisper: "Freezes the comparison set in time." },
  ],
  attacks: [
    { id: "separate", title: "SEPARATE THE CAMEL", move: "Cut the camel into pieces and pass the pieces through separately.", opening: "The task identifies the camel, but never requires it to remain connected.", sealTags: ["integrity"], area: "object", source: "PROGRAMME TEST", ruling: "CONTESTED", rulingNote: "Noel Fielding passed the camel through in pieces rather than intact; Greg nevertheless awarded him one point." },
    { id: "stuffing", title: "REMOVE THE CONTENTS", move: "Take out the stuffing, flatten the shell, and pass only the shell through.", opening: "A connected shell may remain while its original contents stay behind.", sealTags: ["contents"], disputeTags: ["integrity"], area: "object", source: "PROGRAMME TEST", ruling: "CONTESTED", rulingNote: "Hugh Dennis's emptied shell was accepted and scored." },
    { id: "named-gap", title: "USE A PLACE CALLED GAP", move: "Carry the camel through a shop whose name contains ‘Gap’.", opening: "The noun has not been restricted to a physical opening.", sealTags: ["physical-gap"], area: "gap", source: "PROGRAMME TEST", ruling: "WORDING FAILURE", rulingNote: "Mel Giedroyc's Baby Gap reading was accepted and won the task." },
    { id: "move-gap", title: "MOVE THE GAP", move: "Keep the camel still and lower a movable opening over it.", opening: "The relation is specified. The moving party is not.", sealTags: ["camel-moves", "gap-fixed"], area: "passage", source: "COUNTER-READING" },
    { id: "create-gap", title: "CREATE A SMALLER GAP", move: "Make a new opening smaller than every gap that existed before the task.", opening: "‘Smallest’ has no stated comparison time.", sealTags: ["start-set"], area: "gap", source: "COUNTER-READING" },
  ],
  weirdTargets: ["THE CAMEL", "THE CONTENTS", "THE GAP"],
  weirdMap: {
    "SEPARATE|THE CAMEL": "separate",
    "REMOVE|THE CONTENTS": "stuffing",
    "USE|THE GAP": "named-gap",
    "MOVE|THE GAP": "move-gap",
    "CREATE|THE GAP": "create-gap",
  },
  programmeRecord: "Hugh Dennis removed the stuffing. Noel Fielding separated the camel. Mel Giedroyc used a Baby Gap shop. Joe Lycett and Lolly Adefope pursued physical gaps.",
};

const BALLS: TaskDefinition = {
  id: "balls",
  number: "02",
  file: "task-02.exercise-balls.mt",
  short: "Place these three exercise balls on the yoga mat on top of that hill.",
  tokens: [
    { id: "place", text: "Place", area: "balls" },
    { id: "these", text: "these", area: "balls" },
    { id: "three-1", text: "three", area: "balls" },
    { id: "exercise", text: "exercise", area: "balls" },
    { id: "balls-1", text: "balls", area: "balls" },
    { id: "on-1", text: "on", area: "location" },
    { id: "the-1", text: "the", area: "location" },
    { id: "yoga", text: "yoga", area: "location" },
    { id: "mat-1", text: "mat", area: "location" },
    { id: "on-2", text: "on", area: "location" },
    { id: "top", text: "top", area: "location" },
    { id: "of", text: "of", area: "location" },
    { id: "that", text: "that", area: "location" },
    { id: "hill", text: "hill", area: "location" },
    { id: "period-1", text: ".", area: "location", punctuation: true },
    { id: "the-2", text: "The", area: "completion" },
    { id: "task", text: "task", area: "completion" },
    { id: "is", text: "is", area: "completion" },
    { id: "complete", text: "complete", area: "completion" },
    { id: "when", text: "when", area: "completion" },
    { id: "all", text: "all", area: "completion" },
    { id: "three-2", text: "three", area: "completion" },
    { id: "balls-2", text: "balls", area: "completion" },
    { id: "sit", text: "sit", area: "completion" },
    { id: "fully", text: "fully", area: "completion" },
    { id: "inflated", text: "inflated", area: "completion" },
    { id: "and", text: "and", area: "completion" },
    { id: "stationary", text: "stationary", area: "completion" },
    { id: "on-3", text: "on", area: "completion" },
    { id: "the-3", text: "the", area: "completion" },
    { id: "mat-2", text: "mat", area: "completion" },
    { id: "period-2", text: ".", area: "completion", punctuation: true },
  ],
  supportLine: "Fastest wins. Your time starts now.",
  areas: {
    balls: { cursor: "BALLS", prompt: "Change what may happen to the balls in transit." },
    location: { cursor: "HILL", prompt: "Change which object must stay at the top." },
    completion: { cursor: "COMPLETE", prompt: "Change the state that ends the task." },
  },
  slots: {
    "before-stationary": { anchor: "stationary", placement: "before" },
    "append-rule": { anchor: "period-2", placement: "after" },
  },
  patches: [
    { id: "no-deflate", label: "The balls must remain fully inflated throughout the task.", area: "balls", slot: "append-rule", order: 10, tags: ["continuous-inflation"], whisper: "Makes the transit state matter, not only the finish." },
    { id: "mat-remains", label: "The yoga mat must remain on top of the hill throughout the task.", area: "location", slot: "append-rule", order: 20, tags: ["mat-stays"], whisper: "Turns the mat's location into a continuing condition." },
    { id: "no-mat-move", label: "The yoga mat may not be moved.", area: "location", slot: "append-rule", order: 30, tags: ["mat-stays"], whisper: "Directly prevents relocating the destination." },
    { id: "nothing-moves", label: "Nothing may be moved.", area: "location", slot: "append-rule", order: 50, tags: [], whisper: "The balls are included in ‘nothing’.", breaksTask: "The task requires the balls to be placed on the mat, but this amendment forbids moving the balls." },
    { id: "unsupported", label: "The balls may not be held or supported.", area: "completion", slot: "append-rule", order: 40, tags: ["unsupported"], whisper: "Distinguishes resting from being kept still." },
    { id: "inside-boundary", label: "Every point of contact must lie inside the mat's boundary.", area: "completion", slot: "append-rule", order: 35, tags: ["inside-boundary"], whisper: "Strengthens ‘on’ from contact to containment." },
    { id: "apparently", label: "apparently", area: "completion", slot: "before-stationary", tags: ["softener"], whisper: "Grammatical. Also much less useful than it first appears." },
  ],
  attacks: [
    { id: "move-mat", title: "MOVE THE MAT", move: "Bring the yoga mat down the hill, then place the balls on it.", opening: "‘On top of that hill’ can describe the mat in the initial scene rather than the required finishing place.", sealTags: ["mat-stays"], area: "location", source: "PROGRAMME TEST", ruling: "WORDING FAILURE", rulingNote: "Richard Osman's reading was accepted and won the task." },
    { id: "deflate-transit", title: "DEFLATE IN TRANSIT", move: "Deflate the balls, carry them up, then inflate them on the mat.", opening: "The completion clause requires inflation at the finish, not throughout the journey.", sealTags: ["continuous-inflation"], area: "balls", source: "COUNTER-READING" },
    { id: "hold-still", title: "HOLD THEM STILL", move: "Use people or supports to keep every ball stationary on the mat.", opening: "Stationary describes motion. It does not say the balls must be unsupported.", sealTags: ["unsupported"], area: "completion", source: "COUNTER-READING" },
    { id: "edge-contact", title: "USE THE EDGE", move: "Balance each ball with only a tiny point touching the outer edge of the mat.", opening: "‘On’ requires contact, but does not clearly require the ball's footprint to lie inside the mat.", sealTags: ["inside-boundary"], area: "completion", source: "COUNTER-READING" },
  ],
  weirdTargets: ["THE BALLS", "THE MAT", "THE HILL"],
  weirdMap: {
    "MOVE|THE MAT": "move-mat",
    "ALTER|THE BALLS": "deflate-transit",
    "USE|THE BALLS": "hold-still",
    "USE|THE MAT": "edge-contact",
  },
  programmeRecord: "Richard Osman fetched the yoga mat from the top of the hill and completed the task at the bottom. His reading was accepted and won the task.",
};

const COMMA: TaskDefinition = {
  id: "comma",
  number: "03",
  file: "task-03.comma.mt",
  short: "Put on gloves, eat a banana, correctly put on a tie and clap.",
  tokens: [
    { id: "put-on", text: "Put", area: "sequence" },
    { id: "on", text: "on", area: "sequence" },
    { id: "a", text: "a", area: "gloves" },
    { id: "pair", text: "pair", area: "gloves" },
    { id: "of", text: "of", area: "gloves" },
    { id: "food-handling", text: "food-handling", area: "gloves" },
    { id: "gloves", text: "gloves", area: "gloves" },
    { id: "comma-gloves", text: ",", area: "sequence", punctuation: true },
    { id: "eat", text: "eat", area: "attachment" },
    { id: "a-2", text: "a", area: "attachment" },
    { id: "whole", text: "whole", area: "attachment" },
    { id: "banana", text: "banana", area: "attachment" },
    { id: "comma-banana", text: ",", area: "attachment", punctuation: true, editablePunctuation: true },
    { id: "correctly", text: "correctly", area: "attachment" },
    { id: "put-2", text: "put", area: "tie" },
    { id: "on-2", text: "on", area: "tie" },
    { id: "a-3", text: "a", area: "tie" },
    { id: "tie", text: "tie", area: "tie" },
    { id: "and", text: "and", area: "sequence" },
    { id: "clap", text: "clap", area: "sequence" },
    { id: "as", text: "as", area: "sequence" },
    { id: "many", text: "many", area: "sequence" },
    { id: "times", text: "times", area: "sequence" },
    { id: "as-2", text: "as", area: "sequence" },
    { id: "possible", text: "possible", area: "sequence" },
    { id: "period", text: ".", area: "sequence", punctuation: true },
  ],
  supportLine: "All tasks must be completed in 100 seconds. Most claps wins.",
  areas: {
    attachment: { cursor: "COMMA", prompt: "Move the punctuation; watch what ‘correctly’ attaches to." },
    tie: { cursor: "TIE", prompt: "Tighten what counts as putting on the tie." },
    sequence: { cursor: "SEQUENCE", prompt: "Tighten the order of the listed actions." },
    gloves: { cursor: "GLOVES", prompt: "No useful amendment is filed under the gloves." },
  },
  slots: {
    "comma-after-correctly": { anchor: "correctly", placement: "after" },
    "append-rule": { anchor: "period", placement: "after" },
  },
  patches: [
    { id: "move-comma", label: ",", area: "attachment", slot: "comma-after-correctly", tags: ["banana-correct"], whisper: "Moves ‘correctly’ from the tie phrase to the banana phrase.", hidesTokens: ["comma-banana"], punctuation: true },
    { id: "tie-knotted", label: "The tie must be knotted around your neck.", area: "tie", slot: "append-rule", order: 20, tags: ["tie-knotted"], whisper: "Turns ‘put on’ into a visible end state." },
    { id: "listed-order", label: "Complete the listed actions from left to right.", area: "sequence", slot: "append-rule", order: 30, tags: ["listed-order"], whisper: "Makes the written order binding." },
  ],
  attacks: [
    { id: "move-comma-incident", title: "MOVE THE COMMA", move: "Move the comma after ‘correctly’, so the banana must be eaten correctly and the tie need only be put on.", opening: "That reading is not licensed by the original punctuation. It requires changing the task.", sealTags: ["banana-correct"], area: "attachment", source: "PROGRAMME TEST", ruling: "GREG OVERRIDE", rulingNote: "Richard Osman proposed a revised task. Greg accepted the change for everyone; Richard won, and Joe Wilkinson was disqualified for not eating the banana correctly." },
    { id: "drape-tie", title: "DRAPE THE TIE", move: "Lay the tie across your shoulders without tying a knot.", opening: "‘Put on’ does not specify the tie's finished state.", sealTags: ["tie-knotted"], area: "tie", source: "COUNTER-READING" },
    { id: "clap-first", title: "CLAP FROM THE START", move: "Begin clapping, then put on the gloves, eat the banana and deal with the tie while continuing to clap.", opening: "The list suggests an order in ordinary reading, but never explicitly makes that order a condition.", sealTags: ["listed-order"], area: "sequence", source: "COUNTER-READING" },
  ],
  weirdTargets: ["THE COMMA", "THE TIE", "THE ORDER"],
  weirdMap: {
    "MOVE|THE COMMA": "move-comma-incident",
    "USE|THE TIE": "drape-tie",
    "ALTER|THE ORDER": "clap-first",
  },
  programmeRecord: "The original punctuation attached ‘correctly’ to putting on the tie. Richard Osman proposed moving the comma. The task was then changed for everyone; this was an accepted rule change, not a valid reading of the original sentence.",
};

const ICE: TaskDefinition = {
  id: "ice",
  number: "04",
  file: "task-04.ice.mt",
  short: "Make this ice block disappear as fast as possible.",
  tokens: [
    { id: "make", text: "Make", area: "result" },
    { id: "this", text: "this", area: "identity" },
    { id: "ice", text: "ice", area: "identity" },
    { id: "block", text: "block", area: "identity" },
    { id: "disappear", text: "disappear", area: "result" },
    { id: "as", text: "as", area: "timing" },
    { id: "fast", text: "fast", area: "timing" },
    { id: "as-2", text: "as", area: "timing" },
    { id: "possible", text: "possible", area: "timing" },
    { id: "period", text: ".", area: "result", punctuation: true },
  ],
  supportLine: "You have one hour. Your time starts now.",
  areas: {
    result: { cursor: "DISAPPEAR", prompt: "Define the end state without prescribing a method." },
    identity: { cursor: "ICE BLOCK", prompt: "Decide whether the object, its shape or its material must go." },
    timing: { cursor: "FAST", prompt: "Tighten when the result is judged." },
  },
  slots: {
    "before-fast": { anchor: "as", placement: "before" },
    "append-rule": { anchor: "period", placement: "after" },
  },
  patches: [
    { id: "no-solid", label: "No part of the original block may remain solid when you stop the clock.", area: "result", slot: "append-rule", order: 10, tags: ["no-solid"], whisper: "Defines disappearance as a measurable change of state rather than a change of view or shape." },
    { id: "in-area", label: "All material from the block must remain in the task area.", area: "identity", slot: "append-rule", order: 20, tags: ["material-remains"], whisper: "Prevents disposal, but does not by itself make the block disappear." },
    { id: "single-piece", label: "The block must remain in one piece throughout.", area: "identity", slot: "append-rule", order: 30, tags: ["single-piece"], whisper: "Stops smashing and also makes ordinary melting increasingly awkward." },
    { id: "irreversibly", label: "irreversibly", area: "result", slot: "before-fast", tags: ["irreversible"], whisper: "Sounds strong. It does not define which thing must cease to exist." },
    { id: "no-matter", label: "No matter from the block may continue to exist.", area: "result", slot: "append-rule", order: 40, tags: [], whisper: "This asks for destruction of matter, not disappearance of an ice block.", breaksTask: "The amendment requires the block's matter to cease existing, which no available task action can achieve." },
  ],
  attacks: [
    { id: "hide-ice", title: "HIDE THE BLOCK", move: "Put the intact block somewhere the observer cannot see it.", opening: "‘Disappear’ may describe the observer's view rather than a physical change in the block.", sealTags: ["no-solid"], area: "result", source: "COUNTER-READING" },
    { id: "smash-ice", title: "DESTROY THE SHAPE", move: "Smash the block into small pieces and declare that the block has disappeared.", opening: "The block-shaped object can disappear while all of its ice remains solid.", sealTags: ["no-solid", "single-piece"], disputeTags: ["irreversible"], area: "identity", source: "PROGRAMME TEST", ruling: "CONTESTED", rulingNote: "Greg accepted Romesh Ranganathan's smashed block as an attempt and awarded two points." },
    { id: "remove-ice", title: "REMOVE IT FROM THE TASK", move: "Throw the intact block somewhere outside the task area.", opening: "The task does not distinguish disappearance from disposal.", sealTags: ["no-solid", "material-remains"], area: "identity", source: "PROGRAMME TEST", ruling: "CONTESTED", rulingNote: "Tim Key threw the block into a river and received one point." },
  ],
  weirdTargets: ["THE BLOCK", "THE SHAPE", "THE MATERIAL"],
  weirdMap: {
    "MOVE|THE BLOCK": "hide-ice",
    "SEPARATE|THE SHAPE": "smash-ice",
    "REMOVE|THE BLOCK": "remove-ice",
  },
  programmeRecord: "Josh Widdicombe won by melting the ice. Frank Skinner used heat; Roisin Conaty enlisted Alex; Tim Key threw the block into a river; Romesh Ranganathan smashed it into pieces.",
};

const TASKS = [CAMEL, BALLS, COMMA, ICE];

function patchById(task: TaskDefinition, id: string) {
  return task.patches.find((patch) => patch.id === id)!;
}

function attackById(task: TaskDefinition, id: string) {
  return task.attacks.find((attack) => attack.id === id)!;
}

function hasTag(task: TaskDefinition, ids: string[], tag: string) {
  return ids.some((id) => patchById(task, id)?.tags.includes(tag));
}

function hasSoftenerInArea(task: TaskDefinition, ids: string[], area: string) {
  return ids.some((id) => {
    const patch = patchById(task, id);
    return patch?.area === area && patch.tags.includes("softener");
  });
}

function tokenIsHidden(task: TaskDefinition, ids: string[], tokenId: string) {
  return ids.some((id) => patchById(task, id)?.hidesTokens?.includes(tokenId));
}

function activePatchesAt(task: TaskDefinition, ids: string[], tokenId: string, placement: "before" | "after") {
  return task.patches
    .filter((patch) => {
      const slot = task.slots[patch.slot];
      return ids.includes(patch.id) && slot.anchor === tokenId && slot.placement === placement;
    })
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function overallVerdict(task: TaskDefinition, attack: Attack, ids: string[]): Verdict {
  const seal = attack.sealTags.some((tag) => hasTag(task, ids, tag));
  const dispute = attack.disputeTags?.some((tag) => hasTag(task, ids, tag));
  if (seal && hasSoftenerInArea(task, ids, attack.area)) return "DISPUTED";
  if (seal) return "SEALED";
  return dispute ? "DISPUTED" : "SURVIVES";
}

function linkVerdict(task: TaskDefinition, attack: Attack, patch: Patch, ids: string[]): Verdict {
  if (attack.sealTags.some((tag) => patch.tags.includes(tag))) {
    return hasSoftenerInArea(task, ids, attack.area) ? "DISPUTED" : "SEALED";
  }
  if (attack.disputeTags?.some((tag) => patch.tags.includes(tag))) return "DISPUTED";
  return "SURVIVES";
}

function sealingPatchId(task: TaskDefinition, attack: Attack, ids: string[]) {
  if (hasSoftenerInArea(task, ids, attack.area)) return null;
  return ids.find((id) => attack.sealTags.some((tag) => patchById(task, id).tags.includes(tag))) ?? null;
}

export default function Home() {
  const [screen, setScreen] = useState<"home" | "game">("home");
  const [taskId, setTaskId] = useState("camel");
  const [phase, setPhase] = useState<Phase>("edit");
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [patches, setPatches] = useState<string[]>([]);
  const [history, setHistory] = useState<string[][]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [claims, setClaims] = useState<Record<string, Claim>>({});
  const [currentAttackId, setCurrentAttackId] = useState<string | null>(null);
  const [attackOwner, setAttackOwner] = useState<"ALEX" | "PLAYER">("ALEX");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [nudge, setNudge] = useState("");
  const [playerFound, setPlayerFound] = useState<string[]>([]);
  const [unverified, setUnverified] = useState<string[]>([]);
  const [weirdOpen, setWeirdOpen] = useState(false);
  const [weirdVerb, setWeirdVerb] = useState("MOVE");
  const [weirdTarget, setWeirdTarget] = useState("THE GAP");
  const [duckedPatch, setDuckedPatch] = useState<string | null>(null);
  const [duckDrag, setDuckDrag] = useState({ active: false, x: 0, y: 0 });
  const [line, setLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [askOpen, setAskOpen] = useState(false);
  const [askQuestion, setAskQuestion] = useState("");
  const [askAnswer, setAskAnswer] = useState("");
  const [alexIntroduced, setAlexIntroduced] = useState(false);
  const [alexReplyIndex, setAlexReplyIndex] = useState(0);
  const [guideActive, setGuideActive] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);

  const workspaceRef = useRef<HTMLDivElement>(null);
  const attackRef = useRef<HTMLElement>(null);
  const patchRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const duckDragRef = useRef({ pointerId: 0, startX: 0, startY: 0 });
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const musicUnlockedRef = useRef(false);
  const musicBaseVolumeRef = useRef(0.28);
  const previousTaskBrokenRef = useRef(false);
  const surgicalStingPlayedRef = useRef(false);

  const task = TASKS.find((item) => item.id === taskId) ?? CAMEL;
  const currentAttack = currentAttackId ? attackById(task, currentAttackId) : null;
  const effectivePatches = duckedPatch ? patches.filter((id) => id !== duckedPatch) : patches;
  const taskBrokenPatch = effectivePatches.map((id) => patchById(task, id)).find((patch) => patch.breaksTask);
  const taskBroken = Boolean(taskBrokenPatch);
  const ink = patches.length;
  const sealedCount = task.attacks.filter((attack) => claims[attack.id]?.verdict === "SEALED").length;
  const duckReopened = duckedPatch ? task.attacks.filter((attack) => claims[attack.id]?.patchId === duckedPatch) : [];
  const displayedSealedCount = sealedCount - duckReopened.length;
  const finished = displayedSealedCount === task.attacks.length && !taskBroken;
  const area = selectedArea ? task.areas[selectedArea] : null;

  const verdictLabel: Record<Verdict, string> = {
    SEALED: "INCIDENT ADDRESSED",
    SURVIVES: "WORDING STILL OPEN",
    DISPUTED: "RULING DISPUTED",
  };

  const guideCopy = taskBroken
    ? `FIX — Retract “${taskBrokenPatch?.label}” by clicking it in the task, or use undo.`
    : phase === "edit" && snapshots.length === 0 && patches.length === 0
      ? "REVIEW 1/3 — This task produced several readings. Inspect the wording, or review the original first."
      : phase === "edit" && snapshots.length === 0
        ? "REVIEW 2/3 — Send the amendment for review. To retract it, click the underlined +wording in the task, or use undo."
        : phase === "attack"
          ? "REVIEW 3/3 — Run Alex's move against the current wording. The ruling is automatic."
          : phase === "verdict"
              ? "RESULT — Read the ruling, then rewrite or let Alex try another move."
              : "Every recorded incident has been addressed. The file is ready.";

  const sentenceText = useMemo(() => {
    const words: string[] = [];
    task.tokens.forEach((token) => {
      if (tokenIsHidden(task, patches, token.id)) return;
      activePatchesAt(task, patches, token.id, "before").forEach((patch) => words.push(patch.label));
      words.push(token.text);
      activePatchesAt(task, patches, token.id, "after").forEach((patch) => words.push(patch.label));
    });
    return words.join(" ").replace(/\s+([.,!?])/g, "$1");
  }, [patches, task]);

  useEffect(() => {
    if (window.localStorage.getItem("masktaster-guidance-v2-seen") === "1") setGuideActive(false);
  }, []);

  useEffect(() => {
    const music = new Audio();
    music.loop = true;
    music.preload = "auto";
    music.volume = musicBaseVolumeRef.current;
    musicRef.current = music;

    function unlockMusic() {
      musicUnlockedRef.current = true;
      void music.play().catch(() => undefined);
      window.removeEventListener("pointerdown", unlockMusic);
      window.removeEventListener("keydown", unlockMusic);
    }

    window.addEventListener("pointerdown", unlockMusic);
    window.addEventListener("keydown", unlockMusic);
    return () => {
      window.removeEventListener("pointerdown", unlockMusic);
      window.removeEventListener("keydown", unlockMusic);
      music.pause();
      musicRef.current = null;
    };
  }, []);

  useEffect(() => {
    const music = musicRef.current;
    if (!music) return;
    const file = screen === "home" || phase === "record" ? "clair-home.mp3" : "clip1_gymno.mp3";
    const baseVolume = file === "clair-home.mp3" ? 0.4 : 0.28;
    const nextSource = new URL(`audio/${file}`, document.baseURI).href;
    if (music.src !== nextSource) {
      music.pause();
      music.src = nextSource;
      music.currentTime = 0;
    }
    musicBaseVolumeRef.current = baseVolume;
    music.volume = baseVolume;
    if (musicUnlockedRef.current) void music.play().catch(() => undefined);
  }, [screen, phase]);

  useEffect(() => {
    if (taskBroken && !previousTaskBrokenRef.current) playOneShot("mixkit-clown-horn-at-circus-715.wav", 0.62);
    previousTaskBrokenRef.current = taskBroken;
  }, [taskBroken]);

  useEffect(() => {
    if (screen !== "game" || phase !== "record" || ink > 3 || surgicalStingPlayedRef.current) return;
    surgicalStingPlayedRef.current = true;
    const music = musicRef.current;
    if (music) music.volume = 0.1;
    const sting = playOneShot("tchaikovsky-1812-scrlgs.mp3", 0.74);
    sting.addEventListener("ended", () => {
      if (musicRef.current) musicRef.current.volume = musicBaseVolumeRef.current;
    }, { once: true });
  }, [screen, phase, ink]);

  useEffect(() => {
    function positionLine() {
      if (!outcome?.patchId || !workspaceRef.current || !attackRef.current || !patchRefs.current[outcome.patchId]) {
        setLine(null);
        return;
      }
      const workspace = workspaceRef.current.getBoundingClientRect();
      const attack = attackRef.current.getBoundingClientRect();
      const patch = patchRefs.current[outcome.patchId]!.getBoundingClientRect();
      setLine({ x1: attack.left - workspace.left + 18, y1: attack.top - workspace.top + 18, x2: patch.left - workspace.left + patch.width / 2, y2: patch.top - workspace.top + patch.height / 2 });
    }
    positionLine();
    window.addEventListener("resize", positionLine);
    return () => window.removeEventListener("resize", positionLine);
  }, [outcome, phase, patches, taskId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
      }
      if (event.key === "Escape") {
        setWeirdOpen(false);
        setAskOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function reevaluateClaims(next: string[]) {
    const updated: Record<string, Claim> = {};
    for (const attack of task.attacks) {
      const claim = claims[attack.id];
      if (!claim || !next.includes(claim.patchId)) continue;
      if (linkVerdict(task, attack, patchById(task, claim.patchId), next) === "SEALED") updated[attack.id] = claim;
    }
    setClaims(updated);
  }

  function commitPatches(next: string[]) {
    setHistory((items) => [...items, patches]);
    setPatches(next);
    reevaluateClaims(next);
    setPhase("edit");
    setOutcome(null);
    setNudge("");
    setDuckedPatch(null);
  }

  function togglePatch(id: string) {
    commitPatches(patches.includes(id) ? patches.filter((item) => item !== id) : [...patches, id]);
  }

  function undo() {
    const previous = history.at(-1);
    if (!previous) return;
    setPatches(previous);
    reevaluateClaims(previous);
    setHistory((items) => items.slice(0, -1));
    setPhase("edit");
    setOutcome(null);
    setNudge("");
    setDuckedPatch(null);
  }

  function resetForTask(next: TaskDefinition) {
    setPhase("edit");
    setSelectedArea(null);
    setSelectedToken(null);
    setPatches([]);
    setHistory([]);
    setSnapshots([]);
    setClaims({});
    setCurrentAttackId(null);
    setOutcome(null);
    setNudge("");
    setPlayerFound([]);
    setUnverified([]);
    setWeirdOpen(false);
    setWeirdVerb("MOVE");
    setWeirdTarget(next.weirdTargets[0]);
    setDuckedPatch(null);
    setDuckDrag({ active: false, x: 0, y: 0 });
    setLine(null);
    setAskOpen(false);
    setAskQuestion("");
    setAskAnswer("");
    setAlexIntroduced(false);
    setAlexReplyIndex(0);
    setHelpOpen(false);
    previousTaskBrokenRef.current = false;
    surgicalStingPlayedRef.current = false;
  }

  function playOneShot(file: string, volume: number) {
    const clip = new Audio(new URL(`audio/${file}`, document.baseURI).href);
    clip.volume = volume;
    void clip.play().catch(() => undefined);
    return clip;
  }

  function finishGuidance() {
    if (!guideActive) return;
    setGuideActive(false);
    window.localStorage.setItem("masktaster-guidance-v2-seen", "1");
  }

  function replayGuidance() {
    window.localStorage.removeItem("masktaster-guidance-v2-seen");
    setGuideActive(true);
    setHelpOpen(false);
  }

  function reset() {
    resetForTask(task);
  }

  function openTask(id: string) {
    const next = TASKS.find((item) => item.id === id) ?? CAMEL;
    setTaskId(next.id);
    setScreen("game");
    resetForTask(next);
  }

  function chooseNextAttack(knownClaims = claims) {
    const unresolved = task.attacks.filter((attack) => !knownClaims[attack.id] || (duckedPatch && knownClaims[attack.id]?.patchId === duckedPatch));
    return unresolved[0]?.id ?? null;
  }

  function sendToTest() {
    setSnapshots((items) => [...items, { label: `TRY ${items.length + 1}`, patches: [...patches] }]);
    setAttackOwner("ALEX");
    setOutcome(null);
    if (taskBroken) {
      setNudge("");
      setCurrentAttackId(null);
      setPhase("verdict");
      return;
    }

    const currentStillOpen = currentAttackId && !claims[currentAttackId];
    const next = currentStillOpen ? currentAttackId : chooseNextAttack(claims);
    if (!next) {
      setNudge("");
      setPhase("record");
      return;
    }
    setNudge("");
    setCurrentAttackId(next);
    setPhase("attack");
  }

  function runAttackTest() {
    if (!currentAttack) return;
    const actual = overallVerdict(task, currentAttack, effectivePatches);
    const patchId = actual === "SEALED" ? sealingPatchId(task, currentAttack, effectivePatches) : null;

    if (actual === "SEALED" && patchId) {
      const patch = patchById(task, patchId);
      const isWrittenOverride = currentAttack.ruling === "GREG OVERRIDE";
      setOutcome({
        verdict: "SEALED",
        patchId,
        label: isWrittenOverride ? "RULING WRITTEN IN" : undefined,
        message: isWrittenOverride
          ? `“${patch.label}” makes the revised instruction explicit. It addresses the incident without pretending the original wording already allowed it.`
          : `“${patch.label}” prevents this move under the current wording.`,
      });
      setClaims((items) => ({ ...items, [currentAttack.id]: { patchId, verdict: "SEALED" } }));
    } else if (currentAttack.ruling === "GREG OVERRIDE") {
      setOutcome({ verdict: "DISPUTED", label: "GREG OVERRIDE", message: `The original wording did not allow that reading. ${currentAttack.rulingNote ?? "Greg changed the ruling anyway."}` });
    } else {
      const programmeNote = currentAttack.source === "PROGRAMME TEST" && currentAttack.rulingNote
        ? ` ${currentAttack.ruling}: ${currentAttack.rulingNote}`
        : "";
      const message = actual === "DISPUTED"
        ? `The wording pushes against this move but does not settle the reading.${programmeNote}`
        : `${currentAttack.opening}${programmeNote}`;
      setOutcome({ verdict: actual, message });
      if (actual === "SURVIVES") playOneShot("mixkit-funny-video-game-slide-2888.wav", 0.58);
    }
    setPhase("verdict");
    setNudge("");
  }

  function retractBrokenPatch() {
    if (!taskBrokenPatch) return;
    commitPatches(patches.filter((id) => id !== taskBrokenPatch.id));
  }

  function returnToEdit() {
    finishGuidance();
    setPhase("edit");
    setOutcome(null);
    setNudge("");
    if (currentAttack) {
      setSelectedArea(currentAttack.area);
      const token = task.tokens.find((item) => item.area === currentAttack.area && !item.punctuation);
      setSelectedToken(token?.id ?? null);
    }
  }

  function counterattack() {
    finishGuidance();
    setOutcome(null);
    setNudge("");
    const next = chooseNextAttack();
    if (!next) {
      setPhase("record");
      return;
    }
    setAttackOwner("ALEX");
    setCurrentAttackId(next);
    setPhase("attack");
  }

  function submitWeirdAttack() {
    const key = `${weirdVerb}|${weirdTarget}`;
    const match = task.weirdMap[key];
    setWeirdOpen(false);
    if (match) {
      if (!playerFound.includes(match)) setPlayerFound((items) => [...items, match]);
      setCurrentAttackId(match);
      setAttackOwner("PLAYER");
      setOutcome(null);
      setNudge("Attack found. You got there first.");
      setPhase("attack");
      return;
    }
    const label = `${weirdVerb} ${weirdTarget}`;
    setUnverified((items) => [...items, label]);
    setNudge(`${label} saved as an unverified attack.`);
  }

  function restoreSnapshot(snapshot: Snapshot) {
    commitPatches([...snapshot.patches]);
  }

  function coverWithDuck(id: string) {
    const reopened = task.attacks.filter((attack) => claims[attack.id]?.patchId === id);
    setDuckedPatch(id);
    setNudge(reopened.length ? `${reopened.length} sealed move${reopened.length === 1 ? "" : "s"} reopens without “${patchById(task, id).label}”.` : `The next test will ignore “${patchById(task, id).label}”.`);
  }

  function startDuckDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    duckDragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDuckDrag({ active: true, x: 0, y: 0 });
  }

  function moveDuck(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!duckDrag.active || event.pointerId !== duckDragRef.current.pointerId) return;
    setDuckDrag({ active: true, x: event.clientX - duckDragRef.current.startX, y: event.clientY - duckDragRef.current.startY });
  }

  function dropDuck(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!duckDrag.active || event.pointerId !== duckDragRef.current.pointerId) return;
    const target = document.elementsFromPoint(event.clientX, event.clientY)
      .map((element) => element.closest<HTMLElement>("[data-patch-id]"))
      .find((element): element is HTMLElement => Boolean(element));
    if (target?.dataset.patchId) coverWithDuck(target.dataset.patchId);
    else setNudge("The duck did not cover an amendment.");
    setDuckDrag({ active: false, x: 0, y: 0 });
  }

  function selectWord(token: Token) {
    if (phase !== "edit" || (token.punctuation && !token.editablePunctuation)) return;
    setSelectedToken(token.id);
    setSelectedArea(token.area);
  }

  function askAlex(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = askQuestion.trim().toLowerCase();
    if (!query) return;
    const greetings = [
      "Hello.",
      "Hi.",
      "Hello there.",
      "Oh, hello.",
    ];
    const greetingText = query
      .replace(/[.!?]+$/g, "")
      .replace(/^(?:alex|little alex(?: horne)?)[,:]?\s+/i, "")
      .replace(/,?\s+(?:alex|little alex(?: horne)?)$/i, "")
      .trim();
    const isGreeting = /^(?:(?:oh[, ]+)?(?:hi|hello|hullo|hey|hiya|howdy|yo|greetings|salutations|ahoy)(?: there)?|good (?:morning|afternoon|evening|day)|morning|afternoon|evening|how do you do|nice to meet you|pleased to meet you|what'?s up|sup)$/i.test(greetingText);
    if (!alexIntroduced) {
      if (isGreeting) {
        setAlexIntroduced(true);
        setAskAnswer(greetings[Math.floor(Math.random() * greetings.length)]);
      } else {
        setAskAnswer("...");
      }
    } else {
      const subjects: Array<[RegExp, string]> = [
        [/\bmat\b/, "the mat"],
        [/\bballs?\b/, "the balls"],
        [/\bhill\b/, "the hill"],
        [/\bcamels?\b/, "the camel"],
        [/\bgaps?\b/, "the gap"],
        [/\bstuffing|contents?\b/, "the contents"],
        [/\bbanana\b/, "the banana"],
        [/\btie\b/, "the tie"],
        [/\bice|block\b/, "the ice block"],
        [/\bducks?\b/, "the duck"],
        [/\btask|wording|rules?|loopholes?|amendments?\b/, "the wording"],
      ];
      const subject = subjects.find(([pattern]) => pattern.test(query))?.[1];
      const evasions = /\b(?:legal|legally|lawful|allowed)\b/.test(query)
        ? ["It has the appearance of something that might be legal.", "I can confirm that you have used the word ‘legal’. Beyond that, no."]
        : /\b(?:all good|good now|okay now|fine now|ready)\b/.test(query)
          ? ["It is certainly more finished than it was.", "It now contains more wording. I can confirm that much."]
          : /\b(?:block|blocked|closed|sealed|stop)\b/.test(query)
            ? ["Something has been prevented. I wouldn't like to say what.", "The amendment is present. Its achievements remain a private matter."]
            : /\bgreg\b/.test(query)
              ? ["Greg has not asked me to answer that.", "I wouldn't want to prejudge Greg. Or answer you."]
              : subject
                ? [`I heard the part about ${subject}. I'm not going to improve it for you.`, `Your question about ${subject} has been noted and carefully left unanswered.`]
                : /\b(?:why|how)\b/.test(query)
                  ? ["I understand why you're asking. That's not the same as answering.", "I followed the question. I simply don't have anything useful to add."]
                  : ["I followed that. I'm choosing not to clarify it.", "That was comprehensible and has still not earned an answer."];
      setAskAnswer(isGreeting ? "Now we're established." : evasions[alexReplyIndex % evasions.length]);
      if (!isGreeting) setAlexReplyIndex((value) => value + 1);
    }
    setAskQuestion("");
  }

  function renderPatchPhrase(patch: Patch) {
    return (
      <button
        key={patch.id}
        ref={(node) => { patchRefs.current[patch.id] = node; }}
        data-patch-id={patch.id}
        className={`amendment ${patch.punctuation ? "punctuation-amendment" : ""} ${duckedPatch === patch.id ? "ducked" : ""}`}
        onClick={() => duckedPatch === patch.id ? (setDuckedPatch(null), setNudge("Wording restored.")) : togglePatch(patch.id)}
        aria-label={`${duckedPatch === patch.id ? "Remove duck from" : "Remove"} ${patch.label}`}
      >
        {patch.label}
        {duckedPatch === patch.id && <img className="duck-on-word" src="duck-white-on-black.png" alt="White pixel duck covering this amendment" />}
      </button>
    );
  }

  function renderTaskTokens() {
    const nodes: ReactNode[] = [];
    const visibleTokens = task.tokens.filter((token) => !tokenIsHidden(task, patches, token.id));
    visibleTokens.forEach((token, index) => {
      const before = activePatchesAt(task, patches, token.id, "before");
      const after = activePatchesAt(task, patches, token.id, "after");
      before.forEach((patch) => {
        nodes.push(renderPatchPhrase(patch));
        if (!patch.punctuation) nodes.push(<span key={`${patch.id}-space`}> </span>);
      });
      if (token.punctuation && token.editablePunctuation) nodes.push(<button className={phase === "edit" && selectedToken === token.id ? "word punctuation active" : "word punctuation"} key={token.id} onClick={() => selectWord(token)}>{token.text}</button>);
      else if (token.punctuation) nodes.push(<span className="punctuation" key={token.id}>{token.text}</span>);
      else nodes.push(<button className={phase === "edit" && selectedToken === token.id ? "word active" : "word"} key={token.id} onClick={() => selectWord(token)}>{token.text}</button>);
      after.forEach((patch) => {
        if (!patch.punctuation) nodes.push(<span key={`${patch.id}-lead-space`}> </span>);
        nodes.push(renderPatchPhrase(patch));
      });
      if (index < visibleTokens.length - 1 && !visibleTokens[index + 1].punctuation) nodes.push(<span key={`${token.id}-tail-space`}> </span>);
      if (token.punctuation && index < visibleTokens.length - 1) nodes.push(<span key={`${token.id}-sentence-space`}> </span>);
    });
    return nodes;
  }

  if (screen === "home") {
    return (
      <main className="index-screen">
        <header className="index-head"><b>MASK TASTER</b></header>
        <section className="index-body">
          <p className="index-deck">Some tasks have been approached in ridiculous ways throughout Taskmaster history. Is it Alex's fault, or are the contestants simply being cheeky? Either way, Greg is furious. Amendments have been requested.</p>
          <p className="index-command">task files/</p>
          <div className="task-list">
            {TASKS.map((item) => (
              <button className="task-row" key={item.id} onClick={() => openTask(item.id)}>
                <span className="task-number">{item.number}</span>
                <span><b>{item.file}</b><small>{item.short}</small></span>
                <span className="task-enter">[{item.attacks.length} readings] [review]</span>
              </button>
            ))}
          </div>
        </section>
        <img className="index-alex" src="alex-horne.png" width="72" height="96" alt="Little Alex Horne" />
        <footer className="index-foot"><span>{TASKS.length} task files</span><span>amendments requested</span></footer>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="app-bar">
        <button onClick={() => setScreen("home")}>← tasks</button>
        <b>{task.file}</b>
        <span>addressed {displayedSealedCount}/{task.attacks.length}</span>
        <button onClick={() => setHelpOpen((value) => !value)}>? help</button>
        <button onClick={undo} disabled={!history.length}>undo</button>
      </header>

      {helpOpen && <section className="help-panel">
        <span>Select wording to amend.</span><span>Send it to Alex for an automatic test.</span><span>Retract an amendment by clicking its underlined +wording in the task, or use undo.</span>
        <button onClick={replayGuidance}>[replay guidance]</button><button onClick={() => setHelpOpen(false)}>[close]</button>
      </section>}

      <div className={`task-workspace phase-${phase}`} ref={workspaceRef}>
        {line && <svg className={`claim-thread ${outcome?.verdict.toLowerCase()}`} aria-hidden="true"><path d={`M ${line.x1} ${line.y1} C ${line.x1 - 70} ${line.y1 - 45}, ${line.x2 + 70} ${line.y2 + 45}, ${line.x2} ${line.y2}`} /><circle cx={line.x1} cy={line.y1} r="4" /><circle cx={line.x2} cy={line.y2} r="4" /></svg>}

        {guideActive && <aside className="guide-bar"><span>{guideCopy}</span><button onClick={finishGuidance}>[skip]</button></aside>}

        <section className={`task-paper ${taskBroken ? "task-broken" : ""} ${guideActive && phase === "edit" && !area ? "guide-focus-area" : ""}`}>
          <header><span>{task.file}</span><span>{phase === "record" ? "record" : patches.length ? "modified" : "original"}</span></header>
          <div className="code-line"><span className="line-number">1</span><p className="task-sentence">{renderTaskTokens()}</p></div>
          <div className="code-line secondary"><span className="line-number">2</span><p>{task.supportLine}</p></div>
        </section>

        <section className="interaction-strip">
          <div className="alex-mark"><img src={phase === "edit" || phase === "record" ? "alex-horne.png" : "alex-assistant.png"} width="104" height="140" alt="Little Alex Horne" /><span>LITTLE ALEX HORNE</span></div>

          {taskBroken ? (
            <div className="single-output"><p className="system-label danger">TASK BROKEN</p><h2>“{taskBrokenPatch?.label}”</h2><p>{taskBrokenPatch?.breaksTask}</p><button className="primary" onClick={retractBrokenPatch}>[retract this amendment]</button></div>
          ) : phase === "edit" ? (
            <div className="editor-output">
              <div className="editor-prompt"><p className="system-label">{area ? "mt>" : "review>"}</p><h2>{area ? `amend “${task.tokens.find((token) => token.id === selectedToken)?.text ?? area.cursor}”` : "select any wording you want to amend"}</h2>{nudge && <p>{nudge}</p>}</div>
              {area ? <><p className="area-prompt">{area.prompt}</p><div className="patch-menu">{task.patches.filter((patch) => patch.area === selectedArea).map((patch, index) => <button className={patches.includes(patch.id) ? "selected" : ""} key={patch.id} onClick={() => togglePatch(patch.id)} title={patch.whisper}><span className="key">{index + 1}</span><span>{patch.label}</span></button>)}</div></> : <p className="area-prompt">Inspect the wording, or send the original back unchanged.</p>}
              {weirdOpen && <div className="weird-box"><p>Test a move you think the current wording still allows.</p><div className="weird-line"><span>{">"}</span><select value={weirdVerb} onChange={(event) => setWeirdVerb(event.target.value)} aria-label="Attack verb">{["MOVE", "REMOVE", "ALTER", "SEPARATE", "CREATE", "USE"].map((value) => <option key={value}>{value}</option>)}</select><select value={weirdTarget} onChange={(event) => setWeirdTarget(event.target.value)} aria-label="Attack target">{task.weirdTargets.map((value) => <option key={value}>{value}</option>)}</select><button onClick={submitWeirdAttack}>RUN</button></div></div>}
              {!!snapshots.length && <div className="history-line"><span>VERSIONS</span>{snapshots.map((snapshot) => <button key={snapshot.label} onClick={() => restoreSnapshot(snapshot)}>{snapshot.label}</button>)}</div>}
              <div className="main-actions">{!!snapshots.length && <button className="quiet" onClick={() => setWeirdOpen((value) => !value)}>[I SEE ANOTHER LOOPHOLE]</button>}<button className={`primary ${guideActive ? "guide-action" : ""}`} onClick={sendToTest}>{patches.length ? "[SEND AMENDMENT FOR REVIEW]" : "[REVIEW THE ORIGINAL]"} <b>↵</b></button></div>
              {sealedCount > 0 && patches.length > 0 && !duckedPatch && <div className="duck-dock"><button className={`duck-tool ${duckDrag.active ? "dragging" : ""}`} style={{ transform: `translate(${duckDrag.x}px, ${duckDrag.y}px)` }} onPointerDown={startDuckDrag} onPointerMove={moveDuck} onPointerUp={dropDuck} onPointerCancel={() => setDuckDrag({ active: false, x: 0, y: 0 })} aria-label="Drag the pixel duck onto an amendment"><img src="duck-white-on-black.png" alt="White pixel rubber duck" /></button><span>drag onto an amendment to test without it</span></div>}
            </div>
          ) : phase === "record" ? (
            <div className="record-output">
              <p className="system-label success">AMENDMENT FILE</p><h2>{ink <= 3 ? "SURGICAL" : "REVIEW COMPLETE"}</h2><p>The amended wording has been filed.</p>
              <div className="final-task"><span>FINAL WORDING</span><b>{sentenceText}</b></div>
              <ol className="attack-log">{task.attacks.map((attack) => { const claim = claims[attack.id]; return <li key={attack.id}><span>{playerFound.includes(attack.id) ? "YOUR ATTACK" : attack.source}</span><b>{attack.title}</b><i>{claim ? `ADDRESSED BY “${patchById(task, claim.patchId).label}”` : "UNRESOLVED"}</i></li>; })}</ol>
              {!!unverified.length && <p className="unverified">UNVERIFIED: {unverified.join(" · ")}</p>}
              <details><summary>Programme record</summary><p>{task.programmeRecord}</p></details>
              <div className="main-actions"><button className="quiet" onClick={() => setPhase("edit")}>[reopen wording]</button><button className="primary" onClick={() => { reset(); setScreen("home"); }}>[close task]</button></div>
            </div>
          ) : currentAttack ? (
            <article className="attack-output" ref={attackRef}>
              <p className="system-label danger">{attackOwner === "PLAYER" ? "YOUR PROPOSED MOVE" : currentAttack.source === "PROGRAMME TEST" ? "INCIDENT ON RECORD" : "ALEX'S FOLLOW-UP"}</p><h2>{currentAttack.title.toLowerCase()}</h2><p className="attack-move"><b>{">"}</b>{currentAttack.move}</p>
              {phase === "attack" && <p className="attack-question">Run this move against the current wording.</p>}
              {outcome && <div className={`verdict verdict-${outcome.verdict.toLowerCase()}`}><b>{outcome.label ?? verdictLabel[outcome.verdict]}</b><span>{outcome.message}</span></div>}
              {nudge && <p className="nudge">{nudge}</p>}
              <div className="main-actions">{phase === "attack" && <button className="primary" onClick={runAttackTest}>[RUN TEST] <b>↵</b></button>}{phase === "verdict" && outcome?.verdict === "SEALED" && <button className="primary" onClick={counterattack}>{finished ? "[OPEN AMENDMENT FILE]" : "[LET ALEX CHECK ANOTHER READING]"} <b>↵</b></button>}{phase === "verdict" && outcome?.verdict !== "SEALED" && <button className="primary" onClick={returnToEdit}>[AMEND THE TASK] <b>↵</b></button>}</div>
            </article>
          ) : null}

          {askOpen && <form className="ask-console" onSubmit={askAlex}>
            <label htmlFor="ask-alex">alex?</label>
            <input id="ask-alex" value={askQuestion} onChange={(event) => setAskQuestion(event.target.value)} placeholder={alexIntroduced ? "ask anything" : "perhaps begin politely"} autoFocus />
            <button type="submit">[ask]</button>
            {askAnswer && <p><b>{"alex>"}</b> {askAnswer}</p>}
          </form>}
        </section>
        <footer className="workspace-foot"><span>little alex horne: {phase === "attack" || phase === "verdict" ? "reviewing" : "waiting"}</span><span><button onClick={() => setAskOpen((value) => !value)}>ASK ALEX ANYTHING!</button><button onClick={reset}>reset</button></span></footer>
      </div>
    </main>
  );
}
