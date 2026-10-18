import { SiteLayout } from '@/components/site/site-layout'
import { CodeBlock, PageHero } from '@/components/site/ui'
import { Button } from '@alfakit/react'
import { Link } from '@inertiajs/react'
import { ArrowRight } from 'lucide-react'

interface Props {
    links: { pluginsJson: string; edit: string; contact: string }
    categories: Record<string, string>
}

const ENTRY = `{
    "name": "Blog",
    "package": "acme/alfakit-blog",
    "description": "Posts, categories and an editor page for AlfaKit panels.",
    "author": { "name": "Acme", "url": "https://acme.example" },
    "category": "other",
    "renderers": ["react", "vue", "svelte"],
    "alfakit": "^1.0",
    "links": {
        "repository": "https://github.com/acme/alfakit-blog",
        "docs": "https://github.com/acme/alfakit-blog#readme",
        "packagist": "https://packagist.org/packages/acme/alfakit-blog",
        "npm": "https://www.npmjs.com/package/@acme/alfakit-blog"
    }
}`

const COMPOSER = `{
    "require": {
        "alfasix/alfakit": "^1.0"
    },
    "extra": {
        "alfakit": {
            "version": "^1.0",
            "frontend": "@acme/alfakit-blog"
        }
    }
}`

const FIELDS: Array<[string, string]> = [
    ['name', 'Display name.'],
    ['package', 'The Composer package name (vendor/name). Must be unique in the list.'],
    ['description', 'One or two sentences on what the plugin adds.'],
    ['author', 'Your name and an optional URL.'],
    ['category', 'One of the category keys below.'],
    [
        'renderers',
        'The renderers the plugin works with: react, vue and/or svelte. A PHP-only plugin works with all three.',
    ],
    [
        'alfakit',
        'The Composer constraint on alfasix/alfakit, the same as extra.alfakit.version in your composer.json.',
    ],
    ['links', 'repository (required) and optionally docs, packagist and npm.'],
]

export default function Submit({ links, categories }: Props) {
    return (
        <SiteLayout>
            <PageHero eyebrow="Plugins" title="Submit a plugin">
                <p>
                    The directory is a JSON file in the AlfaKit repository. Add your plugin with a
                    pull request; a test checks every entry before it is merged.
                </p>
            </PageHero>

            <div className="site-prose mx-auto flex max-w-3xl flex-col gap-12 px-4 py-14">
                <section aria-labelledby="step-1">
                    <h2 id="step-1" className="text-2xl font-bold tracking-tight">
                        1. Declare compatibility
                    </h2>
                    <p className="text-muted-foreground mt-3">
                        Add an <code>extra.alfakit</code> section to your plugin's{' '}
                        <code>composer.json</code>. <code>php artisan alfakit:upgrade</code> reads
                        it after every update and tells your users whether the installed AlfaKit
                        version is compatible. <code>frontend</code> names the npm package with your
                        renderer components; leave it out for a PHP-only plugin.
                    </p>
                    <CodeBlock code={COMPOSER} language="json" className="mt-4" />
                    <p className="text-muted-foreground mt-4">
                        <code>php artisan make:alfakit-plugin</code> writes this for you. Details in{' '}
                        <Link href="/docs/panels/plugins">Plugins</Link> and{' '}
                        <Link href="/docs/panels/contributing-a-plugin">Contributing a plugin</Link>
                        .
                    </p>
                </section>

                <section aria-labelledby="step-2">
                    <h2 id="step-2" className="text-2xl font-bold tracking-tight">
                        2. Add an entry to plugins.json
                    </h2>
                    <p className="text-muted-foreground mt-3">
                        Edit <a href={links.pluginsJson}>docs/content/plugins.json</a> and append
                        your plugin to the <code>plugins</code> array:
                    </p>
                    <CodeBlock code={ENTRY} language="json" className="mt-4" />
                    <div className="mt-6 overflow-x-auto rounded-xl border">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th scope="col" className="px-4 py-2 text-start font-semibold">
                                        Field
                                    </th>
                                    <th scope="col" className="px-4 py-2 text-start font-semibold">
                                        Value
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {FIELDS.map(([field, text]) => (
                                    <tr key={field} className="border-b last:border-0">
                                        <th
                                            scope="row"
                                            className="px-4 py-2 text-start align-top font-normal"
                                        >
                                            <code>{field}</code>
                                        </th>
                                        <td className="text-muted-foreground px-4 py-2">{text}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-muted-foreground mt-6">Categories:</p>
                    <ul className="text-muted-foreground">
                        {Object.entries(categories).map(([key, label]) => (
                            <li key={key}>
                                <code>{key}</code>: {label}
                            </li>
                        ))}
                    </ul>
                </section>

                <section aria-labelledby="step-3">
                    <h2 id="step-3" className="text-2xl font-bold tracking-tight">
                        3. Open a pull request
                    </h2>
                    <p className="text-muted-foreground mt-3">
                        GitHub can make the edit and the pull request in one go from the browser.
                        Run <code>php artisan test</code> in <code>docs/</code> first if you work
                        locally; the plugin directory test checks the required fields, the renderers
                        and the category.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <Button asChild>
                            <a href={links.edit}>
                                Edit plugins.json on GitHub{' '}
                                <ArrowRight className="rtl:rotate-180" aria-hidden="true" />
                            </a>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href="/plugins">Back to the directory</Link>
                        </Button>
                    </div>
                    <p className="text-muted-foreground mt-6">
                        Can't open a pull request? Get in touch with Alfa Six through{' '}
                        <a href={links.contact}>alfasixbh.com</a> and we will add the entry for you.
                    </p>
                </section>
            </div>
        </SiteLayout>
    )
}
