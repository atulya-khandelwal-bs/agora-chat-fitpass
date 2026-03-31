<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\FPChatConsoleController;

Route::get('/', function () {
    return redirect()->route('fp.chat.console');
});

Route::get('/fp-chat', FPChatConsoleController::class)->name('fp.chat.console');
