<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HealthCoach extends Model
{
    protected $table = 'fitpass_health_coach';

    protected $primaryKey = 'health_coach_id';
    public $timestamps = false;

    protected $fillable = [
        'health_coach_name',
        'photo',
        'status',
        'about_us',
        'specialist',
        'freshchat_user_agent_id',
        'freshchat_agent_channel_tag',
        'created_by',
        'updated_by',
        'create_time',
        'update_time',
        'team_member_id',
        'health_coach_type',
        'remarks',
        'health_experience',
        'number_consultations',
        'avg_rating'
    ];

    protected $casts = [
        'health_coach_id' => 'integer',
        'status' => 'integer',
        'team_member_id' => 'integer',
        'health_coach_type' => 'integer',
        'health_experience' => 'decimal:2',
        'number_consultations' => 'integer',
        'avg_rating' => 'decimal:2',
        'create_time' => 'datetime',
        'update_time' => 'datetime'
    ];

    public function scopeActive($query)
    {
        return $query->where('status', 2);
    }
}
