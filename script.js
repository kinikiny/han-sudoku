const boardEl = document.querySelector('#board');
const timerEl = document.querySelector('#timer');
const difficultyEl = document.querySelector('#difficulty');
const difficultyLabel = document.querySelector('#difficultyLabel');
const overlay = document.querySelector('#completeOverlay');
const STORAGE_KEY = 'haru-sudoku-v3';
const RANKING_KEY = 'haru-sudoku-rankings-v1';

const state = { solution: [], puzzle: [], values: [], notes: [], selected: null, history: [], hints: 3, noteMode: false, seconds: 0, running: false, started: false, nickname: '', sound: false, difficulty: 'medium' };
const labels = { easy: '?ъ?', medium: '蹂댄넻', hard: '?대젮?' };
const holes = { easy: 38, medium: 46, hard: 54 };
const blockedNicknameWords = ['?쒕컻','?⑤컻','蹂묒떊','媛쒖깉','?덈겮','吏??,'爰쇱졇','fuck','shit','bitch'];
const nicknameWords = {
  first: ['?먭툔??,'珥앸챸??,'諛섏쭩?대뒗','李⑤텇??,'?⑷컧??,'?ㅼ젙??,'?щ튌瑜?,'?몃Ⅸ'],
  second: ['?섎떖','李몄깉','怨좎뼇??,'?ъ슦','?먮떎','?좊겮','遺?됱씠','?뚭퀬??]
};

function randomNickname() {
  const first = nicknameWords.first[Math.floor(Math.random() * nicknameWords.first.length)];
  const second = nicknameWords.second[Math.floor(Math.random() * nicknameWords.second.length)];
  return `${first}${second}${Math.floor(Math.random() * 90 + 10)}`;
}
function syncStartDifficulty() {
  document.querySelectorAll('[data-start-difficulty]').forEach(button => button.classList.toggle('active', button.dataset.startDifficulty === state.difficulty));
}

function shuffled(values) { return [...values].sort(() => Math.random() - .5); }
function pattern(r, c) { return (r * 3 + Math.floor(r / 3) + c) % 9; }
function makeSolution() {
  const rows = shuffled([0,1,2]).flatMap(g => shuffled([0,1,2]).map(r => g * 3 + r));
  const cols = shuffled([0,1,2]).flatMap(g => shuffled([0,1,2]).map(c => g * 3 + c));
  const nums = shuffled([1,2,3,4,5,6,7,8,9]);
  return rows.flatMap(r => cols.map(c => nums[pattern(r, c)]));
}
function makePuzzle(solution, count) {
  const puzzle = [...solution];
  let removed = 0;
  for (const i of shuffled([...Array(81).keys()])) {
    if (removed >= count) break;
    const backup = puzzle[i]; puzzle[i] = 0;
    if (countSolutions([...puzzle], 2) !== 1) puzzle[i] = backup;
    else removed++;
  }
  return puzzle;
}
function countSolutions(grid, limit) {
  let best = -1, options = null;
  for (let i = 0; i < 81; i++) {
    if (grid[i]) continue;
    const row = Math.floor(i / 9), col = i % 9, used = new Set();
    for (let n = 0; n < 9; n++) { used.add(grid[row * 9 + n]); used.add(grid[n * 9 + col]); }
    const br = Math.floor(row / 3) * 3, bc = Math.floor(col / 3) * 3;
    for (let r = br; r < br + 3; r++) for (let c = bc; c < bc + 3; c++) used.add(grid[r * 9 + c]);
    const available = [1,2,3,4,5,6,7,8,9].filter(n => !used.has(n));
    if (!available.length) return 0;
    if (!options || available.length < options.length) { best = i; options = available; if (options.length === 1) break; }
  }
  if (best < 0) return 1;
  let total = 0;
  for (const number of options) { grid[best] = number; total += countSolutions(grid, limit - total); if (total >= limit) break; }
  grid[best] = 0; return total;
}
function newGame() {
  state.difficulty = difficultyEl.value;
  state.solution = makeSolution(); state.puzzle = makePuzzle(state.solution, holes[state.difficulty]);
  state.values = [...state.puzzle]; state.notes = Array.from({ length: 81 }, () => []);
  state.selected = null; state.history = []; state.hints = 3; state.noteMode = false; state.seconds = 0; state.running = false; state.started = false;
  overlay.hidden = true; document.querySelector('#startOverlay').hidden = false; timerEl.textContent = '00:00';
  const nicknameInput = document.querySelector('#nickname'); if (!nicknameInput.value.trim()) nicknameInput.value = state.nickname || randomNickname();
  syncStartDifficulty(); updateControls(); render(); renderRanking(); save();
}
function startGame() {
  const input = document.querySelector('#nickname'), nickname = input.value.trim();
  if (!nickname) { input.focus(); return toast('?됰꽕?꾩쓣 ?낅젰??二쇱꽭??'); }
  if (blockedNicknameWords.some(word => nickname.toLowerCase().includes(word))) {
    const warning = document.querySelector('#nicknameWarning'); warning.classList.add('error'); warning.textContent = '?ъ슜?????녿뒗 ?쒗쁽???ы븿?섏뼱 ?덉뼱?? ?ㅻⅨ ?됰꽕?꾩쓣 ?낅젰??二쇱꽭??'; input.focus(); return toast('?됰꽕?꾩쓣 ?ㅼ떆 ?뺤씤??二쇱꽭??');
  }
  state.nickname = nickname; state.started = true; state.running = true;
  document.querySelector('#startOverlay').hidden = true; save(); toast(`${nickname}?섏쓽 湲곕줉 痢≪젙???쒖옉?⑸땲??`);
}
function render() {
  boardEl.innerHTML = '';
  const selectedValue = state.selected !== null ? state.values[state.selected] : 0;
  state.values.forEach((value, i) => {
    const cell = document.createElement('button');
    const row = Math.floor(i / 9), col = i % 9;
    cell.className = 'cell'; cell.dataset.index = i; cell.role = 'gridcell';
    if (state.puzzle[i]) cell.classList.add('given');
    if (state.selected !== null) {
      const sr = Math.floor(state.selected / 9), sc = state.selected % 9;
      if (row === sr || col === sc || (Math.floor(row/3) === Math.floor(sr/3) && Math.floor(col/3) === Math.floor(sc/3))) cell.classList.add('related');
      if (i === state.selected) cell.classList.add('selected');
      else if (value && value === selectedValue) cell.classList.add('same');
    }
    if (value) {
      cell.textContent = value;
      if (!state.puzzle[i] && value !== state.solution[i]) cell.classList.add('error');
    } else if (state.notes[i].length) {
      const notes = document.createElement('span'); notes.className = 'notes';
      for (let n = 1; n <= 9; n++) notes.innerHTML += `<i>${state.notes[i].includes(n) ? n : ''}</i>`;
      cell.append(notes);
    }
    cell.setAttribute('aria-label', `${row + 1}??${col + 1}??{value ? `, ${value}` : ', 鍮덉뭏'}`);
    cell.addEventListener('click', () => { state.selected = i; render(); });
    boardEl.append(cell);
  });
  updateProgress(); updateControls();
}
function snapshot() { return { values: [...state.values], notes: state.notes.map(n => [...n]) }; }
function enterNumber(number) {
  const i = state.selected;
  if (i === null || state.puzzle[i] || !state.running) return;
  state.history.push(snapshot());
  if (state.noteMode) {
    if (state.values[i]) state.values[i] = 0;
    state.notes[i] = state.notes[i].includes(number) ? state.notes[i].filter(n => n !== number) : [...state.notes[i], number].sort();
  } else {
    state.values[i] = number; state.notes[i] = [];
    if (number === state.solution[i]) clearPeerNotes(i, number);
    else beep(130);
  }
  render(); save(); checkComplete();
}
function clearPeerNotes(index, number) {
  const r = Math.floor(index/9), c = index%9;
  state.notes.forEach((notes, i) => { const ir=Math.floor(i/9), ic=i%9; if (ir===r || ic===c || (Math.floor(ir/3)===Math.floor(r/3) && Math.floor(ic/3)===Math.floor(c/3))) state.notes[i] = notes.filter(n => n !== number); });
}
function erase() {
  const i = state.selected; if (i === null || state.puzzle[i] || !state.running || (!state.values[i] && !state.notes[i].length)) return;
  state.history.push(snapshot()); state.values[i] = 0; state.notes[i] = []; render(); save();
}
function undo() { const last = state.history.pop(); if (!last || !state.running) return; state.values = last.values; state.notes = last.notes; render(); save(); }
function hint() {
  if (!state.hints || !state.running) return toast('?ъ슜?????덈뒗 ?뚰듃媛 ?놁뼱??');
  const candidates = state.values.map((v,i) => v !== state.solution[i] ? i : -1).filter(i => i >= 0);
  if (!candidates.length) return;
  const i = candidates[Math.floor(Math.random()*candidates.length)]; state.history.push(snapshot()); state.values[i] = state.solution[i]; state.notes[i] = []; state.selected = i; state.hints--; clearPeerNotes(i, state.values[i]);
  render(); boardEl.children[i].classList.add('hinted'); save(); checkComplete();
}
function updateProgress() {
  const empties = state.values.filter(v => !v).length;
  const initial = state.puzzle.filter(v => !v).length;
  const progress = Math.round(((initial - empties) / initial) * 100);
  document.querySelector('#remainingCount').textContent = empties;
  document.querySelector('#progressText').textContent = `${progress}%`;
  document.querySelector('#progressBar').style.width = `${progress}%`;
}
function updateControls() {
  difficultyLabel.textContent = labels[state.difficulty]; document.querySelector('#hintCount').textContent = state.hints;
  difficultyEl.disabled = state.running;
  const noteBtn = document.querySelector('#noteButton'); noteBtn.classList.toggle('active', state.noteMode); noteBtn.setAttribute('aria-pressed', state.noteMode); noteBtn.querySelector('b').textContent = state.noteMode ? 'ON' : 'OFF';
  const quickNote = document.querySelector('#quickNoteButton'); quickNote.classList.toggle('active', state.noteMode); quickNote.setAttribute('aria-pressed', state.noteMode); quickNote.querySelector('b').textContent = state.noteMode ? 'ON' : 'OFF';
  document.querySelectorAll('[data-number]').forEach(button => { const number = Number(button.dataset.number); const complete = state.values.every((value,i) => state.solution[i] !== number || value === number); button.classList.toggle('completed', complete); button.setAttribute('aria-label', complete ? `${number}, ?꾨즺` : String(number)); });
  document.querySelector('#undoButton').disabled = !state.history.length;
}
function checkComplete() {
  if (state.values.every((v,i) => v === state.solution[i])) {
    state.running = false; addRanking(); document.querySelector('#completeMessage').textContent = `${state.nickname}?? ${formatTime(state.seconds)} 留뚯뿉 ?꾩꽦?덉뒿?덈떎.`; overlay.hidden = false; beep(523); setTimeout(() => beep(659), 100); setTimeout(() => beep(784), 200); save();
  }
}
function getRankings() { try { return JSON.parse(localStorage.getItem(RANKING_KEY)) || {easy:[],medium:[],hard:[]}; } catch { return {easy:[],medium:[],hard:[]}; } }
function addRanking() {
  const all = getRankings();
  all[state.difficulty].push({ nickname: state.nickname, seconds: state.seconds, date: new Date().toISOString() });
  all[state.difficulty] = all[state.difficulty].sort((a,b) => a.seconds-b.seconds).slice(0,10);
  localStorage.setItem(RANKING_KEY, JSON.stringify(all)); renderRanking();
}
function renderRanking() {
  const list = document.querySelector('#rankingList'), records = getRankings()[state.difficulty] || [];
  document.querySelector('#rankingDifficulty').textContent = labels[state.difficulty]; list.innerHTML = '';
  records.slice(0,5).forEach(record => { const li=document.createElement('li'), name=document.createElement('strong'), time=document.createElement('time'); name.textContent=record.nickname; time.textContent=formatTime(record.seconds); li.append(name,time); list.append(li); });
  document.querySelector('#rankingEmpty').hidden = records.length > 0;
}
function formatTime(seconds) { return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`; }
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify({...state, history: state.history.slice(-30)})); }
function load() {
  try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); if (!saved?.solution?.length || typeof saved.started !== 'boolean' || saved.values?.every((v,i) => v === saved.solution[i])) return false; Object.assign(state, saved); state.running = false; state.started = false; difficultyEl.value = state.difficulty; return true; } catch { return false; }
}
let toastTimer;
function toast(message) { const el = document.querySelector('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 1800); }
function beep(freq = 300) { if (!state.sound) return; const ctx = new (window.AudioContext || window.webkitAudioContext)(); const osc = ctx.createOscillator(), gain = ctx.createGain(); osc.frequency.value = freq; gain.gain.setValueAtTime(.05, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .12); osc.connect(gain).connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + .12); }

document.querySelectorAll('[data-number]').forEach(b => b.addEventListener('click', () => enterNumber(Number(b.dataset.number))));
document.querySelector('#newGame').addEventListener('click', newGame); document.querySelector('#overlayNewGame').addEventListener('click', newGame);
document.querySelector('#startButton').addEventListener('click', startGame); document.querySelector('#nickname').addEventListener('keydown', e => { if (e.key === 'Enter') startGame(); });
document.querySelector('#nickname').addEventListener('input', () => { const warning = document.querySelector('#nicknameWarning'); warning.classList.remove('error'); warning.textContent = '媛쒖씤?뺣낫 蹂댄샇瑜??꾪빐 ?ㅻ챸?대굹 遺덉풄媛먯쓣 二쇰뒗 ?쒗쁽? ?ъ슜?섏? 留덉꽭??'; });
document.querySelectorAll('[data-start-difficulty]').forEach(button => button.addEventListener('click', () => {
  difficultyEl.value = button.dataset.startDifficulty; state.difficulty = button.dataset.startDifficulty; newGame();
}));
document.querySelector('#eraseButton').addEventListener('click', erase); document.querySelector('#undoButton').addEventListener('click', undo); document.querySelector('#hintButton').addEventListener('click', hint);
document.querySelector('#noteButton').addEventListener('click', () => { state.noteMode = !state.noteMode; updateControls(); save(); });
document.querySelector('#quickNoteButton').addEventListener('click', () => { state.noteMode = !state.noteMode; updateControls(); save(); });
document.querySelector('#soundButton').addEventListener('click', e => { state.sound = !state.sound; e.currentTarget.classList.toggle('active', state.sound); e.currentTarget.setAttribute('aria-label', state.sound ? '?④낵???꾧린' : '?④낵??耳쒓린'); beep(440); save(); });
difficultyEl.addEventListener('change', () => { difficultyLabel.textContent = labels[difficultyEl.value]; state.difficulty = difficultyEl.value; syncStartDifficulty(); renderRanking(); });
document.addEventListener('keydown', e => { if (/^[1-9]$/.test(e.key)) enterNumber(Number(e.key)); else if (['Backspace','Delete','0'].includes(e.key)) erase(); else if (['n','m'].includes(e.key.toLowerCase()) && !e.target.matches('input')) { state.noteMode = !state.noteMode; updateControls(); save(); toast(`硫붾え 紐⑤뱶 ${state.noteMode ? 'ON' : 'OFF'}`); } else if (state.selected !== null && e.key.startsWith('Arrow')) { e.preventDefault(); const r=Math.floor(state.selected/9), c=state.selected%9; if(e.key==='ArrowUp'&&r)state.selected-=9;if(e.key==='ArrowDown'&&r<8)state.selected+=9;if(e.key==='ArrowLeft'&&c)state.selected--;if(e.key==='ArrowRight'&&c<8)state.selected++;render(); } });
setInterval(() => { if (state.running) { state.seconds++; timerEl.textContent = formatTime(state.seconds); if (!(state.seconds % 10)) save(); } }, 1000);
if (!load()) newGame(); else { timerEl.textContent = formatTime(state.seconds); document.querySelector('#nickname').value = state.nickname || randomNickname(); document.querySelector('#startOverlay').hidden = false; syncStartDifficulty(); document.querySelector('#soundButton').classList.toggle('active', state.sound); render(); renderRanking(); }
