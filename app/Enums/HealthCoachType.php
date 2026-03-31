<?php

namespace App\Enums;

enum HealthCoachType: int
{
    case GENERAL = 1;
    case SPECIALIST = 2;
    case SENIOR = 3;

    public function label(): string
    {
        return match($this) {
            self::GENERAL => 'General',
            self::SPECIALIST => 'Specialist',
            self::SENIOR => 'Senior',
        };
    }

    public function badge(): string
    {
        return match($this) {
            self::GENERAL => 'badge-soft-primary',
            self::SPECIALIST => 'badge-soft-warning',
            self::SENIOR => 'badge-soft-info',
        };
    }

    public function icon(): string
    {
        return match($this) {
            self::GENERAL => 'ri-user-line',
            self::SPECIALIST => 'ri-medical-bag-line',
            self::SENIOR => 'ri-award-line',
        };
    }
}
