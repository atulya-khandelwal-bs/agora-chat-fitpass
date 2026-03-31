<?php

namespace App\Models\Traits;

use App\Enums\HolidayStatus;
use App\Enums\PublicHolidayType;

trait HolidayAccessors
{
    /**
     * Accessor to check if holiday is active
     */
    public function getIsActiveAttribute(): bool
    {
        return $this->status == HolidayStatus::ACTIVE->value;
    }

    /**
     * Accessor to check if holiday is public
     */
    public function getIsPublicHolidayAttribute(): bool
    {
        return $this->public_holiday == PublicHolidayType::PUBLIC->value;
    }

    /**
     * Accessor to get formatted start date
     */
    public function getFormattedStartDateAttribute(): ?string
    {
        return $this->start_date ? $this->start_date->format('Y-m-d H:i:s') : null;
    }

    /**
     * Accessor to get formatted end date
     */
    public function getFormattedEndDateAttribute(): ?string
    {
        return $this->end_date ? $this->end_date->format('Y-m-d H:i:s') : null;
    }

    /**
     * Accessor to get formatted create time
     */
    public function getFormattedCreateTimeAttribute(): ?string
    {
        return $this->create_time ? $this->create_time->format('Y-m-d H:i:s') : null;
    }

    /**
     * Accessor to get formatted update time
     */
    public function getFormattedUpdateTimeAttribute(): ?string
    {
        return $this->update_time ? $this->update_time->format('Y-m-d H:i:s') : null;
    }

    /**
     * Accessor to get status text
     */
    public function getStatusTextAttribute(): string
    {
        $status = HolidayStatus::fromValue($this->status);
        return $status?->label() ?? 'Unknown';
    }

    /**
     * Accessor to get public holiday text
     */
    public function getPublicHolidayTextAttribute(): string
    {
        $type = PublicHolidayType::fromValue($this->public_holiday);
        return $type?->label() ?? 'Unknown';
    }
}
