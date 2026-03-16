<?php
// ============================================================
// app/Http/Requests/Team/StoreTeamRequest.php
// ============================================================
namespace App\Http\Requests\Team;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class StoreTeamRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'name'               => ['required', 'string', 'min:2', 'max:100'],
            'description'        => ['nullable', 'string', 'max:500'],
            'approval_threshold' => ['nullable', 'in:50,75,100'],
            'fmr'                => ['nullable', 'integer', 'min:0', 'max:99999999'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'            => 'Nama tim wajib diisi.',
            'name.min'                 => 'Nama tim minimal 2 karakter.',
            'name.max'                 => 'Nama tim maksimal 100 karakter.',
            'description.max'          => 'Deskripsi maksimal 500 karakter.',
            'approval_threshold.in'    => 'Threshold harus 50, 75, atau 100.',
            'fmr.integer'              => 'FMR harus berupa angka.',
            'fmr.min'                  => 'FMR tidak boleh negatif.',
        ];
    }

    protected function failedValidation(Validator $validator): void
    {
        throw new HttpResponseException(
            response()->json([
                'message' => 'Data tidak valid.',
                'errors'  => $validator->errors(),
            ], 422)
        );
    }
}