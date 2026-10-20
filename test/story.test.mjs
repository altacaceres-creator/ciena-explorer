// Netlandia Quest: the story covers every network once, and the rules score, lose,
// win and unlock in order. (Plain-words checks on its text are in tech.test.mjs.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAJORS } from '../js/world.js';
import {
  STORY, STORY_ORDER, STORY_RANKS, STORY_LIVES, STORY_SECONDS, FLAWLESS_BONUS, answerPoints, newStory, loadStory,
  nextChapter, isUnlocked, rankOf, storyDone, startChallenge, answer, winChapter, restartStory,
} from '../js/story.js';

test('the story unlocks every network exactly once, side B before the ocean before side A', () => {
  assert.deepEqual([...STORY_ORDER].sort(), MAJORS.map((m) => m.id).sort());
  assert.deepEqual(Object.keys(STORY).sort(), [...STORY_ORDER].sort());
  const side = Object.fromEntries(MAJORS.map((m) => [m.id, m.side]));
  const sub = STORY_ORDER.indexOf('submarine');
  assert.ok(STORY_ORDER.slice(0, sub).every((id) => side[id] === 1), 'the packet world comes first');
  assert.ok(STORY_ORDER.slice(sub + 1).every((id) => side[id] === 0), 'the optical side comes after the crossing');
  assert.equal(STORY_RANKS.length, STORY_ORDER.length + 1);
});

test('every chapter has a villain, both readings of every line, and three answers per question', () => {
  for (const id of STORY_ORDER) {
    const ch = STORY[id];
    assert.ok(ch.villain.name && ch.villain.face, id);
    for (const k of ['taunt', 'lose', 'win', 'why']) assert.ok(ch[k].plain && ch[k].eng, `${id}.${k}`);
    assert.equal(ch.questions.length, 3, id);
    for (const q of ch.questions) {
      for (const r of ['plain', 'eng']) {
        assert.ok(q[r].q.endsWith('?'), `${id}: "${q[r].q}"`);
        assert.equal(q[r].a.length, 3, `${id}: ${q[r].q}`);
        assert.equal(new Set(q[r].a).size, 3, `${id}: answers repeat`);
      }
    }
  }
});

test('points: right answers score 100 plus a speed bonus, wrong ones nothing', () => {
  assert.equal(answerPoints(true, 0), 150);
  assert.equal(answerPoints(true, STORY_SECONDS), 100);
  assert.equal(answerPoints(true, STORY_SECONDS * 2), 100);
  assert.equal(answerPoints(false, 1), 0);
});

// a fixed shuffle: the right answer always lands first on screen
const noShuffle = () => 0.999;
const posOfRight = (c) => c.order[c.i].indexOf(0);

test('a challenge is won with every answer right, with the flawless bonus, and unlocks only the next network', () => {
  const s = newStory();
  const c = startChallenge(nextChapter(s), noShuffle);
  for (let i = 0; i < 3; i++) assert.equal(answer(c, posOfRight(c), 0).right, true);
  assert.equal(c.over, 'won');
  assert.equal(c.points, 3 * 150 + FLAWLESS_BONUS);
  winChapter(s, c);
  assert.deepEqual(s.unlocked, [STORY_ORDER[0]]);
  assert.equal(s.score, c.points);
  assert.equal(rankOf(s), STORY_RANKS[1]);
  winChapter(s, c);                                   // banking it twice changes nothing
  assert.equal(s.unlocked.length, 1);
  const skip = startChallenge(STORY_ORDER[3]);
  for (let i = 0; i < 3; i++) answer(skip, posOfRight(skip), 0);
  winChapter(s, skip);                                // out of order: not unlocked
  assert.ok(!isUnlocked(s, STORY_ORDER[3]));
});

test('two mistakes end a challenge, a timeout counts as one, and a lost one scores nothing', () => {
  const s = newStory();
  const c = startChallenge(nextChapter(s));
  answer(c, posOfRight(c), 1);
  const wrong = (posOfRight(c) + 1) % 3;
  assert.equal(answer(c, wrong, 1).right, false);
  assert.equal(c.lives, STORY_LIVES - 1);
  assert.equal(answer(c, null, STORY_SECONDS).right, false);
  assert.equal(c.over, 'lost');
  assert.equal(answer(c, 0, 0).points, 0, 'nothing after the end');
  winChapter(s, c);
  assert.equal(s.unlocked.length, 0);
  assert.equal(s.score, 0);
});

test('one mistake still wins, without the flawless bonus', () => {
  const c = startChallenge(STORY_ORDER[0], noShuffle);
  answer(c, (posOfRight(c) + 1) % 3, 0);
  answer(c, posOfRight(c), 0);
  answer(c, posOfRight(c), 0);
  assert.equal(c.over, 'won');
  assert.equal(c.points, 2 * 150);
});

test('the whole story, then saved progress is checked and a restart keeps the best score', () => {
  const s = newStory();
  for (const id of STORY_ORDER) {
    assert.equal(nextChapter(s), id);
    const c = startChallenge(id);
    for (let i = 0; i < 3; i++) answer(c, posOfRight(c), 5);
    winChapter(s, c);
  }
  assert.ok(storyDone(s));
  assert.equal(nextChapter(s), null);
  assert.equal(rankOf(s), 'Chief of the NOC');
  const back = loadStory(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(back, s);
  // a save that skips a network, or names one that doesn't exist, keeps only the part in order
  assert.deepEqual(loadStory({ unlocked: [STORY_ORDER[0], STORY_ORDER[2], 'atlantis'], score: 400 }).unlocked, [STORY_ORDER[0]]);
  assert.deepEqual(loadStory('nonsense'), newStory());
  const best = s.best;
  restartStory(s);
  assert.deepEqual([s.unlocked, s.score, s.best], [[], 0, best]);
});

test('two levels: the packet world closes with a final exam at the core, then across the ocean', async () => {
  const { STORY_LEVELS, levelOf, examAt } = await import('../js/story.js');
  assert.deepEqual(STORY_LEVELS.flatMap((l) => l.chapters), STORY_ORDER);
  assert.equal(levelOf('xhaul').n, 1);
  assert.equal(levelOf('submarine').n, 2);
  for (const l of STORY_LEVELS) assert.ok(l.name.plain && l.name.eng);
  const exam = examAt('ipcore');
  assert.equal(exam.length, 5, 'the core\'s three, plus one from the towers and one from the city');
  assert.ok(STORY.ipcore.questions.every((q) => exam.includes(q)));
  assert.equal(examAt('aggregation'), null);
  assert.equal(examAt('longhaul'), null, 'level 2 has no exam yet');
  // an exam is a challenge like any other, just longer
  const c = startChallenge('ipcore', () => 0.999, exam);
  for (let i = 0; i < exam.length; i++) answer(c, c.order[c.i].indexOf(0), 0);
  assert.equal(c.over, 'won');
  for (const id of STORY_ORDER) assert.ok(STORY[id].recap.plain.length > 150 && STORY[id].recap.eng.length > 150, `${id} has a longer recap`);
});
