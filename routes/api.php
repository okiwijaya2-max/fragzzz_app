<?php
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use App\Models\Setting;
use App\Models\Perfume;
use App\Models\Blog;
use App\Models\Merch;
use App\Models\Dupe;
use App\Models\User;

// =============================================
// PUBLIC ROUTES (no auth needed)
// =============================================

Route::get('/settings', function () {
    return Cache::remember('settings', 3600, function() {
        return Setting::all()->pluck('value', 'key');
    });
});

Route::get('/perfumes', function (Request $request) {
    $q = $request->query('search');
    if ($q) {
        $query = Perfume::with(['dupes' => function($q) {
            $q->select('id', 'perfume_id', 'name', 'brand', 'price', 'image', 'is_active');
        }]);
        $query->select('id', 'name', 'brand', 'image', 'search_count');
        $query->where(function($b) use ($q) {
            $b->where('name', 'like', "%$q%")
              ->orWhere('brand', 'like', "%$q%");
        });
        return $query->get();
    }
    
    return Cache::remember('perfumes_list', 3600, function() {
        $perfumes = Perfume::select('id', 'name', 'brand', 'image', 'search_count')
            ->with(['dupes' => function($q) {
                $q->select('id', 'perfume_id', 'name', 'brand', 'price', 'image', 'is_active');
            }])
            ->get();
        foreach ($perfumes as $p) {
            $p->setRelation('dupes', $p->dupes->sortByDesc(function($dupe) {
                return (int) preg_replace('/[^0-9]/', '', $dupe->price);
            })->values());
        }
        return $perfumes;
    });
});

Route::get('/perfumes/{id}', function ($id) {
    $p = Cache::remember("perfume_{$id}", 3600, function() use ($id) {
        $perfume = Perfume::with('dupes')->findOrFail($id);
        $perfume->setRelation('dupes', $perfume->dupes->sortByDesc(function($dupe) {
            return (int) preg_replace('/[^0-9]/', '', $dupe->price);
        })->values());
        return $perfume;
    });
    $p->increment('search_count');
    return $p;
})->where('id', '[0-9]+');

Route::get('/blogs', function (Request $request) {
    $q = $request->query('search');
    if ($q) {
        return Blog::select('id', 'title', 'image', 'date', 'created_at', 'is_active', DB::raw('LEFT(content, 150) as content'))
            ->orderBy('id', 'desc')
            ->where('title', 'like', "%$q%")
            ->get();
    }
    
    return Cache::remember('blogs_list', 3600, function() {
        return Blog::select('id', 'title', 'image', 'date', 'created_at', 'is_active', 'view_count', DB::raw('LEFT(content, 150) as content'))
            ->orderBy('id', 'desc')
            ->get();
    });
});

Route::get('/blogs/{id}', function ($id) {
    $blog = Cache::remember("blog_{$id}", 3600, function() use ($id) {
        $blog = Blog::findOrFail($id);
        if ($blog->is_active === 0) abort(404);
        return $blog;
    });
    
    // Increment view count (not cached)
    DB::table('blogs')->where('id', $id)->increment('view_count');
    
    return $blog;
})->where('id', '[0-9]+');

Route::get('/merches', function (Request $request) {
    $q = $request->query('search');
    if ($q) {
        return Merch::select('id', 'name', 'price', 'image', 'buy_link', 'is_active')
            ->where('name', 'like', "%$q%")
            ->get();
    }
    
    return Cache::remember('merches_list', 3600, function() {
        return Merch::select('id', 'name', 'price', 'image', 'buy_link', 'is_active')
            ->get();
    });
});

// =============================================
// AUTH ROUTES (login / logout / check)
// =============================================

Route::post('/auth/login', function (Request $request) {
    $request->validate([
        'email' => 'required|email|max:255',
        'password' => 'required|string|min:6',
    ]);

    $user = User::where('email', $request->email)->first();

    if (!$user || !Hash::check($request->password, $user->password)) {
        return response()->json(['error' => 'Invalid email or password'], 401);
    }

    // Generate a cryptographically secure random token
    $rawToken = Str::random(64);

    // Store the SHA-256 hash of the token (never store raw tokens in DB)
    DB::table('admin_tokens')->insert([
        'user_id'    => $user->id,
        'token'      => hash('sha256', $rawToken),
        'expires_at' => now()->addHours(24),
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    // Clean up any expired tokens
    DB::table('admin_tokens')->where('expires_at', '<', now())->delete();

    return response()->json([
        'token' => $rawToken,
        'name'  => $user->name,
        'expires_in' => 86400, // 24 hours in seconds
    ]);
})->middleware('throttle:5,1');

Route::post('/auth/logout', function (Request $request) {
    $token = $request->bearerToken();
    if ($token) {
        DB::table('admin_tokens')
            ->where('token', hash('sha256', $token))
            ->delete();
    }
    return response()->json(['success' => true]);
});

Route::get('/auth/check', function (Request $request) {
    $token = $request->bearerToken();
    if (!$token) return response()->json(['authenticated' => false]);

    $valid = DB::table('admin_tokens')
        ->where('token', hash('sha256', $token))
        ->where('expires_at', '>', now())
        ->exists();

    return response()->json(['authenticated' => $valid]);
});

// =============================================
// PROTECTED ADMIN ROUTES (require valid token)
// =============================================

Route::middleware('admin.auth')->group(function () {

    Route::post('/settings', function (Request $request) {
        foreach ($request->all() as $key => $value) {
            Setting::updateOrCreate(['key' => $key], ['value' => $value]);
        }
        Cache::forget('settings');
        return response()->json(['success' => true]);
    });

    Route::post('/perfumes', function (Request $request) {
        $validated = $request->validate([
            'id' => 'nullable|integer',
            'name' => 'required|string|max:255',
            'brand' => 'required|string|max:255',
            'top_notes' => 'nullable|string|max:255',
            'middle_notes' => 'nullable|string|max:255',
            'base_notes' => 'nullable|string|max:255',
            'notes' => 'required_without_all:top_notes,middle_notes,base_notes|nullable|string',
            'image' => 'nullable|url|max:255',
            'description' => 'nullable|string',
        ]);

        // Validation for duplicate: name and brand
        $query = Perfume::where('name', $validated['name'])->where('brand', $validated['brand']);
        if (isset($validated['id']) && $validated['id']) {
            $query->where('id', '!=', $validated['id']);
        }
        if ($query->exists()) {
            return response()->json(['error' => 'Duplicate Entry: Perfume with name "'. $validated['name'] .'" and brand "'. $validated['brand'] .'" already exists.'], 422);
        }

        Cache::forget('perfumes_list');
        if (isset($validated['id']) && $validated['id']) {
            Cache::forget("perfume_{$validated['id']}");
            $p = Perfume::findOrFail($validated['id']);
            unset($validated['id']);
            $p->update($validated);
            return $p;
        }
        return Perfume::create($validated);
    });

    Route::post('/dupes', function (Request $request) {
        $validated = $request->validate([
            'id' => 'nullable|integer',
            'perfume_id' => 'required|integer|exists:perfumes,id',
            'name' => 'required|string|max:255',
            'brand' => 'required|string|max:255',
            'price' => 'required|string|max:50',
            'image' => 'nullable|url|max:255',
            'buy_link' => 'required|url|max:500',
            'buy_link_indo' => 'nullable|url|max:500',
            'video_1' => 'nullable|url|max:255',
            'video_2' => 'nullable|url|max:255',
            'video_3' => 'nullable|url|max:255',
            'is_active' => 'nullable|integer|in:0,1'
        ]);

        if (isset($validated['id']) && $validated['id']) {
            $d = Dupe::findOrFail($validated['id']);
            $d->update($validated);
            Cache::forget("perfume_{$d->perfume_id}");
            Cache::forget('perfumes_list');
            return $d;
        }
        $d = Dupe::create($validated);
        Cache::forget("perfume_{$validated['perfume_id']}");
        Cache::forget('perfumes_list');
        return $d;
    });




    Route::delete('/dupes/{id}', function ($id) {
        $d = Dupe::find($id);
        if ($d) {
            Cache::forget("perfume_{$d->perfume_id}");
            Cache::forget('perfumes_list');
            $d->delete();
        }
        return response()->json(['success' => true]);
    });


    Route::post('/blogs', function (Request $request) {
        $validated = $request->validate([
            'id' => 'nullable|integer',
            'title' => 'required|string|max:255',
            'image' => 'nullable|url|max:255',
            'content' => 'required|string',
            'date' => 'nullable|date',
            'is_active' => 'nullable|integer|in:0,1'
        ]);

        // Validation for duplicate: title
        $query = Blog::where('title', $validated['title']);
        if (isset($validated['id']) && $validated['id']) {
            $query->where('id', '!=', $validated['id']);
        }
        if ($query->exists()) {
            return response()->json(['error' => 'Duplicate Entry: Blog with title "'. $validated['title'] .'" already exists.'], 422);
        }

        Cache::forget('blogs_list');
        if (isset($validated['id']) && $validated['id']) {
            Cache::forget("blog_{$validated['id']}");
            $b = Blog::findOrFail($validated['id']);
            $b->update($validated);
            return $b;
        }
        if (!isset($validated['date'])) $validated['date'] = now()->toDateString();
        return Blog::create($validated);
    });

    Route::delete('/blogs/{id}', function ($id) {
        Cache::forget('blogs_list');
        Cache::forget("blog_{$id}");
        return Blog::destroy($id);
    });

    Route::post('/merches', function (Request $request) {
        $validated = $request->validate([
            'id' => 'nullable|integer',
            'name' => 'required|string|max:255',
            'price' => 'required|string|max:50',
            'image' => 'required|url|max:255',
            'buy_link' => 'required|url|max:500',
            'is_active' => 'nullable|integer|in:0,1'
        ]);

        // Validation for duplicate: product name
        $query = Merch::where('name', $validated['name']);
        if (isset($validated['id']) && $validated['id']) {
            $query->where('id', '!=', $validated['id']);
        }
        if ($query->exists()) {
            return response()->json(['error' => 'Duplicate Entry: Merch with name "'. $validated['name'] .'" already exists.'], 422);
        }

        Cache::forget('merches_list');
        if (isset($validated['id']) && $validated['id']) {
            $m = Merch::findOrFail($validated['id']);
            $m->update($validated);
            return $m;
        }
        return Merch::create($validated);
    });

    Route::delete('/merches/{id}', function ($id) {
        Cache::forget('merches_list');
        return Merch::destroy($id);
    });
});
