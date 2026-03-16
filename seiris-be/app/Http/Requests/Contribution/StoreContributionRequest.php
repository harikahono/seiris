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
            'type'              => ['required', 'in:TIME,CASH,IDEA,NETWORK,FACILITY,REVENUE'],
            'description'       => ['required', 'string', 'min:5', 'max:500'],
            'contribution_date' => ['required', 'date', 'before_or_equal:today'],
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

            case 'REVENUE':
                $rules['invoice_amount'] = ['required', 'integer', 'min:0'];
                $rules['actual_amount']  = ['required', 'integer', 'min:0', 'gte:invoice_amount'];
                $rules['invoice']        = ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'];
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
            'invoice_amount.required'    => 'Nominal yang dilaporkan wajib diisi.',
            'actual_amount.required'     => 'Nominal sebenarnya wajib diisi.',
            'actual_amount.gte'          => 'Nominal sebenarnya tidak boleh kurang dari yang dilaporkan.',
            'invoice.required'           => 'Invoice wajib diupload untuk kontribusi REVENUE.',
            'invoice.mimes'              => 'Invoice harus berformat PDF, JPG, atau PNG.',
            'invoice.max'                => 'Ukuran invoice maksimal 5MB.',
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