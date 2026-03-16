<?php
// ============================================================
// app/Http/Requests/Team/UpdateFmrRequest.php
// ============================================================
namespace App\Http\Requests\Team;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class UpdateFmrRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'fmr' => ['required', 'integer', 'min:0', 'max:99999999'],
        ];
    }

    public function messages(): array
    {
        return [
            'fmr.required' => 'FMR wajib diisi.',
            'fmr.integer'  => 'FMR harus berupa angka.',
            'fmr.min'      => 'FMR tidak boleh negatif.',
            'fmr.max'      => 'FMR terlalu besar.',
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