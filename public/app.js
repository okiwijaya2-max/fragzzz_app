const API = {
    getToken() {
        return sessionStorage.getItem('admin_token');
    },
    authHeaders() {
        const t = this.getToken();
        const h = { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        if (t) h['Authorization'] = 'Bearer ' + t;
        return h;
    },
    async get(path) {
        const res = await fetch('/api/' + path, { headers: this.authHeaders() });
        return await res.json();
    },
    async post(path, data) {
        const res = await fetch('/api/' + path, {
            method: 'POST',
            headers: this.authHeaders(),
            body: JSON.stringify(data)
        });
        if (res.status === 401) { App.handleUnauthorized(); throw new Error('Unauthorized'); }
        const result = await res.json();
        if (!res.ok) {
            if (result.errors) {
                const msg = Object.values(result.errors).flat().join('\n');
                throw new Error(msg);
            }
            throw new Error(result.error || result.message || 'Something went wrong');
        }
        return result;
    },
    async del(path) {
        const res = await fetch('/api/' + path, {
            method: 'DELETE',
            headers: this.authHeaders()
        });
        if (res.status === 401) { App.handleUnauthorized(); throw new Error('Unauthorized'); }
        return await res.json();
    },
    async download(path, filename) {
        const res = await fetch('/api/' + path, { headers: this.authHeaders() });
        if (res.status === 401) { App.handleUnauthorized(); throw new Error('Unauthorized'); }
        if (!res.ok) {
            const text = await res.text();
            alert('Download failed: ' + (text.includes('NotFound') ? 'Route not found' : 'Server error'));
            return;
        }
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
    }
};

const App = {
    contentDiv: document.getElementById('app-content'),

    async init() {
        window.addEventListener('popstate', this.router.bind(this));
        
        // Intercept internal links
        document.addEventListener('click', e => {
            const a = e.target.closest('a');
            if (a && a.href && a.href.startsWith(window.location.origin) && !a.target && !a.hasAttribute('download')) {
                const url = new URL(a.href);
                if (url.pathname.startsWith('/api') || url.pathname.endsWith('.xml')) return;
                
                e.preventDefault();
                window.history.pushState({}, '', a.href);
                this.router();
            }
        });

        await this.loadGlobalSettings();
        this.router();
    },

    async loadGlobalSettings() {
        const settings = await API.get('settings');
        window.__SETTINGS__ = settings;
        this.renderSocialIcons(settings);
    },

    renderSocialIcons(settings) {
        const container = document.getElementById('social-icons');
        if(!container) return;
        let html = '';
        if(settings.tiktok_link) html += `<a href="${settings.tiktok_link}" target="_blank" style="color: #000;"><i class="fab fa-tiktok"></i></a>`;
        if(settings.instagram_link) html += `<a href="${settings.instagram_link}" target="_blank" style="color: #000;"><i class="fab fa-instagram"></i></a>`;
        if(settings.facebook_link) html += `<a href="${settings.facebook_link}" target="_blank" style="color: #000;"><i class="fab fa-facebook"></i></a>`;
        container.innerHTML = html;
    },

    async router() {
        window.scrollTo(0, 0);
        const path = window.location.pathname;
        const params = new URLSearchParams(window.location.search);

        // Show generic skeleton loader while fetching
        this.contentDiv.innerHTML = `
            <div style="padding: 20px;">
                <div class="skeleton skeleton-title"></div>
                <div class="grid">
                    <div class="card"><div class="skeleton skeleton-img"></div><div class="skeleton skeleton-text"></div></div>
                    <div class="card"><div class="skeleton skeleton-img"></div><div class="skeleton skeleton-text"></div></div>
                    <div class="card"><div class="skeleton skeleton-img"></div><div class="skeleton skeleton-text"></div></div>
                </div>
            </div>
        `;

        if (path === '/' || path === '/index.html') await this.renderHome();
        else if (path === '/search') await this.renderSearch(params.get('q'));
        else if (path === '/perfume') await this.renderPerfume(params.get('id'));
        else if (path === '/blog') await this.renderBlogList();
        else if (path === '/blog/post') await this.renderBlogPost(params.get('id'));
        else if (path === '/merch') await this.renderMerch();
        else if (path === '/hany4dmin') await this.renderAdmin();
        else this.renderNotFound();
    },

    updateMetadata(title, description, image = '') {
        document.title = title ? `${title} - Fragzzz` : 'Fragzzz - Perfume Dupes & Alternatives';
        
        const descriptionTag = document.querySelector('meta[name="description"]');
        if (descriptionTag) descriptionTag.setAttribute('content', description || '');

        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.setAttribute('content', title || document.title);

        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.setAttribute('content', description || '');

        if (image) {
            const ogImage = document.querySelector('meta[property="og:image"]');
            if (ogImage) ogImage.setAttribute('content', image);
        }

        const canonical = document.querySelector('link[rel="canonical"]');
        if (canonical) canonical.setAttribute('href', window.location.origin + window.location.pathname);
    },

    injectJSONLD(data) {
        const script = document.getElementById('json-ld-data');
        if (script) {
            script.textContent = JSON.stringify(data);
        }
    },

    escapeHTML(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    // --- PUBLIC PAGES ---

    async renderHome() {
        const settings = await API.get('settings');
        let perfumes = await API.get('perfumes');
        
        // Sort by search count desc
        perfumes.sort((a, b) => (b.search_count || 0) - (a.search_count || 0));
        const count = parseInt(settings.mostSearchedCount) || 5;
        const topPerfumes = perfumes.slice(0, count);

        let topHTML = topPerfumes.map(p => `
            <div class="card" style="padding: 15px; display: flex; flex-direction: column;">
                <div style="height: 200px; width: 100%; border: 3px solid #000; border-radius: 8px; overflow: hidden; margin-bottom: 10px; background: #fff;">
                    <img src="${p.image || 'https://via.placeholder.com/300'}" style="width: 100%; height: 100%; object-fit: contain;" alt="${p.name} bottle" loading="lazy">
                </div>
                <h3 style="font-size: 1.1rem;">${this.escapeHTML(p.name)}</h3>
                <p style="font-size: 0.9rem;">by <a href="/search?q=${encodeURIComponent(p.brand)}" style="color: inherit; text-decoration: underline; font-weight: 700;">${this.escapeHTML(p.brand)}</a></p>
                <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 5px;">
                    <span class="badge" style="text-align: center;">🔥 ${p.search_count || 0} Searches</span>
                    <a href="/perfume?id=${p.id}" class="btn btn-secondary" style="padding: 5px 10px; font-size: 0.8rem; text-align: center;">Find Dupes</a>
                </div>
            </div>
        `).join('');

        this.contentDiv.innerHTML = `
            <div class="hero">
                <h1 style="background: var(--secondary-color); display: inline-block; padding: 10px 20px; border: var(--border-width) solid var(--border-color); box-shadow: var(--shadow-solid);">Smell Expensive. Pay Less.</h1>
                <p style="margin-top: 20px; font-weight: 600;">Find perfect dupes for your favorite luxury fragrances.</p>
                <form class="search-bar" onsubmit="event.preventDefault(); window.history.pushState({}, '', '/search?q=' + encodeURIComponent(this.q.value)); App.router();">
                    <input type="text" name="q" placeholder="Type a perfume or brand name (e.g. Baccarat Rouge)..." required>
                    <button type="submit" class="btn btn-primary">Search</button>
                </form>
            </div>

            <div style="margin-top: 40px;">
                <h2 style="margin-bottom: 20px; border-bottom: 3px solid var(--border-color); padding-bottom: 10px; display: inline-block;">🔥 Most Searched Perfumes</h2>
                <div class="grid-5">
                    ${topHTML}
                </div>
            </div>
        `;

        this.updateMetadata('Fragzzz', 'Find the best affordable alternatives and dupes for luxury fragrances. Fragzzz helps you smell expensive for less.');
        this.injectJSONLD({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "Fragzzz",
            "url": window.location.origin
        });
    },

    async renderSearch(query) {
        if (!query) return this.renderHome();

        let perfumes = await API.get('perfumes');
        const q = query.toLowerCase();
        const results = perfumes.filter(p => 
            p.name.toLowerCase().includes(q) || 
            p.brand.toLowerCase().includes(q)
        );

        let resultsHTML = '';
        if (results.length === 0) {
            resultsHTML = `<div class="card"><p>No results found for "${query}". Please try another name.</p></div>`;
        } else {
            resultsHTML = `<div class="grid">` + results.map(p => `
                <div class="card" style="display: flex; flex-direction: column;">
                    <div style="height: 300px; width: 100%; border: 3px solid #000; border-radius: 8px; overflow: hidden; margin-bottom: 15px; background: #fff;">
                        <img src="${p.image || 'https://via.placeholder.com/300'}" style="width: 100%; height: 100%; object-fit: contain;" alt="${p.name}" loading="lazy">
                    </div>
                    <h3>${this.escapeHTML(p.name)}</h3>
                    <p>by <a href="/search?q=${encodeURIComponent(p.brand)}" style="color: inherit; text-decoration: underline; font-weight: 700;">${this.escapeHTML(p.brand)}</a></p>
                    <div style="margin-top: 15px;">
                        <a href="/perfume?id=${p.id}" class="btn btn-primary" style="width: 100%;">View ${p.dupes && p.dupes.length ? p.dupes.length : 0} Dupes</a>
                    </div>
                </div>
            `).join('') + `</div>`;
        }

        this.contentDiv.innerHTML = `
            <a href="/" class="btn mb-4" style="padding: 5px 15px; font-size: 0.8rem;">&larr; Back Home</a>
            <h2 class="mb-4">Search Results for: <em>${query}</em></h2>
            ${resultsHTML}
        `;

        this.updateMetadata(`Search: ${query}`, `Showing results for fragrance dupes matching "${query}"`);
    },

    async renderPerfume(id) {
        // Now API increases the search count automatically when viewing!
        let perfume;
        try {
            perfume = await API.get('perfumes/' + id);
        } catch(e) {
            return this.renderNotFound();
        }

        if(!perfume || perfume.message) return this.renderNotFound();

        let dupesHTML = '<p>No dupes found for this perfume yet.</p>';
        if (perfume.dupes && perfume.dupes.length > 0) {
            dupesHTML = perfume.dupes.filter(d => d.is_active !== 0).map(d => {
                const extractId = (url) => { const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/); return m ? m[1] : null; };
                const vid1Id = d.video_1 ? extractId(d.video_1) : null;
                const vid2Id = d.video_2 ? extractId(d.video_2) : null;
                const vid3Id = d.video_3 ? extractId(d.video_3) : null;
                const vid1 = vid1Id ? `<iframe width="100%" height="200" src="https://www.youtube.com/embed/${vid1Id}" frameborder="0" allowfullscreen style="border-radius:4px; border: 2px solid #000; margin-top: 10px;"></iframe>` : '';
                const vid2 = vid2Id ? `<iframe width="100%" height="200" src="https://www.youtube.com/embed/${vid2Id}" frameborder="0" allowfullscreen style="border-radius:4px; border: 2px solid #000; margin-top: 10px;"></iframe>` : '';
                const vid3 = vid3Id ? `<iframe width="100%" height="200" src="https://www.youtube.com/embed/${vid3Id}" frameborder="0" allowfullscreen style="border-radius:4px; border: 2px solid #000; margin-top: 10px;"></iframe>` : '';
                return `
                <div class="dupe-item" style="border: var(--border-width) solid #000; padding: 20px; margin-bottom: 25px; background: #fff; box-shadow: var(--shadow-solid); border-radius: 8px; display: block;">
                    <div class="dupe-item-content">
                        <!-- LEFT SIDE: Image + Name + Brand -->
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            ${d.image ? `<div style="width: 120px; height: 120px; border: 2px solid #000; border-radius: 8px; overflow: hidden; background: #fff; padding: 5px;"><img src="${d.image}" style="width: 100%; height: 100%; object-fit: contain;" loading="lazy"></div>` : ''}
                            <div>
                                <h4 style="font-size: 1.4rem; font-weight: 900; margin: 0;">${this.escapeHTML(d.name)}</h4>
                                <p style="font-size: 1rem; opacity: 0.8; margin-top: 5px;">by ${this.escapeHTML(d.brand)}</p>
                            </div>
                        </div>
                        
                        <!-- RIGHT SIDE: Price + Buttons (Stacked Vertically) -->
                        <div class="dupe-item-actions">
                            <div style="font-size: 1.6rem; font-weight: 900; color: #00BFA5; line-height: 1; margin-bottom: 5px;">${d.price}</div>
                            ${d.buy_link ? `<a href="${d.buy_link}" target="_blank" class="btn btn-primary" style="width: 100%; padding: 8px 12px; font-size: 0.8rem;">BUY NOW (GLOBAL)</a>` : ''}
                            ${d.buy_link_indo ? `<a href="${d.buy_link_indo}" target="_blank" class="btn" style="background:#e04f5f; color:#fff; width: 100%; padding: 8px 12px; font-size: 0.8rem;">BUY NOW (INDONESIA)</a>` : ''}
                        </div>
                    </div>
                    ${(vid1 || vid2 || vid3) ? `
                    <div style="margin-top:20px; display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:15px;">
                        ${vid1}${vid2}${vid3}
                    </div>` : ''}
                </div>
            `}).join('');
        }

        this.contentDiv.innerHTML = `
            <a href="/" class="btn mb-4" style="padding: 5px 15px; font-size: 0.8rem;">&larr; Back Home</a>
            <div class="perfume-detail-layout">
                <div style="flex: 1; min-width: 300px;">
                    <div style="width: 100%; height: 500px; border: 3px solid #000; border-radius: 8px; overflow: hidden; background: #fff;">
                        <img src="${perfume.image || 'https://via.placeholder.com/300'}" style="width: 100%; height: 100%; object-fit: contain;" alt="${perfume.name} fragrance bottle" loading="lazy">
                    </div>
                </div>
                <div style="flex: 2; min-width: 300px;">
                    <h1 style="font-size: 3rem; margin-top: 10px; line-height: 1;">${this.escapeHTML(perfume.name)}</h1>
                    <h2 style="margin-bottom: 20px;">by <a href="/search?q=${encodeURIComponent(perfume.brand)}" style="color: inherit; text-decoration: underline;">${this.escapeHTML(perfume.brand)}</a></h2>
                    ${(perfume.top_notes || perfume.middle_notes || perfume.base_notes) ? `
                        <div style="margin-bottom: 20px;">
                            <span class="badge" style="background-color: #000; color: var(--white); margin-bottom: 10px; display: inline-block;">NOTES</span>
                            <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 5px;">
                                ${perfume.top_notes ? `<div><span class="badge" style="background: var(--white); border: 2px solid #000; color: #000; border-radius: 4px; padding: 3px 8px;">Top</span> <strong style="margin-left: 5px;">${this.escapeHTML(perfume.top_notes)}</strong></div>` : ''}
                                ${perfume.middle_notes ? `<div><span class="badge" style="background: var(--white); border: 2px solid #000; color: #000; border-radius: 4px; padding: 3px 8px;">Middle</span> <strong style="margin-left: 5px;">${this.escapeHTML(perfume.middle_notes)}</strong></div>` : ''}
                                ${perfume.base_notes ? `<div><span class="badge" style="background: var(--white); border: 2px solid #000; color: #000; border-radius: 4px; padding: 3px 8px;">Base</span> <strong style="margin-left: 5px;">${this.escapeHTML(perfume.base_notes)}</strong></div>` : ''}
                            </div>
                        </div>
                    ` : (perfume.notes ? `
                        <div style="margin-bottom: 20px;">
                            <span class="badge" style="background-color: #000; color: var(--white); margin-bottom: 10px; display: inline-block;">NOTES</span>
                            <div style="margin-top: 5px;">
                                <strong>${perfume.notes}</strong>
                            </div>
                        </div>
                    ` : '')}
                    <p style="font-size: 1.1rem; margin-bottom: 30px; margin-top:15px;">${perfume.description || ''}</p>
                    
                    <h3 style="background-color: var(--secondary-color); display: inline-block; padding: 5px 10px; border: var(--border-width) solid var(--border-color); border-radius: 4px;">Best Alternatives</h3>
                    <div class="dupe-list mt-4">
                        ${dupesHTML}
                    </div>
                    <div style="margin-top:40px; font-size:0.85rem; font-style:italic; opacity:0.8; padding:15px; background:var(--white); border:2px solid #ccc; border-radius:4px;">
                        <strong>Disclaimer:</strong> This information is based on personal experience and external sources. Since scents are personal, please let your own nose be the final judge. <br><br> The prices displayed are subject to change at any time in accordance with the policies and availability of each store/seller. We do not guarantee real-time price accuracy.
                    </div>
                </div>
            </div>
        `;

        this.updateMetadata(`${perfume.name} by ${perfume.brand} Dupes`, perfume.description || `Find affordable alternatives and dupes for ${perfume.name} by ${perfume.brand}.`, perfume.image);
        this.injectJSONLD({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": perfume.name,
            "brand": { "@type": "Brand", "name": perfume.brand },
            "description": perfume.description,
            "image": perfume.image
        });
    },

    async renderBlogList() {
        let blogs = await API.get('blogs');
        blogs = blogs.filter(b => b.is_active !== 0);
        let html = blogs.map(b => `
            <div class="card" style="background-color: var(--secondary-color); display: flex; flex-direction: column;">
                ${b.image ? `<div style="height: 250px; width: 100%; border: 3px solid #000; border-radius: 8px; overflow: hidden; margin-bottom: 15px; background: #fff;">
                    <img src="${b.image}" style="width: 100%; height: 100%; object-fit: contain;" alt="Blog Image" loading="lazy">
                </div>` : ''}
                <h2><a href="/blog/post?id=${b.id}">${this.escapeHTML(b.title)}</a></h2>
                <p style="font-size: 0.8rem; font-weight: 600; margin-bottom: 10px;">${b.date || b.created_at.split('T')[0]}</p>
                <p>${this.escapeHTML(b.content || '').substring(0, 100)}...</p>
                <a href="/blog/post?id=${b.id}" class="btn" style="margin-top: 15px; background: var(--white);">Read More</a>
            </div>
        `).join('');

        if(blogs.length === 0) {
            html = '<p>No blog posts found.</p>';
        }

        this.contentDiv.innerHTML = `
            <h1 class="mb-4" style="font-size: 3rem; text-shadow: 2px 2px 0px var(--primary-color);">Fragzzz Blog</h1>
            <div class="grid">
                ${html}
            </div>
        `;

        this.updateMetadata('Fragrance Blog', 'Read the latest tips, reviews, and guides on fragrance dupes and perfumes.');
    },

    async renderBlogPost(id) {
        let blog, allBlogs;
        try {
            [blog, allBlogs] = await Promise.all([
                API.get('blogs/' + id),
                API.get('blogs')
            ]);
        } catch(e) {
            return this.renderNotFound();
        }

        if(!blog || blog.message) return this.renderNotFound();

        // Prepare widgets data
        const activeBlogs = allBlogs.filter(b => b.is_active !== 0 && b.id != id);
        
        // Latest posts (sorted by date or id desc)
        const latestPosts = [...activeBlogs].sort((a, b) => b.id - a.id).slice(0, 5);
        
        // Most read posts (sorted by view_count desc)
        const mostReadPosts = [...activeBlogs].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 5);

        const renderWidgetPosts = (posts) => {
            return posts.map(b => `
                <a href="/blog/post?id=${b.id}" class="widget-post">
                    <img src="${b.image || 'https://via.placeholder.com/100'}" class="widget-post-img" alt="${b.title}">
                    <div class="widget-post-info">
                        <h4>${b.title}</h4>
                        <p>${b.date || b.created_at.split('T')[0]}</p>
                    </div>
                </a>
            `).join('');
        };

        this.contentDiv.innerHTML = `
            <div class="blog-container">
                <div class="blog-main">
                    <article class="card" style="padding: 40px;">
                        ${blog.image ? `<div style="width: 100%; height: auto; max-height: 600px; border: 3px solid #000; border-radius: 8px; overflow: hidden; margin-bottom: 20px; background: #fff;">
                            <img src="${blog.image}" style="width: 100%; height: auto; max-height: 600px; object-fit: contain;" alt="${blog.title}">
                        </div>` : ''}
                        <h1 style="font-size: 2.5rem; margin-bottom: 10px;">${blog.title}</h1>
                        <p style="font-weight: 600; font-size: 0.9rem; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 10px;">Published: ${blog.date || blog.created_at.split('T')[0]}</p>
                        <div class="blog-content" style="font-size: 1.1rem; line-height: 1.8; white-space: pre-wrap;">${blog.content}</div>
                        <a href="/blog" class="btn btn-secondary mt-4">Back to Blog</a>
                    </article>
                </div>
                
                <aside class="blog-sidebar">
                    <div class="widget">
                        <span class="widget-title">Most Read</span>
                        <div class="widget-list">
                            ${renderWidgetPosts(mostReadPosts)}
                        </div>
                    </div>
                    
                    <div class="widget">
                        <span class="widget-title">Latest Posts</span>
                        <div class="widget-list">
                            ${renderWidgetPosts(latestPosts)}
                        </div>
                    </div>
                </aside>
            </div>
        `;

        this.updateMetadata(blog.title, blog.content.substring(0, 160), blog.image);
        this.injectJSONLD({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": blog.title,
            "image": blog.image,
            "datePublished": blog.date || blog.created_at,
            "author": { "@type": "Organization", "name": "Fragzzz" }
        });
    },

    async renderMerch() {
        let merches = await API.get('merches');
        merches = merches.filter(m => m.is_active !== 0);
        let html = merches.map(m => `
            <div class="card" style="display: flex; flex-direction: column;">
                <div style="height: 250px; width: 100%; border: 3px solid #000; border-radius: 8px; overflow: hidden; margin-bottom: 15px; background: #fff;">
                    <img src="${m.image}" style="width: 100%; height: 100%; object-fit: cover;" alt="${m.name}" loading="lazy">
                </div>
                <h3 style="font-size: 1.5rem; margin-bottom: 10px;">${m.name}</h3>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 1.5rem; font-weight: 900;">${m.price}</span>
                    <a href="${m.buy_link || m.buyLink}" target="_blank" class="btn btn-primary" style="background-color: var(--tertiary-color); color: #fff;">Buy Now</a>
                </div>
            </div>
        `).join('');

        if(merches.length === 0) {
            html = '<p>No merch available yet.</p>';
        }

        this.contentDiv.innerHTML = `
            <div style="text-align: center; margin-bottom: 40px;">
                <h1 style="font-size: 3rem; text-shadow: 2px 2px 0px var(--tertiary-color);">Our Merch</h1>
                <p style="font-weight: 600; font-size: 1.2rem;">Support Fragzzz by getting some fresh gear.</p>
            </div>
            <div class="grid">
                ${html}
            </div>
        `;

        this.updateMetadata('Our Merch', 'Shop official Fragzzz merchandise and support our community.');
    },

    // --- ADMIN PAGES ---

    handleUnauthorized() {
        sessionStorage.removeItem('admin_token');
        sessionStorage.removeItem('admin_name');
        window.history.pushState({}, '', '/hany4dmin');
        this.router();
    },

    async renderAdmin() {
        const token = API.getToken();

        // If we have a token, verify it's still valid
        if (token) {
            try {
                const check = await API.get('auth/check');
                if (!check.authenticated) {
                    sessionStorage.removeItem('admin_token');
                    sessionStorage.removeItem('admin_name');
                    return this.renderLoginForm();
                }
            } catch(e) {
                return this.renderLoginForm();
            }
            return this.renderAdminDashboard();
        }

        this.renderLoginForm();
    },

    renderLoginForm(error = '') {
        this.contentDiv.innerHTML = `
            <div style="max-width: 420px; margin: 80px auto;">
                <div class="card" style="padding: 40px; text-align: center;">
                    <h1 style="font-size: 2.5rem; margin-bottom: 5px;">FRAGZZZ</h1>
                    <p style="font-weight: 600; margin-bottom: 30px; color: #666;">Admin Login</p>
                    ${error ? `<div style="background: #ffe0e0; color: #c00; padding: 10px; border-radius: 4px; border: 2px solid #c00; margin-bottom: 15px; font-weight: 600;">${error}</div>` : ''}
                    <form onsubmit="App.handleLogin(event)">
                        <div style="text-align: left; margin-bottom: 15px;">
                            <label style="font-weight: 700; display: block; margin-bottom: 5px;">Email</label>
                            <input type="email" name="email" required style="width: 100%; padding: 12px; border: 2px solid #000; border-radius: 4px; font-size: 1rem; box-sizing: border-box;" placeholder="admin@fragzzz.com">
                        </div>
                        <div style="text-align: left; margin-bottom: 25px;">
                            <label style="font-weight: 700; display: block; margin-bottom: 5px;">Password</label>
                            <input type="password" name="password" required minlength="6" style="width: 100%; padding: 12px; border: 2px solid #000; border-radius: 4px; font-size: 1rem; box-sizing: border-box;" placeholder="••••••••">
                        </div>
                        <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px; font-size: 1.1rem;" id="loginBtn">Log In</button>
                    </form>
                </div>
                <p style="text-align: center; margin-top: 20px; font-size: 0.85rem; color: #999;"><a href="/" style="color: #000;">&larr; Back to site</a></p>
            </div>
        `;
    },

    async handleLogin(e) {
        e.preventDefault();
        const form = e.target;
        const btn = document.getElementById('loginBtn');
        btn.disabled = true;
        btn.textContent = 'Logging in...';

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: form.email.value,
                    password: form.password.value
                })
            });
            const data = await res.json();

            if (!res.ok || data.error) {
                this.renderLoginForm(data.error || 'Login failed. Please try again.');
                return;
            }

            sessionStorage.setItem('admin_token', data.token);
            sessionStorage.setItem('admin_name', data.name);
            this.renderAdminDashboard();
        } catch(err) {
            this.renderLoginForm('Network error. Please check your connection.');
        }
    },

    async adminLogout() {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: API.authHeaders()
            });
        } catch(e) {}
        sessionStorage.removeItem('admin_token');
        sessionStorage.removeItem('admin_name');
        this.renderLoginForm();
    },

    async renderAdminDashboard() {
        const adminName = sessionStorage.getItem('admin_name') || 'Admin';
        this.contentDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 20px;">
                <h1 style="background: var(--tertiary-color); display: inline-block; padding: 10px 20px; color: white; border: var(--border-width) solid var(--border-color); box-shadow: var(--shadow-solid);">Admin Dashboard</h1>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <span style="font-weight: 700;">👋 ${adminName}</span>
                    <button class="btn" style="padding: 8px 15px; font-size: 0.85rem; background: #333; color: #fff;" onclick="App.adminLogout()">Logout</button>
                </div>
            </div>
            <div class="admin-layout">
                <div class="admin-sidebar card">
                    <button class="tab active" onclick="App.switchAdminTab('perfumes', this)">Perfumes</button>
                    <button class="tab" onclick="App.switchAdminTab('blog', this)">Blog</button>
                    <button class="tab" onclick="App.switchAdminTab('merch', this)">Merch</button>
                    <button class="tab" onclick="App.switchAdminTab('settings', this)">Settings</button>
                </div>
                <div class="admin-main card" id="admin-view-container">
                    <div style="text-align:center; padding: 50px;">Loading...</div>
                </div>
            </div>
        `;
        await this.switchAdminTab('perfumes', document.querySelector('.admin-sidebar .tab.active'));
    },

    async switchAdminTab(tab, btnEle) {
        document.querySelectorAll('.admin-sidebar .tab').forEach(el => el.classList.remove('active'));
        if(btnEle) btnEle.classList.add('active');

        const container = document.getElementById('admin-view-container');
        if(!container) return;
        
        container.innerHTML = '<div style="text-align:center; padding: 50px;">Loading...</div>';

        if (tab === 'perfumes') await this.renderAdminPerfumes(container);
        else if (tab === 'blog') await this.renderAdminBlog(container);
        else if (tab === 'merch') await this.renderAdminMerch(container);
        else if (tab === 'settings') await this.renderAdminSettings(container);
    },

    searchTimeout: null,
    handleAdminSearch(tab, value) {
        if (this.searchTimeout) clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(async () => {
            const container = document.getElementById('admin-view-container');
            if (tab === 'perfumes') await this.renderAdminPerfumes(container, value);
            else if (tab === 'blog') await this.renderAdminBlog(container, value);
            else if (tab === 'merch') await this.renderAdminMerch(container, value);
        }, 500);
    },

    // Admin: Perfumes
    async renderAdminPerfumes(container, search = '') {
        const path = 'perfumes' + (search ? '?search=' + encodeURIComponent(search) : '');
        let perfumes = await API.get(path);
        
        // Expose globally for synchronous edits via onclick handlers
        window.__PERFUMES__ = perfumes;
        
        let listHTML = perfumes.map(p => `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px dashed #000; padding: 10px 0;">
                <div>
                    <strong>${p.name}</strong> by ${p.brand} 
                    <span class="badge" style="margin-left: 10px;">${p.dupes && p.dupes.length ? p.dupes.length : 0} Dupes</span>
                    <span style="margin-left: 10px; font-size: 0.8rem;">👀 ${p.search_count || 0}</span>
                </div>
                <button class="btn btn-secondary" style="padding: 5px 10px; font-size: 0.8rem;" onclick="App.editPerfume('${p.id}')">Edit</button>
            </div>
        `).join('');

        if (perfumes.length === 0) listHTML = `<p>${search ? 'No perfumes match your search.' : 'No perfumes in database.'}</p>`;

        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap:10px;">
                <h2>Manage Perfumes</h2>
                <div style="display:flex; gap:10px; flex:1; justify-content: flex-end; min-width: 300px; align-items: center;">
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap:10px;">
                <div style="display:flex; gap:10px; flex:1; justify-content: flex-end; min-width: 300px;">
                    <input type="text" placeholder="Search perfume or brand..." value="${search}" oninput="App.handleAdminSearch('perfumes', this.value)" style="margin-bottom:0; padding: 8px 12px; font-size: 0.9rem; max-width: 300px;">
                    <button class="btn btn-primary" style="padding: 8px 15px; font-size: 0.9rem;" onclick="App.showAddPerfumeForm()">+ Add Perfume</button>
                </div>
            </div>
            <div id="perfume-list">${listHTML}</div>
            <div id="perfume-form-container" class="hidden mt-4 admin-form border" style="background:#fff; box-shadow: none;"></div>
        `;
    },

    showAddPerfumeForm(perfume = null) {
        const container = document.getElementById('perfume-form-container');
        container.classList.remove('hidden');
        document.getElementById('perfume-list').classList.add('hidden');
        
        const isEdit = !!perfume;
        
        container.innerHTML = `
            <h3>${isEdit ? 'Edit Perfume' : 'Add New Perfume'}</h3>
            <form onsubmit="App.savePerfume(event, ${isEdit ? perfume.id : 'null'})">
                <label>Name</label><input type="text" name="name" value="${isEdit ? perfume.name : ''}" required>
                <label>Brand</label><input type="text" name="brand" value="${isEdit ? perfume.brand : ''}" required>
                <label>Top Notes</label><input type="text" name="top_notes" value="${isEdit ? (perfume.top_notes||'') : ''}">
                <label>Middle Notes</label><input type="text" name="middle_notes" value="${isEdit ? (perfume.middle_notes||'') : ''}">
                <label>Base Notes</label><input type="text" name="base_notes" value="${isEdit ? (perfume.base_notes||'') : ''}">
                <label>Notes (Required if Top/Mid/Base empty)</label><input type="text" name="notes" value="${isEdit ? (perfume.notes||'') : ''}">
                <label>Image URL</label><input type="url" name="image" value="${isEdit ? perfume.image : ''}">
                <label>Description</label><textarea name="description">${isEdit ? (perfume.description||'') : ''}</textarea>
                
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Save'}</button>
                    ${isEdit ? `<button type="button" class="btn btn-secondary" style="background: var(--tertiary-color); color: #fff;" onclick="App.showAddDupeForm('${perfume.id}')">+ Add Dupe</button>` : ''}
                    <button type="button" class="btn" onclick="App.switchAdminTab('perfumes')">Back</button>
                </div>
            </form>
            
            ${isEdit && perfume.dupes && perfume.dupes.length > 0 ? `
                <h4 style="margin-top: 30px; margin-bottom: 10px;">Existing Dupes</h4>
                ${perfume.dupes.map(d => `
                    <div style="border: 2px dashed #000; padding: 10px; margin-bottom: 10px; display:flex; justify-content: space-between; align-items:center; flex-wrap: wrap; gap: 10px;">
                        <div>
                            <strong>${d.name}</strong> by ${d.brand} - ${d.price}
                            <span class="badge" style="margin-left:10px; background:${d.is_active !== 0 ? 'var(--tertiary-color)' : '#ccc'}">${d.is_active !== 0 ? 'Active' : 'Inactive'}</span>
                        </div>
                        <div style="margin-top: 5px;">
                            <button type="button" class="btn" style="padding: 5px; font-size:0.8rem;" onclick="App.toggleDupeActive(${d.id}, ${d.is_active}, ${perfume.id})">${d.is_active !== 0 ? 'Deactivate' : 'Activate'}</button>
                            <button type="button" class="btn btn-secondary" style="padding: 5px; font-size:0.8rem;" onclick="App.editDupe(${d.id}, ${perfume.id})">Edit</button>
                            <button type="button" class="btn btn-primary" style="padding: 5px; font-size:0.8rem;" onclick="App.deleteDupe(${d.id}, ${perfume.id})">Delete</button>
                        </div>
                    </div>
                `).join('')}
            ` : ''}

            <div id="dupe-form-container" class="hidden mt-4 border admin-form" style="padding: 15px; background: #fdfdfd; box-shadow:none;"></div>
        `;
    },

    async editPerfume(id) {
        try {
            const p = await API.get('perfumes/' + id);
            if(p) this.showAddPerfumeForm(p);
        } catch (err) {
            alert('Error loading perfume details: ' + err.message);
        }
    },

    async savePerfume(e, id) {
        e.preventDefault();
        const form = e.target;
        const data = {
            name: form.name.value,
            brand: form.brand.value,
            top_notes: form.top_notes.value,
            middle_notes: form.middle_notes.value,
            base_notes: form.base_notes.value,
            notes: form.notes.value,
            image: form.image.value,
            description: form.description.value
        };
        if(id) data.id = id;
        
        try {
            await API.post('perfumes', data);
            await this.switchAdminTab('perfumes');
        } catch (err) {
            alert(err.message);
        }
    },


    showAddDupeForm(perfumeId, dupe = null) {
        const container = document.getElementById('dupe-form-container');
        container.classList.remove('hidden');
        const isEdit = !!dupe;
        container.innerHTML = `
            <h4>${isEdit ? 'Edit Dupe' : 'Add New Dupe'}</h4>
            <form onsubmit="App.saveDupe(event, ${perfumeId}, ${isEdit ? dupe.id : 'null'})">
                <label>Dupe Name</label><input type="text" name="name" value="${isEdit ? dupe.name : ''}" required>
                <label>Brand</label><input type="text" name="brand" value="${isEdit ? dupe.brand : ''}" required>
                <label>Price</label><input type="text" name="price" value="${isEdit ? dupe.price : ''}" placeholder="e.g. $45" required>
                <label>Image URL</label><input type="url" name="image" value="${isEdit ? (dupe.image||'') : ''}">
                <label>Buy Link (Global)</label><input type="url" name="buyLink" value="${isEdit ? dupe.buy_link : ''}" required>
                <label>Buy Link (Indonesia)</label><input type="url" name="buyLinkIndo" value="${isEdit ? (dupe.buy_link_indo||'') : ''}">
                <label>Video 1 URL (YouTube)</label><input type="url" name="video1" value="${isEdit ? (dupe.video_1||'') : ''}">
                <label>Video 2 URL (YouTube)</label><input type="url" name="video2" value="${isEdit ? (dupe.video_2||'') : ''}">
                <label>Video 3 URL (YouTube)</label><input type="url" name="video3" value="${isEdit ? (dupe.video_3||'') : ''}">
                
                <div style="margin-top: 15px; display: flex; gap: 10px;">
                    <button type="submit" class="btn btn-secondary">${isEdit ? 'Update Dupe' : 'Save Dupe'}</button>
                    <button type="button" class="btn" onclick="document.getElementById('dupe-form-container').classList.add('hidden')">Cancel</button>
                </div>
            </form>
        `;
    },


    async saveDupe(e, perfumeId, id) {
        e.preventDefault();
        const form = e.target;
        const data = {
            perfume_id: perfumeId,
            name: form.name.value,
            brand: form.brand.value,
            price: form.price.value,
            image: form.image.value,
            buy_link: form.buyLink.value,
            buy_link_indo: form.buyLinkIndo.value,
            video_1: form.video1.value,
            video_2: form.video2.value,
            video_3: form.video3.value
        };
        if(id) data.id = id;
        try {
            await API.post('dupes', data);
            window.__PERFUMES__ = await API.get('perfumes');
            App.editPerfume(perfumeId);
        } catch (err) {
            alert(err.message);
        }
    },

    editDupe(dupeId, perfumeId) {
        const perfumes = window.__PERFUMES__ || [];
        const p = perfumes.find(p => p.id == perfumeId);
        if(!p || !p.dupes) return;
        const d = p.dupes.find(d => d.id == dupeId);
        if(d) this.showAddDupeForm(perfumeId, d);
    },

    async deleteDupe(dupeId, perfumeId) {
        if(!confirm('Are you sure you want to delete this dupe?')) return;
        await API.del('dupes/' + dupeId);
        window.__PERFUMES__ = await API.get('perfumes');
        App.editPerfume(perfumeId);
    },

    async toggleDupeActive(dupeId, currentStatus, perfumeId) {
        const newStatus = currentStatus !== 0 ? 0 : 1;
        await API.post('dupes', { id: dupeId, is_active: newStatus });
        window.__PERFUMES__ = await API.get('perfumes');
        App.editPerfume(perfumeId);
    },

    // Admin: Blog
    async renderAdminBlog(container, search = '') {
        const path = 'blogs' + (search ? '?search=' + encodeURIComponent(search) : '');
        let blogs = await API.get(path);
        window.__BLOGS__ = blogs;
        let listHTML = blogs.map(b => `
            <div style="border-bottom: 2px dashed #000; padding: 10px 0; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <strong>${b.title}</strong> <span style="font-size:0.8rem; margin-left: 10px;">${b.date || b.created_at.split('T')[0]}</span>
                    <span class="badge" style="margin-left:10px; background:${b.is_active !== 0 ? 'var(--tertiary-color)' : '#ccc'}">${b.is_active !== 0 ? 'Active' : 'Inactive'}</span>
                </div>
                <div>
                    <button class="btn" style="padding: 5px; font-size:0.8rem;" onclick="App.toggleBlogActive(${b.id}, ${b.is_active})">${b.is_active !== 0 ? 'Deactivate' : 'Activate'}</button>
                    <button class="btn btn-secondary" style="padding: 5px; font-size:0.8rem;" onclick="App.editBlog(${b.id})">Edit</button>
                    <button class="btn btn-primary" style="padding: 5px; font-size:0.8rem;" onclick="App.deleteBlog(${b.id})">Delete</button>
                </div>
            </div>
        `).join('');

        if (blogs.length === 0) listHTML = `<p>${search ? 'No blog posts match your search.' : 'No blog posts.'}</p>`;

        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap:10px;">
                <h2>Manage Blog</h2>
                <div style="display:flex; gap:10px; flex:1; justify-content: flex-end; min-width: 300px;">
                    <input type="text" placeholder="Search title..." value="${search}" oninput="App.handleAdminSearch('blog', this.value)" style="margin-bottom:0; padding: 8px 12px; font-size: 0.9rem; max-width: 300px;">
                    <button class="btn btn-primary" style="padding: 8px 15px; font-size: 0.9rem;" onclick="App.showBlogForm()">+ Add Post</button>
                </div>
            </div>
            <div>${listHTML}</div>
            
            <form id="blog-form" class="hidden mt-4 admin-form border" style="box-shadow:none;" onsubmit="App.saveBlog(event)">
                <h3 id="blog-form-title">Add New Post</h3>
                <input type="hidden" name="id" id="blog-form-id">
                <label>Title</label><input type="text" name="title" id="blog-form-title-input" required>
                <label>Image URL</label><input type="url" name="image" id="blog-form-image-input">
                <label>Content</label><textarea name="content" id="blog-form-content-input" rows="6" required></textarea>
                <div style="display:flex; gap:10px; margin-top: 15px;">
                    <button type="submit" class="btn btn-primary">Save</button>
                    <button type="button" class="btn" onclick="this.parentElement.parentElement.classList.add('hidden')">Cancel</button>
                </div>
            </form>
        `;
    },

    showBlogForm(blog = null) {
        document.getElementById('blog-form').classList.remove('hidden');
        document.getElementById('blog-form-title').innerText = blog ? 'Edit Post' : 'Add New Post';
        document.getElementById('blog-form-id').value = blog ? blog.id : '';
        document.getElementById('blog-form-title-input').value = blog ? blog.title : '';
        document.getElementById('blog-form-image-input').value = blog ? (blog.image || '') : '';
        document.getElementById('blog-form-content-input').value = blog ? blog.content : '';
    },

    async editBlog(id) {
        try {
            const b = await API.get('blogs/' + id);
            if(b) this.showBlogForm(b);
        } catch (err) {
            alert('Error loading blog details: ' + err.message);
        }
    },

    async deleteBlog(id) {
        if(!confirm('Are you sure you want to delete this blog post?')) return;
        await API.del('blogs/' + id);
        await this.switchAdminTab('blog');
    },

    async toggleBlogActive(id, currentStatus) {
        const newStatus = currentStatus !== 0 ? 0 : 1;
        await API.post('blogs', { id: id, is_active: newStatus });
        await this.switchAdminTab('blog');
    },

    async saveBlog(e) {
        e.preventDefault();
        const form = e.target;
        const data = {
            title: form.title.value,
            image: form.image.value,
            content: form.content.value
        };
        const id = form.id.value;
        if(id) data.id = id;
        else data.date = new Date().toISOString().split('T')[0];

        try {
            await API.post('blogs', data);
            await this.switchAdminTab('blog');
        } catch (err) {
            alert(err.message);
        }
    },

    // Admin: Merch
    async renderAdminMerch(container, search = '') {
        const path = 'merches' + (search ? '?search=' + encodeURIComponent(search) : '');
        let merches = await API.get(path);
        window.__MERCHES__ = merches;
        let listHTML = merches.map(m => `
            <div style="border-bottom: 2px dashed #000; padding: 10px 0; display:flex; justify-content: space-between; align-items:center;">
                <div>
                    <strong>${m.name}</strong> - ${m.price}
                    <span class="badge" style="margin-left:10px; background:${m.is_active !== 0 ? 'var(--tertiary-color)' : '#ccc'}">${m.is_active !== 0 ? 'Active' : 'Inactive'}</span>
                </div>
                <div>
                    <button class="btn" style="padding: 5px; font-size:0.8rem;" onclick="App.toggleMerchActive(${m.id}, ${m.is_active})">${m.is_active !== 0 ? 'Deactivate' : 'Activate'}</button>
                    <button class="btn btn-secondary" style="padding: 5px; font-size:0.8rem;" onclick="App.editMerch(${m.id})">Edit</button>
                    <button class="btn btn-primary" style="padding: 5px; font-size:0.8rem;" onclick="App.deleteMerch(${m.id})">Delete</button>
                </div>
            </div>
        `).join('');

        if(merches.length === 0) listHTML = `<p>${search ? 'No merch matches your search.' : 'No merch available.'}</p>`;

        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap:10px;">
                <h2>Manage Merch</h2>
                <div style="display:flex; gap:10px; flex:1; justify-content: flex-end; min-width: 300px;">
                    <input type="text" placeholder="Search product name..." value="${search}" oninput="App.handleAdminSearch('merch', this.value)" style="margin-bottom:0; padding: 8px 12px; font-size: 0.9rem; max-width: 300px;">
                    <button class="btn btn-primary" style="padding: 8px 15px; font-size: 0.9rem;" onclick="App.showMerchForm()">+ Add Merch</button>
                </div>
            </div>
            <div>${listHTML}</div>
            
            <form id="merch-form" class="hidden mt-4 admin-form border" style="box-shadow:none;" onsubmit="App.saveMerch(event)">
                <h3 id="merch-form-title">Add New Merch</h3>
                <input type="hidden" name="id" id="merch-form-id">
                <label>Name</label><input type="text" name="name" id="merch-form-name" required>
                <label>Price</label><input type="text" name="price" id="merch-form-price" required>
                <label>Image URL</label><input type="url" name="image" id="merch-form-image" required>
                <label>Buy Link</label><input type="url" name="buyLink" id="merch-form-buy" required>
                <div style="display:flex; gap:10px; margin-top: 15px;">
                    <button type="submit" class="btn btn-primary">Save</button>
                    <button type="button" class="btn" onclick="this.parentElement.parentElement.classList.add('hidden')">Cancel</button>
                </div>
            </form>
        `;
    },

    showMerchForm(merch = null) {
        document.getElementById('merch-form').classList.remove('hidden');
        document.getElementById('merch-form-title').innerText = merch ? 'Edit Merch' : 'Add New Merch';
        document.getElementById('merch-form-id').value = merch ? merch.id : '';
        document.getElementById('merch-form-name').value = merch ? merch.name : '';
        document.getElementById('merch-form-price').value = merch ? merch.price : '';
        document.getElementById('merch-form-image').value = merch ? merch.image : '';
        document.getElementById('merch-form-buy').value = merch ? (merch.buy_link || merch.buyLink) : '';
    },

    editMerch(id) {
        let merches = window.__MERCHES__ || [];
        const m = merches.find(m => m.id == id);
        if(m) this.showMerchForm(m);
    },

    async deleteMerch(id) {
        if(!confirm('Are you sure you want to delete this merch?')) return;
        await API.del('merches/' + id);
        await this.switchAdminTab('merch');
    },

    async toggleMerchActive(id, currentStatus) {
        const newStatus = currentStatus !== 0 ? 0 : 1;
        await API.post('merches', { id: id, is_active: newStatus });
        await this.switchAdminTab('merch');
    },

    async saveMerch(e) {
        e.preventDefault();
        const form = e.target;
        const data = {
            name: form.name.value,
            price: form.price.value,
            image: form.image.value,
            buy_link: form.buyLink.value
        };
        const id = form.id.value;
        if(id) data.id = id;

        try {
            await API.post('merches', data);
            await this.switchAdminTab('merch');
        } catch (err) {
            alert(err.message);
        }
    },

    // Admin: Settings
    async renderAdminSettings(container) {
        const settings = await API.get('settings');
        
        container.innerHTML = `
            <h2>General Settings</h2>
            <form class="admin-form border mt-4" style="box-shadow:none;" onsubmit="App.saveSettings(event)">
                <label>Number of Top "Most Searched" perfumes to show on homepage</label>
                <input type="number" name="mostSearchedCount" min="1" max="20" value="${settings.mostSearchedCount || 3}" required>
                
                <hr style="margin: 20px 0; border: 1px dashed #ccc;">
                <h3>Social Media Links</h3>
                <label>TikTok URL</label>
                <input type="url" name="tiktok_link" value="${settings.tiktok_link || ''}" placeholder="https://tiktok.com/@yourprofile">
                
                <label>Instagram URL</label>
                <input type="url" name="instagram_link" value="${settings.instagram_link || ''}" placeholder="https://instagram.com/yourprofile">
                
                <label>Facebook URL</label>
                <input type="url" name="facebook_link" value="${settings.facebook_link || ''}" placeholder="https://facebook.com/yourpage">

                <button type="submit" class="btn btn-primary mt-4">Save Settings</button>
            </form>
        `;
    },

    async saveSettings(e) {
        e.preventDefault();
        const settings = {
            mostSearchedCount: parseInt(e.target.mostSearchedCount.value, 10),
            tiktok_link: e.target.tiktok_link.value,
            instagram_link: e.target.instagram_link.value,
            facebook_link: e.target.facebook_link.value
        };
        await API.post('settings', settings);
        this.renderSocialIcons(settings);
        alert('Settings saved successfully!');
        await this.switchAdminTab('settings');
    },

    renderNotFound() {
        this.contentDiv.innerHTML = `
            <div class="card" style="text-align: center; padding: 100px 20px;">
                <h1>404</h1>
                <p>Page not found.</p>
                <a href="/" class="btn btn-primary mt-4">Go Home</a>
            </div>
        `;
    }
};

window.onload = () => App.init();
