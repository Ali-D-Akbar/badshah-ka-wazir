const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('/health', (_, res) => res.json({ ok: true }));
app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

const rooms = {};
const MIN_PLAYERS = 4;
const MAX_PLAYERS_LIMIT = 12;
const ROLE_REVEAL_DURATION = 6000;

function genCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function assignRoles(playerIds, enableMukhbir) {
  const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
  const n = shuffled.length;
  const map = {};
  shuffled.forEach((id, i) => {
    if (i === 0) map[id] = 'Badshah';
    else if (i === 1) map[id] = 'Wazir';
    else if (i === n - 1) map[id] = 'Chor';
    else if (enableMukhbir && n >= 6 && i === n - 2) map[id] = 'Mukhbir';
    else map[id] = 'Sipahi';
  });
  return map;
}

function calcPoints(role, wazirCorrect) {
  if (role === 'Badshah') return 70;
  if (role === 'Wazir') return wazirCorrect ? 70 : 0;
  if (role === 'Sipahi') return 50;
  if (role === 'Mukhbir') return wazirCorrect ? 0 : 80;
  if (role === 'Chor') return wazirCorrect ? 0 : 80;
  return 0;
}

function publicRoom(code) {
  const r = rooms[code];
  return {
    code: r.code,
    host: r.host,
    players: r.players.map(p => ({ id: p.id, name: p.name, score: p.score })),
    state: r.state,
    round: r.round,
    totalRounds: r.totalRounds,
    maxPlayers: r.maxPlayers,
    enableMukhbir: r.enableMukhbir,
    guessingTimer: r.guessingTimer,
  };
}

function processGuess(code, guessId, timedOut) {
  const r = rooms[code];
  if (!r || r.state !== 'guessing') return;

  if (r.guessingTimeout) { clearTimeout(r.guessingTimeout); r.guessingTimeout = null; }

  const isCorrect = guessId === r.chorId;
  const roundResult = {};

  r.players.forEach(p => {
    const pts = calcPoints(r.roles[p.id], isCorrect);
    p.score += pts;
    roundResult[p.id] = { role: r.roles[p.id], pts, name: p.name };
  });

  r.state = 'round_result';

  io.to(code).emit('round_result', {
    roundResult,
    scores: r.players.map(p => ({ id: p.id, name: p.name, score: p.score })),
    isCorrect,
    timedOut: !!timedOut,
    guessedName: r.players.find(p => p.id === guessId)?.name,
    chorName:    r.players.find(p => p.id === r.chorId)?.name,
    wazirName:   r.players.find(p => p.id === r.wazirId)?.name,
    mukhbirName: r.mukhbirId ? r.players.find(p => p.id === r.mukhbirId)?.name : null,
    chorId: r.chorId,
    round: r.round,
    totalRounds: r.totalRounds,
  });
}

function startRound(code) {
  const r = rooms[code];
  r.round++;
  r.state = 'role_reveal';
  if (r.guessingTimeout) { clearTimeout(r.guessingTimeout); r.guessingTimeout = null; }

  const ids = r.players.map(p => p.id);
  r.roles = assignRoles(ids, r.enableMukhbir);
  r.wazirId   = ids.find(id => r.roles[id] === 'Wazir');
  r.badshahId = ids.find(id => r.roles[id] === 'Badshah');
  r.chorId    = ids.find(id => r.roles[id] === 'Chor');
  r.mukhbirId = ids.find(id => r.roles[id] === 'Mukhbir') || null;

  const badshahName = r.players.find(p => p.id === r.badshahId)?.name;
  const chorName    = r.players.find(p => p.id === r.chorId)?.name;

  r.players.forEach(p => {
    io.to(p.id).emit('role_assigned', {
      role: r.roles[p.id],
      round: r.round,
      totalRounds: r.totalRounds,
      players: r.players.map(pl => ({ id: pl.id, name: pl.name, score: pl.score })),
      badshahId: r.badshahId,
      badshahName,
      wazirId: r.wazirId,
      secretChorName: r.roles[p.id] === 'Mukhbir' ? chorName : null,
      enableMukhbir: r.enableMukhbir,
      guessingTimer: r.guessingTimer,
    });
  });

  setTimeout(() => {
    if (!rooms[code] || r.state !== 'role_reveal') return;
    r.state = 'guessing';
    const wazirName = r.players.find(p => p.id === r.wazirId)?.name;
    io.to(code).emit('guessing_phase', {
      wazirId: r.wazirId,
      wazirName,
      badshahId: r.badshahId,
      players: r.players.map(p => ({ id: p.id, name: p.name })),
      enableMukhbir: r.enableMukhbir,
      guessingTimer: r.guessingTimer,
    });

    if (r.guessingTimer) {
      r.guessingTimeout = setTimeout(() => {
        if (!rooms[code] || r.state !== 'guessing') return;
        // Timer expired: Wazir picks random non-Chor → Chor escapes
        const wrongGuess = r.players.find(p => p.id !== r.chorId && p.id !== r.wazirId && p.id !== r.badshahId);
        processGuess(code, wrongGuess?.id || r.players[0].id, true);
      }, r.guessingTimer * 1000);
    }
  }, ROLE_REVEAL_DURATION);
}

io.on('connection', (socket) => {
  console.log('+ connect', socket.id);

  socket.on('create_room', ({ name, totalRounds, maxPlayers, enableMukhbir, guessingTimer }) => {
    const code = genCode();
    rooms[code] = {
      code,
      host: socket.id,
      players: [{ id: socket.id, name, score: 0 }],
      state: 'waiting',
      round: 0,
      totalRounds: Math.min(25, Math.max(5, totalRounds || 10)),
      maxPlayers: Math.min(MAX_PLAYERS_LIMIT, Math.max(MIN_PLAYERS, maxPlayers || 8)),
      enableMukhbir: !!enableMukhbir,
      guessingTimer: guessingTimer || null,
      roles: {},
      wazirId: null, badshahId: null, chorId: null, mukhbirId: null,
      guessingTimeout: null,
      chat: [],
    };
    socket.join(code);
    socket.data.code = code;
    socket.emit('room_created', { code });
    io.to(code).emit('room_update', publicRoom(code));
  });

  socket.on('join_room', ({ name, code }) => {
    const r = rooms[code];
    if (!r) return socket.emit('error', { message: 'Room not found' });
    if (r.players.length >= r.maxPlayers) return socket.emit('error', { message: `Room is full (max ${r.maxPlayers})` });
    if (r.state !== 'waiting') return socket.emit('error', { message: 'Game already started' });
    r.players.push({ id: socket.id, name, score: 0 });
    socket.join(code);
    socket.data.code = code;
    socket.emit('room_joined', { code });
    io.to(code).emit('room_update', publicRoom(code));
  });

  socket.on('start_game', ({ code }) => {
    const r = rooms[code];
    if (!r || r.host !== socket.id) return;
    if (r.players.length < MIN_PLAYERS) return socket.emit('error', { message: `Need at least ${MIN_PLAYERS} players` });
    startRound(code);
  });

  socket.on('wazir_guess', ({ code, guessId }) => {
    const r = rooms[code];
    if (!r || r.state !== 'guessing' || r.wazirId !== socket.id) return;
    processGuess(code, guessId, false);
  });

  socket.on('send_message', ({ code, text }) => {
    const r = rooms[code];
    if (!r) return;
    const player = r.players.find(p => p.id === socket.id);
    if (!player || !text?.trim()) return;
    const msg = {
      id: Date.now() + Math.random(),
      playerId: socket.id,
      playerName: player.name,
      text: text.trim().slice(0, 200),
      timestamp: Date.now(),
    };
    r.chat.push(msg);
    if (r.chat.length > 100) r.chat.shift();
    io.to(code).emit('chat_message', msg);
  });

  socket.on('next_round', ({ code }) => {
    const r = rooms[code];
    if (!r || r.host !== socket.id || r.state !== 'round_result') return;
    if (r.round >= r.totalRounds) {
      r.state = 'game_over';
      io.to(code).emit('game_over', {
        scores: [...r.players].sort((a, b) => b.score - a.score)
          .map(p => ({ id: p.id, name: p.name, score: p.score }))
      });
    } else {
      startRound(code);
    }
  });

  socket.on('disconnect', () => {
    const code = socket.data.code;
    if (!code || !rooms[code]) return;
    const r = rooms[code];
    const player = r.players.find(p => p.id === socket.id);
    if (!player) return;
    const name = player.name;
    r.players = r.players.filter(p => p.id !== socket.id);
    if (r.players.length === 0) { delete rooms[code]; return; }
    if (r.host === socket.id) r.host = r.players[0].id;
    io.to(code).emit('room_update', publicRoom(code));
    io.to(code).emit('player_left', { name });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Badshah server on :${PORT}`));
