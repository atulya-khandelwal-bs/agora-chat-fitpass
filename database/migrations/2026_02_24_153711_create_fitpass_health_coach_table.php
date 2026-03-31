<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('fitpass_health_coach', function (Blueprint $table) {
            $table->bigIncrements('health_coach_id');
            $table->string('health_coach_name')->nullable();
            $table->string('photo')->nullable();
            $table->integer('status')->default(1);
            $table->text('about_us')->nullable();
            $table->string('specialist')->nullable();
            $table->string('freshchat_user_agent_id')->nullable();
            $table->string('freshchat_agent_channel_tag')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamp('create_time')->nullable();
            $table->timestamp('update_time')->nullable();
            $table->unsignedBigInteger('team_member_id')->nullable();
            $table->integer('health_coach_type')->nullable();
            $table->text('remarks')->nullable();
            $table->decimal('health_experience', 10, 2)->nullable();
            $table->integer('number_consultations')->nullable();
            $table->decimal('avg_rating', 5, 2)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fitpass_health_coach');
    }
};
