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
            'approval_threshold' => ['nullable', 'in:50,100'],
            'fmr'                => ['nullable', 'integer', 'min:0', 'max:' . config('seiris.max_student_fmr')],
            'commission_rate'    => ['nullable', 'numeric', 'min:0', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'            => 'Nama tim wajib diisi.',
            'name.min'                 => 'Nama tim minimal 2 karakter.',
            'name.max'                 => 'Nama tim maksimal 100 karakter.',
            'description.max'          => 'Deskripsi maksimal 500 karakter.',
            'approval_threshold.in'    => 'Threshold harus 50 atau 100.',
            'fmr.integer'              => 'FMR harus berupa angka.',
            'fmr.min'                  => 'FMR tidak boleh negatif.',
            'fmr.max'                  => 'FMR maksimal Rp ' . number_format((int) config('seiris.max_student_fmr'), 0, ',', '.') . '/jam (batas mahasiswa).',
            'commission_rate.numeric'  => 'Rate komisi harus berupa angka.',
            'commission_rate.min'      => 'Rate komisi minimal 0%.',
            'commission_rate.max'      => 'Rate komisi maksimal 100%.',
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