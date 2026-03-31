<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use App\Models\HealthCoach;

class FPChatConsoleController extends Controller
{
    private function backendUrl(): string
    {
        return env('VITE_BACKEND_API_URL', 'https://services.fitpass.dev');
    }
    /**
     * Render the primary FP chat console page.
     */
    public function __invoke(Request $request)
    {
        $healthCoaches = HealthCoach::active()
            ->orderBy('health_coach_name')
            ->get(['health_coach_id', 'health_coach_name'])
            ->map(fn ($coach) => [
                'id' => (string) $coach->health_coach_id,
                'name' => $coach->health_coach_name ?: ('Coach #' . $coach->health_coach_id),
            ])
            ->values();

        return Inertia::render('fp/ChatConsole', [
            'healthCoaches' => $healthCoaches,
        ]);
    }

    /**
     * Proxy send-custom-message request to external API to avoid CORS issues.
     */
    public function sendCustomMessage(Request $request)
    {
        $request->validate([
            'from' => 'required|string',
            'to' => 'required|string',
            'type' => 'required|string',
            'data' => 'required|array',
        ]);

        try {
            $response = Http::post(
                $this->backendUrl() . '/agora-chat/api/chat/send-custom-message',
                $request->all()
            );

            return response()->json($response->json(), $response->status());
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to send custom message',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Proxy generate-token request to external API to avoid CORS issues.
     */
    public function generateToken(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'expireInSecs' => 'sometimes|integer',
        ]);

        try {
            $response = Http::asJson()->post(
                $this->backendUrl() . '/agora-chat/api/chat/generate-token',
                $request->only(['username', 'expireInSecs'])
            );
            return response()->json($response->json(), $response->status());
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Token generation failed',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Proxy register-user request to external API to avoid CORS issues.
     */
    public function registerUser(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
        ]);

        try {
            $response = Http::asJson()->post(
                $this->backendUrl() . '/agora-chat/api/chat/register-user',
                $request->only('username')
            );
            return response()->json($response->json(), $response->status());
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'User registration failed',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
