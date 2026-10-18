import {
  PresenceRoom,
  presenceInitials,
  visiblePresenceMembers,
  type PresenceSchema,
} from '@alfakit/core'
import { useEffect, useMemo } from 'react'
import { useChoice, usePanel, useT } from '../../context'
import { useStore } from '../../hooks/use-store'
import { cn } from '../../lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'

/**
 * Who else is on this record (`Panel::realtime()`): avatars of the other users on the
 * record page, with a dot for those editing it. A labelled list with screen-reader text
 * per user. Replace it with `components: { 'page:presence': … }`.
 */
export function RecordPresence({ presence }: { presence: PresenceSchema }) {
  const panel = usePanel()
  const t = useT()
  const choice = useChoice()
  const self = panel.user?.id ?? null

  const room = useMemo(
    () => new PresenceRoom({ channel: presence.channel, state: presence.state, self }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [presence.channel, self],
  )

  useEffect(() => room.start(), [room])
  useEffect(() => room.setState(presence.state), [room, presence.state])

  const { members } = useStore(room.store)

  if (members.length === 0) return null

  const { shown, overflow } = visiblePresenceMembers(members)

  return (
    <div data-slot="presence" className="flex items-center">
      <ul
        aria-label={t('realtime.presence.label', {}, 'Also on this record')}
        className="flex items-center -space-x-2 rtl:space-x-reverse"
      >
        {shown.map((member) => {
          const label =
            member.state === 'editing'
              ? t('realtime.presence.editing', { name: member.name }, ':name is editing')
              : t('realtime.presence.viewing', { name: member.name }, ':name is viewing')

          return (
            <li
              key={member.id}
              data-state={member.state}
              title={label}
              className="relative inline-flex"
            >
              <Avatar
                className={cn(
                  'ring-background size-8 ring-2',
                  member.state === 'editing' && 'ring-primary',
                )}
              >
                {member.avatar && <AvatarImage src={member.avatar} alt="" />}
                <AvatarFallback aria-hidden="true">{presenceInitials(member.name)}</AvatarFallback>
              </Avatar>
              {member.state === 'editing' && (
                <span
                  aria-hidden="true"
                  className="bg-primary ring-background absolute -end-0.5 -bottom-0.5 size-2.5 rounded-full ring-2"
                />
              )}
              <span className="sr-only">{label}</span>
            </li>
          )
        })}
        {overflow > 0 && (
          <li className="relative inline-flex">
            <span
              aria-hidden="true"
              className="bg-muted ring-background flex size-8 items-center justify-center rounded-full text-xs font-medium ring-2"
            >
              {`+${overflow}`}
            </span>
            <span className="sr-only">
              {choice(
                'realtime.presence.more',
                overflow,
                {},
                '{1} and :count other person|[2,*] and :count other people',
              )}
            </span>
          </li>
        )}
      </ul>
    </div>
  )
}
