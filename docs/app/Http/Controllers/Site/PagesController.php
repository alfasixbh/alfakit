<?php

namespace App\Http\Controllers\Site;

use App\Support\Documentation;
use App\Support\Site\Dogfood;
use App\Support\Site\Markdown;
use App\Support\Site\Repository;
use App\Support\Site\Seo;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The public website's static pages: features, demo, community, services and changelog.
 */
class PagesController
{
    public function features(): Response
    {
        return Inertia::render('site/features', [
            'seo' => Seo::make(
                'Features - AlfaKit',
                'A tour of AlfaKit: panels, resources, forms, tables, actions, dashboards, multi-tenancy, localization and right-to-left layouts, themes, components outside panels and tools for AI agents.',
                '/screenshots/products-cards-light.webp',
            ),
        ]);
    }

    public function demo(): Response
    {
        $demo = Documentation::demoUrl();

        return Inertia::render('site/demo', [
            'seo' => Seo::make(
                'Live demo - AlfaKit',
                'Maison Alfa, a perfume shop admin built with AlfaKit: three identical panels rendered with React, Vue and Svelte, a storefront, and a shared login.',
                '/screenshots/dashboard-light.webp',
            ),
            'links' => [
                ['renderer' => 'React', 'admin' => $demo.'/react/admin', 'storefront' => $demo.'/react'],
                ['renderer' => 'Vue', 'admin' => $demo.'/vue/admin', 'storefront' => $demo.'/vue'],
                ['renderer' => 'Svelte', 'admin' => $demo.'/svelte/admin', 'storefront' => $demo.'/svelte'],
            ],
            'login' => ['email' => 'demo@alfakit.dev', 'password' => 'password'],
        ]);
    }

    /**
     * The contact page: a form of the Forms plugin when the site runs it (config
     * docs.dogfood.forms), else the other ways to reach the team.
     */
    public function contact(): Response
    {
        return Inertia::render('site/contact', [
            'seo' => Seo::make(
                'Contact - AlfaKit',
                'Ask the AlfaKit team a question, suggest a plugin or talk to Alfa Six about a project.',
            ),
            'form' => Dogfood::contactForm(),
            'links' => [
                'discussions' => Repository::GITHUB.'/discussions',
                'issues' => Repository::GITHUB.'/issues',
                'alfaSix' => Repository::ALFA_SIX,
            ],
        ]);
    }

    public function community(): Response
    {
        $security = Repository::read('SECURITY.md');

        return Inertia::render('site/community', [
            'seo' => Seo::make(
                'Community - AlfaKit',
                'Ask questions, report bugs, contribute code or translations, and report security issues for AlfaKit.',
            ),
            // GitHub renders the emoji shortcodes of the versions table; the site uses words.
            'security' => $security === null ? null : Markdown::convert(strtr(self::withoutTitle($security), [':white_check_mark:' => 'Yes', ':x:' => 'No']))['html'],
            'links' => [
                'github' => Repository::GITHUB,
                'discussions' => Repository::GITHUB.'/discussions',
                'issues' => Repository::GITHUB.'/issues',
                'contributing' => Repository::blob('CONTRIBUTING.md'),
                'conduct' => Repository::blob('CODE_OF_CONDUCT.md'),
                'security' => Repository::blob('SECURITY.md'),
                'translations' => Repository::GITHUB.'/tree/main/packages/translations',
            ],
        ]);
    }

    public function services(): Response
    {
        return Inertia::render('site/services', [
            'seo' => Seo::make(
                'Services - AlfaKit by Alfa Six',
                'Alfa Six, the team behind AlfaKit, builds custom panels, migrates Filament applications and supports teams building on AlfaKit.',
            ),
            'contactUrl' => Repository::ALFA_SIX,
        ]);
    }

    public function changelog(): Response
    {
        $source = Repository::read('CHANGELOG.md');
        $html = $source === null ? null : Markdown::convert(self::withoutTitle($source))['html'];

        return Inertia::render('site/changelog', [
            'seo' => Seo::make(
                'Changelog - AlfaKit',
                'Every notable change to AlfaKit, from the repository CHANGELOG.md.',
            ),
            'html' => $html,
            'toc' => $html === null ? [] : Markdown::toc($html),
            'sourceUrl' => Repository::blob('CHANGELOG.md'),
        ]);
    }

    /** The page supplies its own heading. */
    private static function withoutTitle(string $markdown): string
    {
        return (string) preg_replace('/\A\s*# .*\R/', '', $markdown, 1);
    }
}
