<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HealthCoachRatingResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->health_coach_rating_id,
            'health_coach_rating_id' => $this->health_coach_rating_id,
            'rating' => $this->rating,
            'created_by' => $this->created_by,
            'updated_by' => $this->updated_by,
            'create_time' => $this->create_time,
            'update_time' => $this->update_time,
            'user_id' => $this->user_id,
            'health_coach_id' => $this->health_coach_id,
            'referral_source' => $this->referral_source,
            'remarks' => $this->remarks,
            'user_feedback' => $this->user_feedback,
            'rating_tags' => $this->rating_tags,
            'user_name' => $this->user_name,
            'user_mobile' => $this->user_mobile,
            'health_coach_name' => $this->health_coach_name,
            'fitpass_id' => $this->user_id,
            'user' => $this->whenLoaded('user', function () {
                return [
                    'name' => $this->user->name,
                    'mobile_number' => $this->user->user_mobile
                ];
            }),
            'health_coach' => $this->whenLoaded('healthCoach', function () {
                return [
                    'health_coach_name' => $this->healthCoach->health_coach_name
                ];
            })
        ];
    }

    /**
     * Get column options for filtering
     */
    public function getColumnOptions(): array
    {
        return [
            'rating' => [
                'type' => 'range-inputs',
                'min' => 1,
                'max' => 5,
                'step' => 0.1
            ],
            'referral_source' => [
                'type' => 'text'
            ],
            'health_coach_id' => [
                'type' => 'select',
                'options' => $this->getHealthCoachOptions()
            ],
            'health_coach_name' => [
                'type' => 'text'
            ]
        ];
    }

    /**
     * Get display rules for columns
     */
    public function getDisplayRules(): array
    {
        return [
            'rating' => [
                'type' => 'badge',
                'badge_class' => 'bg-warning-subtle text-warning',
                'icon' => 'ri-star-fill'
            ],
            'create_time' => [
                'type' => 'datetime',
                'format' => 'Y-m-d H:i:s'
            ],
            'user_feedback' => [
                'type' => 'text',
                'max_length' => 100,
                'truncate' => true
            ],
            'remarks' => [
                'type' => 'text',
                'max_length' => 100,
                'truncate' => true
            ]
        ];
    }

    /**
     * Get health coach options for dropdown
     */
    private function getHealthCoachOptions(): array
    {
        // This would typically come from a service or be cached
        // For now, return empty array - will be populated by controller
        return [];
    }
}
