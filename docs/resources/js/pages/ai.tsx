import { SiteLayout } from '@/components/site/site-layout'
import { copyText } from '@/lib/copy'
import { Button } from '@alfakit/react'
import { Link } from '@inertiajs/react'
import { ArrowRight, Bot, Check, Copy, FileText, Sparkles, Terminal } from 'lucide-react'
import { useState, type ReactNode } from 'react'

interface Props {
    skills: Array<{ name: string; description: string }>
    urls: { llms: string; full: string; page: string }
}

const RULES = [
    [
        'Build in PHP',
        'Validation, queries, authorization and formatting run on the server. Frontend code is only for new visual components.',
    ],
    [
        'Use AlfaKit namespaces',
        'Classes live under AlfaSix\\Alfakit. The API feels like Filament, but Filament\\ classes do not exist here.',
    ],
    [
        'Generate first',
        'php artisan make:alfakit-resource Post --generate writes the resource, pages, form and table for you.',
    ],
    [
        'Translate and mirror',
        'Every label goes through __() or t(), and layouts use logical classes so right-to-left languages work.',
    ],
] as const

function CopyCommand({ value, label }: { value: string; label?: string }) {
    const [copied, setCopied] = useState(false)

    const copy = async () => {
        if (await copyText(value)) {
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1500)
        }
    }

    return (
        <div className="bg-background flex min-w-0 items-center gap-2 rounded-md border py-1.5 ps-3 pe-1.5 font-mono text-[13px] leading-5">
            <span className="min-w-0 flex-1 break-all">{value}</span>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 shrink-0"
                onClick={copy}
                aria-label={copied ? 'Copied' : `Copy ${label ?? value}`}
            >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
        </div>
    )
}

function Card({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
    return (
        <section className="bg-card flex min-w-0 flex-col gap-4 rounded-xl border p-6">
            <div className="flex items-center gap-3">
                <span className="bg-secondary text-secondary-foreground flex size-9 items-center justify-center rounded-lg">
                    {icon}
                </span>
                <h2 className="text-lg font-semibold">{title}</h2>
            </div>
            {children}
        </section>
    )
}

export default function Ai({ skills, urls }: Props) {
    return (
        <SiteLayout>
            <section className="bg-brand-cream dark:bg-card">
                <div className="mx-auto grid max-w-screen-xl items-center gap-10 px-4 pt-16 pb-14 lg:grid-cols-[1.4fr_1fr]">
                    <div>
                        <p className="text-primary mb-4 text-sm font-semibold">
                            AI and Laravel Boost
                        </p>
                        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                            Your agent already knows AlfaKit.
                        </h1>
                        <p className="text-muted-foreground mt-6 max-w-2xl text-lg">
                            AlfaKit ships its own guidelines and skills, so Claude Code, Cursor,
                            Codex, Copilot and other agents write AlfaKit code that compiles, with
                            AlfaKit's own namespaces rather than Filament's or generic Laravel
                            patterns.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <Button asChild size="lg">
                                <Link href="/docs/getting-started/ai-agents">
                                    Read the guide <ArrowRight className="rtl:rotate-180" />
                                </Link>
                            </Button>
                            <Button asChild size="lg" variant="outline">
                                <a href={urls.llms}>Open llms.txt</a>
                            </Button>
                        </div>
                    </div>
                    <img
                        src="/brand/alfakit-mascot-color.svg"
                        alt="The AlfaKit fox"
                        width="256"
                        height="295"
                        className="mx-auto h-auto w-48 max-w-full sm:w-64"
                    />
                </div>
            </section>

            <div className="mx-auto grid max-w-screen-xl gap-6 px-4 py-16 lg:grid-cols-3">
                <Card icon={<Sparkles className="size-5" />} title="With Laravel Boost">
                    <p className="text-muted-foreground text-sm">
                        Boost finds AlfaKit in your composer.json and installs its guideline and
                        four skills for every agent it supports. Nothing else to set up.
                    </p>
                    <CopyCommand value="composer require laravel/boost --dev" />
                    <CopyCommand value="php artisan boost:install" />
                    <p className="text-muted-foreground text-sm">
                        After updating AlfaKit, run <code>php artisan boost:update</code>.
                    </p>
                </Card>

                <Card icon={<Terminal className="size-5" />} title="Any other agent">
                    <p className="text-muted-foreground text-sm">
                        One command writes the same guidance as plain files: an AGENTS.md section,
                        CLAUDE.md and Claude Code skills, Cursor rules or Copilot instructions. It
                        detects what your project uses and only updates its own section.
                    </p>
                    <CopyCommand value="php artisan alfakit:ai" />
                    <CopyCommand value="php artisan alfakit:ai --target=claude --target=cursor" />
                </Card>

                <Card icon={<FileText className="size-5" />} title="Docs for machines">
                    <p className="text-muted-foreground text-sm">
                        The documentation follows the llms.txt convention: an index, everything in
                        one file, and every page as Markdown. Every docs page also has a Copy as
                        Markdown button.
                    </p>
                    <CopyCommand value={urls.llms} label="llms.txt URL" />
                    <CopyCommand value={urls.full} label="llms-full.txt URL" />
                    <CopyCommand value={urls.page} label="page Markdown URL" />
                </Card>
            </div>

            <section className="border-t">
                <div className="mx-auto max-w-screen-xl px-4 py-16">
                    <h2 className="mb-2 text-2xl font-semibold tracking-tight">
                        Skills, loaded when needed
                    </h2>
                    <p className="text-muted-foreground mb-8 max-w-2xl">
                        The guideline is loaded in every session. Skills hold the detail and are
                        read only when a task needs them, so they don't fill the agent's context.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {skills.map((skill) => (
                            <div key={skill.name} className="rounded-lg border p-5">
                                <p className="mb-2 flex items-center gap-2 font-mono text-sm font-medium">
                                    <Bot className="text-primary size-4" /> {skill.name}
                                </p>
                                <p className="text-muted-foreground text-sm">{skill.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="border-t">
                <div className="mx-auto max-w-screen-xl px-4 py-16">
                    <h2 className="mb-8 text-2xl font-semibold tracking-tight">
                        What agents are taught
                    </h2>
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {RULES.map(([title, text]) => (
                            <div key={title} className="flex flex-col gap-2">
                                <h3 className="font-semibold">{title}</h3>
                                <p className="text-muted-foreground text-sm">{text}</p>
                            </div>
                        ))}
                    </div>
                    <p className="text-muted-foreground mt-10 text-sm">
                        The guidance ships inside the package (<code>resources/boost</code>), so it
                        always matches the AlfaKit version you have installed, and a test checks
                        that every class it imports exists.
                    </p>
                </div>
            </section>
        </SiteLayout>
    )
}
