<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\HasMany;

class User extends Authenticatable
{
    use HasApiTokens;
    use HasFactory;
    use Notifiable;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'fitpass_teams';

    /**
     * The primary key for the model.
     *
     * @var string
     */
    protected $primaryKey = 'team_member_id';

    /**
     * The "type" of the auto-incrementing ID.
     *
     * @var string
     */
    protected $keyType = 'int';

    /**
     * Indicates if the IDs are auto-incrementing.
     *
     * @var bool
     */
    public $incrementing = true;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'email_address',
        'password',
        'first_name',
        'last_name',
        'mobile_number',
        'status',
        'team_designation_id',
        'department_ids',
        'gender',
        'user_photo',
        'is_doctor',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'text_password',
        'login_token',
        'access_token',
        'remember_token',
        'two_factor_recovery_codes',
        'two_factor_secret',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'create_time' => 'datetime',
        'update_time' => 'datetime',
        'last_access_time' => 'datetime',
        'is_doctor' => 'boolean',
        'agent_event_name' => 'array',
        'agent_call_uid' => 'array',
        'agent_executive_details' => 'array',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array<int, string>
     */
    protected $appends = [
        // 'profile_photo_url', // Removed - was related to Jetstream
    ];

    /**
     * Get the user's full name.
     *
     * @return string
     */
    public function getNameAttribute()
    {
        return trim($this->first_name . ' ' . $this->last_name);
    }

    /**
     * Get the user's email for password reset.
     *
     * @return string
     */
    public function getEmailForPasswordReset()
    {
        return $this->email_address;
    }

    /**
     * Get the email address that should be used for authentication.
     *
     * @return string
     */
    public function getEmailAttribute()
    {
        return $this->email_address;
    }

    /**
     * Get the name that should be used for authentication.
     *
     * @return string
     */
    public function getAuthIdentifierName()
    {
        return 'team_member_id';
    }

    /**
     * Get the unique identifier for the user.
     *
     * @return mixed
     */
    public function getAuthIdentifier()
    {
        return $this->team_member_id;
    }

    /**
     * Get the password for the user.
     *
     * @return string
     */
    public function getAuthPassword()
    {
        return $this->text_password;
    }

    /**
     * Check if user is active
     */
    public function isActive()
    {
        return $this->status == 2;
    }

    /**
     * Scope to only include active users
     */
    public function scopeActive($query)
    {
        return $query->where('status', 1);
    }

    /**
     * Get the holiday calendar entries for this user.
     */
    public function holidayCalendars(): HasMany
    {
        return $this->hasMany(HolidayCalendar::class, 'team_member_id', 'team_member_id');
    }

    /**
     * Get the health coach holiday calendar entries for this user.
     */
    public function healthCoachHolidays(): HasMany
    {
        return $this->hasMany(HolidayCalendar::class, 'health_coach_id', 'team_member_id');
    }
}
