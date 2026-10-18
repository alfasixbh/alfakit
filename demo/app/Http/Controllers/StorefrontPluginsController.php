<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use AlfaSix\AlfakitCms\Http\Controllers\PageController;
use AlfaSix\AlfakitCms\Http\Responses\CmsPageResponse;
use AlfaSix\AlfakitCms\Models\Page;
use AlfaSix\AlfakitCms\Support\Site;
use AlfaSix\AlfakitForms\AlfakitForms;
use AlfaSix\AlfakitForms\Models\Form;
use App\Demo\Renderer;
use App\Demo\StorefrontPlugins;
use App\Features\WholesaleEnquiries;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Storefront pages run by the plugins, inside each renderer's shop layout: CMS pages
 * (alfakit-cms, `/{renderer}/pages/{path}`, with the editing bar for signed-in staff) and the
 * wholesale enquiry form (alfakit-forms).
 */
class StorefrontPluginsController extends Controller
{
    public function page(Request $request, ?string $path = null): Response
    {
        $site = StorefrontPlugins::cmsSite(Renderer::current($request));
        abort_if($site === null, 404);

        [$locale, $pagePath] = PageController::splitLocale($site, (string) $path);
        abort_if($locale === false, 404);

        $prefixed = $locale !== null && str_starts_with(trim((string) $path, '/'), $locale.'/');
        $site = $site->withLocale($locale);
        $page = $site->findPublishedPage($pagePath);

        // The shop in Arabic shows the Arabic translation of an English page when it has one.
        if ($page !== null && ! $prefixed && app()->getLocale() === 'ar' && $page->locale !== 'ar') {
            $translation = Page::query()->forTenant($site->tenant)->published()
                ->where('translation_of_id', $page->getKey())->where('locale', 'ar')->first();

            if ($translation instanceof Page) {
                $page = $translation;
                $site = $site->withLocale('ar');
            }
        }

        abort_if($page === null, 404);

        $request->attributes->set(Site::REQUEST_ATTRIBUTE, $site);

        // The editing bar checks the visitor's Shield roles in the shop's store.
        if ($site->tenant !== null) {
            setPermissionsTeamId($site->tenant->getKey());
        }

        return Inertia::render('Storefront/CmsPage', [
            'cms' => CmsPageResponse::payload($page, $site, $request),
            'intro' => __('plugins.storefront.cms_intro'),
        ]);
    }

    public function wholesale(Request $request): Response
    {
        $enabled = StorefrontPlugins::active(WholesaleEnquiries::class);
        $form = $enabled ? Form::query()->where('slug', 'wholesale')->where('is_published', true)->first() : null;

        return Inertia::render('Storefront/Wholesale', [
            'form' => $form === null ? null : AlfakitForms::embed($form),
            'copy' => __('plugins.storefront'),
        ]);
    }
}
