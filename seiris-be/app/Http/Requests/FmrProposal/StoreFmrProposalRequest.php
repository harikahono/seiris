<?php

namespace App\Http\Requests\FmrProposal;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class StoreFmrProposalRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'proposed_fmr' => ['required', 'integer', 'min:0', 'max:' . config('seiris.max_student_fmr')],
        ];
    }

    public function messages(): array
    {
        $maxFmr = config('seiris.max_student_fmr');
        return [
            'proposed_fmr.required' => 'FMR yang diusulkan wajib diisi.',
            'proposed_fmr.integer'  => 'FMR harus berupa angka.',
            'proposed_fmr.min'      => 'FMR tidak boleh negatif.',
            'proposed_fmr.max'      => "FMR melebihi batas maksimum mahasiswa (Rp {$maxFmr}/jam).",
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
