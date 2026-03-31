<?php

namespace App\Enums;

enum HealthCoachStatus: int
{
    case INACTIVE = 1;
    case ACTIVE = 2;

    public function label(): string
    {
        return match($this) {
            self::INACTIVE => 'Inactive',
            self::ACTIVE => 'Active',
        };
    }

    public function badge(): string
    {
        return match($this) {
            self::INACTIVE => 'badge-soft-danger',
            self::ACTIVE => 'badge-soft-success',
        };
    }

    public function icon(): string
    {
        return match($this) {
            self::INACTIVE => 'ri-close-circle-line',
            self::ACTIVE => 'ri-checkbox-circle-line',
        };
    }
}
