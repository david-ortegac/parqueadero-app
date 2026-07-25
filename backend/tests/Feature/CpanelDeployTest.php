<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Symfony\Component\Process\Process;
use Tests\TestCase;

final class CpanelDeployTest extends TestCase
{
    private string $workspace = '';

    protected function setUp(): void
    {
        parent::setUp();
        $this->workspace = storage_path('framework/testing/cpanel-deploy-'.uniqid());
        File::ensureDirectoryExists($this->workspace);
    }

    protected function tearDown(): void
    {
        if ($this->workspace !== '' && is_dir($this->workspace)) {
            File::deleteDirectory($this->workspace);
        }
        parent::tearDown();
    }

    public function test_deploy_returns_404_when_disabled(): void
    {
        config([
            'cpanel-deploy.enabled' => false,
            'cpanel-deploy.token' => 'test-token',
        ]);

        $this->get('/cpanel-deploy', ['X-Deploy-Token' => 'test-token'])
            ->assertNotFound();
    }

    public function test_deploy_rejects_invalid_token(): void
    {
        config([
            'cpanel-deploy.enabled' => true,
            'cpanel-deploy.token' => 'expected-token',
            'cpanel-deploy.steps' => [
                'migrate' => false,
                'storage_link' => false,
                'optimize_clear' => false,
                'config_cache' => false,
                'route_cache' => false,
                'view_cache' => false,
                'event_cache' => false,
            ],
        ]);

        $this->get('/cpanel-deploy', ['X-Deploy-Token' => 'wrong'])
            ->assertUnauthorized();
    }

    public function test_deploy_runs_pipeline_with_valid_token(): void
    {
        config([
            'cpanel-deploy.enabled' => true,
            'cpanel-deploy.token' => 'expected-token',
            'cpanel-deploy.steps' => [
                'migrate' => false,
                'storage_link' => false,
                'optimize_clear' => true,
                'config_cache' => false,
                'route_cache' => false,
                'view_cache' => false,
                'event_cache' => false,
            ],
        ]);

        $this->get('/cpanel-deploy', ['X-Deploy-Token' => 'expected-token'])
            ->assertOk()
            ->assertJsonPath('ok', true);
    }

    public function test_health_requires_token(): void
    {
        config([
            'cpanel-deploy.enabled' => true,
            'cpanel-deploy.token' => 'expected-token',
            'cpanel-deploy.remote_path' => base_path(),
        ]);

        $this->get('/cpanel-deploy/health')
            ->assertUnauthorized();

        $this->get('/cpanel-deploy/health', ['X-Deploy-Token' => 'expected-token'])
            ->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('resolved_target', realpath(base_path()) ?: base_path());
    }

    public function test_release_rejects_non_archive(): void
    {
        config([
            'cpanel-deploy.enabled' => true,
            'cpanel-deploy.token' => 'expected-token',
            'cpanel-deploy.remote_path' => base_path(),
        ]);

        $file = UploadedFile::fake()->create('notes.txt', 10, 'text/plain');

        $this->post('/cpanel-deploy/release', [
            'archive' => $file,
        ], ['X-Deploy-Token' => 'expected-token'])
            ->assertStatus(422);
    }

    public function test_packager_creates_tar_gz(): void
    {
        $source = $this->workspace.'/src';
        File::ensureDirectoryExists($source.'/public');
        File::put($source.'/artisan', "#!/usr/bin/env php\n");
        File::put($source.'/composer.json', '{"name":"test/app"}');
        File::put($source.'/public/index.php', '<?php // old');
        File::put($source.'/public/deploy-release.php', '<?php // deploy');
        File::put($source.'/public/.htaccess', "RewriteEngine On\n");
        File::put($source.'/.env', 'SECRET=1');
        File::put($source.'/.env.example', "APP_NAME=Example\n");
        File::put($source.'/backend.zip', 'fake-zip-with-secrets');
        File::put($source.'/.DS_Store', 'mac');
        File::put($source.'/public/._index.php', 'appledouble');
        File::put($source.'/._.DS_Store', 'appledouble');
        File::ensureDirectoryExists($source.'/vendor/pkg');
        File::put($source.'/vendor/pkg/x.php', '<?php');
        File::put($source.'/vendor/pkg/._x.php', 'appledouble');

        $archive = $this->workspace.'/build/out.tar.gz';
        $packager = app(\App\Services\CpanelReleasePackager::class);
        $meta = $packager->package($source, $archive);

        $this->assertFileExists($archive);
        $this->assertGreaterThan(0, $meta['bytes']);

        $list = new Process(['tar', '-tzf', $archive]);
        $list->run();
        $this->assertTrue($list->isSuccessful());
        $entries = $list->getOutput();
        $this->assertStringContainsString('./artisan', $entries);
        $this->assertStringContainsString('./index.php', $entries);
        $this->assertStringContainsString('./deploy-release.php', $entries);
        $this->assertStringContainsString('./vendor/autoload.php', $entries);
        $this->assertStringContainsString('./.env.example', $entries);
        $this->assertStringNotContainsString('./public/', $entries);
        $this->assertDoesNotMatchRegularExpression('/(?:^|\\n)\\.\\/?\\.env(?:\\n|$)/', $entries);
        $this->assertStringNotContainsString('backend.zip', $entries);
        $this->assertStringNotContainsString('.DS_Store', $entries);
        $this->assertStringNotContainsString('/._', $entries);
        $this->assertStringNotContainsString('./._', $entries);
    }

    public function test_packager_leaves_only_the_archive_in_build_directory(): void
    {
        $source = $this->workspace.'/src';
        File::ensureDirectoryExists($source.'/public');
        File::put($source.'/artisan', "#!/usr/bin/env php\n");
        File::put($source.'/composer.json', '{"name":"test/app"}');
        File::put($source.'/public/index.php', '<?php // old');
        File::put($source.'/public/deploy-release.php', '<?php // deploy');
        File::put($source.'/public/.htaccess', "RewriteEngine On\n");

        $build = $this->workspace.'/build';
        File::ensureDirectoryExists($build.'/stale');
        File::put($build.'/stale/old.txt', 'basura del build anterior');

        $archive = $build.'/release.tar.gz';
        app(\App\Services\CpanelReleasePackager::class)->package($source, $archive);

        $this->assertDirectoryDoesNotExist($build.'/stale');
        $this->assertDirectoryDoesNotExist($build.'/release');
        $this->assertSame(['release.tar.gz'], array_values(array_diff(
            scandir($build) ?: [],
            ['.', '..']
        )));
    }
}
