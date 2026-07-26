<?php

namespace App\Http\Requests\Project;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // team.member middleware already gates access
    }

    public function rules(): array
    {
        $team = $this->route('team');

        return [
            'name'        => [
                'required', 'string', 'min:3', 'max:100',
                // B2: cegah duplikat nama dalam 1 tim — validasi app-level
                Rule::unique('projects')
                    ->where('team_id', $team?->id),
            ],
            'description' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Nama project wajib diisi.',
            'name.min'      => 'Nama project minimal 3 karakter.',
            'name.unique'   => 'Nama project sudah digunakan di tim ini.',
        ];
    }
}
