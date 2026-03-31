<?php

namespace App\Enums;

enum HolidayStatus: int
{
    case PENDING = 1;
    case APPROVED = 2;
    case REJECTED = 3;

    public function label(): string
    {
        return match($this) {
            self::PENDING => 'Pending',
            self::APPROVED => 'Approved',
            self::REJECTED => 'Rejected',
        };
    }

    public function icon(): string
    {
        return match($this) {
            self::PENDING => 'ri-time-line text-warning',
            self::APPROVED => 'ri-checkbox-circle-line text-success',
            self::REJECTED => 'ri-close-circle-line text-danger',
        };
    }

    public function title(): string
    {
        return match($this) {
            self::PENDING => 'Pending',
            self::APPROVED => 'Approved',
            self::REJECTED => 'Rejected',
        };
    }

    public static function fromValue(int $value): ?self
    {
        return match($value) {
            1 => self::PENDING,
            2 => self::APPROVED,
            3 => self::REJECTED,
            default => null,
        };
    }
}
