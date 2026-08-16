<?php

namespace App\Http\Requests\Contribution;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class StoreContributionRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $type = $this->input('type');

        $rules = [
            'type'              => ['required', 'in:TIME,CASH,IDEA,NETWORK,FACILITY,SALES'],
            'description'       => ['required', 'string', 'min:5', 'max:500'],
            'contribution_date' => ['required', 'date', 'before_or_equal:today'],
            // optional proof file (≤5 MB) and GitHub link
            'proof' => ['nullable','file','mimes:pdf,jpg,png','max:5120'],
            'source_url' => ['nullable','url','regex:/^https:\/\/github\.com\/[^\/]+\/[^\/]+\/(pull\/\d+|commit\/[a-f0-9]+)$/i'],
        ];

        // Rules tambahan per tipe
        switch ($type) {
            case 'TIME':
            case 'IDEA':
            case 'NETWORK':
                $rules['hours'] = ['required', 'numeric', 'min:0.5', 'max:744'];
                break;

            case 'CASH':
            case 'FACILITY':
                $rules['amount'] = ['required', 'integer', 'min:1000', 'max:999999999'];
                break;

            case 'SALES':
                $rules['deal_value']       = ['required', 'integer', 'min:1', 'max:999999999', 'gte:estimated_value'];
                $rules['estimated_value']  = ['required', 'integer', 'min:1', 'max:999999999'];
                // ponytail: commission_rate diabaikan — backend paksa pakai rate dari tim
                $rules['commission_rate']  = ['nullable', 'numeric', 'min:0', 'max:100'];
                break;
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'type.required'              => 'Jenis kontribusi wajib dipilih.',
            'type.in'                    => 'Jenis kontribusi tidak valid.',
            'description.required'       => 'Deskripsi wajib diisi.',
            'description.min'            => 'Deskripsi minimal 5 karakter.',
            'contribution_date.required' => 'Tanggal kontribusi wajib diisi.',
            'contribution_date.before_or_equal' => 'Tanggal kontribusi tidak boleh di masa depan.',
            'hours.required'             => 'Jumlah jam wajib diisi.',
            'hours.min'                  => 'Minimal 0.5 jam (30 menit).',
            'hours.max'                  => 'Maksimal 744 jam (31 hari).',
            'amount.required'            => 'Nominal wajib diisi.',
            'amount.min'                 => 'Nominal minimal Rp 1.000.',
            'deal_value.required'        => 'Nilai deal wajib diisi.',
            'deal_value.min'             => 'Nilai deal minimal Rp 1.',
            'deal_value.gte'             => 'Nilai deal harus lebih besar atau sama dengan estimasi tim.',
            'estimated_value.required'   => 'Estimasi tim wajib diisi.',
            'estimated_value.min'        => 'Estimasi tim minimal Rp 1.',
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