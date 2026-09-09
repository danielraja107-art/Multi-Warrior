import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Difficulty, PlayerColor, ConnectionStatus } from '@storm-arena/shared'
import { useGameStore } from '../state/useGameStore'
import { startGame, changeDifficulty, leaveRoom, reconnect } from '../network/socket'
import { LoadingSpinner } from './components/LoadingSpinner'
import { ErrorMessage } from './components/ErrorMessage'
import { ConnectionStatus as ConnectionStatusBadge } from './components/ConnectionStatus'
import type { PlayerData } from '@storm-arena/shared'

const PLAYER_COLORS = [
  PlayerColor.RED,
  PlayerColor.BLUE,
  PlayerColor.GREEN,
  PlayerColor.YELLOW,
]

const COLOR_BG: Record<string, string> = {
  [PlayerColor.RED]: 'bg-player-red',
  [PlayerColor.BLUE]: 'bg-player-blue',
  [PlayerColor.GREEN]: 'bg-player-green',
  [PlayerColor.YELLOW]: 'bg-player-yellow',
}

const DIFFICULTIES = [
  { value: Difficulty.EASY, label: 'Easy', color: 'text-player-green', border: 'border-player-green/40', hoverBg: 'hover:bg-player-green/10' },
  { value: Difficulty.NORMAL, label: 'Normal', color: 'text-accent-lightning', border: 'border-accent-lightning/40', hoverBg: 'hover:bg-accent-lightning/10' },
  { value: Difficulty.HARD, label: 'Hard', color: 'text-player-red', border: 'border-player-red/40', hoverBg: 'hover:bg-player-red/10' },
]

export function Lobby() {
  const navigate = useNavigate()
  const connectionStatus = useGameStore((s) => s.connection.status)
  const roomId = useGameStore((s) => s.connection.roomId)
  const roomCode = useGameStore((s) => s.lobby.roomCode)
  const players = useGameStore((s) => s.lobby.players)
  const lobbyDifficulty = useGameStore((s) => s.lobby.difficulty)
  const hostId = useGameStore((s) => s.lobby.hostId)
  const localPlayerId = useGameStore((s) => s.localPlayerId)
  const gamePhase = useGameStore((s) => s.gameState?.phase)
  const uiError = useGameStore((s) => s.ui.error)

  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.NORMAL)
  const [copied, setCopied] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [starting, setStarting] = useState(false)
  const [roomClosed, setRoomClosed] = useState<string | null>(null)
  const leavingRef = useRef(false)
  const hadRoomRef = useRef(false)

  const isHost = localPlayerId != null && localPlayerId === hostId

  useEffect(() => {
    if (lobbyDifficulty !== difficulty) {
      setDifficulty(lobbyDifficulty)
    }
  }, [lobbyDifficulty, difficulty])

  useEffect(() => {
    if (roomId) hadRoomRef.current = true
    if (!roomId && hadRoomRef.current && !leavingRef.current && connectionStatus === ConnectionStatus.DISCONNECTED) {
      setRoomClosed('The room was closed or you were disconnected from it.')
      hadRoomRef.current = false
    }
  }, [roomId, connectionStatus])

  useEffect(() => {
    if (starting && gamePhase === 'game') {
      setStarting(false)
      navigate('/game')
    }
  }, [starting, gamePhase, navigate])

  const handleCopy = async () => {
    if (roomCode) {
      await navigator.clipboard.writeText(roomCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleStart = () => {
    if (!isHost) return
    setStarting(true)
    try {
      startGame()
    } catch {
      setStarting(false)
      setRoomClosed('Could not reach the game server.')
    }
  }

  const handleDifficulty = (value: Difficulty) => {
    if (!isHost) return
    setDifficulty(value)
    try {
      changeDifficulty(value)
    } catch {
      // server will be surfaced via connection state
    }
  }

  const handleLeave = async () => {
    leavingRef.current = true
    setLeaving(true)
    await leaveRoom()
    navigate('/')
  }

  if (leaving) {
    return <LoadingSpinner overlay message="Leaving room..." />
  }

  if (starting) {
    return <LoadingSpinner overlay message="Starting game..." />
  }

  if (!roomCode && connectionStatus === ConnectionStatus.CONNECTING) {
    return <LoadingSpinner overlay message="Joining room..." />
  }

  const slots = PLAYER_COLORS.map((color) => {
    const entry = Object.entries(players).find(([, p]) => p.color === color)
    return entry as [string, PlayerData] | undefined
  })

  const filledCount = Object.keys(players).length

  const renderSlot = (entry: [string, PlayerData] | undefined, index: number) => {
    const colorBg = COLOR_BG[PLAYER_COLORS[index]]
    if (!entry) {
      return (
        <div
          key={index}
          className="flex items-center gap-3 p-3 rounded-sm border border-dashed border-storm-600/30 bg-storm-800/20"
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colorBg} opacity-30`}>
            <span className="font-display text-xs font-bold text-white">{index + 1}</span>
          </div>
          <p className="font-body text-sm text-storm-500 italic">Waiting for player...</p>
        </div>
      )
    }

    const [sessionId, player] = entry
    const isYou = sessionId === localPlayerId
    const name = isYou ? 'You' : `Player ${index + 1}`

    return (
      <div key={sessionId} className="flex items-center gap-3 p-3 rounded-sm border border-storm-500/20 bg-storm-800/40">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colorBg}`}>
          <span className="font-display text-xs font-bold text-white">{index + 1}</span>
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <p className="font-body text-sm font-medium text-storm-100 truncate">{name}</p>
          {player.isHost && (
            <span className="px-1.5 py-0.5 text-[9px] font-display uppercase tracking-wider bg-accent-fire/20 text-accent-fire rounded-sm border border-accent-fire/30">
              Host
            </span>
          )}
          {isYou && (
            <span className="px-1.5 py-0.5 text-[9px] font-display uppercase tracking-wider bg-accent-ice/20 text-accent-ice rounded-sm border border-accent-ice/30">
              You
            </span>
          )}
        </div>
        <div className="w-2 h-2 rounded-full bg-player-green" />
      </div>
    )
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-storm-gradient" />

      <div className="relative z-10 w-full max-w-lg mx-4 animate-slide-up">
        <div className="panel p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="font-body text-xs text-storm-400 uppercase tracking-widest">Room</p>
              <div className="flex items-center gap-3 mt-1">
                <h2 className="font-mono text-2xl font-bold text-accent-lightning tracking-wider">{roomCode || '----'}</h2>
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-sm bg-storm-700/50 hover:bg-storm-600/50 transition-colors"
                  title="Copy room code"
                >
                  {copied ? (
                    <svg className="w-4 h-4 text-player-green" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-storm-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div className="text-right">
              <p className="font-body text-xs text-storm-400 uppercase tracking-widest">Players</p>
              <p className="font-mono text-lg font-bold text-storm-100">{filledCount}/4</p>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <ConnectionStatusBadge status={connectionStatus} onReconnect={() => reconnect()} />
          </div>

          {connectionStatus === ConnectionStatus.RECONNECTING && (
            <div className="mb-4">
              <ErrorMessage
                code="NETWORK_TIMEOUT"
                message="Connection interrupted. Reconnecting to the room..."
                variant="warning"
                onRetry={() => reconnect()}
              />
            </div>
          )}

          {uiError && (
            <div className="mb-4">
              <ErrorMessage code="SERVER_ERROR" message={uiError} onDismiss={() => useGameStore.getState().setError(null)} />
            </div>
          )}

          {roomClosed && (
            <div className="mb-4">
              <ErrorMessage
                code="UNEXPECTED_STATE"
                message={roomClosed}
                onDismiss={() => navigate('/')}
              />
            </div>
          )}

          <div className="storm-divider mb-6" />

          <div className="space-y-3 mb-6">{slots.map(renderSlot)}</div>

          <div className="storm-divider mb-6" />

          <div className="mb-6">
            <p className="font-display text-xs uppercase tracking-widest text-storm-300 mb-3">Difficulty</p>
            <div className="flex gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.value}
                  onClick={() => handleDifficulty(d.value)}
                  disabled={!isHost}
                  className={`flex-1 py-2.5 rounded-sm font-display text-xs uppercase tracking-wider border transition-all duration-200 ${
                    difficulty === d.value
                      ? `${d.color} ${d.border} bg-storm-700/50`
                      : `text-storm-400 border-storm-600/30 ${isHost ? d.hoverBg : ''}`
                  } ${!isHost ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {isHost ? (
            <button
              onClick={handleStart}
              disabled={filledCount < 2}
              className={`btn-primary w-full ${filledCount < 2 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Start Game
            </button>
          ) : (
            <div className="text-center py-3">
              <p className="font-body text-sm text-storm-400 animate-pulse">Waiting for host to start...</p>
            </div>
          )}

          {filledCount < 2 && (
            <p className="text-center mt-2 font-body text-xs text-storm-500">
              Need at least 2 players to start
            </p>
          )}

          <button
            onClick={handleLeave}
            className="w-full mt-3 py-2 font-body text-xs text-storm-400 hover:text-player-red transition-colors uppercase tracking-wider"
          >
            Leave Room
          </button>
        </div>
      </div>
    </div>
  )
}