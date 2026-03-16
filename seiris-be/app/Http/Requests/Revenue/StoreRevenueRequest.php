<?php
// ============================================================
// app/Http/Requests/Revenue/StoreRevenueRequest.php
// ============================================================
namespace App\Http\Requests\Revenue;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class StoreRevenueRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'description'          => ['required', 'string', 'min:5', 'max:500'],
            'amount'               => ['required', 'integer', 'min:1000'],
            'distributable_amount' => ['required', 'integer', 'min:0', 'lte:amount'],
            'revenue_date'         => ['required', 'date', 'before_or_equal:today'],
            'proof'                => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
        ];
    }

    public function messages(): array
    {
        return [
            'description.required'          => 'Deskripsi wajib diisi.',
            'description.min'               => 'Deskripsi minimal 5 karakter.',
            'amount.required'               => 'Nominal revenue wajib diisi.',
            'amount.min'                    => 'Nominal minimal Rp 1.000.',
            'distributable_amount.required' => 'Nominal yang didistribusikan wajib diisi.',
            'distributable_amount.lte'      => 'Nominal distribusi tidak boleh melebihi total revenue.',
            'revenue_date.required'         => 'Tanggal revenue wajib diisi.',
            'revenue_date.before_or_equal'  => 'Tanggal tidak boleh di masa depan.',
            'proof.mimes'                   => 'Bukti harus berformat PDF, JPG, atau PNG.',
            'proof.max'                     => 'Ukuran file maksimal 5MB.',
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