<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Perfume extends Model
{
    use HasFactory;
    protected $guarded = [];

    public function dupes()
    {
        return $this->hasMany(Dupe::class);
    }
}
