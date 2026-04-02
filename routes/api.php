<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\FPChatConsoleController;

Route::post('/chat/send-custom-message-to-group', [FPChatConsoleController::class, 'sendCustomMessage']);
Route::post('/chat/generate-token', [FPChatConsoleController::class, 'generateToken']);
Route::post('/chat/register-user', [FPChatConsoleController::class, 'registerUser']);
Route::post('/chat/get-dietitian-token', [FPChatConsoleController::class, 'getDietitianToken']);
Route::post('/chat/update-text-message', [FPChatConsoleController::class, 'updateTextMessage']);
