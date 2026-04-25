<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class SecurityHeaders
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Illuminate\Http\Response|\Illuminate\Http\RedirectResponse)  $next
     * @return \Illuminate\Http\Response|\Illuminate\Http\RedirectResponse
     */
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        // Clickjacking protection
        $response->headers->set('X-Frame-Options', 'DENY');
        
        // Prevent MIME sniffing
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        
        // Legacy XSS protection
        $response->headers->set('X-XSS-Protection', '1; mode=block');
        
        // Referrer policy
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');

        // Content Security Policy (Basic)
        // Allowing localhost, CDNs for fonts and icons
        $csp = "default-src 'self'; ";
        $csp .= "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com; ";
        $csp .= "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; ";
        $csp .= "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; ";
        $csp .= "img-src 'self' data: https: http:; "; // Allow images from anywhere for now as they use external URLs
        $csp .= "connect-src 'self'; ";
        $csp .= "frame-src 'self' https://www.youtube.com https://youtube.com;";

        $response->headers->set('Content-Security-Policy', $csp);

        return $response;
    }
}
