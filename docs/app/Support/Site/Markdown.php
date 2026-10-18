<?php

namespace App\Support\Site;

use League\CommonMark\Environment\Environment;
use League\CommonMark\Extension\CommonMark\CommonMarkCoreExtension;
use League\CommonMark\Extension\FrontMatter\FrontMatterExtension;
use League\CommonMark\Extension\FrontMatter\Output\RenderedContentWithFrontMatter;
use League\CommonMark\Extension\GithubFlavoredMarkdownExtension;
use League\CommonMark\Extension\HeadingPermalink\HeadingPermalinkExtension;
use League\CommonMark\MarkdownConverter;

/**
 * Markdown for the website pages (blog posts, changelog, policies), with the same
 * extensions as the documentation: GitHub-flavoured Markdown, front matter and heading
 * anchors.
 */
class Markdown
{
    /**
     * @return array{html: string, frontMatter: array<string, mixed>}
     */
    public static function convert(string $markdown): array
    {
        $environment = new Environment([
            'heading_permalink' => ['symbol' => '#', 'insert' => 'after', 'html_class' => 'heading-anchor', 'aria_hidden' => true, 'id_prefix' => '', 'fragment_prefix' => ''],
            'html_input' => 'strip',
            'allow_unsafe_links' => false,
        ]);

        $environment->addExtension(new CommonMarkCoreExtension);
        $environment->addExtension(new GithubFlavoredMarkdownExtension);
        $environment->addExtension(new FrontMatterExtension);
        $environment->addExtension(new HeadingPermalinkExtension);

        $result = (new MarkdownConverter($environment))->convert($markdown);
        $frontMatter = $result instanceof RenderedContentWithFrontMatter ? $result->getFrontMatter() : [];

        return ['html' => $result->getContent(), 'frontMatter' => is_array($frontMatter) ? $frontMatter : []];
    }

    /**
     * The h2 and h3 headings of rendered HTML, for an "On this page" list.
     *
     * @return array<int, array{id: string, text: string, level: int}>
     */
    public static function toc(string $html, int $maxLevel = 3): array
    {
        preg_match_all('#<h([2-'.$maxLevel.'])[^>]*>(.*?)</h\1>#s', $html, $matches, PREG_SET_ORDER);

        $toc = [];

        foreach ($matches as $match) {
            if (preg_match('#id="([^"]+)"#', $match[0], $id) !== 1) {
                continue;
            }

            $text = (string) preg_replace('#<a[^>]*class="heading-anchor"[^>]*>.*?</a>#s', '', $match[2]);
            $toc[] = ['id' => $id[1], 'text' => trim(html_entity_decode(strip_tags($text))), 'level' => (int) $match[1]];
        }

        return $toc;
    }
}
