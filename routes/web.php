<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use App\Models\Perfume;
use App\Models\Blog;

Route::get('/', function () {
    return view('welcome', [
        'title' => 'Fragzzz - Perfume Dupes & Alternatives',
        'description' => 'Find the best affordable alternatives and dupes for luxury fragrances. Fragzzz helps you smell expensive for less.',
        'image' => asset('favicon.ico')
    ]);
});

Route::get('/sitemap.xml', [App\Http\Controllers\SitemapController::class, 'index']);

// Dynamic SEO metadata for specific pages
Route::get('/{any}', function (Request $request, $any) {
    $title = 'Fragzzz';
    $description = 'Find the best affordable alternatives and dupes for luxury fragrances.';
    $image = asset('favicon.ico');

    if ($any === 'perfume') {
        $id = $request->query('id');
        $p = Perfume::find($id);
        if ($p) {
            $title = $p->name . ' by ' . $p->brand . ' Dupes';
            $description = $p->description ?: "Find affordable alternatives and dupes for {$p->name} by {$p->brand}.";
            $image = $p->image;
        }
    } elseif ($any === 'blog/post') {
        $id = $request->query('id');
        $b = Blog::find($id);
        if ($b) {
            $title = $b->title;
            $description = strip_tags(substr($b->content, 0, 160));
            $image = $b->image;
        }
    } elseif ($any === 'blog') {
        $title = 'Fragrance Blog - Fragzzz';
        $description = 'Read the latest tips, reviews, and guides on fragrance dupes and perfumes.';
    } elseif ($any === 'merch') {
        $title = 'Our Merch - Fragzzz';
        $description = 'Shop official Fragzzz merchandise and support our community.';
    }

    return view('welcome', [
        'title' => $title . ' - Fragzzz',
        'description' => $description,
        'image' => $image
    ]);
})->where('any', '^(?!api|sitemap\.xml).*$');
