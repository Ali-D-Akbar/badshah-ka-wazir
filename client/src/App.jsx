import { useState, useEffect, useRef } from 'react';
import { socket } from './socket';

const ROLE_CONFIG = {
  Badshah: { emoji: '👑', color: 'text-yellow-400', border: 'border-yellow-600', urdu: 'بادشاہ', pts: '70 pts always' },
  Wazir:   { emoji: '🧠', color: 'text-green-400',  border: 'border-green-600',  urdu: 'وزیر',   pts: '70 correct / 0 wrong' },
  Sipahi:  { emoji: '⚔️', color: 'text-blue-400',   border: 'border-blue-600',   urdu: 'سپاہی',  pts: '50 pts always' },
  Mukhbir: { emoji: '🕵️', color: 'text-purple-400', border: 'border-purple-600', urdu: 'مخبر',   pts: '80 escaped / 0 caught' },
  Chor:    { emoji: '🦹', color: 'text-red-400',    border: 'border-red-600',    urdu: 'چور',    pts: '80 escaped / 0 caught' },
};

const MIN_PLAYERS = 4;
const MAX_PLAYERS_LIMIT = 12;
const TIMER_OPTIONS = [null, 7, 15, 30, 45, 60];

// ─── Chat Panel ───────────────────────────────────────────────────────────────
function ChatPanel({ messages, myId, onSend, collapsed, onToggle }) {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function send() {
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  }

  return (
    <div className={`fixed bottom-0 right-0 w-72 flex flex-col transition-all ${collapsed ? 'h-10' : 'h-72'}`}
      style={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: '0.75rem 0.75rem 0 0', zIndex: 50 }}>
      <button
        onClick={onToggle}
        className="flex items-center justify-between px-3 py-2 text-sm font-semibold text-yellow-400 border-b border-gray-700"
      >
        <span>💬 Chat {messages.length > 0 && `(${messages.length})`}</span>
        <span className="text-gray-400">{collapsed ? '▲' : '▼'}</span>
      </button>

      {!collapsed && (
        <>
          <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1">
            {messages.length === 0 && (
              <p className="text-gray-600 text-xs text-center mt-4">No messages yet. Say something!</p>
            )}
            {messages.map(m => (
              <div key={m.id} className={`text-sm ${m.playerId === myId ? 'text-right' : ''}`}>
                <span className="text-gray-500 text-xs">{m.playerId === myId ? 'you' : m.playerName}</span>
                <div className={`inline-block px-2 py-1 rounded-lg text-sm mt-0.5 ${
                  m.playerId === myId ? 'bg-yellow-900/40 text-yellow-200 ml-4' : 'bg-gray-800 text-gray-200 mr-4'
                }`}>{m.text}</div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <div className="flex gap-2 p-2 border-t border-gray-700">
            <input
              className="input-field text-sm py-1 px-2"
              placeholder="Type a message…"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              maxLength={200}
            />
            <button className="btn-gold px-3 py-1 text-sm" onClick={send}>→</button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Countdown ────────────────────────────────────────────────────────────────
function Countdown({ seconds }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-400">
      <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
      Guessing in {seconds}s…
    </div>
  );
}

function GuessingTimer({ seconds, total }) {
  const pct = total ? (seconds / total) * 100 : 100;
  const color = seconds <= 7 ? 'bg-red-500' : seconds <= 15 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>Time to guess</span>
        <span className={seconds <= 7 ? 'text-red-400 font-bold' : ''}>{seconds}s</span>
      </div>
      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Home ─────────────────────────────────────────────────────────────────────
function HomeScreen({ onCreateRoom, onJoinRoom, error }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState(null);
  const [rounds, setRounds] = useState(5);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [enableMukhbir, setEnableMukhbir] = useState(false);
  const [guessingTimer, setGuessingTimer] = useState(null);

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
          <div className="flex flex-col gap-4 pt-2 border-t border-gray-700">
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

            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-300">Wazir Guess Timer</label>
              <div className="flex gap-2 flex-wrap">
                {TIMER_OPTIONS.map(t => (
                  <button
                    key={t}
                    onClick={() => setGuessingTimer(t)}
                    className={`px-3 py-1 rounded-lg text-sm border transition-all ${
                      guessingTimer === t
                        ? 'border-yellow-500 bg-yellow-900/40 text-yellow-400 font-bold'
                        : 'border-gray-600 text-gray-400 hover:border-gray-400'
                    }`}
                  >
                    {t === null ? 'Off' : `${t}s`}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setEnableMukhbir(v => !v)}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all ${enableMukhbir ? 'border-purple-600 bg-purple-900/30' : 'border-gray-700'}`}
            >
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-200">🕵️ Mukhbir (Spy)</p>
                <p className="text-xs text-gray-500">6+ players. Spy secretly aids Chor.</p>
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
                ? onCreateRoom(name.trim(), rounds, maxPlayers, enableMukhbir, guessingTimer)
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

      <div className="card w-full p-4 text-sm text-gray-300 space-y-2 border border-yellow-900/40">
        <p>🧠 <span className="text-yellow-400 font-semibold">Wazir</span> must find the <span className="text-red-400 font-semibold">Chor</span> — guess right for 70 pts, guess wrong and Chor escapes with 80.</p>
        <p>👑 <span className="text-yellow-400 font-semibold">Badshah</span> &amp; <span className="text-green-400 font-semibold">Wazir</span> are revealed to all · everyone else stays hidden until caught.</p>
      </div>

      <div className="card w-full p-4 text-xs text-gray-400 space-y-1">
        <p className="font-semibold text-gray-300 mb-1">Points:</p>
        <p>👑 Badshah → 70 always</p>
        <p>🧠 Wazir → 70 correct / 0 wrong</p>
        <p>⚔️ Sipahi → 50 always</p>
        <p>🕵️ Mukhbir → 80 escaped / 0 caught</p>
        <p>🦹 Chor → 80 escaped / 0 caught</p>
      </div>
    </div>
  );
}

// ─── Lobby ────────────────────────────────────────────────────────────────────
function LobbyScreen({ roomCode, players, isHost, myId, onStart, error, roomSettings }) {
  const [copied, setCopied] = useState(false);
  const { totalRounds, maxPlayers, enableMukhbir, guessingTimer } = roomSettings || {};

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

      <div className="flex gap-2 flex-wrap justify-center text-xs">
        <span className="card px-3 py-1 text-yellow-400">{totalRounds} rounds</span>
        <span className="card px-3 py-1 text-blue-400">max {maxPlayers}</span>
        <span className="card px-3 py-1 text-orange-400">⏱ {guessingTimer ? `${guessingTimer}s` : 'No timer'}</span>
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

      <p className="text-gray-500 text-xs text-center">Game starts with 4+ · extra players = Sipahi</p>
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
function RoleRevealScreen({ myRole, round, totalRounds, badshahName, wazirName, myId, badshahId, wazirId, countdown, secretChorName, enableMukhbir, guessingTimer }) {
  const cfg = ROLE_CONFIG[myRole] || ROLE_CONFIG.Sipahi;
  return (
    <div className="fade-in flex flex-col items-center gap-5 py-10 px-4 max-w-sm mx-auto pb-24">
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

      <div className="card w-full p-4">
        <p className="text-gray-400 text-sm text-center mb-2">Known to all:</p>
        <div className="flex flex-col gap-1">
          <p className="text-yellow-400 font-bold text-center">👑 Badshah: <span className="text-white">{badshahName}</span></p>
          <p className="text-green-400 font-bold text-center">🧠 Wazir: <span className="text-white">{wazirName}</span></p>
        </div>
      </div>

      {myRole === 'Mukhbir' && secretChorName && (
        <div className="card w-full p-4 text-center border border-purple-700">
          <p className="text-purple-400 font-semibold">You are the Mukhbir 🕵️</p>
          <p className="text-gray-300 text-sm mt-1">Chor is: <span className="text-red-400 font-bold">{secretChorName}</span></p>
          <p className="text-gray-500 text-xs mt-1">Help them escape. Use chat to mislead Wazir.</p>
        </div>
      )}
      {myRole === 'Wazir' && (
        <div className="card w-full p-4 text-center border border-green-800">
          <p className="text-green-400 font-semibold">You are the Wazir 🧠</p>
          <p className="text-gray-400 text-xs mt-1">
            Identify the Chor.{guessingTimer ? ` You have ${guessingTimer}s to decide.` : ''}
            {enableMukhbir ? ' Watch out — a Mukhbir may mislead you.' : ''}
          </p>
        </div>
      )}
      {myRole === 'Chor' && (
        <div className="card w-full p-4 text-center border border-red-800">
          <p className="text-red-400 font-semibold">You are the Chor 🦹</p>
          <p className="text-gray-400 text-xs mt-1">Stay calm. Use chat to blend in. {enableMukhbir ? 'Mukhbir has your back.' : ''}</p>
        </div>
      )}
    </div>
  );
}

// ─── Guessing Phase ───────────────────────────────────────────────────────────
function GuessingScreen({ myId, wazirId, wazirName, badshahId, players, myRole, onGuess, enableMukhbir, guessingTimer }) {
  const isWazir = myId === wazirId;
  const cfg = ROLE_CONFIG[myRole] || ROLE_CONFIG.Sipahi;
  const guessTargets = players.filter(p => p.id !== badshahId && p.id !== wazirId);

  const [timeLeft, setTimeLeft] = useState(guessingTimer);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!guessingTimer) return;
    setTimeLeft(guessingTimer);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [guessingTimer]);

  if (isWazir) {
    return (
      <div className="fade-in flex flex-col items-center gap-5 py-10 px-4 max-w-sm mx-auto pb-24">
        <div className="text-center">
          <span className="text-5xl">🧠</span>
          <h2 className="text-2xl font-bold text-green-400 mt-2">You are Wazir</h2>
          <p className="text-gray-300 mt-1">Who is the <span className="text-red-400 font-bold">Chor</span>?</p>
          {enableMukhbir && <p className="text-purple-400 text-xs mt-1">⚠️ A Mukhbir may be misleading you in chat</p>}
        </div>

        {guessingTimer && <GuessingTimer seconds={timeLeft} total={guessingTimer} />}

        <div className="flex flex-col gap-3 w-full">
          {guessTargets.map(p => (
            <button
              key={p.id}
              onClick={() => onGuess(p.id)}
              className="card w-full p-5 text-left flex items-center gap-4 border border-transparent hover:border-yellow-600 hover:bg-yellow-900/20 transition-all group"
            >
              <span className="text-3xl">🎭</span>
              <div>
                <p className="font-bold text-white text-lg group-hover:text-yellow-400">{p.name}</p>
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
    <div className="fade-in flex flex-col items-center gap-6 py-10 px-4 max-w-sm mx-auto pb-24">
      <div className="text-center">
        <div className="text-5xl mb-2">⏳</div>
        <h2 className="text-xl font-bold text-gray-300">Wazir is deciding…</h2>
        <p className="text-green-400 font-semibold mt-1">{wazirName}</p>
      </div>
      {guessingTimer && <GuessingTimer seconds={timeLeft} total={guessingTimer} />}
      <div className={`card w-full p-6 text-center border-2 ${cfg.border}`}>
        <p className="text-gray-400 text-sm mb-2">Your role:</p>
        <span className="text-5xl">{cfg.emoji}</span>
        <p className={`text-2xl font-bold ${cfg.color} mt-2`}>{myRole}</p>
        {myRole === 'Chor' && <p className="text-red-400 text-xs mt-2 italic">Use chat to look innocent 🤫</p>}
        {myRole === 'Mukhbir' && <p className="text-purple-400 text-xs mt-2 italic">Mislead Wazir in chat. Act like Sipahi. 🕵️</p>}
      </div>
    </div>
  );
}

// ─── Round Result ─────────────────────────────────────────────────────────────
function RoundResultScreen({ roundResult, scores, isCorrect, timedOut, guessedName, chorName, wazirName, mukhbirName, round, totalRounds, isHost, myId, onNext }) {
  return (
    <div className="fade-in flex flex-col items-center gap-5 py-8 px-4 max-w-sm mx-auto pb-24">
      <div className="text-center">
        <p className="text-gray-400 text-sm">Round {round} of {totalRounds}</p>
        <div className={`text-4xl font-bold mt-2 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
          {isCorrect ? '✅ Caught!' : '❌ Escaped!'}
        </div>
        {timedOut && <p className="text-orange-400 text-xs mt-1">⏱ Time ran out — Chor escapes!</p>}
        <p className="text-gray-300 mt-2 text-sm">
          {isCorrect
            ? `${wazirName} caught ${chorName}!`
            : timedOut
              ? `${wazirName} ran out of time — ${chorName} escapes!`
              : `${wazirName} guessed ${guessedName} — ${chorName} escapes!`}
        </p>
        {mukhbirName && !isCorrect && <p className="text-purple-400 text-xs mt-1">🕵️ {mukhbirName} helped Chor escape</p>}
        {mukhbirName && isCorrect && <p className="text-purple-400 text-xs mt-1">🕵️ {mukhbirName}'s cover failed</p>}
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
function GameOverScreen({ scores, myId, isHost, onPlayAgain, onLeave }) {
  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔟', '🔟'];
  return (
    <div className="fade-in flex flex-col items-center gap-6 py-12 px-4 max-w-sm mx-auto pb-24">
      <div className="text-center">
        <div className="text-6xl mb-2">🏆</div>
        <h1 className="text-3xl font-bold text-yellow-400">Game Over!</h1>
      </div>
      <div className="card w-full p-4">
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
      {isHost ? (
        <button className="btn-gold w-full text-lg" onClick={onPlayAgain}>Play Again with same group 🔄</button>
      ) : (
        <p className="text-gray-400 text-sm">Waiting for host to restart…</p>
      )}
      <button className="text-gray-500 text-sm underline" onClick={onLeave}>Leave room</button>
    </div>
  );
}

// ─── Disconnect Banner ────────────────────────────────────────────────────────
function DisconnectBanner({ onGoHome }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-900/95 border-b border-red-700 px-4 py-3 flex items-center justify-between">
      <p className="text-red-200 text-sm">⚠️ Connection lost — server may have restarted. Start a new room.</p>
      <button onClick={onGoHome} className="text-white text-xs bg-red-700 hover:bg-red-600 px-3 py-1 rounded-lg">← Home</button>
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
  const [disconnected, setDisconnected] = useState(false);
  const [roomSettings, setRoomSettings] = useState({ totalRounds: 5, maxPlayers: 4, enableMukhbir: false, guessingTimer: null });

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
  const [roundGuessingTimer, setRoundGuessingTimer] = useState(null);

  const [roundResult, setRoundResult] = useState(null);
  const [scores, setScores] = useState([]);
  const [isCorrect, setIsCorrect] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [guessedName, setGuessedName] = useState('');
  const [chorName, setChorName] = useState('');
  const [mukhbirName, setMukhbirName] = useState(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [finalScores, setFinalScores] = useState([]);

  const [chatMessages, setChatMessages] = useState([]);
  const [chatCollapsed, setChatCollapsed] = useState(false);

  const countdownRef = useRef(null);
  const guessingFallbackRef = useRef(null);
  const hasConnectedRef = useRef(false);
  const screenRef = useRef('home');
  const guessingDataRef = useRef(null); // fallback data if guessing_phase event is lost

  const inGame = ['lobby', 'role_reveal', 'guessing', 'round_result', 'game_over'].includes(screen);

  useEffect(() => { screenRef.current = screen; }, [screen]);

  useEffect(() => {
    socket.connect();

    socket.on('connect', () => {
      setMyId(socket.id);
      if (hasConnectedRef.current && screenRef.current !== 'home') {
        // Reconnected mid-game — server restarted, room is gone
        setDisconnected(true);
      } else {
        setDisconnected(false);
      }
      hasConnectedRef.current = true;
    });

    socket.on('disconnect', () => setDisconnected(true));

    socket.on('room_created', ({ code }) => { setRoomCode(code); setIsHost(true); setError(''); setScreen('lobby'); });
    socket.on('room_joined',  ({ code }) => { setRoomCode(code); setError(''); setScreen('lobby'); });

    socket.on('room_update', (room) => {
      setPlayers(room.players);
      setIsHost(room.host === socket.id);
      setRoomSettings({ totalRounds: room.totalRounds, maxPlayers: room.maxPlayers, enableMukhbir: room.enableMukhbir, guessingTimer: room.guessingTimer });
    });

    socket.on('error', ({ message }) => setError(message));
    socket.on('player_left', ({ name }) => setError(`${name} left`));
    socket.on('chat_message', (msg) => setChatMessages(prev => [...prev, msg]));

    socket.on('role_assigned', ({ role, round, totalRounds, players, badshahId, badshahName, wazirId, wazirName, secretChorName, enableMukhbir, guessingTimer }) => {
      setMyRole(role); setRound(round); setPlayers(players);
      setBadshahId(badshahId); setBadshahName(badshahName); setWazirId(wazirId); setWazirName(wazirName);
      setSecretChorName(secretChorName || null);
      setRoomSettings(s => ({ ...s, totalRounds, enableMukhbir, guessingTimer }));
      setError(''); setChatCollapsed(false);

      // Store fallback data in case guessing_phase event is dropped
      guessingDataRef.current = { wazirId, wazirName, badshahId, players, enableMukhbir, guessingTimer };

      let t = 6; setCountdown(t);
      clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        t--;
        setCountdown(t);
        if (t <= 0) clearInterval(countdownRef.current);
      }, 1000);

      // Fallback: if guessing_phase never arrives, self-transition after 7s
      clearTimeout(guessingFallbackRef.current);
      guessingFallbackRef.current = setTimeout(() => {
        if (screenRef.current !== 'role_reveal') return;
        const d = guessingDataRef.current;
        if (!d) return;
        setWazirId(d.wazirId); setWazirName(d.wazirName); setBadshahId(d.badshahId);
        setGuessingPlayers(d.players); setEnableMukhbirRound(!!d.enableMukhbir); setRoundGuessingTimer(d.guessingTimer || null);
        setScreen('guessing');
      }, 7000);

      setScreen('role_reveal');
    });

    socket.on('guessing_phase', ({ wazirId, wazirName, badshahId, players, enableMukhbir, guessingTimer }) => {
      clearTimeout(guessingFallbackRef.current);
      clearInterval(countdownRef.current);
      setWazirId(wazirId); setWazirName(wazirName); setBadshahId(badshahId);
      setGuessingPlayers(players); setEnableMukhbirRound(!!enableMukhbir); setRoundGuessingTimer(guessingTimer || null);
      setScreen('guessing');
    });

    socket.on('round_result', ({ roundResult, scores, isCorrect, timedOut, guessedName, chorName, wazirName, mukhbirName, round, totalRounds }) => {
      clearTimeout(guessingFallbackRef.current);
      setRoundResult(roundResult); setScores(scores); setIsCorrect(isCorrect); setTimedOut(!!timedOut);
      setGuessedName(guessedName); setChorName(chorName); setWazirName(wazirName); setMukhbirName(mukhbirName || null);
      setCurrentRound(round); setRoomSettings(s => ({ ...s, totalRounds }));
      setScreen('round_result');
    });

    socket.on('game_over', ({ scores }) => { setFinalScores(scores); setScreen('game_over'); });

    socket.on('room_replay', () => {
      setMyRole(''); setRound(0); setError('');
      setScreen('lobby');
    });

    return () => {
      ['connect','disconnect','room_created','room_joined','room_update','error','player_left',
       'chat_message','role_assigned','guessing_phase','round_result','game_over','room_replay'].forEach(e => socket.off(e));
      socket.disconnect();
      clearInterval(countdownRef.current);
      clearTimeout(guessingFallbackRef.current);
    };
  }, []);

  function handleCreateRoom(name, rounds, maxPlayers, enableMukhbir, guessingTimer) {
    socket.emit('create_room', { name, totalRounds: rounds, maxPlayers, enableMukhbir, guessingTimer });
  }
  function handleJoinRoom(name, code) { socket.emit('join_room', { name, code }); }
  function handleStartGame() { socket.emit('start_game', { code: roomCode }); }
  function handleGuess(guessId) { socket.emit('wazir_guess', { code: roomCode, guessId }); }
  function handleNextRound() { socket.emit('next_round', { code: roomCode }); }
  function handleSendMessage(text) { socket.emit('send_message', { code: roomCode, text }); }
  function handleGoHome() {
    setDisconnected(false); setScreen('home'); setRoomCode(''); setPlayers([]);
    setIsHost(false); setMyRole(''); setRound(0); setError(''); setChatMessages([]);
  }
  function handlePlayAgain() { socket.emit('replay_room', { code: roomCode }); }
  function handleLeaveRoom() { handleGoHome(); }

  return (
    <div className="min-h-screen">
      {disconnected && <DisconnectBanner onGoHome={handleGoHome} />}
      <div className={disconnected ? 'pt-14' : ''}>
        {screen === 'home' && <HomeScreen onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} error={error} />}
        {screen === 'lobby' && <LobbyScreen roomCode={roomCode} players={players} isHost={isHost} myId={myId} onStart={handleStartGame} error={error} roomSettings={roomSettings} />}
        {screen === 'role_reveal' && <RoleRevealScreen myRole={myRole} round={round} totalRounds={roomSettings.totalRounds} badshahName={badshahName} wazirName={wazirName} myId={myId} badshahId={badshahId} wazirId={wazirId} countdown={countdown} secretChorName={secretChorName} enableMukhbir={roomSettings.enableMukhbir} guessingTimer={roomSettings.guessingTimer} />}
        {screen === 'guessing' && <GuessingScreen myId={myId} wazirId={wazirId} wazirName={wazirName} badshahId={badshahId} players={guessingPlayers} myRole={myRole} onGuess={handleGuess} enableMukhbir={enableMukhbirRound} guessingTimer={roundGuessingTimer} />}
        {screen === 'round_result' && <RoundResultScreen roundResult={roundResult} scores={scores} isCorrect={isCorrect} timedOut={timedOut} guessedName={guessedName} chorName={chorName} wazirName={wazirName} mukhbirName={mukhbirName} round={currentRound} totalRounds={roomSettings.totalRounds} isHost={isHost} myId={myId} onNext={handleNextRound} />}
        {screen === 'game_over' && <GameOverScreen scores={finalScores} myId={myId} isHost={isHost} onPlayAgain={handlePlayAgain} onLeave={handleLeaveRoom} />}
      </div>

      {inGame && !disconnected && (
        <ChatPanel
          messages={chatMessages}
          myId={myId}
          onSend={handleSendMessage}
          collapsed={chatCollapsed}
          onToggle={() => setChatCollapsed(v => !v)}
        />
      )}
    </div>
  );
}
