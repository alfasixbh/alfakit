import { AlfakitAnalytics, HelpdeskChat } from '@alfakit/react'
import { usePage } from '@inertiajs/react'

export interface DogfoodProps {
    analytics: { siteKey: string; shareUrl: string | null } | null
    chat: { endpoint: string } | null
    contact: boolean
}

/** The page-view tracker (Analytics plugin) and the chat bubble (Helpdesk plugin), when on. */
export function Dogfood() {
    const dogfood = usePage().props.dogfood as DogfoodProps | undefined

    return (
        <>
            {dogfood?.analytics && <AlfakitAnalytics siteKey={dogfood.analytics.siteKey} />}
            {dogfood?.chat && (
                <HelpdeskChat
                    endpoint={dogfood.chat.endpoint}
                    position="end"
                    label="Chat with us"
                />
            )}
        </>
    )
}
