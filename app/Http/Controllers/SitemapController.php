<?php

namespace App\Http\Controllers;

use App\Models\Perfume;
use App\Models\Blog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;

class SitemapController extends Controller
{
    public function index()
    {
        $perfumes = Perfume::all();
        $blogs = Blog::where('is_active', '!=', 0)->get();

        $xml = '<?xml version="1.0" encoding="UTF-8"?>';
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

        // Home
        $xml .= $this->createUrl('');

        // Blog List
        $xml .= $this->createUrl('/blog');
 
        // Merch
        $xml .= $this->createUrl('/merch');
 
        // Perfumes
        foreach ($perfumes as $perfume) {
            $xml .= $this->createUrl('/perfume?id=' . $perfume->id, $perfume->updated_at);
        }
 
        // Blogs
        foreach ($blogs as $blog) {
            $xml .= $this->createUrl('/blog/post?id=' . $blog->id, $blog->updated_at);
        }

        $xml .= '</urlset>';

        return Response::make($xml, 200, ['Content-Type' => 'text/xml']);
    }

    private function createUrl($path, $lastmod = null)
    {
        $url = url($path);
        $mod = $lastmod ? $lastmod->toAtomString() : now()->toAtomString();
        
        $xml = '<url>';
        $xml .= '<loc>' . htmlspecialchars($url) . '</loc>';
        $xml .= '<lastmod>' . $mod . '</lastmod>';
        $xml .= '<changefreq>weekly</changefreq>';
        $xml .= '<priority>' . ($path === '' ? '1.0' : '0.8') . '</priority>';
        $xml .= '</url>';
        
        return $xml;
    }
}
