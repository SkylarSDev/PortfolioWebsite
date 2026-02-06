// === STARFIELD ===
(function initStarfield() {
    const starfield = document.getElementById('starfield');
    for (let i = 0; i < 120; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        const size = Math.random() * 2.5 + 0.5;
        star.style.width = size + 'px';
        star.style.height = size + 'px';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.setProperty('--dur', (Math.random() * 3 + 2) + 's');
        star.style.animationDelay = Math.random() * 3 + 's';
        starfield.appendChild(star);
    }
})();

// ============================================================
//  ROUTER — drives everything off window.location.hash
//
//  Supported routes:
//    #home            → home section
//    #blog            → blog post list
//    #post/<id>       → single blog post  (e.g. #post/unity-serialization)
//    #projects        → projects section
//    (empty hash)     → home
// ============================================================

const sections = {
    home: document.getElementById('section-home'),
    blog: document.getElementById('section-blog'),
    projects: document.getElementById('section-projects'),
};

// Navigate by updating the hash — the hashchange listener does the rest.
function navigate(hash) {
    if (window.location.hash === '#' + hash) {
        handleRoute(); // re-run even if hash is identical (e.g. clicking active link)
    } else {
        window.location.hash = hash;
    }
}

// Central route handler — called on every hash change + initial load.
async function handleRoute() {
    const hash = window.location.hash.replace(/^#\/?/, '') || 'home';
    const [route, ...rest] = hash.split('/');
    const param = rest.join('/');

    if (route === 'post' && param) {
        await ensureManifestLoaded();
        showSection('blog', false);
        await openPost(param);
    } else if (sections[route]) {
        showSection(route, true);
    } else {
        showSection('home', true);
    }
}

// Show a top-level section. If resetBlog is true, swap back to the post list.
function showSection(name, resetBlog) {
    Object.values(sections).forEach(s => s.classList.add('hidden'));
    sections[name]?.classList.remove('hidden');

    if (name === 'blog' && resetBlog) {
        document.getElementById('blog-list').classList.remove('hidden');
        document.getElementById('blog-post-view').classList.add('hidden');
    }

    document.querySelectorAll('.nav-links a').forEach(a => {
        a.classList.toggle('active', a.dataset.section === name);
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Bind nav/section links to use the router
document.querySelectorAll('[data-section]').forEach(el => {
    el.addEventListener('click', (e) => {
        e.preventDefault();
        navigate(el.dataset.section);
    });
});

// Back/forward buttons + manual URL edits
window.addEventListener('hashchange', handleRoute);

// === BLOG ENGINE ===
const blogListContainer = document.getElementById('blog-entries');
const blogPostView = document.getElementById('blog-post-view');
const blogPostBody = document.getElementById('blog-post-body');
const blogPostTitle = document.getElementById('blog-post-title');
const blogPostDate = document.getElementById('blog-post-date');
const blogPostTags = document.getElementById('blog-post-tags');

let blogManifest = [];
let manifestPromise = null;
const postCache = {};

function ensureManifestLoaded() {
    if (!manifestPromise) {
        manifestPromise = loadManifest();
    }
    return manifestPromise;
}

async function loadManifest() {
    try {
        const res = await fetch('posts/manifest.json');
        blogManifest = await res.json();
        renderBlogList();
    } catch (err) {
        blogListContainer.innerHTML = '<p style="color: var(--text-dim);">Failed to load posts. Check console.</p>';
        console.error('Blog manifest load error:', err);
    }
}

function renderBlogList() {
    blogListContainer.innerHTML = blogManifest.map(post => `
        <div class="blog-entry" data-post-id="${post.id}">
            <div class="blog-date">// ${post.date}</div>
            <h3>> ${post.title}</h3>
            <div class="blog-tags">
                ${post.tags.map(t => `<span class="blog-tag">#${t}</span>`).join('')}
            </div>
            <p>${post.excerpt}</p>
            <span class="read-more">[ READ MORE → ]</span>
        </div>
    `).join('');

    blogListContainer.querySelectorAll('.blog-entry').forEach(entry => {
        entry.addEventListener('click', () => navigate('post/' + entry.dataset.postId));
    });
}

async function openPost(postId) {
    await ensureManifestLoaded();

    const post = blogManifest.find(p => p.id === postId);
    if (!post) {
        navigate('blog');
        return;
    }

    if (!postCache[postId]) {
        try {
            const res = await fetch(post.file);
            postCache[postId] = await res.text();
        } catch (err) {
            postCache[postId] = '<p>Failed to load post content.</p>';
            console.error(`Error loading post "${postId}":`, err);
        }
    }

    blogPostTitle.textContent = '> ' + post.title;
    blogPostDate.textContent = '// ' + post.date;
    blogPostTags.innerHTML = post.tags.map(t => `<span class="blog-tag">#${t}</span>`).join('');
    blogPostBody.innerHTML = postCache[postId];

    document.getElementById('blog-list').classList.add('hidden');
    blogPostView.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Back button → blog list
document.getElementById('back-to-blog').addEventListener('click', () => {
    navigate('blog');
});

// === INIT ===
ensureManifestLoaded().then(() => handleRoute());