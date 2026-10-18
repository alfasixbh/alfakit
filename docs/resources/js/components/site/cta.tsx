import { Button } from '@alfakit/react'
import { Link } from '@inertiajs/react'
import { ArrowRight } from 'lucide-react'

/** The closing call to action of the marketing pages, on Alfa Navy with the fox mascot. */
export function FinalCta({
    demoUrl,
    title = 'Build your next panel in the stack you already use',
    text = 'Install the package, generate a resource and open it in React, Vue or Svelte.',
}: {
    demoUrl: string
    title?: string
    text?: string
}) {
    return (
        <section
            aria-labelledby="cta-title"
            className="on-brand bg-brand-navy relative isolate overflow-hidden text-white"
        >
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(rgb(255_255_255/0.09)_1px,transparent_1px)] mask-[radial-gradient(ellipse_at_center,black,transparent_70%)] bg-size-[22px_22px]"
            />
            <div className="mx-auto grid max-w-screen-xl items-center gap-10 px-4 py-16 sm:py-20 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="flex min-w-0 flex-col items-center gap-6 text-center lg:items-start lg:text-start">
                    <h2
                        id="cta-title"
                        className="max-w-2xl text-3xl font-bold tracking-tight text-balance sm:text-4xl"
                    >
                        {title}
                    </h2>
                    <p className="max-w-xl text-lg text-[#d6e2f2]">{text}</p>
                    <div className="flex w-full max-w-md flex-col gap-2 font-mono text-[13px]">
                        <code
                            dir="ltr"
                            className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-start break-words text-[#e6edf7]"
                        >
                            <span className="text-[#9db9de] select-none" aria-hidden="true">
                                ${' '}
                            </span>
                            composer require alfasix/alfakit
                        </code>
                        <code
                            dir="ltr"
                            className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-start break-words text-[#e6edf7]"
                        >
                            <span className="text-[#9db9de] select-none" aria-hidden="true">
                                ${' '}
                            </span>
                            php artisan alfakit:install
                        </code>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3">
                        <Button
                            asChild
                            size="lg"
                            className="bg-brand-orange rounded-full text-[#14263d] hover:bg-[#f68d40]"
                        >
                            <Link href="/docs/getting-started/installation">
                                Get started <ArrowRight className="rtl:rotate-180" />
                            </Link>
                        </Button>
                        <Button
                            asChild
                            size="lg"
                            variant="outline"
                            className="rounded-full border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white dark:border-white/40 dark:bg-transparent dark:hover:bg-white/10"
                        >
                            <a href={demoUrl}>Try the live demo</a>
                        </Button>
                    </div>
                </div>
                <img
                    src="/brand/alfakit-mascot-color.svg"
                    alt="The AlfaKit fox mascot"
                    width="320"
                    height="369"
                    loading="lazy"
                    className="mx-auto hidden h-auto w-48 sm:block lg:w-64"
                />
            </div>
        </section>
    )
}
