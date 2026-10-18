import { Seo } from '@/components/site/seo'
import { SiteFooter } from '@/components/site/site-footer'
import { SiteHeader } from '@/components/site/site-header'
import { Button } from '@alfakit/react'
import { Link } from '@inertiajs/react'
import { ArrowRight } from 'lucide-react'

const COPY: Record<number, { title: string; text: string }> = {
    403: { title: 'You can’t open this page', text: 'This page is not available to you.' },
    404: {
        title: 'Page not found',
        text: 'The page you are looking for has moved or never existed. The docs search may find it.',
    },
    500: {
        title: 'Something went wrong',
        text: 'The server ran into an error. Try again in a moment.',
    },
    503: { title: 'Back soon', text: 'The site is being updated. Try again in a few minutes.' },
}

/**
 * The website's error page (App\Support\Site\ErrorPage). The router has not run the web
 * middleware for unknown URLs, so the demo URL comes as a page prop.
 */
export default function ErrorPage({ status }: { status: number }) {
    const copy = COPY[status] ?? COPY[500]

    return (
        <div className="flex min-h-svh flex-col">
            <Seo />
            <SiteHeader />
            <main
                id="main"
                className="bg-brand-cream dark:bg-card flex flex-1 items-center border-b"
            >
                <div className="mx-auto grid max-w-screen-lg items-center gap-10 px-4 py-16 md:grid-cols-[1fr_auto]">
                    <div>
                        <p className="text-primary font-mono text-sm font-semibold">
                            Error {status}
                        </p>
                        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
                            {copy.title}
                        </h1>
                        <p className="text-muted-foreground mt-4 max-w-md text-lg">{copy.text}</p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <Button asChild size="lg">
                                <Link href="/">
                                    Go to the home page{' '}
                                    <ArrowRight className="rtl:rotate-180" aria-hidden="true" />
                                </Link>
                            </Button>
                            <Button asChild size="lg" variant="outline" className="bg-background">
                                <Link href="/docs">Browse the docs</Link>
                            </Button>
                        </div>
                    </div>
                    <img
                        src="/brand/alfakit-mascot-color.svg"
                        alt="The AlfaKit fox mascot"
                        width="224"
                        height="258"
                        className="mx-auto h-auto w-40 sm:w-56"
                    />
                </div>
            </main>
            <SiteFooter />
        </div>
    )
}
