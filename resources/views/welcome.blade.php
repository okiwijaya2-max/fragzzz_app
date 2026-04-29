<!DOCTYPE html>
<html lang="en">
<head>
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-Q0M9Z8HL1H"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());

      gtag('config', 'G-Q0M9Z8HL1H');
    </script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $title ?? 'Fragzzz - Perfume Dupes & Alternatives' }}</title>
    <meta name="description" content="{{ $description ?? 'Find the best affordable alternatives and dupes for luxury fragrances. Fragzzz helps you smell expensive for less.' }}">
    <link rel="canonical" href="{{ url()->current() }}">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="{{ url()->current() }}">
    <meta property="og:title" content="{{ $title ?? 'Fragzzz - Perfume Dupes & Alternatives' }}">
    <meta property="og:description" content="{{ $description ?? 'Find the best affordable alternatives and dupes for luxury fragrances. Fragzzz helps you smell expensive for less.' }}">
    <meta property="og:image" content="{{ $image ?? asset('favicon.ico') }}">

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="{{ url()->current() }}">
    <meta property="twitter:title" content="{{ $title ?? 'Fragzzz - Perfume Dupes & Alternatives' }}">
    <meta property="twitter:description" content="{{ $description ?? 'Find the best affordable alternatives and dupes for luxury fragrances. Fragzzz helps you smell expensive for less.' }}">
    <meta property="twitter:image" content="{{ $image ?? asset('favicon.ico') }}">

    <!-- Use Google Fonts (Outfit) -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="{{ asset('styles.css') }}">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    
    <!-- JSON-LD Placeholder -->
    <script type="application/ld+json" id="json-ld-data"></script>
</head>
<body>

    <nav class="navbar border-bottom">
        <div class="nav-brand">
            <a href="/" class="logo">FRAGZZZ</a>
        </div>
        <div class="nav-right">
            <div class="nav-links">
                <a href="/" class="nav-link">Home</a>
                <a href="/blog" class="nav-link">Blog</a>
                <a href="/merch" class="nav-link">Our Merch</a>
            </div>
            <div id="social-icons" class="social-icons">
                <!-- Dynamically filled -->
            </div>
        </div>
    </nav>

    <main id="app-content">
        <!-- Dynamic content injected here -->
    </main>

    <footer class="border-top">
        <p>&copy; 2026 Fragzzz. All rights reserved.</p>
    </footer>

    <script src="{{ asset('app.js') }}"></script>
</body>
</html>
