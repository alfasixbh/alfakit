import { acquireChannel, withEcho, type EchoLike } from './realtime'
import type { RecordKey } from './schema/common'
import type { PresenceSchema, PresenceState } from './schema/realtime'
import { createStore, type Store } from './store'

/** Another user on the same record (what `RealtimeChannels::member()` shares). */
export interface PresenceMember {
  id: RecordKey
  name: string
  avatar?: string | null
  state: PresenceState
}

export interface PresenceRoomState {
  /** Other users on the record, in the order they arrived; never the current user. */
  members: PresenceMember[]
  /** The channel was joined (Echo is available and the user may see the record). */
  connected: boolean
}

const rooms = new Map<string, PresenceRoom>()

/** Whisper (client event) carrying a member's editing/viewing state. */
export const PRESENCE_STATE_WHISPER = 'alfakit-presence'

function asMember(value: unknown): Omit<PresenceMember, 'state'> | null {
  if (!value || typeof value !== 'object') return null

  const { id, name, avatar } = value as Record<string, unknown>

  if (typeof id !== 'string' && typeof id !== 'number') return null

  return {
    id,
    name: typeof name === 'string' && name !== '' ? name : String(id),
    avatar: typeof avatar === 'string' && avatar !== '' ? avatar : null,
  }
}

export interface PresenceRoomOptions extends PresenceSchema {
  /** The current user's key (left out of `members`). */
  self?: RecordKey | null
  echo?: EchoLike | null
}

/**
 * Who else is on a record page: joins the record's presence channel and tracks its members
 * and their editing/viewing state (shared with whispers). Renderers show `store` as avatars.
 */
/**
 * The members of a presence channel whose subscription already succeeded (Pusher protocol:
 * Reverb, Pusher), as `here` would list them; null before that or with another connector.
 */
function subscribedMembers(channel: unknown): unknown[] | null {
  const subscription = (
    channel as {
      subscription?: { subscribed?: boolean; members?: { members?: Record<string, unknown> } }
    }
  ).subscription
  const members = subscription?.members?.members

  if (!subscription?.subscribed || !members || typeof members !== 'object') return null

  return Object.values(members)
}

export class PresenceRoom {
  readonly store: Store<PresenceRoomState> = createStore<PresenceRoomState>({
    members: [],
    connected: false,
  })

  private readonly states = new Map<string, PresenceState>()
  /** Names of everybody seen on the channel, also after they left ("Dana saved changes"). */
  private readonly names = new Map<string, string>()
  private whisper: ((data: Record<string, unknown>) => void) | null = null
  private state: PresenceState

  constructor(private readonly options: PresenceRoomOptions) {
    this.state = options.state
  }

  get members(): PresenceMember[] {
    return this.store.get().members
  }

  /** The name of a user seen on the record, if any. */
  memberName(id: RecordKey): string | null {
    return this.names.get(String(id)) ?? null
  }

  /** The started room of a presence channel (the conflict banner reads names from it). */
  static find(channel: string): PresenceRoom | null {
    return rooms.get(channel) ?? null
  }

  /** Join the channel. Returns the function that leaves it. */
  start(): () => void {
    rooms.set(this.options.channel, this)

    const stop = withEcho(
      (echo) => {
        const acquired = acquireChannel(echo, 'presence', this.options.channel)

        if (!acquired) return

        const channel = acquired.channel
        let active = true

        this.whisper = (data) => {
          try {
            channel.whisper?.(PRESENCE_STATE_WHISPER, data)
          } catch {
            // Client events can be disabled on the server; presence still works.
          }
        }

        const here = (members: unknown[]) => {
          if (!active) return

          this.store.set({
            connected: true,
            members: members
              .map(asMember)
              .filter((m) => m !== null)
              .map((m) => this.withState(m))
              .filter((member) => !this.isSelf(member.id)),
          })
          this.announce()
        }

        channel.here(here)

        // A channel another part of the page already joined (the conflict monitor, a room
        // re-created by a re-render) fired `here` before this listener existed: take the
        // members it already has (W-S5-05).
        const joined = subscribedMembers(channel)

        if (joined) here(joined)

        channel.joining((value) => {
          const member = asMember(value)

          if (!active || !member || this.isSelf(member.id)) return

          this.store.update({
            members: [
              ...this.members.filter((existing) => String(existing.id) !== String(member.id)),
              this.withState(member),
            ],
          })
          // Tell the newcomer what this page does.
          this.announce()
        })

        channel.leaving((value) => {
          const member = asMember(value)

          if (!active || !member) return

          this.states.delete(String(member.id))
          this.store.update({
            members: this.members.filter((existing) => String(existing.id) !== String(member.id)),
          })
        })

        channel.listenForWhisper?.(PRESENCE_STATE_WHISPER, (data) => {
          const id = data.id
          const state = data.state

          if (!active || (typeof id !== 'string' && typeof id !== 'number')) return
          if (state !== 'editing' && state !== 'viewing') return

          this.states.set(String(id), state)
          this.store.update({
            members: this.members.map((member) =>
              String(member.id) === String(id) ? { ...member, state } : member,
            ),
          })
        })

        return () => {
          active = false
          this.whisper = null
          acquired.release()
          this.store.set({ members: [], connected: false })
        }
      },
      { echo: this.options.echo },
    )

    return () => {
      stop()

      if (rooms.get(this.options.channel) === this) rooms.delete(this.options.channel)
    }
  }

  /** Change this page's state (e.g. to `editing` once the form has unsaved changes). */
  setState(state: PresenceState): void {
    if (state === this.state) return

    this.state = state
    this.announce()
  }

  private announce(): void {
    if (this.options.self === undefined || this.options.self === null) return

    this.whisper?.({ id: this.options.self, state: this.state })
  }

  private withState(member: Omit<PresenceMember, 'state'>): PresenceMember {
    this.names.set(String(member.id), member.name)

    return { ...member, state: this.states.get(String(member.id)) ?? 'viewing' }
  }

  private isSelf(id: RecordKey): boolean {
    return (
      this.options.self !== undefined &&
      this.options.self !== null &&
      String(id) === String(this.options.self)
    )
  }
}

/** Initials for an avatar without an image ("Dana Scully" → "DS"). */
export function presenceInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  return (
    parts.length > 1 ? `${parts[0]![0]}${parts.at(-1)![0]}` : (parts[0] ?? '?').slice(0, 2)
  ).toLocaleUpperCase()
}

/** At most `limit` avatars, and how many more are not shown. */
export function visiblePresenceMembers(
  members: PresenceMember[],
  limit = 4,
): { shown: PresenceMember[]; overflow: number } {
  return { shown: members.slice(0, limit), overflow: Math.max(0, members.length - limit) }
}
