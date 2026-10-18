import { initializeAppearance } from '@alfakit/core'
import { createInertiaApp } from '@inertiajs/react'

const appName = import.meta.env.VITE_APP_NAME || 'Alfakit'

void createInertiaApp({
    title: (title) =>
        !title ? appName : title.includes(appName) ? title : `${title} - ${appName}`,
    progress: {
        color: 'var(--primary)',
    },
})

initializeAppearance()
