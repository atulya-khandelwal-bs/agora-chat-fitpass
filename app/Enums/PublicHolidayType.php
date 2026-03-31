<?php

namespace App\Enums;

enum PublicHolidayType: int
{
    case PERSONAL = 1;
    case PUBLIC = 2;

    public function label(): string
    {
        return match($this) {
            self::PERSONAL => 'Personal Holiday',
            self::PUBLIC => 'Public Holiday',
        };
    }

    public function badge(): array
    {
        return match($this) {
            self::PERSONAL => ['variant' => 'info', 'text' => 'Personal'],
            self::PUBLIC => ['variant' => 'success', 'text' => 'Public'],
        };
    }

    public static function fromValue(int $value): ?self
    {
        return match($value) {
            1 => self::PERSONAL,
            2 => self::PUBLIC,
            default => null,
        };
    }
}
