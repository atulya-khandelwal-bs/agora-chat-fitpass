<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\DTOs\FitpassUserDTO;
use App\DTOs\FitpassUserEditDTO;

class FitpassUserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        if ($this->resource instanceof FitpassUserDTO) {
            return $this->resource->toArray();
        }
        
        if ($this->resource instanceof FitpassUserEditDTO) {
            return $this->resource->toArray();
        }
        
        // Fallback for model instances
        $dto = FitpassUserDTO::fromModel($this->resource);
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
            'user_type' => [
                ['value' => 1, 'text' => 'Regular'],
                ['value' => 2, 'text' => 'Premium'],
                ['value' => 3, 'text' => 'VIP']
            ],
            'is_email_verify' => [
                ['value' => 1, 'text' => 'Verified'],
                ['value' => 2, 'text' => 'Not Verified']
            ],
            'is_mobile_verified' => [
                ['value' => 1, 'text' => 'Verified'],
                ['value' => 2, 'text' => 'Not Verified']
            ],
            'is_deleted' => [
                ['value' => 1, 'text' => 'Active'],
                ['value' => 2, 'text' => 'Deleted']
            ]
        ];
    }

    /**
     * Get display rules for the frontend
     */
    public function getDisplayRules(): array
    {
        return [
            'deletion_status' => [
                'Active' => [
                    'type' => 'badge',
                    'variant' => 'success',
                    'text' => 'Active'
                ],
                'Deleted' => [
                    'type' => 'badge',
                    'variant' => 'danger',
                    'text' => 'Deleted'
                ]
            ],
            'is_deleted' => [
                1 => [
                    'type' => 'clickable-status',
                    'class' => 'ri-check-line text-success',
                    'title' => 'Active',
                    'statusConfig' => [
                        'active' => [
                            'value' => 1,
                            'icon' => 'ri-check-line',
                            'title' => 'Active'
                        ],
                        'inactive' => [
                            'value' => 2,
                            'icon' => 'ri-delete-bin-line',
                            'title' => 'Deleted'
                        ]
                    ],
                    'updateUrl' => '/fitpass-users/update-status/{id}'
                ],
                2 => [
                    'type' => 'clickable-status',
                    'class' => 'ri-delete-bin-line text-danger',
                    'title' => 'Deleted',
                    'statusConfig' => [
                        'active' => [
                            'value' => 1,
                            'icon' => 'ri-check-line',
                            'title' => 'Active'
                        ],
                        'inactive' => [
                            'value' => 2,
                            'icon' => 'ri-delete-bin-line',
                            'title' => 'Deleted'
                        ]
                    ],
                    'updateUrl' => '/fitpass-users/update-status/{id}'
                ]
            ],
            'is_email_verify' => [
                1 => [
                    'type' => 'badge',
                    'class' => 'badge-soft-success',
                    'icon' => 'ri-check-line',
                    'title' => 'Email Verified'
                ],
                2 => [
                    'type' => 'badge',
                    'class' => 'badge-soft-danger',
                    'icon' => 'ri-close-line',
                    'title' => 'Email Not Verified'
                ]
            ],
            'is_mobile_verified' => [
                1 => [
                    'type' => 'badge',
                    'class' => 'badge-soft-success',
                    'icon' => 'ri-check-line',
                    'title' => 'Mobile Verified'
                ],
                2 => [
                    'type' => 'badge',
                    'class' => 'badge-soft-danger',
                    'icon' => 'ri-close-line',
                    'title' => 'Mobile Not Verified'
                ]
            ],
            'user_type' => [
                1 => [
                    'type' => 'badge',
                    'class' => 'badge-soft-primary',
                    'icon' => 'ri-user-line',
                    'title' => 'Regular User'
                ],
                2 => [
                    'type' => 'badge',
                    'class' => 'badge-soft-success',
                    'icon' => 'ri-vip-crown-line',
                    'title' => 'Premium User'
                ],
                3 => [
                    'type' => 'badge',
                    'class' => 'badge-soft-warning',
                    'icon' => 'ri-vip-crown-2-line',
                    'title' => 'VIP User'
                ]
            ]
        ];
    }
}
