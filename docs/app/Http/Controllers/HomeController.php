<?php

namespace App\Http\Controllers;

use App\Support\Site\Repository;
use App\Support\Site\Seo;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('welcome', [
            'seo' => Seo::make(
                'AlfaKit by Alfa Six: your Laravel foundation, your frontend choice',
                'AlfaKit by Alfa Six: the Filament experience for React, Vue and Svelte. Define admin panels, resources, forms and tables in PHP and render them through Inertia.',
                jsonLd: [
                    '@context' => 'https://schema.org',
                    '@type' => 'SoftwareApplication',
                    'name' => 'AlfaKit',
                    'alternateName' => 'alfasix/alfakit',
                    'description' => 'An admin panel builder for Laravel: define panels, resources, forms, tables, actions and widgets in PHP and render them with React, Vue or Svelte through Inertia.',
                    'applicationCategory' => 'DeveloperApplication',
                    'operatingSystem' => 'PHP 8.3+, Laravel 13',
                    'url' => url('/'),
                    'image' => url(Seo::DEFAULT_IMAGE),
                    'license' => 'https://opensource.org/licenses/MIT',
                    'codeRepository' => Repository::GITHUB,
                    'isAccessibleForFree' => true,
                    'offers' => ['@type' => 'Offer', 'price' => '0', 'priceCurrency' => 'USD'],
                    'author' => ['@type' => 'Organization', 'name' => 'Alfa Six', 'url' => Repository::ALFA_SIX, 'logo' => url('/brand/alfasix/alfa-six-emblem-navy.svg')],
                ],
            ),
            'versions' => [
                'php' => '8.3+',
                'laravel' => '13',
                'inertia' => '3',
            ],
        ]);
    }
}
