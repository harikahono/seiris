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
            'fmr' => ['required', 'integer', 'min:0', 'max:' . config('seiris.max_student_fmr')],
        ];
    }

    public function messages(): array
    {
        $maxFmr = config('seiris.max_student_fmr');
        return [
            'fmr.required' => 'FMR wajib diisi.',
            'fmr.integer'  => 'FMR harus berupa angka.',
            'fmr.min'      => 'FMR tidak boleh negatif.',
            'fmr.max'      => "FMR melebihi batas maksimum mahasiswa (Rp {$maxFmr}/jam).",
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