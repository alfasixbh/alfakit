import { SiteLayout } from '@/components/site/site-layout'
import { PageHero } from '@/components/site/ui'
import { Button } from '@alfakit/react'
import { Link } from '@inertiajs/react'
import { ArrowRight, ArrowRightLeft, LifeBuoy, PanelsTopLeft } from 'lucide-react'

const SERVICES = [
    {
        icon: PanelsTopLeft,
        title: 'Custom panels',
        text: 'Admin panels, back offices and customer portals designed and built on AlfaKit, in the renderer your team uses, including custom fields, widgets and themes.',
    },
    {
        icon: ArrowRightLeft,
        title: 'Migrations from Filament',
        text: 'Moving a Filament app to AlfaKit: running alfakit:migrate-from-filament, working through its report, and replacing Blade views, Livewire components and plugins with AlfaKit equivalents.',
    },
    {
        icon: LifeBuoy,
        title: 'Support',
        text: 'Help for teams building on AlfaKit, from the team that maintains it.',
    },
]

export default function Services({ contactUrl }: { contactUrl: string }) {
    return (
        <SiteLayout>
            <PageHero
                eyebrow="Alfa Six services"
                title="Need help building on AlfaKit?"
                aside={
                    <img
                        src="/brand/alfakit-mascot-color.svg"
                        alt="The AlfaKit fox mascot"
                        width="224"
                        height="258"
                        className="mx-auto hidden h-auto w-48 lg:block"
                    />
                }
            >
                <p>
                    AlfaKit is built and maintained by Alfa Six. The same team builds panels for
                    clients and helps teams adopt AlfaKit.
                </p>
                <div className="mt-6">
                    <Button asChild size="lg">
                        <a href={contactUrl}>
                            Contact Alfa Six{' '}
                            <ArrowRight className="rtl:rotate-180" aria-hidden="true" />
                        </a>
                    </Button>
                </div>
            </PageHero>

            <div className="mx-auto max-w-screen-xl px-4 py-14">
                <ul className="grid gap-4 md:grid-cols-3">
                    {SERVICES.map((service) => (
                        <li
                            key={service.title}
                            className="bg-card flex flex-col gap-3 rounded-xl border p-6"
                        >
                            <span
                                className="bg-secondary text-secondary-foreground flex size-10 items-center justify-center rounded-lg"
                                aria-hidden="true"
                            >
                                <service.icon className="size-5" />
                            </span>
                            <h2 className="text-xl font-bold">{service.title}</h2>
                            <p className="text-muted-foreground text-sm">{service.text}</p>
                        </li>
                    ))}
                </ul>
                <div className="bg-brand-cream dark:bg-card mt-12 flex flex-col items-start gap-4 rounded-xl border p-6 sm:flex-row sm:items-center">
                    <div className="flex-1">
                        <h2 className="text-lg font-bold">Prefer to do it yourself?</h2>
                        <p className="text-muted-foreground mt-1 text-sm">
                            Everything in AlfaKit is documented and MIT licensed. The community page
                            lists where to ask questions.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline" className="bg-background">
                            <Link href="/docs">Read the docs</Link>
                        </Button>
                        <Button asChild variant="outline" className="bg-background">
                            <Link href="/community">Community</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </SiteLayout>
    )
}
