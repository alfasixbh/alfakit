<?php

namespace App\Http\Controllers;

use App\Support\Documentation;
use App\Support\Examples;
use App\Support\Site\Plugins;
use App\Support\Site\Seo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DocsController extends Controller
{
    public function __construct(protected Documentation $docs) {}

    public function index(): RedirectResponse
    {
        return redirect()->route('docs.show', ['slug' => $this->docs->firstSlug()]);
    }

    public function show(string $slug, Plugins $plugins, Examples $examples): Response
    {
        $page = $this->docs->page($slug);

        return Inertia::render('docs/show', [
            'sidebar' => $this->docs->sidebar(),
            'page' => $page,
            'examples' => $examples->forPage($page['examples']),
            'firstParty' => $plugins->isFirstPartyDocsPage($slug),
            'seo' => Seo::make($page['title'].' - AlfaKit docs', $page['description'], type: 'article'),
        ]);
    }

    /**
     * One live example rendered by one renderer, shown in an iframe next to its code. It is
     * an Inertia page of its own (root view `examples`), so actions, validation, redirects
     * and notifications behave as in an app.
     */
    public function example(Request $request, Examples $examples, string $name, string $renderer): Response
    {
        abort_unless(in_array($renderer, Examples::RENDERERS, true) && $examples->has($name), 404);

        return Inertia::render('examples/frame', [
            'example' => $examples->make($name),
            'renderer' => $renderer,
        ])->rootView('examples');
    }

    public function search(Request $request): JsonResponse
    {
        return response()->json(['results' => $this->docs->search((string) $request->query('q', ''))]);
    }
}
