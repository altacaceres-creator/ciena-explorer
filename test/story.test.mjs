// Netlandia Quest: the story covers every network once, and the rules score, lose,
// win and unlock in order. (Plain-words checks on its text are in tech.test.mjs.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAJORS } from '../js/world.js';
import {
  STORY, STAGES, STORY_ORDER, STORY_LEVELS, STORY_RANKS, STORY_LIVES, STORY_SECONDS, FLAWLESS_BONUS, answerPoints, newStory, loadStory,
  nextChapter, nextStage, isUnlocked, rankOf, storyDone, bossNext, startChallenge, answer, winStage, winChapter, winFinal, restartStory,
  levelOf, examAt, jumpTo, TEASERS, EXTRA_QUESTIONS,
  newNotebook, loadNotebook, BOARD_SIZE, boardName, loadBoard, addToBoard, noteGame, noteExam, noteAnswer, noteChapter, questionKey, questionOf,
} from '../js/story.js';
import { MINIGAMES } from '../js/minigames.js';

test('the story unlocks every network exactly once, side B before the ocean before side A', () => {
  assert.deepEqual([...STORY_ORDER].sort(), MAJORS.map((m) => m.id).sort());
  assert.deepEqual(Object.keys(STORY).sort(), [...STORY_ORDER].sort());
  const side = Object.fromEntries(MAJORS.map((m) => [m.id, m.side]));
  const sub = STORY_ORDER.indexOf('submarine');
  assert.ok(STORY_ORDER.slice(0, sub).every((id) => side[id] === 1), 'the packet world comes first');
  assert.ok(STORY_ORDER.slice(sub + 1).every((id) => side[id] === 0), 'the optical side comes after the crossing');
  assert.equal(STORY_RANKS.length, STORY_ORDER.length + 2, 'a rank per network, plus the start and beating Lord Lag');
});

test('every network has its games, every game a villain, every line both readings, and three answers per question', () => {
  const games = STORY_ORDER.flatMap((id) => STORY[id].stages);
  assert.deepEqual([...games].sort(), Object.keys(MINIGAMES).sort(), 'each game is played at exactly one stop');
  assert.deepEqual(Object.keys(STAGES).sort(), Object.keys(MINIGAMES).sort());
  for (const gid of games) {
    const st = STAGES[gid];
    assert.ok(st.villain.name && st.villain.face, gid);
    for (const k of ['taunt', 'lose', 'lesson']) assert.ok(st[k].plain && st[k].eng, `${gid}.${k}`);
  }
  for (const id of STORY_ORDER) {
    const ch = STORY[id];
    assert.ok(ch.stages.length >= 1, id);
    for (const k of ['win', 'why', 'recap']) assert.ok(ch[k].plain && ch[k].eng, `${id}.${k}`);
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
  assert.deepEqual(c.wrong, [{ i: 1, pick: c.order[1][wrong] }, { i: 2, pick: null }], 'the misses are kept for the review');
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

test('the whole story: every stop, every network, then Lord Lag; saves are checked and a restart keeps the best score', () => {
  const s = newStory();
  for (const id of STORY_ORDER) {
    assert.equal(nextChapter(s), id);
    STORY[id].stages.forEach((gid, k) => {
      assert.equal(nextStage(s), gid);
      if (k < STORY[id].stages.length - 1) winStage(s, id, 100);
    });
    assert.ok(!isUnlocked(s, id), 'not before its last stop');
    winStage(s, id, 100);                                   // the last stop is banked by winChapter, not here
    assert.equal(nextStage(s), STORY[id].stages.at(-1));
    winChapter(s, { id, over: 'won', points: 300 });
    assert.ok(isUnlocked(s, id));
    assert.equal(s.stage, 0);
  }
  assert.equal(nextChapter(s), null);
  assert.ok(bossNext(s) && !storyDone(s), 'Lord Lag is still to beat');
  assert.equal(rankOf(s), STORY_RANKS.at(-2));
  winFinal(s, 1000);
  assert.ok(storyDone(s) && !bossNext(s));
  assert.equal(rankOf(s), 'Chief of the NOC');
  const back = loadStory(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(back, s);
  // a save that skips a network, names one that doesn't exist or a stop out of range keeps only what is in order
  assert.deepEqual(loadStory({ unlocked: [STORY_ORDER[0], STORY_ORDER[2], 'atlantis'], score: 400 }).unlocked, [STORY_ORDER[0]]);
  assert.equal(loadStory({ unlocked: [], stage: 2 }).stage, 2);
  assert.equal(loadStory({ unlocked: [], stage: 9 }).stage, 0);
  assert.equal(loadStory({ unlocked: [STORY_ORDER[0]], final: true }).final, false, 'no final win without every network');
  assert.deepEqual(loadStory('nonsense'), newStory());
  const best = s.best;
  restartStory(s);
  assert.deepEqual([s.unlocked, s.stage, s.final, s.score, s.best], [[], 0, false, 0, best]);
});

test('five levels: four close with a final exam on their networks, the fifth is the fight with Lord Lag', () => {
  assert.equal(STORY_LEVELS.length, 5);
  assert.deepEqual(STORY_LEVELS.flatMap((l) => l.chapters), STORY_ORDER);
  assert.deepEqual(STORY_LEVELS.map((l) => l.n), [1, 2, 3, 4, 5]);
  assert.equal(levelOf('aggregation').n, 1);
  assert.equal(levelOf('ipcore').n, 2);
  assert.equal(levelOf('submarine').n, 3);
  assert.equal(levelOf('longhaul').n, 4);
  assert.ok(STORY_LEVELS[4].boss && !STORY_LEVELS[4].chapters.length);
  for (const l of STORY_LEVELS) assert.ok(l.name.plain && l.name.eng);
  for (const l of STORY_LEVELS.slice(0, 4)) {
    const exam = examAt(l.chapters.at(-1));
    assert.ok(exam.length >= 5, `level ${l.n} has a full exam`);
    for (const id of l.chapters) assert.ok(STORY[id].questions.every((q) => exam.includes(q)), `level ${l.n} asks about ${id}`);
    for (const q of exam) for (const r of ['plain', 'eng']) assert.equal(new Set(q[r].a).size, 3);
    if (l.chapters.length > 1) assert.equal(examAt(l.chapters[0]), null, 'only at the level\'s last network');
  }
  // an exam is a challenge like any other, just longer
  const exam = examAt('ipcore');
  const c = startChallenge('ipcore', () => 0.999, exam);
  for (let i = 0; i < exam.length; i++) answer(c, c.order[c.i].indexOf(0), 0);
  assert.equal(c.over, 'won');
  for (const id of STORY_ORDER) assert.ok(STORY[id].recap.plain.length > 150 && STORY[id].recap.eng.length > 150, `${id} has a longer recap`);
});

test('every network has a riddle that does not give its name away, and the dev menu can jump to any stop', () => {
  for (const id of STORY_ORDER) for (const r of ['plain', 'eng']) assert.ok(TEASERS[id][r].length > 20, `${id}.${r}`);
  const s = newStory();
  jumpTo(s, 'ipcore');
  assert.deepEqual([s.unlocked, s.stage, nextChapter(s), nextStage(s)], [['aggregation', 'xhaul'], 0, 'ipcore', 'firewall']);
  jumpTo(s, 'aggregation', 2);
  assert.deepEqual([s.unlocked, nextStage(s)], [[], 'storm']);
  jumpTo(s, 'submarine', 9);
  assert.equal(nextStage(s), 'cablelayer', 'a stop out of range is the last one');
  jumpTo(s, null);
  assert.ok(bossNext(s) && !storyDone(s));
  assert.deepEqual(loadStory(JSON.parse(JSON.stringify(s))), s, 'a jump saves like any other progress');
});

test('two scores, knowledge and games, add up to the score; old saves count as games', () => {
  const s = newStory();
  winStage(s, 'aggregation', 300);
  winStage(s, 'aggregation', 200);
  winChapter(s, { id: 'aggregation', over: 'won', points: 450 }, 250);
  assert.deepEqual([s.play, s.know, s.score, s.best], [750, 450, 1200, 1200]);
  jumpTo(s, null);
  winFinal(s, 1000);
  assert.deepEqual([s.play, s.know, s.score], [1750, 450, 2200]);
  assert.deepEqual(loadStory(JSON.parse(JSON.stringify(s))), s);
  const old = loadStory({ unlocked: ['aggregation'], score: 900, best: 1500 });
  assert.deepEqual([old.play, old.know, old.score, old.best], [900, 0, 900, 1500]);
  restartStory(s);
  assert.deepEqual([s.play, s.know, s.score, s.best], [0, 0, 0, 2200]);
});

test('the notebook keeps every game and exam tried, every miss (even once fixed) and survives a reload', () => {
  const nb = newNotebook();
  noteGame(nb, 'tetris', false); noteGame(nb, 'tetris', false); noteGame(nb, 'tetris', true);
  noteExam(nb, 'aggregation', false); noteExam(nb, 'aggregation', true);
  const q = STORY.ipcore.questions[1], x = EXTRA_QUESTIONS.sea[0];
  noteAnswer(nb, q, false, 2); noteAnswer(nb, q, false, null); noteAnswer(nb, q, true, 0);
  noteAnswer(nb, x, false, 1);
  noteAnswer(nb, STORY.metro.questions[0], true, 0);            // right first time: nothing to note
  noteChapter(nb, 'xhaul'); noteChapter(nb, 'aggregation'); noteChapter(nb, 'aggregation');
  assert.deepEqual(nb.games.tetris, { tries: 3, wins: 1 });
  assert.deepEqual(nb.exams.aggregation, { tries: 2, wins: 1 });
  assert.deepEqual(nb.misses[questionKey(q)], { times: 2, picks: [2, null], fixed: true });
  assert.deepEqual(Object.keys(nb.misses).sort(), ['extra.sea.0', 'ipcore.1']);
  assert.equal(questionOf('extra.sea.0'), x);
  assert.deepEqual(nb.won, ['aggregation', 'xhaul'], 'in story order, once each');
  const ids = Object.keys(MINIGAMES);
  assert.deepEqual(loadNotebook(JSON.parse(JSON.stringify(nb)), ids), nb);
  // anything that doesn't exist any more is dropped
  const odd = loadNotebook({ games: { tetris: { tries: 2, wins: 1 }, pong: { tries: 1 } }, exams: { atlantis: {} }, misses: { 'ipcore.9': { times: 1 }, 'ipcore.0': { times: 2, picks: [7, 1] } }, won: ['atlantis', 'metro'] }, ids);
  assert.deepEqual(odd, { games: { tetris: { tries: 2, wins: 1 } }, exams: {}, misses: { 'ipcore.0': { times: 2, picks: [1], fixed: false } }, won: ['metro'] });
  assert.deepEqual(loadNotebook('nonsense', ids), newNotebook());
});

test('the board keeps the ten best runs with their two scores, and only clean names', () => {
  const board = [];
  const run = (score, know = 0) => ({ ...newStory(), score, know, play: score - know, unlocked: ['aggregation'] });
  assert.equal(addToBoard(board, 'Ana', run(500, 200), 1), 0);
  assert.equal(addToBoard(board, 'Bo', run(900), 2), 0, 'a better run goes on top');
  assert.equal(addToBoard(board, 'Cy', run(500), 3), 2, 'a tie goes after the earlier run');
  assert.equal(addToBoard(board, '', run(800), 4), -1, 'no name, no place');
  assert.equal(addToBoard(board, 'Zero', run(0), 5), -1, 'no points, no place');
  assert.deepEqual(board[1], { name: 'Ana', score: 500, know: 200, play: 300, rank: STORY_RANKS[1], at: 1 });
  for (let i = 0; i < 12; i++) addToBoard(board, `P${i}`, run(1000 + i), 10 + i);
  assert.equal(board.length, BOARD_SIZE);
  assert.equal(board[0].name, 'P11');
  assert.equal(addToBoard(board, 'Late', run(10), 99), -1, 'too low for the top ten');
  assert.deepEqual(loadBoard(JSON.parse(JSON.stringify(board))), board);
  assert.equal(boardName('  María   José <3 López!! '), 'María José 3');
  assert.deepEqual(loadBoard([{ name: '<>', score: 50 }, { name: 'Ok', score: -3 }, 'junk', { name: 'Fine', score: 70.4, rank: 'Emperor' }]), [{ name: 'Fine', score: 70, know: 0, play: 0, rank: STORY_RANKS[0], at: 0 }]);
  assert.deepEqual(loadBoard('nonsense'), []);
});
