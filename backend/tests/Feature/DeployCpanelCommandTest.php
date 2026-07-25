<?php

declare(strict_types=1);

namespace Tests\Feature;

use Tests\TestCase;

final class DeployCpanelCommandTest extends TestCase
{
    public function test_deploy_cpanel_fails_without_token(): void
    {
        config([
            'cpanel.api_token' => null,
            'cpanel.host' => 'davidortega.dev',
            'cpanel.user' => 'davidort',
        ]);

        $this->artisan('deploy:cpanel', ['--skip-build' => true])
            ->assertFailed();
    }

    public function test_deploy_cpanel_dry_run_shows_config(): void
    {
        config([
            'cpanel.api_token' => 'test-token',
            'cpanel.host' => 'davidortega.dev',
            'cpanel.user' => 'davidort',
            'cpanel.remote_dir' => '/home/davidort/parkingsoft',
        ]);

        $this->artisan('deploy:cpanel', ['--dry-run' => true])
            ->expectsOutputToContain('davidortega.dev')
            ->expectsOutputToContain('/home/davidort/parkingsoft')
            ->assertSuccessful();
    }
}
