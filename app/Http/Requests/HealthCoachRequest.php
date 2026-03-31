<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;

class HealthCoachRequest extends FormRequest
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
        
        // Debug: Log what the request contains
        \Log::info('HealthCoachRequest - Validation Rules', [
            'method' => $method,
            'all_input' => $this->all(),
            'has_health_coach_name' => $this->has('health_coach_name'),
            'health_coach_name_value' => $this->input('health_coach_name'),
            'has_photo' => $this->hasFile('photo'),
            'input_keys' => array_keys($this->all())
        ]);
        
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
    
    /**
     * Handle a failed validation attempt.
     */
    protected function failedValidation(\Illuminate\Contracts\Validation\Validator $validator)
    {
        \Log::error('HealthCoachRequest - Validation Failed', [
            'errors' => $validator->errors()->toArray(),
            'input_data' => $this->all(),
            'has_health_coach_name' => $this->has('health_coach_name'),
            'health_coach_name_value' => $this->input('health_coach_name')
        ]);
        
        parent::failedValidation($validator);
    }

    /**
     * Validation rules for creating a health coach
     */
    protected function rulesForCreate(): array
    {
        return [
            'health_coach_name' => 'required|string|max:255',
            'about_us' => 'nullable|string|max:5000', // Increased for HTML content
            'specialist' => 'nullable|string|max:255',
            'health_experience' => 'nullable|numeric|min:0|max:99',
            'photo' => 'nullable|image|mimes:png,jpeg,jpg|max:2048'
        ];
    }

    /**
     * Validation rules for updating a health coach
     */
    protected function rulesForUpdate(): array
    {
        return [
            'health_coach_name' => 'required|string|max:255',
            'about_us' => 'nullable|string|max:5000', // Increased for HTML content
            'specialist' => 'nullable|string|max:255',
            'health_experience' => 'nullable|numeric|min:0|max:99',
            'photo' => 'nullable|image|mimes:png,jpeg,jpg|max:2048'
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'health_coach_name.required' => 'The health coach name is required.',
            'health_coach_name.max' => 'The health coach name may not be greater than 255 characters.',
            'about_us.max' => 'The about us may not be greater than 5000 characters.',
            'specialist.max' => 'The specialist may not be greater than 255 characters.',
            'health_experience.numeric' => 'The health experience must be a number.',
            'health_experience.min' => 'The health experience must be at least 0.',
            'health_experience.max' => 'The health experience may not be greater than 99.',
            'photo.image' => 'The photo must be an image.',
            'photo.mimes' => 'The photo must be a PNG, JPEG, or JPG file.',
            'photo.max' => 'The photo must not be larger than 2MB.'
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'health_coach_name' => 'health coach name',
            'about_us' => 'about us',
            'specialist' => 'specialist',
            'health_experience' => 'health experience',
            'photo' => 'photo'
        ];
    }
}
