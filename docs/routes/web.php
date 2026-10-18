<?php

use App\Http\Controllers\AiController;
use App\Http\Controllers\DocsController;
use App\Http\Controllers\FeedbackController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\LlmsController;
use App\Http\Controllers\Site\BlogController;
use App\Http\Controllers\Site\PagesController;
use App\Http\Controllers\Site\PluginsController;
use App\Http\Controllers\Site\SeoController;
use Illuminate\Support\Facades\Route;

Route::get('/', HomeController::class)->name('home');
Route::get('/ai', AiController::class)->name('ai');
Route::get('/docs', [DocsController::class, 'index'])->name('docs.index');
Route::get('/docs/search', [DocsController::class, 'search'])->name('docs.search');
// Live examples (app/Examples), rendered in an iframe per renderer next to their code.
Route::get('/docs/examples/{name}/{renderer}', [DocsController::class, 'example'])->where(['name' => '[a-z0-9\-]+', 'renderer' => 'react|vue|svelte'])->name('docs.examples.frame');

// For AI agents (https://llmstxt.org): an index, everything in one file, and raw Markdown per page.
Route::get('/llms.txt', [LlmsController::class, 'index'])->name('llms.index');
Route::get('/llms-full.txt', [LlmsController::class, 'full'])->name('llms.full');
Route::get('/docs/{slug}.md', [LlmsController::class, 'page'])->where('slug', '[a-z0-9\-/]+')->name('docs.markdown');
Route::get('/docs/{slug}', [DocsController::class, 'show'])->where('slug', '[a-z0-9\-/]+')->name('docs.show');
Route::post('/docs/feedback', [FeedbackController::class, 'store'])->name('docs.feedback');

// Public website (controllers in app/Http/Controllers/Site, pages in resources/js/pages/site).
Route::get('/features', [PagesController::class, 'features'])->name('features');
Route::get('/demo', [PagesController::class, 'demo'])->name('demo');
Route::get('/community', [PagesController::class, 'community'])->name('community');
Route::get('/services', [PagesController::class, 'services'])->name('services');
Route::get('/changelog', [PagesController::class, 'changelog'])->name('changelog');
Route::get('/contact', [PagesController::class, 'contact'])->name('contact');
Route::get('/plugins', [PluginsController::class, 'index'])->name('plugins.index');
Route::get('/plugins/submit', [PluginsController::class, 'submit'])->name('plugins.submit');
Route::get('/plugins/{slug}', [PluginsController::class, 'show'])->where('slug', '[a-z0-9\-]+')->name('plugins.show');
Route::get('/blog', [BlogController::class, 'index'])->name('blog.index');
Route::get('/blog/rss.xml', [BlogController::class, 'rss'])->name('blog.rss');
Route::get('/blog/{slug}', [BlogController::class, 'show'])->where('slug', '[a-z0-9\-]+')->name('blog.show');
Route::get('/sitemap.xml', [SeoController::class, 'sitemap'])->name('sitemap');
Route::get('/robots.txt', [SeoController::class, 'robots'])->name('robots');
