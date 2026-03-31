<?php

namespace App\Http\Resources;

use App\DTOs\HolidayDTO;
use App\DTOs\HolidayEditDTO;
use App\Enums\HolidayStatus;
use App\Enums\PublicHolidayType;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HolidayResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        // Handle both DTO types and model instances
        if ($this->resource instanceof HolidayDTO) {
            return $this->resource->toArray();
        }
        
        if ($this->resource instanceof HolidayEditDTO) {
            return $this->resource->toArray();
        }
        
        // For model instances, use the appropriate DTO
        $dto = HolidayDTO::fromModel($this->resource);
        return $dto->toArray();
    }



    /**
     * Get column options for filters and forms
     */
    public function getColumnOptions(): array
    {
        return [
            'status' => [
                ['value' => 1, 'text' => 'Pending'],
                ['value' => 2, 'text' => 'Approved'],
                ['value' => 3, 'text' => 'Rejected']
            ],
            'public_holiday' => [
                ['value' => PublicHolidayType::PUBLIC->value, 'text' => PublicHolidayType::PUBLIC->label()],
                ['value' => PublicHolidayType::PERSONAL->value, 'text' => PublicHolidayType::PERSONAL->label()]
            ]
        ];
    }

    /**
     * Get display rules for UI rendering
     */
    public function getDisplayRules(): array
    {
        return [
            'status' => [
                1 => ['type' => 'badge', 'variant' => 'warning', 'text' => 'Pending'],
                2 => ['type' => 'badge', 'variant' => 'success', 'text' => 'Approved'],
                3 => ['type' => 'badge', 'variant' => 'danger', 'text' => 'Rejected']
            ],
            'public_holiday' => [
                PublicHolidayType::PUBLIC->value => ['type' => 'badge', 'variant' => PublicHolidayType::PUBLIC->badge()['variant'], 'text' => 'Public'],
                PublicHolidayType::PERSONAL->value => ['type' => 'badge', 'variant' => PublicHolidayType::PERSONAL->badge()['variant'], 'text' => 'Personal']
            ]
        ];
    }


}
