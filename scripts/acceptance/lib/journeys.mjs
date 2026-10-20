// The browser journeys a new user goes through, then the route crawl.
import { skip } from './report.mjs'

const PANEL = '/admin'

export async function runJourneys({ app, report, session, ids, credentials, routes }) {
    const { page } = session
    const mode = app.mode

    const step = (id, title, fn, options = {}) => {
        const hooks = session.stepHooks()
        return report.step(id, title, fn, {
            needs: ['app', 'auth'],
            ...options,
            before: hooks.before,
            after: hooks.after,
        })
    }

    // ---------------------------------------------------------------- helpers
    const open = async (path, { allow4xx = false } = {}) => {
        const response = await page.goto(path, { waitUntil: 'load' })
        if (!response) throw new Error(`GET ${path}: no response`)
        if (response.status() >= 500)
            throw new Error(`GET ${path} answered HTTP ${response.status()}`)
        if (!allow4xx && response.status() >= 400)
            throw new Error(`GET ${path} answered HTTP ${response.status()}`)
        await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
        return response
    }
    const see = async (locator, what, timeout = 15_000) => {
        try {
            await locator.first().waitFor({ state: 'visible', timeout })
        } catch {
            throw new Error(`Expected to see ${what} on ${page.url()}`)
        }
    }
    const absent = async (locator, what) => {
        const count = await locator.count()
        if (count > 0) throw new Error(`Expected no ${what} on ${page.url()}, found ${count}`)
    }
    const toast = (text) =>
        see(page.locator('[data-sonner-toast]').filter({ hasText: text }), `a "${text}" toast`)
    const waitUrl = async (pattern, what) => {
        try {
            await page.waitForURL(pattern, { timeout: 20_000 })
        } catch {
            throw new Error(
                `Expected the URL to match ${pattern} (${what}); still on ${page.url()}`,
            )
        }
        await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    }
    const control = (name) =>
        page.getByRole('link', { name }).or(page.getByRole('button', { name }))
    const textbox = (name) => page.getByRole('textbox', { name, exact: true })
    const dialog = () => page.getByRole('alertdialog').or(page.getByRole('dialog'))
    const breadcrumbs = async (expected) => {
        const nav = page.locator('nav[aria-label="breadcrumb" i]').first()
        await see(nav, 'the breadcrumbs')
        const text = (await nav.innerText()).replace(/\s+/g, ' ')
        const missing = expected.filter((part) => !text.includes(part))
        if (missing.length) throw new Error(`Breadcrumbs "${text}" lack: ${missing.join(', ')}`)
        return text
    }
    const rowWith = (text) => page.getByRole('row').filter({ hasText: text })
    // Text columns may be generated as a RichEditor: compare the text, not the HTML.
    const plain = (html) =>
        String(html ?? '')
            .replace(/<[^>]+>/g, '')
            .trim()
    const pathOf = () => new URL(page.url()).pathname
    const noParentPicker = async (field, label) => {
        await absent(page.locator(`[data-field="${field}"]`), `${field} field`)
        await absent(page.getByRole('combobox', { name: label }), `"${label}" select`)
        await absent(page.getByLabel(label, { exact: true }), `"${label}" field`)
    }
    const confirmDelete = async () => {
        await control(/^Delete$/)
            .first()
            .click()
        const modal = dialog().last()
        await see(modal, 'the delete confirmation')
        await modal.getByRole('button', { name: 'Delete', exact: true }).click()
    }

    const post = `${PANEL}/posts/${ids.post}`
    const comment = `${post}/comments/${ids.comment}`
    const state = {}

    // ---------------------------------------------------------------- sign in
    await step(
        'B01',
        mode === 'panel'
            ? 'Sign in at /admin/login'
            : 'Register at /register, verify the email, open /dashboard',
        async () => {
            if (mode === 'panel') {
                await open(`${PANEL}/login`)
                await page.getByLabel(/email/i).first().fill(credentials.email)
                await page
                    .getByLabel(/^password/i)
                    .first()
                    .fill(credentials.password)
                await page.getByRole('button', { name: /sign in/i }).click()
                await waitUrl(/\/admin\/?$/, 'the dashboard after signing in')
            } else {
                await open('/register')
                await page.locator('#name').fill(credentials.name)
                await page.locator('#email').fill(credentials.email)
                await page.locator('#password').fill(credentials.password)
                await page.locator('#password_confirmation').fill(credentials.password)
                await page.getByRole('button', { name: /create account/i }).click()
                await waitUrl(
                    (url) => !url.pathname.startsWith('/register'),
                    'leaving the register page',
                )
                app.php(
                    `App\\Models\\User::where('email', '${credentials.email}')->update(['email_verified_at' => now()])`,
                )
                await open('/dashboard')
                if (!pathOf().startsWith('/dashboard'))
                    throw new Error(`/dashboard redirected to ${page.url()}`)
            }
            ids.user = app.php(
                `App\\Models\\User::where('email', '${credentials.email}')->value('id')`,
            )
            return `signed in as ${credentials.email} (user ${ids.user})`
        },
        { needs: ['app'], blocks: 'auth' },
    )

    // ---------------------------------------------------------------- panel basics
    await step('B02', 'Sidebar lists Posts and Users (and no nested resources)', async () => {
        await open(`${PANEL}/posts`)
        for (const label of ['Posts', 'Users'])
            await see(
                page.getByRole('link', { name: label, exact: true }),
                `a "${label}" navigation link`,
            )
        await absent(
            page.getByRole('link', { name: 'Comments', exact: true }),
            '"Comments" navigation link',
        )
        await absent(
            page.getByRole('link', { name: 'Replies', exact: true }),
            '"Replies" navigation link',
        )
    })

    await step('B03', '/admin never 500s (and never lands on a nested resource)', async () => {
        const response = await open(PANEL)
        if (/\/(comments|replies)(\/|$)/.test(pathOf()))
            throw new Error(`/admin sent the user to a nested resource: ${page.url()}`)
        return `HTTP ${response.status()}, landed on ${pathOf()}`
    })

    // ---------------------------------------------------------------- posts CRUD
    await step('B04', 'Posts list shows the seeded posts', async () => {
        await open(`${PANEL}/posts`)
        await see(rowWith('Seeded acceptance post'), 'the seeded post row')
    })

    await step('B05', 'Create a post (New post → form → Create → view page)', async () => {
        await open(`${PANEL}/posts`)
        await control(/^New post$/)
            .first()
            .click()
        await waitUrl(/\/admin\/posts\/create$/, 'the create page')
        state.postTitle = `Acceptance post ${Date.now().toString(36)}`
        await textbox('Title').fill(state.postTitle)
        await textbox('Body').fill('Written by the acceptance harness.')
        await page.getByRole('button', { name: 'Create', exact: true }).click()
        await toast('Created')
        await waitUrl(/\/admin\/posts\/\d+(\/edit)?$/, 'the new post')
        state.postId = Number(pathOf().match(/posts\/(\d+)/)[1])
        await see(page.getByText(state.postTitle), 'the new title')
        return `created post ${state.postId}`
    })

    await step('B06', 'Edit the post (Save changes)', async () => {
        if (!state.postId) skip('no post was created')
        await open(`${PANEL}/posts/${state.postId}/edit`)
        await textbox('Title').fill(`${state.postTitle} edited`)
        await page.getByRole('button', { name: 'Save changes', exact: true }).click()
        await toast('Saved')
        const title = app.php(`App\\Models\\Post::find(${state.postId})?->title`)
        if (title !== `${state.postTitle} edited`)
            throw new Error(`The database has title "${title}"`)
    })

    await step('B07', 'Delete the post from its edit page', async () => {
        if (!state.postId) skip('no post was created')
        await open(`${PANEL}/posts/${state.postId}/edit`)
        await confirmDelete()
        await waitUrl(/\/admin\/posts\/?$/, 'the posts list after deleting')
        if (app.php(`App\\Models\\Post::whereKey(${state.postId})->exists()`))
            throw new Error('The post still exists')
    })

    // ---------------------------------------------------------------- nested: comments
    for (const [id, where, path] of [
        ['B08', 'VIEW', post],
        ['B09', 'EDIT', `${post}/edit`],
    ]) {
        await step(
            id,
            `Post ${where} page lists its comments by text, with "New comment"`,
            async () => {
                await open(path)
                await see(
                    rowWith('Seeded comment alpha'),
                    'the comment "Seeded comment alpha" in the comments list (not its ID)',
                )
                await see(rowWith('Seeded comment beta'), 'the comment "Seeded comment beta"')
                await see(
                    control(/^New comment$/),
                    'a "New comment" action (the manager must not be read-only)',
                )
            },
        )
    }

    await step('B10', 'Clicking a comment row opens the comment', async () => {
        await open(post)
        await rowWith('Seeded comment alpha')
            .first()
            .getByText('Seeded comment alpha')
            .first()
            .click()
        await waitUrl(
            new RegExp(`/admin/posts/${ids.post}/comments/${ids.comment}(/edit)?$`),
            'the comment page',
        )
        await see(page.getByText('Seeded comment alpha'), 'the comment body')
    })

    await step(
        'B11',
        '"New comment" opens the nested create page (no parent picker, breadcrumbs)',
        async () => {
            await open(post)
            await control(/^New comment$/)
                .first()
                .click()
            await waitUrl(
                new RegExp(`/admin/posts/${ids.post}/comments/create$`),
                'the nested create page',
            )
            await see(textbox('Body'), 'the Body field')
            await noParentPicker('post_id', 'Post')
            return `breadcrumbs: ${await breadcrumbs(['Posts', 'Seeded acceptance post', 'Comments'])}`
        },
    )

    await step('B12', 'Create a comment under the post', async () => {
        if (!pathOf().endsWith('/comments/create')) await open(`${post}/comments/create`)
        state.commentBody = `Acceptance comment ${Date.now().toString(36)}`
        await textbox('Body').fill(state.commentBody)
        await page.getByRole('button', { name: 'Create', exact: true }).click()
        await toast('Created')
        await waitUrl(
            new RegExp(`/admin/posts/${ids.post}/comments/\\d+(/edit)?$`),
            'the new comment',
        )
        state.commentId = Number(pathOf().match(/comments\/(\d+)/)[1])
        const parent = app.php(`App\\Models\\Comment::find(${state.commentId})?->post_id`)
        if (parent !== ids.post)
            throw new Error(`The comment belongs to post ${parent}, expected ${ids.post}`)
        return `created comment ${state.commentId}`
    })

    await step('B13', 'Edit the comment', async () => {
        if (!state.commentId) skip('no comment was created')
        await open(`${post}/comments/${state.commentId}/edit`)
        await breadcrumbs(['Posts', 'Seeded acceptance post', 'Comments'])
        await noParentPicker('post_id', 'Post')
        await textbox('Body').fill(`${state.commentBody} edited`)
        await page.getByRole('button', { name: 'Save changes', exact: true }).click()
        await toast('Saved')
        const body = plain(app.php(`App\\Models\\Comment::find(${state.commentId})?->body`))
        if (body !== `${state.commentBody} edited`)
            throw new Error(`The database has body "${body}"`)
    })

    await step('B14', 'Delete the comment', async () => {
        if (!state.commentId) skip('no comment was created')
        await open(`${post}/comments/${state.commentId}/edit`)
        await confirmDelete()
        await waitUrl(
            (url) => !url.pathname.endsWith(`/comments/${state.commentId}/edit`),
            'leaving the deleted comment',
        )
        if (app.php(`App\\Models\\Comment::whereKey(${state.commentId})->exists()`))
            throw new Error('The comment still exists')
        if (/\/comments\/\d+/.test(pathOf()) && pathOf().includes(String(state.commentId)))
            throw new Error(`Redirected to the deleted record ${page.url()}`)
        return `redirected to ${pathOf()}`
    })

    // ---------------------------------------------------------------- nested: replies
    await step('B15', 'Comment VIEW page lists its replies by text, with "New reply"', async () => {
        await open(comment)
        await see(rowWith('Seeded reply one'), 'the reply "Seeded reply one" (not its ID)')
        await see(control(/^New reply$/), 'a "New reply" action')
        return `breadcrumbs: ${await breadcrumbs(['Posts', 'Seeded acceptance post', 'Comments'])}`
    })

    await step('B16', 'Clicking a reply row opens the reply', async () => {
        await open(comment)
        await rowWith('Seeded reply one').first().getByText('Seeded reply one').first().click()
        await waitUrl(
            new RegExp(
                `/admin/posts/${ids.post}/comments/${ids.comment}/replies/${ids.reply}(/edit)?$`,
            ),
            'the reply page',
        )
    })

    await step(
        'B17',
        '"New reply" opens the nested create page (no parent picker, breadcrumb chain)',
        async () => {
            await open(comment)
            await control(/^New reply$/)
                .first()
                .click()
            await waitUrl(
                new RegExp(`/admin/posts/${ids.post}/comments/${ids.comment}/replies/create$`),
                'the nested reply create page',
            )
            await see(textbox('Body'), 'the Body field')
            await noParentPicker('comment_id', 'Comment')
            return `breadcrumbs: ${await breadcrumbs(['Posts', 'Seeded acceptance post', 'Comments', 'Replies'])}`
        },
    )

    await step('B18', 'Create a reply under the comment', async () => {
        if (!pathOf().endsWith('/replies/create')) await open(`${comment}/replies/create`)
        state.replyBody = `Acceptance reply ${Date.now().toString(36)}`
        await textbox('Body').fill(state.replyBody)
        await page.getByRole('button', { name: 'Create', exact: true }).click()
        await toast('Created')
        await waitUrl(new RegExp(`/replies/\\d+(/edit)?$`), 'the new reply')
        state.replyId = Number(pathOf().match(/replies\/(\d+)/)[1])
        const parent = app.php(`App\\Models\\Reply::find(${state.replyId})?->comment_id`)
        if (parent !== ids.comment)
            throw new Error(`The reply belongs to comment ${parent}, expected ${ids.comment}`)
        return `created reply ${state.replyId}`
    })

    await step('B19', 'Edit the reply', async () => {
        if (!state.replyId) skip('no reply was created')
        await open(`${comment}/replies/${state.replyId}/edit`)
        await breadcrumbs(['Posts', 'Comments', 'Replies'])
        await textbox('Body').fill(`${state.replyBody} edited`)
        await page.getByRole('button', { name: 'Save changes', exact: true }).click()
        await toast('Saved')
        const body = plain(app.php(`App\\Models\\Reply::find(${state.replyId})?->body`))
        if (body !== `${state.replyBody} edited`) throw new Error(`The database has body "${body}"`)
    })

    await step('B20', 'Delete the reply', async () => {
        if (!state.replyId) skip('no reply was created')
        await open(`${comment}/replies/${state.replyId}/edit`)
        await confirmDelete()
        await waitUrl(
            (url) => !url.pathname.endsWith(`/replies/${state.replyId}/edit`),
            'leaving the deleted reply',
        )
        if (app.php(`App\\Models\\Reply::whereKey(${state.replyId})->exists()`))
            throw new Error('The reply still exists')
        return `redirected to ${pathOf()}`
    })

    // ---------------------------------------------------------------- the --soft-deletes probe
    await step(
        'B21',
        'Notes resource (generated with --soft-deletes on a model without SoftDeletes) works',
        async () => {
            await open(`${PANEL}/notes`)
            await see(rowWith('Seeded note'), 'the seeded note')
        },
    )

    // ---------------------------------------------------------------- widgets
    await step('B22', 'BlogStats widget on the panel dashboard', async () => {
        const hasDashboard = /Dashboard::class/.test(
            app.read('app/Providers/Alfakit/AdminPanelProvider.php') ?? '',
        )
        if (mode === 'starter-kit' && !hasDashboard)
            skip(
                'the starter-kit panel registers no Dashboard page (widgets go on the app /dashboard, see B23)',
            )
        await open(PANEL)
        await see(page.getByText('This month'), 'the "This month" widget heading')
        await see(page.getByText('Revenue'), 'the Revenue stat')
        await see(page.getByText('Posts', { exact: true }), 'the Posts stat')
    })

    await step('B23', 'BlogStats widget on the starter kit /dashboard', async () => {
        if (mode !== 'starter-kit') skip('starter-kit mode only')
        const file = {
            react: 'resources/js/pages/dashboard.tsx',
            vue: 'resources/js/pages/Dashboard.vue',
            svelte: 'resources/js/pages/Dashboard.svelte',
        }[app.renderer]
        const dashboard = app.read(file) ?? ''
        const installer =
            app.read('vendor/alfasix/alfakit/src/Commands/StarterKit/StarterKitInstaller.php') ?? ''
        const supported = /alfakit/i.test(dashboard) || /dashboard/i.test(installer)
        if (!supported)
            skip(
                `widgets on the starter kit dashboard are not implemented in this code (the installer never touches ${file})`,
            )
        if (!/alfakit/i.test(dashboard))
            throw new Error(
                `The installer knows about the dashboard but ${file} has no AlfaKit widgets`,
            )
        await open('/dashboard')
        await see(page.getByText('This month'), 'the "This month" widget heading on /dashboard')
        await see(page.getByText('Revenue'), 'the Revenue stat on /dashboard')
    })

    // ---------------------------------------------------------------- users resource
    await step('B24', 'Users list shows the signed-in user', async () => {
        await open(`${PANEL}/users`)
        await see(rowWith(credentials.email), `the row of ${credentials.email}`)
    })

    await step('B25', 'User view page', async () => {
        await open(`${PANEL}/users/${ids.user}`)
        await see(page.getByText(credentials.email), 'the user email')
    })

    await step('B26', 'Invite user modal opens', async () => {
        await open(`${PANEL}/users`)
        await control(/^Invite user$/)
            .first()
            .click()
        await see(dialog().filter({ hasText: 'Invite a user' }), 'the "Invite a user" modal')
        await see(
            dialog().last().getByRole('textbox', { name: /email/i }),
            'the invite email field',
        )
        await page.keyboard.press('Escape')
    })

    // ---------------------------------------------------------------- command palette
    await step('B27', 'Command palette opens with Ctrl/⌘+K', async () => {
        await open(`${PANEL}/posts`)
        await page
            .locator('body')
            .click({ position: { x: 5, y: 5 } })
            .catch(() => {})
        await page.keyboard.press('ControlOrMeta+k')
        const palette = page.getByRole('dialog')
        await see(palette, 'the command palette dialog')
        await see(
            palette
                .last()
                .getByRole('combobox')
                .or(palette.last().getByRole('searchbox'))
                .or(palette.last().locator('input')),
            'the palette search input',
        )
        await page.keyboard.press('Escape')
    })

    // ---------------------------------------------------------------- Arabic / RTL
    const route = routes.find(
        (r) => /^admin\/_alfakit\/locale$/.test(r.uri) && r.method.includes('POST'),
    )
    const switchTo = async (locale) => {
        const token = (await session.context.cookies()).find((c) => c.name === 'XSRF-TOKEN')?.value
        if (!token) throw new Error('No XSRF-TOKEN cookie')
        const response = await page.request.post(`/${route.uri}`, {
            form: { locale },
            headers: {
                'X-XSRF-TOKEN': decodeURIComponent(token),
                Referer: `${session.baseURL}${PANEL}/posts`,
                Accept: 'text/html',
            },
            maxRedirects: 0,
            failOnStatusCode: false,
        })
        if (response.status() >= 400)
            throw new Error(
                `POST /${route.uri} (locale=${locale}) answered HTTP ${response.status()}`,
            )
    }
    const direction = () =>
        page.evaluate(() => ({
            html: document.documentElement.getAttribute('dir'),
            lang: document.documentElement.getAttribute('lang'),
            content:
                document
                    .querySelector('[data-slot="content"]')
                    ?.closest('[dir]')
                    ?.getAttribute('dir') ?? null,
        }))
    await step('B28', 'Switch to Arabic: the panel renders right to left', async () => {
        if (!route)
            throw new Error('No POST admin/_alfakit/locale route (->locales() not applied?)')
        try {
            await switchTo('ar')
            await open(`${PANEL}/posts`)
            const rtl = await direction()
            const ok =
                mode === 'panel' ? rtl.html === 'rtl' : rtl.content === 'rtl' || rtl.html === 'rtl'
            if (!ok)
                throw new Error(
                    `Expected dir=rtl after switching to Arabic, got ${JSON.stringify(rtl)}`,
                )
            // The layout must mirror, not break: the sidebar sits right of the content and they
            // do not overlap, nothing scrolls sideways.
            const layout = await page.evaluate(() => {
                const box = (el) => {
                    if (!el) return null
                    const r = el.getBoundingClientRect()
                    return r.width > 0 && r.height > 0
                        ? { left: Math.round(r.left), right: Math.round(r.right) }
                        : null
                }
                return {
                    viewport: window.innerWidth,
                    scrollWidth: document.documentElement.scrollWidth,
                    sidebar: box(document.querySelector('[data-sidebar="sidebar"]')),
                    content: box(document.querySelector('[data-slot="content"]')),
                }
            })
            const problems = []
            if (layout.scrollWidth > layout.viewport + 1)
                problems.push(
                    `the page scrolls horizontally (${layout.scrollWidth}px > ${layout.viewport}px)`,
                )
            if (layout.sidebar && layout.content) {
                if (layout.sidebar.left < layout.content.left)
                    problems.push('the sidebar is left of the content (not mirrored)')
                if (
                    layout.sidebar.left < layout.content.right &&
                    layout.content.left < layout.sidebar.right
                )
                    problems.push('the sidebar overlaps the content')
            }
            if (
                layout.content &&
                (layout.content.left < -1 || layout.content.right > layout.viewport + 1)
            )
                problems.push('the content area is cut off by the viewport')
            if (problems.length)
                throw new Error(
                    `RTL layout is broken: ${problems.join('; ')}\n${JSON.stringify({ dir: rtl, layout })}`,
                )
            return `ar: ${JSON.stringify(rtl)} layout ${JSON.stringify(layout)}`
        } finally {
            await switchTo('en').catch(() => {})
        }
    })

    await step(
        'B29',
        "Starter kit: AlfaKit's Arabic does not leak into the app's own pages",
        async () => {
            if (mode !== 'starter-kit') skip('starter-kit mode only')
            if (!route) throw new Error('No locale route')
            try {
                await switchTo('ar')
                await open(`${PANEL}/posts`)
                // Client-side (Inertia) navigation to the app's own dashboard, as a user clicks it.
                await page.getByRole('link', { name: 'Dashboard', exact: true }).first().click()
                await waitUrl(/\/dashboard$/, 'the app dashboard')
                const dir = await direction()
                if (dir.html === 'rtl')
                    throw new Error(
                        `The app's /dashboard (not an AlfaKit page) keeps <html dir="rtl" lang="${dir.lang}"> after visiting an AlfaKit page in Arabic`,
                    )
                return JSON.stringify(dir)
            } finally {
                await switchTo('en').catch(() => {})
            }
        },
    )
}

/** Requests every GET route of the panel (signed in) and fails on any 5xx. */
export async function crawl({ app, session, routes, ids }) {
    const byResource = {
        posts: ids.post,
        comments: ids.comment,
        replies: ids.reply,
        users: ids.user,
        notes: ids.note,
    }
    const byName = {
        post: ids.post,
        comment: ids.comment,
        reply: ids.reply,
        user: ids.user,
        note: ids.note,
    }
    const results = { ok: [], client: [], server: [], skipped: [] }

    const candidates = routes.filter(
        (r) =>
            r.method.includes('GET') &&
            (r.uri === 'admin' ||
                r.uri.startsWith('admin/') ||
                (app.mode === 'starter-kit' && r.uri === 'dashboard')) &&
            !/logout|impersonat/i.test(`${r.uri} ${r.name ?? ''}`),
    )

    for (const route of candidates) {
        const segments = route.uri.split('/')
        let unresolved = null
        const filled = []
        for (let i = 0; i < segments.length; i++) {
            const match = segments[i].match(/^\{(\w+)(\?)?\}$/)
            if (!match) {
                filled.push(segments[i])
                continue
            }
            const [, name, optional] = match
            const value = name === 'record' ? byResource[segments[i - 1]] : byName[name]
            if (value != null) filled.push(String(value))
            else if (optional) continue
            else unresolved = name
        }
        if (unresolved) {
            results.skipped.push(`${route.uri} (no value for {${unresolved}})`)
            continue
        }
        const path = `/${filled.join('/')}`
        try {
            const response = await session.page.request.get(path, {
                failOnStatusCode: false,
                maxRedirects: 5,
                timeout: 30_000,
            })
            const line = `${response.status()} GET ${path}  [${route.name ?? route.uri}]`
            if (response.status() >= 500) {
                const body = (await response.text().catch(() => '')).replace(/\s+/g, ' ')
                const message =
                    body.match(/"message":"([^"]{0,300})/)?.[1] ??
                    body.match(/<title>([^<]{0,200})/)?.[1] ??
                    ''
                results.server.push(`${line}${message ? ` — ${message}` : ''}`)
            } else if (response.status() >= 400) results.client.push(line)
            else results.ok.push(line)
        } catch (error) {
            results.server.push(`ERR GET ${path}: ${error.message.split('\n')[0]}`)
        }
    }
    return results
}
