<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\FPChatConsoleController;

Route::post('/chat/send-custom-message', [FPChatConsoleController::class, 'sendCustomMessage']);
Route::post('/chat/generate-token', [FPChatConsoleController::class, 'generateToken']);
Route::post('/chat/register-user', [FPChatConsoleController::class, 'registerUser']);
