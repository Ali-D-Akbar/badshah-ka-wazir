import { useState, useEffect, useRef } from 'react';
import { socket } from './socket';

const ROLE_CONFIG = {
  Badshah: { emoji: '👑', color: 'text-yellow-400', bg: 'bg-yellow-900/40', border: 'border-yellow-600', urdu: 'بادشاہ', pts: '100 pts always' },
  Wazir:   { emoji: '🧠', color: 'text-green-400',  bg: 'bg-green-900/40',  border: 'border-green-600',  urdu: 'وزیر',   pts: '70 if correct, 0 if wrong' },
  Sipahi:  { emoji: '⚔️', color: 'text-blue-400',   bg: 'bg-blue-900/40',   border: 'border-blue-600',   urdu: 'سپاہی',  pts: '50 pts always' },
  Chor:    { emoji: '🦹', color: 'text-red-400',    bg: 'bg-red-900/40',    border: 'border-red-600',    urdu: 'چور',    pts: '0 if caught, 70 if not' },
};

const MIN_PLAYERS = 4;
const MAX_PLAYERS = 8;

function Countdown({ seconds }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-400">
      <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
      Guessing phase in {seconds}s…
    </div>
  );
}

// ─── Home ────────────────────────────────────────────────────────────────────
function HomeScreen({ onCreateRoom, onJoinRoom, error }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState(null); // 'create' | 'join'

  return (
    <div className="fade-in flex flex-col items-center gap-8 py-12 px-4 max-w-sm mx-auto">
      <div className="text-center">
        <div className="text-6xl mb-3">👑</div>
        <h1 className="text-3xl font-bold text-yellow-400">بادشاہ کا وزیر</h1>
        <p className="text-gray-400 mt-1 text-sm">Badshah ka Wazir · 4 Players · 10 Rounds</p>
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

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <div className="flex flex-col gap-3 mt-2">
          {mode !== 'join' && (
            <button
              className="btn-gold w-full text-lg"
              disabled={!name.trim()}
              onClick={() => mode === 'create' ? onCreateRoom(name.trim()) : setMode('create')}
            >
              {mode === 'create' ? 'Create Room' : '+ Create Room'}
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
          {mode && (
            <button className="text-gray-500 text-sm" onClick={() => setMode(null)}>← Back</button>
          )}
        </div>
      </div>

      <div className="text-center text-gray-500 text-xs space-y-1">
        <p>👑 Badshah · 🧠 Wazir · ⚔️ Sipahi · 🦹 Chor</p>
        <p>Wazir must identify the Chor each round</p>
      </div>
    </div>
  );
}

// ─── Lobby ───────────────────────────────────────────────────────────────────
function LobbyScreen({ roomCode, players, isHost, myId, onStart, error }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fade-in flex flex-col items-center gap-6 py-10 px-4 max-w-sm mx-auto">
      <div className="text-center">
        <p className="text-gray-400 text-sm uppercase tracking-widest mb-1">Room Code</p>
        <button
          onClick={copy}
          className="text-5xl font-bold text-yellow-400 tracking-widest hover:text-yellow-300 transition-colors"
        >
          {roomCode}
        </button>
        <p className="text-gray-500 text-xs mt-1">{copied ? '✓ Copied!' : 'tap to copy'}</p>
      </div>

      <div className="card w-full p-4">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-3">Players ({players.length}/{MAX_PLAYERS})</p>
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

      <p className="text-gray-500 text-xs text-center">{MIN_PLAYERS}–{MAX_PLAYERS} players · extra players become Sipahi ⚔️</p>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {isHost ? (
        <button
          className="btn-gold w-full text-lg pulse-gold"
          disabled={players.length < MIN_PLAYERS}
          onClick={onStart}
        >
          {players.length >= MIN_PLAYERS ? `Start Game 🎮 (${players.length} players)` : `Need ${MIN_PLAYERS - players.length} more…`}
        </button>
      ) : (
        <p className="text-gray-400 text-sm">Waiting for host to start…</p>
      )}

      <div className="card w-full p-4 text-xs text-gray-400 space-y-1">
        <p className="font-semibold text-gray-300 mb-2">How to play:</p>
        <p>👑 Badshah → 100 pts (always safe)</p>
        <p>🧠 Wazir → guesses Chor. Correct: 70 pts. Wrong: 0 pts</p>
        <p>⚔️ Sipahi → 50 pts (always safe)</p>
        <p>🦹 Chor → 0 if caught, 70 if Wazir wrong</p>
      </div>
    </div>
  );
}

// ─── Role Reveal ─────────────────────────────────────────────────────────────
function RoleRevealScreen({ myRole, round, totalRounds, badshahName, myId, badshahId, countdown }) {
  const cfg = ROLE_CONFIG[myRole];
  const isBadshah = myId === badshahId;

  return (
    <div className="fade-in flex flex-col items-center gap-6 py-10 px-4 max-w-sm mx-auto">
      <div className="flex justify-between w-full text-sm text-gray-400">
        <span>Round {round} of {totalRounds}</span>
        <Countdown seconds={countdown} />
      </div>

      <p className="text-gray-300 text-lg">Your role this round:</p>

      <div className={`role-reveal card p-8 flex flex-col items-center gap-4 w-full border-2 ${cfg.border}`}>
        <span className="text-8xl">{cfg.emoji}</span>
        <div className="text-center">
          <p className={`text-4xl font-bold ${cfg.color}`}>{myRole}</p>
          <p className={`text-2xl font-urdu ${cfg.color} mt-1`}>{cfg.urdu}</p>
          <p className="text-gray-400 text-sm mt-2">{cfg.pts}</p>
        </div>
      </div>

      {!isBadshah && (
        <div className="card w-full p-4 text-center">
          <p className="text-gray-400 text-sm">Known to all:</p>
          <p className="text-yellow-400 font-bold mt-1">👑 Badshah this round: <span className="text-white">{badshahName}</span></p>
        </div>
      )}

      {myRole === 'Wazir' && (
        <div className="card w-full p-4 text-center border border-green-800">
          <p className="text-green-400 font-semibold text-sm">You are the Wazir!</p>
          <p className="text-gray-400 text-xs mt-1">You must pick who is the Chor from the non-Badshah players.</p>
        </div>
      )}

      {myRole === 'Chor' && (
        <div className="card w-full p-4 text-center border border-red-800">
          <p className="text-red-400 font-semibold text-sm">You are the Chor! 🤫</p>
          <p className="text-gray-400 text-xs mt-1">Try not to look suspicious…</p>
        </div>
      )}
    </div>
  );
}

// ─── Guessing Phase ──────────────────────────────────────────────────────────
function GuessingScreen({ myId, wazirId, wazirName, badshahId, players, myRole, onGuess }) {
  const isWazir = myId === wazirId;
  const cfg = ROLE_CONFIG[myRole];

  const guessTargets = players.filter(p => p.id !== badshahId && p.id !== wazirId);

  if (isWazir) {
    return (
      <div className="fade-in flex flex-col items-center gap-6 py-10 px-4 max-w-sm mx-auto">
        <div className="text-center">
          <span className="text-5xl">🧠</span>
          <h2 className="text-2xl font-bold text-green-400 mt-2">You are Wazir</h2>
          <p className="text-gray-300 mt-1">Who is the <span className="text-red-400 font-bold">Chor</span>?</p>
        </div>

        <p className="text-gray-400 text-sm text-center">
          Pick who you think is the Chor. Others are Sipahi.
        </p>

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
        <p className="text-gray-500 text-sm mt-1">is choosing who the Chor is</p>
      </div>

      <div className={`card w-full p-6 text-center border-2 ${cfg.border}`}>
        <p className="text-gray-400 text-sm mb-2">Your role:</p>
        <span className="text-5xl">{cfg.emoji}</span>
        <p className={`text-2xl font-bold ${cfg.color} mt-2`}>{myRole}</p>
        {myRole === 'Chor' && (
          <p className="text-red-400 text-xs mt-2 italic">Stay calm. Don't react. 🤫</p>
        )}
      </div>
    </div>
  );
}

// ─── Round Result ─────────────────────────────────────────────────────────────
function RoundResultScreen({ roundResult, scores, isCorrect, guessedName, chorName, wazirName, chorId, round, totalRounds, isHost, myId, onNext }) {
  return (
    <div className="fade-in flex flex-col items-center gap-5 py-8 px-4 max-w-sm mx-auto">
      <div className="text-center">
        <p className="text-gray-400 text-sm">Round {round} of {totalRounds}</p>
        <div className={`text-4xl font-bold mt-2 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
          {isCorrect ? '✅ Caught!' : '❌ Escaped!'}
        </div>
        <p className="text-gray-300 mt-2 text-sm">
          {isCorrect
            ? `${wazirName} correctly identified ${chorName} as the Chor!`
            : `${wazirName} guessed ${guessedName}, but ${chorName} was the Chor — escapes!`}
        </p>
      </div>

      <div className="card w-full p-4">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-3">Roles this round</p>
        <div className="flex flex-col gap-2">
          {Object.values(roundResult).map(({ name, role, pts }) => {
            const cfg = ROLE_CONFIG[role];
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
        <p className="text-gray-400 text-sm">Waiting for host to continue…</p>
      )}
    </div>
  );
}

// ─── Game Over ────────────────────────────────────────────────────────────────
function GameOverScreen({ scores, myId, onPlayAgain }) {
  const medals = ['🥇', '🥈', '🥉', '4️⃣'];

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
            <div
              key={p.id}
              className={`flex items-center gap-3 p-3 rounded-xl ${i === 0 ? 'bg-yellow-900/30 border border-yellow-700' : ''}`}
            >
              <span className="text-2xl">{medals[i]}</span>
              <span className={`flex-1 font-bold text-lg ${p.id === myId ? 'text-yellow-400' : 'text-gray-200'}`}>
                {p.name} {p.id === myId && '(you)'}
              </span>
              <span className={`text-xl font-bold ${i === 0 ? 'text-yellow-400' : 'text-white'}`}>{p.score}</span>
            </div>
          ))}
        </div>
      </div>

      <button className="btn-gold w-full text-lg" onClick={onPlayAgain}>
        Play Again 🔄
      </button>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState('home');
  const [myId, setMyId] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState('');

  // Round state
  const [myRole, setMyRole] = useState('');
  const [round, setRound] = useState(0);
  const [badshahId, setBadshahId] = useState('');
  const [badshahName, setBadshahName] = useState('');
  const [wazirId, setWazirId] = useState('');
  const [wazirName, setWazirName] = useState('');
  const [countdown, setCountdown] = useState(6);

  // Guessing state
  const [guessingPlayers, setGuessingPlayers] = useState([]);

  // Result state
  const [roundResult, setRoundResult] = useState(null);
  const [scores, setScores] = useState([]);
  const [isCorrect, setIsCorrect] = useState(false);
  const [guessedName, setGuessedName] = useState('');
  const [chorName, setChorName] = useState('');
  const [chorId, setChorId] = useState('');
  const [currentRound, setCurrentRound] = useState(0);
  const [totalRounds] = useState(10);

  // Game over
  const [finalScores, setFinalScores] = useState([]);

  const countdownRef = useRef(null);

  useEffect(() => {
    socket.connect();
    socket.on('connect', () => setMyId(socket.id));

    socket.on('room_created', ({ code }) => {
      setRoomCode(code);
      setIsHost(true);
      setError('');
      setScreen('lobby');
    });

    socket.on('room_joined', ({ code }) => {
      setRoomCode(code);
      setError('');
      setScreen('lobby');
    });

    socket.on('room_update', (room) => {
      setPlayers(room.players);
      setIsHost(room.host === socket.id);
    });

    socket.on('error', ({ message }) => setError(message));

    socket.on('player_left', ({ name }) => {
      setError(`${name} left the game`);
    });

    socket.on('role_assigned', ({ role, round, totalRounds, players, badshahId, badshahName, wazirId }) => {
      setMyRole(role);
      setRound(round);
      setPlayers(players);
      setBadshahId(badshahId);
      setBadshahName(badshahName);
      setWazirId(wazirId);
      setError('');

      // Start countdown
      let t = 6;
      setCountdown(t);
      clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        t--;
        setCountdown(t);
        if (t <= 0) clearInterval(countdownRef.current);
      }, 1000);

      setScreen('role_reveal');
    });

    socket.on('guessing_phase', ({ wazirId, wazirName, badshahId, players }) => {
      clearInterval(countdownRef.current);
      setWazirId(wazirId);
      setWazirName(wazirName);
      setBadshahId(badshahId);
      setGuessingPlayers(players);
      setScreen('guessing');
    });

    socket.on('round_result', ({ roundResult, scores, isCorrect, guessedName, chorName, wazirName, chorId, round, totalRounds }) => {
      setRoundResult(roundResult);
      setScores(scores);
      setIsCorrect(isCorrect);
      setGuessedName(guessedName);
      setChorName(chorName);
      setWazirName(wazirName);
      setChorId(chorId);
      setCurrentRound(round);
      setScreen('round_result');
    });

    socket.on('game_over', ({ scores }) => {
      setFinalScores(scores);
      setScreen('game_over');
    });

    return () => {
      socket.off('connect');
      socket.off('room_created');
      socket.off('room_joined');
      socket.off('room_update');
      socket.off('error');
      socket.off('player_left');
      socket.off('role_assigned');
      socket.off('guessing_phase');
      socket.off('round_result');
      socket.off('game_over');
      socket.disconnect();
      clearInterval(countdownRef.current);
    };
  }, []);

  function handleCreateRoom(name) {
    socket.emit('create_room', { name });
  }

  function handleJoinRoom(name, code) {
    socket.emit('join_room', { name, code });
  }

  function handleStartGame() {
    socket.emit('start_game', { code: roomCode });
  }

  function handleGuess(guessId) {
    socket.emit('wazir_guess', { code: roomCode, guessId });
  }

  function handleNextRound() {
    socket.emit('next_round', { code: roomCode });
  }

  function handlePlayAgain() {
    setScreen('home');
    setRoomCode('');
    setPlayers([]);
    setIsHost(false);
    setMyRole('');
    setRound(0);
    setError('');
  }

  return (
    <div className="min-h-screen">
      {screen === 'home' && (
        <HomeScreen onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} error={error} />
      )}
      {screen === 'lobby' && (
        <LobbyScreen
          roomCode={roomCode}
          players={players}
          isHost={isHost}
          myId={myId}
          onStart={handleStartGame}
          error={error}
        />
      )}
      {screen === 'role_reveal' && (
        <RoleRevealScreen
          myRole={myRole}
          round={round}
          totalRounds={totalRounds}
          badshahName={badshahName}
          myId={myId}
          badshahId={badshahId}
          countdown={countdown}
        />
      )}
      {screen === 'guessing' && (
        <GuessingScreen
          myId={myId}
          wazirId={wazirId}
          wazirName={wazirName}
          badshahId={badshahId}
          players={guessingPlayers}
          myRole={myRole}
          onGuess={handleGuess}
        />
      )}
      {screen === 'round_result' && (
        <RoundResultScreen
          roundResult={roundResult}
          scores={scores}
          isCorrect={isCorrect}
          guessedName={guessedName}
          chorName={chorName}
          wazirName={wazirName}
          chorId={chorId}
          round={currentRound}
          totalRounds={totalRounds}
          isHost={isHost}
          myId={myId}
          onNext={handleNextRound}
        />
      )}
      {screen === 'game_over' && (
        <GameOverScreen scores={finalScores} myId={myId} onPlayAgain={handlePlayAgain} />
      )}
    </div>
  );
}
