import { useState, useEffect, useRef } from 'react';
import { socket } from './socket';

const ROLE_CONFIG = {
  Badshah: { emoji: '👑', color: 'text-yellow-400', border: 'border-yellow-600', urdu: 'بادشاہ', pts: '70 pts always' },
  Wazir:   { emoji: '🧠', color: 'text-green-400',  border: 'border-green-600',  urdu: 'وزیر',   pts: '70 correct / 0 wrong' },
  Sipahi:  { emoji: '⚔️', color: 'text-blue-400',   border: 'border-blue-600',   urdu: 'سپاہی',  pts: '55 caught / 35 escaped' },
  Mukhbir: { emoji: '🕵️', color: 'text-purple-400', border: 'border-purple-600', urdu: 'مخبر',   pts: '80 if Chor escapes / 0 caught' },
  Chor:    { emoji: '🦹', color: 'text-red-400',    border: 'border-red-600',    urdu: 'چور',    pts: '80 escaped / 0 caught' },
};

const MIN_PLAYERS = 4;
const MAX_PLAYERS_LIMIT = 12;

function Countdown({ seconds }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-400">
      <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
      Guessing phase in {seconds}s…
    </div>
  );
}

// ─── Home ─────────────────────────────────────────────────────────────────────
function HomeScreen({ onCreateRoom, onJoinRoom, error }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState(null);
  const [rounds, setRounds] = useState(10);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [enableMukhbir, setEnableMukhbir] = useState(false);

  return (
    <div className="fade-in flex flex-col items-center gap-6 py-10 px-4 max-w-sm mx-auto">
      <div className="text-center">
        <div className="text-6xl mb-3">👑</div>
        <h1 className="text-3xl font-bold text-yellow-400">بادشاہ کا وزیر</h1>
        <p className="text-gray-400 mt-1 text-sm">4–{MAX_PLAYERS_LIMIT} Players · 5–25 Rounds</p>
      </div>

      <div className="card w-full p-6 flex flex-col gap-4">
        <input
          className="input-field"
          placeholder="Your name…"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={20}
        />

        {mode === 'join' && (
          <input
            className="input-field tracking-widest text-center text-xl uppercase"
            placeholder="Room code"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase().slice(0, 6))}
            maxLength={6}
          />
        )}

        {mode === 'create' && (
          <div className="flex flex-col gap-3 pt-1 border-t border-gray-700">
            <p className="text-gray-400 text-xs uppercase tracking-widest">Room Settings</p>

            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-300">Rounds</label>
              <div className="flex items-center gap-2">
                <button className="w-7 h-7 rounded-full bg-gray-700 text-white text-sm hover:bg-gray-600"
                  onClick={() => setRounds(r => Math.max(5, r - 5))}>−</button>
                <span className="w-8 text-center font-bold text-yellow-400">{rounds}</span>
                <button className="w-7 h-7 rounded-full bg-gray-700 text-white text-sm hover:bg-gray-600"
                  onClick={() => setRounds(r => Math.min(25, r + 5))}>+</button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-300">Max Players</label>
              <div className="flex items-center gap-2">
                <button className="w-7 h-7 rounded-full bg-gray-700 text-white text-sm hover:bg-gray-600"
                  onClick={() => setMaxPlayers(p => Math.max(4, p - 1))}>−</button>
                <span className="w-8 text-center font-bold text-yellow-400">{maxPlayers}</span>
                <button className="w-7 h-7 rounded-full bg-gray-700 text-white text-sm hover:bg-gray-600"
                  onClick={() => setMaxPlayers(p => Math.min(MAX_PLAYERS_LIMIT, p + 1))}>+</button>
              </div>
            </div>

            <button
              onClick={() => setEnableMukhbir(v => !v)}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all ${enableMukhbir ? 'border-purple-600 bg-purple-900/30' : 'border-gray-700 bg-transparent'}`}
            >
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-200">🕵️ Mukhbir (Spy) Role</p>
                <p className="text-xs text-gray-500">For 6+ players. Spy secretly aids Chor.</p>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${enableMukhbir ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
                {enableMukhbir ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>
        )}

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <div className="flex flex-col gap-3 mt-1">
          {mode !== 'join' && (
            <button
              className="btn-gold w-full text-lg"
              disabled={!name.trim()}
              onClick={() => mode === 'create'
                ? onCreateRoom(name.trim(), rounds, maxPlayers, enableMukhbir)
                : setMode('create')}
            >
              {mode === 'create' ? 'Create Room →' : '+ Create Room'}
            </button>
          )}
          {mode !== 'create' && (
            <button
              className="btn-outline w-full text-lg"
              disabled={mode === 'join' && (!name.trim() || code.length < 6)}
              onClick={() => mode === 'join' ? onJoinRoom(name.trim(), code) : setMode('join')}
            >
              {mode === 'join' ? 'Join →' : 'Join Room'}
            </button>
          )}
          {mode && <button className="text-gray-500 text-sm" onClick={() => setMode(null)}>← Back</button>}
        </div>
      </div>

      <div className="card w-full p-4 text-xs text-gray-400 space-y-1">
        <p className="font-semibold text-gray-300 mb-1">Points (refined):</p>
        <p>👑 Badshah → 70 (always)</p>
        <p>🧠 Wazir → 70 correct / 0 wrong</p>
        <p>⚔️ Sipahi → 55 caught / 35 escaped</p>
        <p>🕵️ Mukhbir → 80 escaped / 0 caught <span className="text-purple-400">(spy for Chor)</span></p>
        <p>🦹 Chor → 80 escaped / 0 caught</p>
      </div>
    </div>
  );
}

// ─── Lobby ────────────────────────────────────────────────────────────────────
function LobbyScreen({ roomCode, players, isHost, myId, onStart, error, roomSettings }) {
  const [copied, setCopied] = useState(false);
  const { totalRounds, maxPlayers, enableMukhbir } = roomSettings || {};

  function copy() {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fade-in flex flex-col items-center gap-5 py-8 px-4 max-w-sm mx-auto">
      <div className="text-center">
        <p className="text-gray-400 text-sm uppercase tracking-widest mb-1">Room Code</p>
        <button onClick={copy} className="text-5xl font-bold text-yellow-400 tracking-widest hover:text-yellow-300 transition-colors">
          {roomCode}
        </button>
        <p className="text-gray-500 text-xs mt-1">{copied ? '✓ Copied!' : 'tap to copy'}</p>
      </div>

      <div className="flex gap-3 text-xs">
        <span className="card px-3 py-1 text-yellow-400">{totalRounds} rounds</span>
        <span className="card px-3 py-1 text-blue-400">max {maxPlayers} players</span>
        {enableMukhbir && <span className="card px-3 py-1 text-purple-400">🕵️ Mukhbir ON</span>}
      </div>

      <div className="card w-full p-4">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-3">Players ({players.length}/{maxPlayers})</p>
        <div className="flex flex-col gap-2">
          {players.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3">
              <span className="text-gray-500 w-4 text-sm">{i + 1}.</span>
              <span className={`font-medium ${p.id === myId ? 'text-yellow-400' : 'text-gray-200'}`}>
                {p.name} {p.id === myId && '(you)'}
              </span>
              {i === 0 && <span className="ml-auto text-xs text-gray-500">host</span>}
            </div>
          ))}
          {players.length < MIN_PLAYERS && Array.from({ length: MIN_PLAYERS - players.length }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 opacity-30">
              <span className="text-gray-500 w-4 text-sm">{players.length + i + 1}.</span>
              <span className="text-gray-500 italic text-sm">waiting…</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-gray-500 text-xs text-center">Game starts with {MIN_PLAYERS}+ players · extra players become Sipahi</p>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {isHost ? (
        <button className="btn-gold w-full text-lg pulse-gold" disabled={players.length < MIN_PLAYERS} onClick={onStart}>
          {players.length >= MIN_PLAYERS ? `Start Game 🎮 (${players.length} players)` : `Need ${MIN_PLAYERS - players.length} more…`}
        </button>
      ) : (
        <p className="text-gray-400 text-sm">Waiting for host to start…</p>
      )}
    </div>
  );
}

// ─── Role Reveal ──────────────────────────────────────────────────────────────
function RoleRevealScreen({ myRole, round, totalRounds, badshahName, myId, badshahId, countdown, secretChorName, enableMukhbir }) {
  const cfg = ROLE_CONFIG[myRole] || ROLE_CONFIG.Sipahi;

  return (
    <div className="fade-in flex flex-col items-center gap-5 py-10 px-4 max-w-sm mx-auto">
      <div className="flex justify-between w-full text-sm text-gray-400">
        <span>Round {round} of {totalRounds}</span>
        <Countdown seconds={countdown} />
      </div>

      <p className="text-gray-300 text-lg">Your role this round:</p>

      <div className={`role-reveal card p-8 flex flex-col items-center gap-4 w-full border-2 ${cfg.border}`}>
        <span className="text-8xl">{cfg.emoji}</span>
        <div className="text-center">
          <p className={`text-4xl font-bold ${cfg.color}`}>{myRole}</p>
          <p className={`text-2xl ${cfg.color} mt-1`}>{cfg.urdu}</p>
          <p className="text-gray-400 text-sm mt-2">{cfg.pts}</p>
        </div>
      </div>

      {myId !== badshahId && (
        <div className="card w-full p-4 text-center">
          <p className="text-gray-400 text-sm">Known to all:</p>
          <p className="text-yellow-400 font-bold mt-1">👑 Badshah: <span className="text-white">{badshahName}</span></p>
        </div>
      )}

      {myRole === 'Mukhbir' && secretChorName && (
        <div className="card w-full p-4 text-center border border-purple-700">
          <p className="text-purple-400 font-semibold">You are the Mukhbir! 🕵️</p>
          <p className="text-gray-300 text-sm mt-1">The Chor is: <span className="text-red-400 font-bold">{secretChorName}</span></p>
          <p className="text-gray-500 text-xs mt-1">Help them escape — but don't get caught helping.</p>
        </div>
      )}
      {myRole === 'Wazir' && (
        <div className="card w-full p-4 text-center border border-green-800">
          <p className="text-green-400 font-semibold">You are the Wazir! 🧠</p>
          <p className="text-gray-400 text-xs mt-1">
            Identify the Chor.{enableMukhbir ? ' Watch out — a Mukhbir may be misleading you.' : ''}
          </p>
        </div>
      )}
      {myRole === 'Chor' && (
        <div className="card w-full p-4 text-center border border-red-800">
          <p className="text-red-400 font-semibold">You are the Chor! 🦹</p>
          <p className="text-gray-400 text-xs mt-1">Stay calm. Don't react. {enableMukhbir ? 'A Mukhbir secretly has your back.' : ''}</p>
        </div>
      )}
    </div>
  );
}

// ─── Guessing Phase ───────────────────────────────────────────────────────────
function GuessingScreen({ myId, wazirId, wazirName, badshahId, players, myRole, onGuess, enableMukhbir }) {
  const isWazir = myId === wazirId;
  const cfg = ROLE_CONFIG[myRole] || ROLE_CONFIG.Sipahi;
  const guessTargets = players.filter(p => p.id !== badshahId && p.id !== wazirId);

  if (isWazir) {
    return (
      <div className="fade-in flex flex-col items-center gap-6 py-10 px-4 max-w-sm mx-auto">
        <div className="text-center">
          <span className="text-5xl">🧠</span>
          <h2 className="text-2xl font-bold text-green-400 mt-2">You are Wazir</h2>
          <p className="text-gray-300 mt-1">Who is the <span className="text-red-400 font-bold">Chor</span>?</p>
          {enableMukhbir && <p className="text-purple-400 text-xs mt-1">⚠️ A Mukhbir may be among them, misleading you</p>}
        </div>

        <div className="flex flex-col gap-3 w-full">
          {guessTargets.map(p => (
            <button
              key={p.id}
              onClick={() => onGuess(p.id)}
              className="card w-full p-5 text-left flex items-center gap-4 border border-transparent hover:border-yellow-600 hover:bg-yellow-900/20 transition-all group"
            >
              <span className="text-3xl">🎭</span>
              <div>
                <p className="font-bold text-white text-lg group-hover:text-yellow-400 transition-colors">{p.name}</p>
                <p className="text-gray-500 text-xs">Tap to accuse as Chor</p>
              </div>
              <span className="ml-auto text-gray-600 group-hover:text-yellow-400">→</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in flex flex-col items-center gap-6 py-10 px-4 max-w-sm mx-auto">
      <div className="text-center">
        <div className="text-5xl mb-2">⏳</div>
        <h2 className="text-xl font-bold text-gray-300">Wazir is deciding…</h2>
        <p className="text-green-400 font-semibold mt-1">{wazirName}</p>
      </div>
      <div className={`card w-full p-6 text-center border-2 ${cfg.border}`}>
        <p className="text-gray-400 text-sm mb-2">Your role:</p>
        <span className="text-5xl">{cfg.emoji}</span>
        <p className={`text-2xl font-bold ${cfg.color} mt-2`}>{myRole}</p>
        {myRole === 'Chor' && <p className="text-red-400 text-xs mt-2 italic">Stay calm. 🤫</p>}
        {myRole === 'Mukhbir' && <p className="text-purple-400 text-xs mt-2 italic">Act like Sipahi. Help Chor escape. 🕵️</p>}
      </div>
    </div>
  );
}

// ─── Round Result ─────────────────────────────────────────────────────────────
function RoundResultScreen({ roundResult, scores, isCorrect, guessedName, chorName, wazirName, mukhbirName, round, totalRounds, isHost, myId, onNext }) {
  return (
    <div className="fade-in flex flex-col items-center gap-5 py-8 px-4 max-w-sm mx-auto">
      <div className="text-center">
        <p className="text-gray-400 text-sm">Round {round} of {totalRounds}</p>
        <div className={`text-4xl font-bold mt-2 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
          {isCorrect ? '✅ Caught!' : '❌ Escaped!'}
        </div>
        <p className="text-gray-300 mt-2 text-sm">
          {isCorrect
            ? `${wazirName} caught ${chorName}!`
            : `${wazirName} guessed ${guessedName} — ${chorName} escapes!`}
        </p>
        {mukhbirName && !isCorrect && (
          <p className="text-purple-400 text-xs mt-1">🕵️ {mukhbirName} (Mukhbir) helped Chor escape</p>
        )}
        {mukhbirName && isCorrect && (
          <p className="text-purple-400 text-xs mt-1">🕵️ {mukhbirName} (Mukhbir) failed to protect Chor</p>
        )}
      </div>

      <div className="card w-full p-4">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-3">Roles this round</p>
        <div className="flex flex-col gap-2">
          {Object.values(roundResult).map(({ name, role, pts }) => {
            const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.Sipahi;
            return (
              <div key={name} className="flex items-center gap-3">
                <span className="text-xl">{cfg.emoji}</span>
                <span className="font-medium text-gray-200 flex-1">{name}</span>
                <span className={`text-sm font-semibold ${cfg.color}`}>{role}</span>
                <span className={`text-sm font-bold w-16 text-right ${pts > 0 ? 'text-green-400' : 'text-gray-500'}`}>+{pts}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card w-full p-4">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-3">Scoreboard</p>
        <div className="flex flex-col gap-2">
          {[...scores].sort((a, b) => b.score - a.score).map((p, i) => (
            <div key={p.id} className="flex items-center gap-3">
              <span className="text-gray-500 w-4 text-sm">{i + 1}.</span>
              <span className={`flex-1 font-medium ${p.id === myId ? 'text-yellow-400' : 'text-gray-200'}`}>
                {p.name} {p.id === myId && '(you)'}
              </span>
              <span className="font-bold text-white">{p.score}</span>
            </div>
          ))}
        </div>
      </div>

      {isHost ? (
        <button className="btn-gold w-full" onClick={onNext}>
          {round >= totalRounds ? 'See Final Results 🏆' : 'Next Round →'}
        </button>
      ) : (
        <p className="text-gray-400 text-sm">Waiting for host…</p>
      )}
    </div>
  );
}

// ─── Game Over ─────────────────────────────────────────────────────────────────
function GameOverScreen({ scores, myId, onPlayAgain }) {
  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔟', '🔟'];
  return (
    <div className="fade-in flex flex-col items-center gap-6 py-12 px-4 max-w-sm mx-auto">
      <div className="text-center">
        <div className="text-6xl mb-2">🏆</div>
        <h1 className="text-3xl font-bold text-yellow-400">Game Over!</h1>
        <p className="text-gray-400 mt-1">Final Rankings</p>
      </div>
      <div className="card w-full p-4">
        <div className="flex flex-col gap-3">
          {scores.map((p, i) => (
            <div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl ${i === 0 ? 'bg-yellow-900/30 border border-yellow-700' : ''}`}>
              <span className="text-2xl">{medals[i] || '·'}</span>
              <span className={`flex-1 font-bold text-lg ${p.id === myId ? 'text-yellow-400' : 'text-gray-200'}`}>
                {p.name} {p.id === myId && '(you)'}
              </span>
              <span className={`text-xl font-bold ${i === 0 ? 'text-yellow-400' : 'text-white'}`}>{p.score}</span>
            </div>
          ))}
        </div>
      </div>
      <button className="btn-gold w-full text-lg" onClick={onPlayAgain}>Play Again 🔄</button>
    </div>
  );
}

// ─── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState('home');
  const [myId, setMyId] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState('');
  const [roomSettings, setRoomSettings] = useState({ totalRounds: 10, maxPlayers: 8, enableMukhbir: false });

  const [myRole, setMyRole] = useState('');
  const [round, setRound] = useState(0);
  const [badshahId, setBadshahId] = useState('');
  const [badshahName, setBadshahName] = useState('');
  const [wazirId, setWazirId] = useState('');
  const [wazirName, setWazirName] = useState('');
  const [secretChorName, setSecretChorName] = useState(null);
  const [countdown, setCountdown] = useState(6);

  const [guessingPlayers, setGuessingPlayers] = useState([]);
  const [enableMukhbirRound, setEnableMukhbirRound] = useState(false);

  const [roundResult, setRoundResult] = useState(null);
  const [scores, setScores] = useState([]);
  const [isCorrect, setIsCorrect] = useState(false);
  const [guessedName, setGuessedName] = useState('');
  const [chorName, setChorName] = useState('');
  const [mukhbirName, setMukhbirName] = useState(null);
  const [currentRound, setCurrentRound] = useState(0);

  const [finalScores, setFinalScores] = useState([]);
  const countdownRef = useRef(null);

  useEffect(() => {
    socket.connect();
    socket.on('connect', () => setMyId(socket.id));

    socket.on('room_created', ({ code }) => { setRoomCode(code); setIsHost(true); setError(''); setScreen('lobby'); });
    socket.on('room_joined',  ({ code }) => { setRoomCode(code); setError(''); setScreen('lobby'); });

    socket.on('room_update', (room) => {
      setPlayers(room.players);
      setIsHost(room.host === socket.id);
      setRoomSettings({ totalRounds: room.totalRounds, maxPlayers: room.maxPlayers, enableMukhbir: room.enableMukhbir });
    });

    socket.on('error', ({ message }) => setError(message));
    socket.on('player_left', ({ name }) => setError(`${name} left the game`));

    socket.on('role_assigned', ({ role, round, totalRounds, players, badshahId, badshahName, wazirId, secretChorName, enableMukhbir }) => {
      setMyRole(role);
      setRound(round);
      setPlayers(players);
      setBadshahId(badshahId);
      setBadshahName(badshahName);
      setWazirId(wazirId);
      setSecretChorName(secretChorName || null);
      setRoomSettings(s => ({ ...s, totalRounds, enableMukhbir }));
      setError('');
      let t = 6;
      setCountdown(t);
      clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => { t--; setCountdown(t); if (t <= 0) clearInterval(countdownRef.current); }, 1000);
      setScreen('role_reveal');
    });

    socket.on('guessing_phase', ({ wazirId, wazirName, badshahId, players, enableMukhbir }) => {
      clearInterval(countdownRef.current);
      setWazirId(wazirId);
      setWazirName(wazirName);
      setBadshahId(badshahId);
      setGuessingPlayers(players);
      setEnableMukhbirRound(!!enableMukhbir);
      setScreen('guessing');
    });

    socket.on('round_result', ({ roundResult, scores, isCorrect, guessedName, chorName, wazirName, mukhbirName, round, totalRounds }) => {
      setRoundResult(roundResult);
      setScores(scores);
      setIsCorrect(isCorrect);
      setGuessedName(guessedName);
      setChorName(chorName);
      setWazirName(wazirName);
      setMukhbirName(mukhbirName || null);
      setCurrentRound(round);
      setRoomSettings(s => ({ ...s, totalRounds }));
      setScreen('round_result');
    });

    socket.on('game_over', ({ scores }) => { setFinalScores(scores); setScreen('game_over'); });

    return () => {
      ['connect','room_created','room_joined','room_update','error','player_left',
       'role_assigned','guessing_phase','round_result','game_over'].forEach(e => socket.off(e));
      socket.disconnect();
      clearInterval(countdownRef.current);
    };
  }, []);

  function handleCreateRoom(name, rounds, maxPlayers, enableMukhbir) {
    socket.emit('create_room', { name, totalRounds: rounds, maxPlayers, enableMukhbir });
  }
  function handleJoinRoom(name, code) { socket.emit('join_room', { name, code }); }
  function handleStartGame() { socket.emit('start_game', { code: roomCode }); }
  function handleGuess(guessId) { socket.emit('wazir_guess', { code: roomCode, guessId }); }
  function handleNextRound() { socket.emit('next_round', { code: roomCode }); }
  function handlePlayAgain() {
    setScreen('home'); setRoomCode(''); setPlayers([]); setIsHost(false); setMyRole(''); setRound(0); setError('');
  }

  return (
    <div className="min-h-screen">
      {screen === 'home' && <HomeScreen onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} error={error} />}
      {screen === 'lobby' && <LobbyScreen roomCode={roomCode} players={players} isHost={isHost} myId={myId} onStart={handleStartGame} error={error} roomSettings={roomSettings} />}
      {screen === 'role_reveal' && <RoleRevealScreen myRole={myRole} round={round} totalRounds={roomSettings.totalRounds} badshahName={badshahName} myId={myId} badshahId={badshahId} countdown={countdown} secretChorName={secretChorName} enableMukhbir={roomSettings.enableMukhbir} />}
      {screen === 'guessing' && <GuessingScreen myId={myId} wazirId={wazirId} wazirName={wazirName} badshahId={badshahId} players={guessingPlayers} myRole={myRole} onGuess={handleGuess} enableMukhbir={enableMukhbirRound} />}
      {screen === 'round_result' && <RoundResultScreen roundResult={roundResult} scores={scores} isCorrect={isCorrect} guessedName={guessedName} chorName={chorName} wazirName={wazirName} mukhbirName={mukhbirName} round={currentRound} totalRounds={roomSettings.totalRounds} isHost={isHost} myId={myId} onNext={handleNextRound} />}
      {screen === 'game_over' && <GameOverScreen scores={finalScores} myId={myId} onPlayAgain={handlePlayAgain} />}
    </div>
  );
}
