const { test } = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../backend/Minesweeper-temp');
const act = (game, type, extra = {}, now = 10000) => engine.applyAction(game, { type, roundId: game.roundId, revision: game.revision, ...extra }, now);
function fixedBoard() {
  const g = engine.createGame();
  g.rows = 3; g.cols = 3; g.mineCount = 1; g.status = 'playing'; g.startedAt = 1000;
  g.board = Array.from({ length: 9 }, (_, i) => ({ mine: i === 0, adjacent: [1,3,4].includes(i) ? 1 : 0, revealed: false, flagged: false, exploded: false }));
  return g;
}
test('difficulty dimensions and ungenerated board are correct', () => {
  for (const [difficulty, spec] of Object.entries(engine.DIFFICULTIES)) {
    const g = engine.createGame(difficulty);
    assert.equal(g.board.length, spec.rows * spec.cols); assert.equal(g.mineCount, spec.mines); assert.equal(g.status, 'ready');
    assert.equal(g.board.filter(c => c.mine).length, 0);
  }
  assert.throws(() => engine.createGame('__proto__'));
});
test('first reveal and its neighbors are safe at corners, edges and center for all difficulties', () => {
  for (const difficulty of Object.keys(engine.DIFFICULTIES)) {
    for (let round = 0; round < 30; round++) {
      const g = engine.createGame(difficulty);
      const index = [0, g.cols - 1, Math.floor(g.board.length / 2), g.board.length - 1][round % 4];
      act(g, 'reveal', { index });
      assert.notEqual(g.status, 'lost'); assert.equal(g.board[index].adjacent, 0);
      assert.equal(g.board.filter(c => c.mine).length, g.mineCount);
      g.board.forEach((cell, i) => {
        if (cell.mine) return;
        let count = 0;
        for (let j = 0; j < g.board.length; j++) {
          if (g.board[j].mine && Math.abs(Math.floor(i/g.cols)-Math.floor(j/g.cols)) <= 1 && Math.abs(i%g.cols-j%g.cols) <= 1) count++;
        }
        assert.equal(cell.adjacent, count);
      });
    }
  }
});
test('flags before first reveal do not start the timer and a flagged square is protected', () => {
  const g = engine.createGame(); act(g,'flag',{index:0}); act(g,'reveal',{index:0});
  assert.equal(g.status,'ready'); assert.equal(g.startedAt,null); assert.equal(g.board[0].revealed,false);
  act(g,'flag',{index:0}); act(g,'reveal',{index:0}); assert.equal(g.startedAt,10000);
});
test('flag count cannot exceed the number of mines', () => {
  const g=engine.createGame(); for(let i=0;i<10;i++) act(g,'flag',{index:i});
  assert.throws(()=>act(g,'flag',{index:10}),/flags/); assert.equal(engine.publicState(g).minesRemaining,0);
});
test('zero flood fill opens safe neighbors and wins without requiring flags', () => {
  const g=fixedBoard(); act(g,'reveal',{index:8}); assert.equal(g.status,'won'); assert.equal(g.board.filter(c=>c.revealed).length,8);
  assert.equal(g.board[0].flagged,true); assert.equal(engine.publicState(g).minesRemaining,0);
});
test('flood fill leaves flagged safe cells closed', () => {
  const g=fixedBoard(); act(g,'flag',{index:8}); act(g,'reveal',{index:7}); assert.equal(g.status,'playing'); assert.equal(g.board[8].revealed,false);
  act(g,'flag',{index:8}); act(g,'reveal',{index:8}); assert.equal(g.status,'won');
});
test('clicking a mine ends the game and shows wrong flags', () => {
  const g=fixedBoard(); act(g,'flag',{index:8}); act(g,'reveal',{index:0});
  assert.equal(g.status,'lost'); assert.equal(g.board[0].exploded,true); assert.equal(g.endedAt,10000);
  assert.equal(engine.publicState(g).board[8].wrongFlag,true);
  assert.throws(()=>act(g,'flag',{index:1}),/ended/);
});
test('clicking a number chords only with matching flags; wrong flags can lose', () => {
  let g=fixedBoard(); act(g,'reveal',{index:4}); act(g,'chord',{index:4}); assert.equal(g.board.filter(c=>c.revealed).length,1);
  act(g,'flag',{index:0}); act(g,'reveal',{index:4}); assert.equal(g.status,'won');
  g=fixedBoard(); act(g,'reveal',{index:4}); act(g,'flag',{index:8}); act(g,'chord',{index:4}); assert.equal(g.status,'lost');
});
test('hidden cells do not leak mine locations or adjacent numbers', () => {
  const g=engine.createGame(); act(g,'reveal',{index:0});
  const p=engine.publicState(g); p.board.forEach((cell,i)=>{ if(!cell.revealed){assert.equal(cell.mine,false);assert.equal(cell.adjacent,null);} });
  assert.equal('minesweeper' in p,false); assert.equal(p.board.filter(c=>c.exploded).length,0);
});
test('elapsed time advances then stops on loss',()=>{
  const g=fixedBoard(); assert.equal(engine.publicState(g,4500).elapsedSeconds,3);
  act(g,'reveal',{index:0},6000); assert.equal(engine.publicState(g,9000).elapsedSeconds,5);
});
test('new game resets board, flags, timer and stale actions cannot alter it',()=>{
  const old=engine.createGame(); act(old,'reveal',{index:0});
  const g=act(old,'new-game',{difficulty:'expert'}); assert.notEqual(g.roundId,old.roundId);
  assert.equal(g.board.length,480); assert.equal(g.startedAt,null); assert.equal(g.status,'ready');
  assert.throws(()=>engine.applyAction(g,{type:'reveal',index:0,roundId:old.roundId,revision:old.revision}),/board changed/);
});
test('malformed moves, stale revisions and invalid difficulties are rejected without mutation',()=>{
  const g=engine.createGame(); const original=JSON.stringify(g);
  for(const index of [-1,81,1.1,'0',null]) assert.throws(()=>act(g,'reveal',{index}),/Invalid cell/);
  assert.throws(()=>act(g,'new-game',{difficulty:'unknown'})); assert.throws(()=>act(g,'hack'));
  assert.throws(()=>engine.applyAction(g,{type:'flag',index:0,roundId:g.roundId,revision:-1})); assert.equal(JSON.stringify(g),original);
});
