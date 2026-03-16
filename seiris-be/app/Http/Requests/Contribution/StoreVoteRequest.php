<?php
// ============================================================
// app/Http/Requests/Contribution/StoreVoteRequest.php
// ============================================================
namespace App\Http\Requests\Contribution;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class StoreVoteRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'vote' => ['required', 'in:APPROVE,REJECT'],
            'note' => ['nullable', 'string', 'max:300'],
        ];
    }

    public function messages(): array
    {
        return [
            'vote.required' => 'Vote wajib diisi.',
            'vote.in'       => 'Vote harus APPROVE atau REJECT.',
            'note.max'      => 'Catatan maksimal 300 karakter.',
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