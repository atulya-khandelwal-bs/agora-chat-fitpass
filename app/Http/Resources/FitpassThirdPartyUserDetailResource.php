<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\DTOs\FitpassThirdPartyUserDetailDTO;

class FitpassThirdPartyUserDetailResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        if ($this->resource instanceof FitpassThirdPartyUserDetailDTO) {
            return $this->resource->toArray();
        }
        
        // Fallback for model instances
        $dto = FitpassThirdPartyUserDetailDTO::fromModel($this->resource);
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
                ['value' => '', 'text' => 'All'],
                ['value' => 1, 'text' => 'Inactive'],
                ['value' => 2, 'text' => 'Active']
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
                1 => [
                    'type' => 'badge',
                    'variant' => 'danger',
                    'text' => 'Inactive'
                ],
                2 => [
                    'type' => 'badge',
                    'variant' => 'success',
                    'text' => 'Active'
                ]
            ]
        ];
    }
}

