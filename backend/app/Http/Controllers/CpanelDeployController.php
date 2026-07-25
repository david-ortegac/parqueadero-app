<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\CpanelDeployPipeline;
use App\Services\CpanelReleaseInstaller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

final class CpanelDeployController extends Controller
{
    public function __invoke(CpanelDeployPipeline $pipeline): JsonResponse
    {
        $result = $pipeline->run();

        return response()->json([
            'message' => $result['ok'] ? 'Deploy pipeline completed.' : 'Deploy pipeline finished with errors.',
            'ok' => $result['ok'],
            'steps' => $result['steps'],
        ], $result['ok'] ? 200 : 500);
    }

    public function health(CpanelReleaseInstaller $installer): JsonResponse
    {
        $target = null;
        $targetError = null;
        try {
            $target = $installer->resolveTargetPath();
        } catch (Throwable $e) {
            $targetError = $e->getMessage();
        }

        return response()->json([
            'ok' => true,
            'enabled' => (bool) config('cpanel-deploy.enabled'),
            'app' => config('app.name'),
            'env' => config('app.env'),
            'remote_path' => config('cpanel-deploy.remote_path'),
            'resolved_target' => $target,
            'target_error' => $targetError,
            'base_path' => base_path(),
        ]);
    }

    public function release(
        Request $request,
        CpanelReleaseInstaller $installer,
        CpanelDeployPipeline $pipeline,
    ): JsonResponse {
        $request->validate([
            'archive' => ['required', 'file', 'max:102400'],
        ]);

        $upload = $request->file('archive');
        if ($upload === null) {
            return response()->json(['ok' => false, 'message' => 'Archivo ausente.'], 422);
        }

        $original = strtolower((string) $upload->getClientOriginalName());
        if (! str_ends_with($original, '.tar.gz') && ! str_ends_with($original, '.tgz')) {
            return response()->json(['ok' => false, 'message' => 'Solo se acepta .tar.gz'], 422);
        }

        $deployDir = storage_path('app/deploy');
        if (! is_dir($deployDir) && ! mkdir($deployDir, 0755, true) && ! is_dir($deployDir)) {
            return response()->json(['ok' => false, 'message' => 'No se pudo crear storage/app/deploy.'], 500);
        }

        $archivePath = $deployDir.'/incoming-'.uniqid('rel_', true).'.tar.gz';
        $upload->move(dirname($archivePath), basename($archivePath));

        try {
            $result = $installer->installFromArchive($archivePath, $pipeline);
        } catch (Throwable $e) {
            if (is_file($archivePath)) {
                @unlink($archivePath);
            }

            return response()->json([
                'ok' => false,
                'message' => $e->getMessage(),
            ], 500);
        }

        return response()->json($result, $result['ok'] ? 200 : 500);
    }
}
