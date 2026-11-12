<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitCms\Actions;

use AlfaSix\Alfakit\Actions\BulkAction;
use AlfaSix\Alfakit\Support\Enums\Color;
use AlfaSix\AlfakitCms\Models\Page;
use AlfaSix\AlfakitCms\Support\CmsAuthorization;
use AlfaSix\AlfakitCms\Support\Publisher;
use Illuminate\Support\Enumerable;
use Illuminate\Validation\ValidationException;

/**
 * Publish the selected pages now (each one checked against the `publish` ability).
 */
class PublishBulkAction extends BulkAction
{
    public static function make(string $name = 'publish'): static
    {
        return parent::make($name);
    }

    protected function setUp(): void
    {
        parent::setUp();

        $this->label(__('alfakit-cms::cms.actions.publish'));
        $this->icon('send');
        $this->color(Color::Success);
        $this->requiresConfirmation();
        $this->modalHeading(__('alfakit-cms::cms.actions.publish_bulk_heading'));
        $this->modalSubmitActionLabel(__('alfakit-cms::cms.actions.publish'));
        $this->successNotificationTitle(__('alfakit-cms::cms.notifications.published_bulk'));
        $this->authorize(static fn (): bool => CmsAuthorization::allows('publish', Page::class));
        $this->authorizeIndividualRecords('publish');

        $this->action(function (Enumerable $records): void {
            $records->each(function (mixed $record): void {
                if (! $record instanceof Page) {
                    return;
                }

                // A page whose saved changes can't go live (a path another page has, no
                // title) is skipped and counted as a failure; the others are published.
                try {
                    Publisher::publish($record);
                } catch (ValidationException $exception) {
                    $this->reportBulkProcessingFailure('invalid', implode(' ', $exception->validator->errors()->all()));
                }
            });
        });

        $this->after(fn () => $this->sendSuccessNotification());
    }
}
