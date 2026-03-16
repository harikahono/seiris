<?php
// ============================================================
// app/Http/Requests/Team/JoinTeamRequest.php
// ============================================================
namespace App\Http\Requests\Team;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class JoinTeamRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'invite_code' => ['required', 'string', 'size:8', 'alpha_num'],
        ];
    }

    public function messages(): array
    {
        return [
            'invite_code.required'  => 'Kode undangan wajib diisi.',
            'invite_code.size'      => 'Kode undangan harus 8 karakter.',
            'invite_code.alpha_num' => 'Kode undangan hanya boleh huruf dan angka.',
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