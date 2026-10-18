<?php

declare(strict_types=1);

namespace Database\Seeders\Benchmark;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        User::query()->firstOrCreate(
            ['email' => 'admin@example.com'],
            ['name' => 'Alfa Admin', 'password' => Hash::make('password'), 'email_verified_at' => now()],
        );
    }
}
