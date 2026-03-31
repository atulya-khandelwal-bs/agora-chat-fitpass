<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\DTOs\HealthCoachDTO;
use App\DTOs\HealthCoachEditDTO;
use App\Enums\HealthCoachStatus;
use App\Enums\HealthCoachType;

class HealthCoachResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        if ($this->resource instanceof HealthCoachDTO) {
            return $this->resource->toArray();
        }
        
        if ($this->resource instanceof HealthCoachEditDTO) {
            return $this->resource->toArray();
        }
        
        // Fallback for model instances
        $dto = HealthCoachDTO::fromModel($this->resource);
        return $dto ? $dto->toArray() : [];
    }

    /**
     * Get additional data that should be returned with the resource array.
     */
    public function with(Request $request): array
    {
        return [
            'columnOptions' => $this->getColumnOptions(),
            'displayRules' => $this->getDisplayRules(),
        ];
    }

    /**
     * Get column options for the frontend
     */
    public function getColumnOptions(): array
    {
        return [
            'status' => [
                ['value' => HealthCoachStatus::INACTIVE->value, 'text' => HealthCoachStatus::INACTIVE->label()],
                ['value' => HealthCoachStatus::ACTIVE->value, 'text' => HealthCoachStatus::ACTIVE->label()]
            ]
        ];
    }

    /**
     * Get display rules for the frontend
     */
    public function getDisplayRules(): array
    {
        return [
            'status' => [
                HealthCoachStatus::INACTIVE->value => [
                    'type' => 'clickable-status',
                    'class' => HealthCoachStatus::INACTIVE->icon() . ' text-danger',
                    'title' => HealthCoachStatus::INACTIVE->label(),
                    'statusConfig' => [
                        'active' => [
                            'value' => HealthCoachStatus::ACTIVE->value,
                            'icon' => HealthCoachStatus::ACTIVE->icon(),
                            'title' => HealthCoachStatus::ACTIVE->label()
                        ],
                        'inactive' => [
                            'value' => HealthCoachStatus::INACTIVE->value,
                            'icon' => HealthCoachStatus::INACTIVE->icon(),
                            'title' => HealthCoachStatus::INACTIVE->label()
                        ]
                    ],
                    'updateUrl' => '/health-coaches/update-status/{id}'
                ],
                HealthCoachStatus::ACTIVE->value => [
                    'type' => 'clickable-status',
                    'class' => HealthCoachStatus::ACTIVE->icon() . ' text-success',
                    'title' => HealthCoachStatus::ACTIVE->label(),
                    'statusConfig' => [
                        'active' => [
                            'value' => HealthCoachStatus::ACTIVE->value,
                            'icon' => HealthCoachStatus::ACTIVE->icon(),
                            'title' => HealthCoachStatus::ACTIVE->label()
                        ],
                        'inactive' => [
                            'value' => HealthCoachStatus::INACTIVE->value,
                            'icon' => HealthCoachStatus::INACTIVE->icon(),
                            'title' => HealthCoachStatus::INACTIVE->label()
                        ]
                    ],
                    'updateUrl' => '/health-coaches/update-status/{id}'
                ]
            ]
        ];
    }
}
