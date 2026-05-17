<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Log;
use Kreait\Firebase\Contract\Messaging;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\Notification;

final class FCMService
{
    private ?Messaging $messaging = null;

    public function __construct() {}

    /**
     * Lazily resolve the Firebase Messaging service to avoid crashes during bootstrapping.
     */
    private function getMessaging(): ?Messaging
    {
        if ($this->messaging === null) {
            try {
                $this->messaging = app(Messaging::class);
            } catch (\Throwable $e) {
                Log::warning("No se pudo inicializar Firebase Messaging (credenciales faltantes o inválidas): " . $e->getMessage());
            }
        }

        return $this->messaging;
    }

    /**
     * Envía una notificación push a un usuario en todos sus dispositivos registrados.
     *
     * @param array<string, string> $data
     */
    public function sendToUser(User $user, string $title, string $body, array $data = []): void
    {
        $tokens = $user->pushDevices()->pluck('token')->filter()->all();

        if (empty($tokens)) {
            Log::info("No se enviaron notificaciones a usuario {$user->id} ({$user->name}) porque no tiene tokens registrados.");
            return;
        }

        $messaging = $this->getMessaging();
        if ($messaging === null) {
            Log::error("No se pudo enviar notificación push a usuario {$user->id} porque Firebase Messaging no está disponible.");
            return;
        }

        foreach ($tokens as $token) {
            try {
                $message = CloudMessage::withTarget('token', $token)
                    ->withNotification(Notification::create($title, $body))
                    ->withData($data);

                $messaging->send($message);
            } catch (\Throwable $e) {
                // Si el token es inválido o expiró, podríamos eliminarlo opcionalmente
                Log::error("Error al enviar push a token del usuario {$user->id}: " . $e->getMessage());
            }
        }
    }
}
