import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ADJ, TERRITORY_BY_ID, TERRITORY_IDS } from './mapData'
import {
  type Board,
  buildDeck,
  canAttackFrom,
  type Card,
  type Difficulty,
  isValidSet,
  ownedBy,
  type Phase,
  type Player,
  rand,
  reachable,
  type ReinforcementBreakdown,
  reinforcements,
  resolveBattle,
  rollDice,
  shuffle,
  START_ARMIES,
  tradeValue,
} from './rules'
import { setSoundEnabled, sfx } from './sound'

export interface PlayerConfig {
  name: string
  color: string
  ai: boolean
  difficulty: Difficulty
}

export type ThemeMode = 'system' | 'light' | 'dark'

export interface Settings {
  sound: boolean
  /** Colour theme; 'system' follows the OS preference. Optional for saves made before it existed. */
  theme?: ThemeMode
  /** Animation speed multiplier (1 normal, 2 fast, 4 turbo). */
  speed: number
}

export interface BattleView {
  key: number
  from: string
  to: string
  att: number[]
  def: number[]
  attLoss: number
  defLoss: number
  rolling: boolean
  attacker: number
  defender: number
  conquered: boolean
  duration: number
}

export interface PendingMove {
  kind: 'conquest' | 'fortify'
  from: string
  to: string
  max: number
}

export interface LogEntry {
  id: number
  text: string
  color?: string
}

export type Fx =
  | { id: number; kind: 'float'; territory: string; text: string; color: string }
  | { id: number; kind: 'shock'; territory: string; color: string }

export interface Banner {
  key: number
  title: string
  subtitle?: string
  color: string
}

export interface PlayerStats {
  conquered: number
  kills: number
  lost: number
}

interface GameData {
  screen: 'menu' | 'game'
  players: Player[]
  board: Board
  current: number
  phase: Phase
  turn: number
  pool: number
  deployLeft: number[]
  placeStep: number
  selected: string | null
  target: string | null
  conquered: boolean
  returnToAttack: boolean
  deck: Card[]
  discard: Card[]
  trades: number
  pendingMove: PendingMove | null
  battle: BattleView | null
  busy: boolean
  log: LogEntry[]
  winner: number | null
  settings: Settings
  gameId: number
  fx: Fx[]
  banner: Banner | null
  cardsOpen: boolean
  breakdown: ReinforcementBreakdown | null
  stats: PlayerStats[]
  lastCard: { key: number; card: Card } | null
}

interface GameActions {
  newGame: (configs: PlayerConfig[], manualDeploy: boolean) => void
  toMenu: () => void
  resume: () => void
  clickTerritory: (id: string) => void
  setPlaceStep: (n: number) => void
  place: (id: string, n: number) => void
  autoPlace: () => void
  attack: (dice: number) => Promise<boolean>
  blitz: () => Promise<boolean>
  confirmMove: (n: number) => void
  cancelMove: () => void
  endAttack: () => void
  endTurn: () => void
  trade: (cardIds: number[]) => boolean
  setCardsOpen: (open: boolean) => void
  select: (from: string | null, to?: string | null) => void
  updateSettings: (s: Partial<Settings>) => void
  removeFx: (id: number) => void
}

export type GameState = GameData & GameActions

let uid = 1
const nextId = () => uid++
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const name = (id: string) => TERRITORY_BY_ID[id].name

export const useGame = create<GameState>()(
  persist(
    (set, get) => {
      const log = (text: string, color?: string) =>
        set((s) => ({ log: [...s.log.slice(-59), { id: nextId(), text, color }] }))

      const addFx = (fx: Fx extends infer F ? (F extends Fx ? Omit<F, 'id'> : never) : never) => set((s) => ({ fx: [...s.fx, { ...fx, id: nextId() } as Fx] }))

      const banner = (title: string, color: string, subtitle?: string) =>
        set({ banner: { key: nextId(), title, subtitle, color } })

      const dur = (ms: number) => ms / get().settings.speed

      const startTurn = (p: number, turn: number) => {
        const s = get()
        const breakdown = reinforcements(s.board, p)
        const player = s.players[p]
        set({
          current: p,
          turn,
          phase: 'reinforce',
          pool: breakdown.total,
          breakdown,
          selected: null,
          target: null,
          conquered: false,
          returnToAttack: false,
          pendingMove: null,
          battle: null,
          cardsOpen: !player.ai && player.cards.length >= 5,
        })
        banner(player.name, player.color, `Tour ${turn} · +${breakdown.total} renforts`)
        log(`Tour ${turn} — ${player.name} reçoit ${breakdown.total} renforts`, player.color)
        sfx.turn()
      }

      const nextAlive = (from: number) => {
        const { players } = get()
        let n = from
        do n = (n + 1) % players.length
        while (!players[n].alive)
        return n
      }

      const startDeploy = (p: number) => {
        const s = get()
        set({ current: p, phase: 'deploy', pool: s.deployLeft[p], selected: null, target: null })
        banner(s.players[p].name, s.players[p].color, `Déploiement · ${s.deployLeft[p]} armées`)
        sfx.turn()
      }

      const enterAttack = () => {
        set({ phase: 'attack', returnToAttack: false, selected: null, target: null })
      }

      const doConquest = (from: string, to: string, moved: number) => {
        const s = get()
        const defender = s.board[to].owner
        const board = { ...s.board }
        board[to] = { owner: s.current, armies: moved }
        board[from] = { ...board[from], armies: board[from].armies - moved }
        const stats = s.stats.map((st, i) =>
          i === s.current ? { ...st, conquered: st.conquered + 1 } : i === defender ? { ...st, lost: st.lost + 1 } : st,
        )
        const attacker = s.players[s.current]
        set({ board, conquered: true, stats })
        addFx({ kind: 'shock', territory: to, color: attacker.color })
        sfx.conquer()
        log(`${attacker.name} conquiert ${name(to)}`, attacker.color)

        const extra = board[from].armies - 1
        if (extra > 0) set({ pendingMove: { kind: 'conquest', from, to, max: extra } })
        else set({ selected: canAttackFrom(board, to) ? to : null, target: null })

        if (ownedBy(board, defender).length === 0) {
          const loser = s.players[defender]
          const players = s.players.map((p, i) =>
            i === defender ? { ...p, alive: false, cards: [] } : i === s.current ? { ...p, cards: [...p.cards, ...loser.cards] } : p,
          )
          set({ players })
          log(`☠ ${loser.name} est éliminé !`, loser.color)
          sfx.eliminated()
          banner(`${loser.name} éliminé`, loser.color, `par ${attacker.name}`)
          if (players.filter((p) => p.alive).length === 1) {
            set({ winner: s.current, pendingMove: null })
            setTimeout(() => sfx.victory(), 600)
            return
          }
          if (!attacker.ai && players[s.current].cards.length >= 5) set({ cardsOpen: true })
        }
      }

      /** Rolls one battle, animates it and applies the result. Leaves `busy` set. */
      const runBattle = async (from: string, to: string, dice: number, duration: number) => {
        const gid = get().gameId
        const s = get()
        const attN = Math.min(dice, 3, s.board[from].armies - 1)
        const defN = Math.min(2, s.board[to].armies)
        const att = rollDice(attN)
        const def = rollDice(defN)
        const { attLoss, defLoss } = resolveBattle(att, def)
        set({
          busy: true,
          selected: from,
          target: to,
          battle: { key: nextId(), from, to, att, def, attLoss, defLoss, rolling: true, attacker: s.current, defender: s.board[to].owner, conquered: false, duration },
        })
        sfx.dice()
        await sleep(duration)
        if (get().gameId !== gid) return false
        const cur = get()
        const board = { ...cur.board }
        board[from] = { ...board[from], armies: board[from].armies - attLoss }
        board[to] = { ...board[to], armies: board[to].armies - defLoss }
        const defender = cur.board[to].owner
        const stats = cur.stats.map((st, i) =>
          i === cur.current ? { ...st, kills: st.kills + defLoss } : i === defender ? { ...st, kills: st.kills + attLoss } : st,
        )
        if (attLoss) addFx({ kind: 'float', territory: from, text: `-${attLoss}`, color: '#ff5d73' })
        if (defLoss) addFx({ kind: 'float', territory: to, text: `-${defLoss}`, color: '#ff5d73' })
        if (defLoss) sfx.hit()
        else sfx.defend()
        const conquered = board[to].armies === 0
        set({ board, stats, battle: { ...cur.battle!, rolling: false, conquered } })
        if (conquered) doConquest(from, to, attN)
        return conquered
      }

      const validAttack = (from: string | null, to: string | null): boolean => {
        const s = get()
        if (!from || !to || s.phase !== 'attack' || s.pendingMove || s.winner !== null) return false
        const b = s.board
        return b[from].owner === s.current && b[to].owner !== s.current && b[from].armies >= 2 && ADJ[from].includes(to)
      }

      return {
        screen: 'menu',
        players: [],
        board: {},
        current: 0,
        phase: 'reinforce',
        turn: 1,
        pool: 0,
        deployLeft: [],
        placeStep: 1,
        selected: null,
        target: null,
        conquered: false,
        returnToAttack: false,
        deck: [],
        discard: [],
        trades: 0,
        pendingMove: null,
        battle: null,
        busy: false,
        log: [],
        winner: null,
        settings: { sound: true, speed: 1, theme: 'system' },
        gameId: 0,
        fx: [],
        banner: null,
        cardsOpen: false,
        breakdown: null,
        stats: [],
        lastCard: null,

        newGame: (configs, manualDeploy) => {
          const players: Player[] = configs.map((c, i) => ({ ...c, id: i, alive: true, cards: [] }))
          const n = players.length
          const board: Board = {}
          shuffle(TERRITORY_IDS).forEach((id, i) => (board[id] = { owner: i % n, armies: 1 }))
          const deployLeft = players.map((_, p) => START_ARMIES[n] - ownedBy(board, p).length)
          if (!manualDeploy) {
            players.forEach((_, p) => {
              const mine = ownedBy(board, p)
              for (let k = 0; k < deployLeft[p]; k++) board[mine[rand(mine.length)]].armies++
              deployLeft[p] = 0
            })
          }
          set({
            screen: 'game',
            players,
            board,
            deployLeft,
            deck: buildDeck(),
            discard: [],
            trades: 0,
            winner: null,
            log: [],
            fx: [],
            gameId: get().gameId + 1,
            busy: false,
            battle: null,
            pendingMove: null,
            stats: players.map(() => ({ conquered: 0, kills: 0, lost: 0 })),
            lastCard: null,
          })
          log('⚔ La guerre mondiale commence !')
          if (manualDeploy) startDeploy(0)
          else startTurn(0, 1)
        },

        toMenu: () => set({ screen: 'menu', gameId: get().gameId + 1, busy: false, battle: null, banner: null, fx: [] }),

        resume: () => set({ screen: 'game', busy: false, battle: null, gameId: get().gameId + 1 }),

        setPlaceStep: (n) => set({ placeStep: n }),

        select: (from, to = null) => set({ selected: from, target: to }),

        clickTerritory: (id) => {
          const s = get()
          const me = s.players[s.current]
          if (s.busy || me?.ai || s.winner !== null || s.pendingMove) return
          const t = s.board[id]
          if (s.phase === 'deploy' || s.phase === 'reinforce') {
            if (t.owner !== s.current) return
            if (s.phase === 'reinforce' && me.cards.length >= 5) {
              set({ cardsOpen: true })
              return
            }
            get().place(id, s.placeStep)
            return
          }
          if (s.phase === 'attack') {
            if (t.owner === s.current) {
              if (id === s.selected) set({ selected: null, target: null })
              else if (canAttackFrom(s.board, id)) {
                set({ selected: id, target: null })
                sfx.select()
              }
              return
            }
            if (s.selected && ADJ[s.selected].includes(id)) {
              if (s.target === id) void get().attack(3)
              else {
                set({ target: id })
                sfx.select()
              }
              return
            }
            // Convenience: pick the strongest adjacent own territory automatically.
            const from = ADJ[id]
              .filter((n) => s.board[n].owner === s.current && s.board[n].armies >= 2)
              .sort((a, b) => s.board[b].armies - s.board[a].armies)[0]
            if (from) {
              set({ selected: from, target: id })
              sfx.select()
            }
            return
          }
          if (s.phase === 'fortify') {
            if (t.owner !== s.current) return
            if (s.selected && id !== s.selected && reachable(s.board, s.selected).has(id)) {
              set({ target: id, pendingMove: { kind: 'fortify', from: s.selected, to: id, max: s.board[s.selected].armies - 1 } })
              sfx.select()
              return
            }
            if (id === s.selected) set({ selected: null, target: null })
            else if (t.armies > 1 && reachable(s.board, id).size > 0) {
              set({ selected: id, target: null })
              sfx.select()
            }
          }
        },

        place: (id, n) => {
          const s = get()
          if ((s.phase !== 'reinforce' && s.phase !== 'deploy') || s.pool <= 0 || s.board[id].owner !== s.current) return
          const amount = Math.max(1, Math.min(n, s.pool))
          const board = { ...s.board, [id]: { ...s.board[id], armies: s.board[id].armies + amount } }
          const pool = s.pool - amount
          set({ board, pool })
          addFx({ kind: 'float', territory: id, text: `+${amount}`, color: '#7dffb2' })
          sfx.place()
          if (pool > 0) return
          if (s.phase === 'deploy') {
            const deployLeft = [...s.deployLeft]
            deployLeft[s.current] = 0
            set({ deployLeft })
            const next = deployLeft.findIndex((d) => d > 0)
            if (next >= 0) startDeploy(next)
            else startTurn(0, 1)
          } else enterAttack()
        },

        autoPlace: () => {
          const s = get()
          if (s.pool <= 0) return
          const mine = ownedBy(s.board, s.current).filter((id) => ADJ[id].some((n) => s.board[n].owner !== s.current))
          const targets = mine.length ? mine : ownedBy(s.board, s.current)
          const board = { ...s.board }
          for (let k = 0; k < s.pool; k++) {
            const id = targets[rand(targets.length)]
            board[id] = { ...board[id], armies: board[id].armies + 1 }
          }
          set({ board, pool: 1 })
          get().place(targets[0], 1)
        },

        attack: async (dice) => {
          const s = get()
          if (s.busy || !validAttack(s.selected, s.target)) return false
          const won = await runBattle(s.selected!, s.target!, dice, dur(1100))
          set({ busy: false })
          return won
        },

        blitz: async () => {
          const s = get()
          if (s.busy || !validAttack(s.selected, s.target)) return false
          const gid = s.gameId
          const from = s.selected!
          const to = s.target!
          let won = false
          while (!won && get().gameId === gid && get().board[from].armies >= 2 && get().board[to].owner !== get().current) {
            won = await runBattle(from, to, 3, dur(420))
            if (!won) await sleep(dur(120))
          }
          if (get().gameId === gid) set({ busy: false })
          return won
        },

        confirmMove: (n) => {
          const s = get()
          const pm = s.pendingMove
          if (!pm) return
          const amount = Math.max(0, Math.min(n, pm.max))
          const board = { ...s.board }
          board[pm.from] = { ...board[pm.from], armies: board[pm.from].armies - amount }
          board[pm.to] = { ...board[pm.to], armies: board[pm.to].armies + amount }
          set({ board, pendingMove: null })
          if (amount > 0) {
            addFx({ kind: 'float', territory: pm.to, text: `+${amount}`, color: '#7dffb2' })
            sfx.place()
          }
          if (pm.kind === 'fortify') {
            log(`${s.players[s.current].name} déplace ${amount} armées vers ${name(pm.to)}`, s.players[s.current].color)
            get().endTurn()
          } else {
            const sel = canAttackFrom(board, pm.to) ? pm.to : canAttackFrom(board, pm.from) ? pm.from : null
            set({ selected: sel, target: null })
          }
        },

        cancelMove: () => {
          const pm = get().pendingMove
          if (pm?.kind === 'conquest') get().confirmMove(0)
          else set({ pendingMove: null, target: null })
        },

        endAttack: () => {
          const s = get()
          if (s.busy || s.phase !== 'attack' || s.pendingMove) return
          set({ phase: 'fortify', selected: null, target: null, battle: null })
          sfx.click()
        },

        endTurn: () => {
          const s = get()
          if (s.winner !== null) return
          let { deck, discard } = s
          let players = s.players
          if (s.conquered) {
            if (deck.length === 0) {
              deck = shuffle(discard)
              discard = []
            }
            if (deck.length) {
              const card = deck[0]
              deck = deck.slice(1)
              players = players.map((p, i) => (i === s.current ? { ...p, cards: [...p.cards, card] } : p))
              set({ lastCard: players[s.current].ai ? null : { key: nextId(), card } })
              sfx.card()
            }
          }
          set({ deck, discard, players, battle: null })
          const next = nextAlive(s.current)
          startTurn(next, next <= s.current ? s.turn + 1 : s.turn)
        },

        trade: (cardIds) => {
          const s = get()
          const me = s.players[s.current]
          const cards = me.cards.filter((c) => cardIds.includes(c.id))
          if (!isValidSet(cards) || (s.phase !== 'reinforce' && s.phase !== 'attack')) return false
          const value = tradeValue(s.trades)
          let board = s.board
          const bonusCard = cards.find((c) => c.territory && s.board[c.territory].owner === s.current)
          if (bonusCard?.territory) {
            const t = bonusCard.territory
            board = { ...board, [t]: { ...board[t], armies: board[t].armies + 2 } }
            addFx({ kind: 'float', territory: t, text: '+2', color: '#ffd166' })
          }
          const players = s.players.map((p, i) => (i === s.current ? { ...p, cards: p.cards.filter((c) => !cardIds.includes(c.id)) } : p))
          const toAttack = s.phase === 'attack'
          set({
            board,
            players,
            discard: [...s.discard, ...cards],
            trades: s.trades + 1,
            pool: s.pool + value,
            phase: 'reinforce',
            returnToAttack: s.returnToAttack || toAttack,
            cardsOpen: players[s.current].cards.length >= 5 && !me.ai,
          })
          log(`${me.name} échange des cartes : +${value} armées${bonusCard ? ' (+2 bonus)' : ''}`, me.color)
          sfx.trade()
          return true
        },

        setCardsOpen: (open) => {
          const s = get()
          const me = s.players[s.current]
          if (!open && me && !me.ai && me.cards.length >= 5 && (s.phase === 'reinforce' || s.phase === 'attack')) return
          set({ cardsOpen: open })
        },

        updateSettings: (patch) => {
          const settings = { ...get().settings, ...patch }
          setSoundEnabled(settings.sound)
          set({ settings })
        },

        removeFx: (id) => set((s) => ({ fx: s.fx.filter((f) => f.id !== id) })),
      }
    },
    {
      name: 'risk-save-v1',
      partialize: (s) => {
        const { fx: _fx, banner: _b, battle: _bt, busy: _busy, lastCard: _lc, ...rest } = s
        return rest
      },
      onRehydrateStorage: () => (state) => {
        if (state) setSoundEnabled(state.settings.sound)
      },
    },
  ),
)

export const currentPlayer = (s: GameState) => s.players[s.current]
