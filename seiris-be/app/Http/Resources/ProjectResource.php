<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ProjectResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'          => $this->id,
            'team_id'     => $this->team_id,
            'name'        => $this->name,
            'description' => $this->description,
            'is_frozen'   => $this->is_frozen,
            'frozen_at'   => $this->frozen_at,
            'created_at'  => $this->created_at,
            'updated_at'  => $this->updated_at,
        ];
    }
}
