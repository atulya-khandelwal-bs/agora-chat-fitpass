<?php

namespace App\Http\Requests;

use App\Enums\HolidayStatus;
use App\Enums\PublicHolidayType;
use App\Services\AccessControlService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Carbon\Carbon;

class HolidayRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        $method = $this->method();
        
        switch ($method) {
            case 'POST':
                return $this->rulesForCreate();
            case 'PUT':
            case 'PATCH':
                return $this->rulesForUpdate();
            default:
                return [];
        }
    }

    protected function prepareForValidation(): void
    {
        if (!$this->isMethod('post')) {
            return;
        }

        $user = $this->user();
        $accessControl = app(AccessControlService::class);
        if (!$user || !$accessControl->isSuperAdmin($user)) {
            $this->merge([
                'public_holiday' => (string) PublicHolidayType::PERSONAL->value,
            ]);
        }
    }

    /**
     * Validation rules for creating a holiday
     */
    protected function rulesForCreate(): array
    {
        $rules = [
            'title' => 'required|string|max:255',
            'start_date' => 'required|date_format:Y-m-d H:i',
            'end_date' => 'required|date_format:Y-m-d H:i',
            'public_holiday' => 'required|in:' . PublicHolidayType::PERSONAL->value . ',' . PublicHolidayType::PUBLIC->value,
            'description' => 'nullable|string|max:1000',
            'app_display_message' => 'nullable|string|max:500',
            'self_leave' => 'nullable|in:0,1'
        ];

        // Only require health coach selection for personal holidays
        if ($this->input('public_holiday') == PublicHolidayType::PERSONAL->value) {
            $rules['health_coach_id'] = 'required|array|min:1';
            $rules['health_coach_id.*'] = 'exists:fitpass_health_coach,health_coach_id';
        }

        return $rules;
    }

        /**
     * Validation rules for updating a holiday
     */
    protected function rulesForUpdate(): array
    {
        $rules = [
            'title' => 'required|string|max:255',
            'start_date' => 'required|date_format:Y-m-d H:i',
            'end_date' => 'required|date_format:Y-m-d H:i',
            'public_holiday' => 'required|in:' . PublicHolidayType::PERSONAL->value . ',' . PublicHolidayType::PUBLIC->value,
            'description' => 'nullable|string|max:1000',
            'app_display_message' => 'nullable|string|max:500',
            'self_leave' => 'nullable|in:0,1'
        ];

        // Only require health coach selection for personal holidays
        if ($this->input('public_holiday') == PublicHolidayType::PERSONAL->value) {
            $rules['health_coach_id'] = 'required|array|min:1';
            $rules['health_coach_id.*'] = 'exists:fitpass_health_coach,health_coach_id';
        }

        return $rules;
    }

    /**
     * Custom validation logic for date comparison and public holiday logic
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            // Date comparison validation
            if ($this->has('start_date') && $this->has('end_date')) {
                try {
                    $startDate = Carbon::createFromFormat('Y-m-d H:i', $this->start_date);
                    $endDate = Carbon::createFromFormat('Y-m-d H:i', $this->end_date);
                    
                    if ($endDate->lt($startDate)) {
                        $validator->errors()->add('end_date', 'The end date must be after or equal to the start date.');
                    }
                } catch (\Exception $e) {
                    // If date parsing fails, the date_format validation will catch it
                }
            }

            // Public holiday validation - ensure health coach selection is not required for public holidays
            if ($this->input('public_holiday') == PublicHolidayType::PUBLIC->value) {
                // Remove any existing health_coach_id validation errors for public holidays
                if ($validator->errors()->has('health_coach_id')) {
                    $validator->errors()->forget('health_coach_id');
                }
            }
        });
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'title.required' => 'The holiday title is required.',
            'title.max' => 'The holiday title may not be greater than 255 characters.',
            'start_date.required' => 'The start date is required.',
            'start_date.date_format' => 'The start date must be in the format Y-m-d H:i.',
            'end_date.required' => 'The end date is required.',
            'end_date.date_format' => 'The end date must be in the format Y-m-d H:i.',
            'public_holiday.required' => 'Please select the holiday type.',
            'public_holiday.in' => 'The holiday type must be either Personal or Public.',
            'health_coach_id.required' => 'Please select at least one health coach.',
            'health_coach_id.array' => 'The health coach selection must be an array.',
            'health_coach_id.min' => 'Please select at least one health coach.',
            'health_coach_id.*.exists' => 'One or more selected health coaches are invalid.',
            'description.max' => 'The description may not be greater than 1000 characters.',
            'app_display_message.max' => 'The app display message may not be greater than 500 characters.'
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'title' => 'holiday title',
            'start_date' => 'start date',
            'end_date' => 'end date',
            'public_holiday' => 'holiday type',
            'health_coach_id' => 'health coach',
            'description' => 'description',
            'app_display_message' => 'app display message'
        ];
    }
}
