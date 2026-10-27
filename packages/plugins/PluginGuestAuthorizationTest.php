<?php

declare(strict_types=1);

use AlfaSix\Alfakit\Tests\Fixtures\Models\User;

uses(AlfaSix\Alfakit\Tests\TestCase::class);

/*
 * The documented `authorize(fn (User $user): bool => ...)` callbacks are asked on pages a
 * guest sees (the login page builds global search, which asks every resource). A guest is
 * never authorised and the closure is not called with null (a TypeError, i.e. a 500).
 */
it('denies guests without calling a user-typed authorization closure', function (string $plugin, string $setter, string $check): void {
    alfakit()->setCurrentPanel(alfakit()->getPanel('admin'));

    $instance = $plugin::make()->{$setter}(fn (User $user): bool => $user->email === 'ada@example.com');

    expect($instance->{$check}())->toBeFalse();

    $this->actingAs(User::query()->create(['name' => 'Ada', 'email' => 'ada@example.com', 'password' => 'password']));

    expect($instance->{$check}())->toBeTrue();
})->with([
    'forms' => [AlfaSix\AlfakitForms\FormsPlugin::class, 'authorize', 'isAuthorized'],
    'activity log' => [AlfaSix\AlfakitActivityLog\ActivityLogPlugin::class, 'authorize', 'isAuthorized'],
    'analytics' => [AlfaSix\AlfakitAnalytics\AnalyticsPlugin::class, 'authorize', 'isAuthorized'],
    'analytics sharing' => [AlfaSix\AlfakitAnalytics\AnalyticsPlugin::class, 'sharing', 'canShare'],
    'api tokens' => [AlfaSix\AlfakitApi\ApiPlugin::class, 'canManageTokens', 'userCanManageTokens'],
    'api documentation' => [AlfaSix\AlfakitApi\ApiPlugin::class, 'canViewDocumentation', 'userCanViewDocumentation'],
    'backup' => [AlfaSix\AlfakitBackup\BackupPlugin::class, 'authorize', 'isAuthorized'],
    'feature flags' => [AlfaSix\AlfakitFeatureFlags\FeatureFlagsPlugin::class, 'authorize', 'isAuthorized'],
    'file manager' => [AlfaSix\AlfakitFileManager\FileManagerPlugin::class, 'authorize', 'isAuthorized'],
    'health' => [AlfaSix\AlfakitHealth\HealthPlugin::class, 'authorize', 'isAuthorized'],
    'mail templates' => [AlfaSix\AlfakitMailTemplates\MailTemplatesPlugin::class, 'authorize', 'isAuthorized'],
    'teams' => [AlfaSix\AlfakitTeams\TeamsPlugin::class, 'teamCreation', 'canCreateTeams'],
    'translation manager' => [AlfaSix\AlfakitTranslationManager\TranslationManagerPlugin::class, 'authorize', 'isAuthorized'],
    'webhooks' => [AlfaSix\AlfakitWebhooks\WebhooksPlugin::class, 'authorize', 'isAuthorized'],
]);
