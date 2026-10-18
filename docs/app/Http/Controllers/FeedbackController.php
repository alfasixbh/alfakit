<?php

namespace App\Http\Controllers;

use App\Models\Feedback;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class FeedbackController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'page' => ['required', 'string', 'max:200'],
            'is_helpful' => ['required', 'boolean'],
            'message' => ['nullable', 'string', 'max:2000'],
            'email' => ['nullable', 'email', 'max:255'],
        ]);

        Feedback::create($data);

        return back()->with('feedback', 'Thanks for your feedback!');
    }
}
