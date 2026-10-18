import {
  CircleCheckIcon,
  CircleXIcon,
  InfoIcon,
  Loader2Icon,
  TriangleAlertIcon,
} from 'lucide-react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'
import { useT } from '../../context'

function Toaster({ toastOptions, ...props }: ToasterProps) {
  const t = useT()

  return (
    <Sonner
      theme="system"
      className="toaster group"
      // sonner appends the hotkey: "Notifications alt+T".
      containerAriaLabel={t('notifications', {}, 'Notifications')}
      toastOptions={{
        closeButtonAriaLabel: t('close_notification', {}, 'Close notification'),
        ...toastOptions,
      }}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <CircleXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
