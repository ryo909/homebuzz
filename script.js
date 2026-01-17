/**
 * SNS Praise Skins - Logic
 */

// --- Utils ---
// Simple seeded random (Linear Congruential Generator)
class Random {
    constructor(seed) {
        this.seed = seed;
    }

    // Returns float 0-1
    next() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }

    // Returns integer min to max (inclusive)
    nextInt(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    // Pick random item from array
    pick(arr) {
        if (!arr || arr.length === 0) return null;
        return arr[this.nextInt(0, arr.length - 1)];
    }

    // Pick unique items from array
    pickUnique(arr, count) {
        const copy = [...arr];
        const result = [];
        for (let i = 0; i < count; i++) {
            if (copy.length === 0) break;
            const idx = this.nextInt(0, copy.length - 1);
            result.push(copy[idx]);
            copy.splice(idx, 1);
        }
        return result;
    }
}

// --- Praise Engine ---
class PraiseEngine {
    constructor(data) {
        this.data = data;
    }

    generatePack(text, seed = Date.now()) {
        const rng = new Random(seed);
        const d = this.data;

        // 1. Hashtags
        const hashtags = this.generateHashtags(text, rng);

        // 2. Stats
        const stats = {
            likes: rng.nextInt(d.statsRanges.likes[0], d.statsRanges.likes[1]),
            reposts: rng.nextInt(d.statsRanges.reposts[0], d.statsRanges.reposts[1]),
            bookmarks: rng.nextInt(d.statsRanges.bookmarks[0], d.statsRanges.bookmarks[1]),
            views: rng.nextInt(d.statsRanges.views[0], d.statsRanges.views[1]),
            trendRank: rng.nextInt(d.statsRanges.trendRank[0], d.statsRanges.trendRank[1]),
            trendTag: hashtags[0], // First hashtag is priority
        };

        // 3. Select DM Profile
        const dmProfile = rng.pick(d.dmProfiles);

        // 4. Quotes & Templates
        const fmt = (tpl) => tpl.replace(/{text}/g, text);

        // Generate Crowds (6 unique)
        const crowdTemplates = rng.pickUnique(d.crowdTemplates, 6);
        const crowdReplies = crowdTemplates.map(t => fmt(t));

        // Generate Quotes
        return {
            id: crypto.randomUUID(),
            createdAt: seed,
            text: text,
            seed: seed,
            dmProfileId: dmProfile.id,
            headlines: fmt(rng.pick(d.headlineTemplates)),
            postBody: fmt(rng.pick(d.postBodyTemplates)),
            expertQuote: fmt(rng.pick(d.expertTemplates)),
            expertPreface: rng.pick(d.newsPrefaceTemplates),
            influencerQuote: fmt(rng.pick(d.influencerTemplates)),
            celebrityQuote: fmt(rng.pick(d.celebrityTemplates)),
            otakuQuote: fmt(rng.pick(d.otakuTemplates)),
            officialQuote: fmt(rng.pick(d.officialTemplates)),
            crowdReplies: crowdReplies,
            stats: stats,
            hashtags: hashtags
        };
    }

    generateHashtags(text, rng) {
        const d = this.data;
        const tags = [];
        let tag1 = this.getDerivedTag(text);
        if (!tag1) tag1 = "今日やった";
        tags.push(`#${tag1}`);
        tags.push(rng.pick(d.tag2List));
        tags.push(rng.pick(d.tag3List));
        return [...new Set(tags)];
    }

    getDerivedTag(text) {
        const d = this.data;
        for (const entry of d.actionDict) {
            if (text.includes(entry.keyword)) return entry.tag;
        }
        const bracketMatch = text.match(/[「『（(](.*?)[」』）)]/);
        if (bracketMatch && bracketMatch[1]) return this.cleanSuffix(bracketMatch[1]);
        const parts = text.split(/[\s,、。]+/);
        if (parts.length > 0) {
            const last = parts[parts.length - 1];
            if (last) return this.cleanSuffix(last);
        }
        return this.cleanSuffix(text.substring(0, 12));
    }

    cleanSuffix(str) {
        return str.replace(/(した|する|やった|やる|できた|完了|終了|ました|ます)$/, "");
    }
}

// --- Skin Renderer ---
class SkinRenderer {
    constructor(displayId, sendCallback) {
        this.container = document.getElementById(displayId);
        this.currentSkin = null;
        this.currentPack = null;
        this.sendCallback = sendCallback;
    }

    render(praisePack, skinId) {
        this.currentPack = praisePack;
        this.currentSkin = skinId;
        this.container.innerHTML = '';

        switch (skinId) {
            case 'dm':
                this.renderDM(praisePack);
                break;
            case 'x':
                this.renderX(praisePack);
                break;
            case 'news':
                this.renderNews(praisePack);
                break;
        }
    }

    /* --- DM RENDERER REFINED --- */
    renderDM(pack) {
        const d = document.createElement('div');
        d.className = 'skin-dm';

        const profile = PRAISE_DATA.dmProfiles.find(p => p.id === pack.dmProfileId) || PRAISE_DATA.dmProfiles[0];
        const badgeChar = (profile.badge === 'star') ? '★' : '';

        // 1. Header (Fixed)
        const header = document.createElement('div');
        header.className = 'dm-header';
        header.innerHTML = `
            <div class="dm-back-btn">←</div>
            <div class="dm-avatar-header" style="background-color: hsl(${profile.avatar.hue}, 70%, 60%)">
                ${profile.avatar.text}
            </div>
            <div class="dm-header-info">
                <div class="dm-header-top">
                    <span class="dm-header-name">${profile.displayName}</span>
                    <span class="dm-header-badge">${badgeChar}</span>
                </div>
                <div class="dm-header-detail">${profile.handle} • ${profile.bio}</div>
            </div>
            <div class="dm-header-menu">⋯</div>
        `;
        d.appendChild(header);

        // 2. Message List (Scrollable)
        const list = document.createElement('div');
        list.className = 'dm-message-list';
        d.appendChild(list);

        // Logic: Timestamp -> User Msg -> Read -> Replies... -> Official(System)

        // Timestamp
        const date = new Date(pack.createdAt);
        const hours = date.getHours();
        const mins = date.getMinutes().toString().padStart(2, '0');
        const timeStr = `${hours}:${mins}`;

        const ts = document.createElement('div');
        ts.className = 'dm-timestamp-center';
        ts.textContent = `今日 ${timeStr}`;
        list.appendChild(ts);

        // User Message
        this.createDMBubble(list, pack.text, 'user', null);

        // Read Status
        const readStats = document.createElement('div');
        readStats.className = 'dm-read-status';
        readStats.textContent = `既読`; // Simple "Read" just below bubble
        list.appendChild(readStats);

        // Reply Sequence
        const replies = [
            pack.influencerQuote,
            pack.expertQuote,
            pack.otakuQuote
        ];

        let delayBase = 400; // start delay

        // Typing Indicator Element
        const typing = document.createElement('div');
        typing.className = 'typing-indicator';
        typing.innerHTML = '<div class="dot"></div><div class="dot"></div>'; // 2 dots for style

        // Helper to scroll down
        const scrollDown = () => list.scrollTop = list.scrollHeight;

        const showReply = (idx) => {
            // System Message (Official) check
            if (idx >= replies.length) {
                if (pack.officialQuote) {
                    setTimeout(() => {
                        const sys = document.createElement('div');
                        sys.className = 'dm-system-message';
                        sys.innerHTML = `<span>👑</span> ${pack.officialQuote}`;
                        list.appendChild(sys);
                        scrollDown();
                    }, 600);
                }
                return;
            }

            // Show Typing
            const row = document.createElement('div');
            row.className = 'dm-message-row row-reply';
            // Avatar placeholder for typing? 
            // Spec says: "Opponent avatar on left".
            // Since typing precedes the message, let's just show typing bubble.
            // Ideally typing bubble also has avatar if it's the start of block.
            // We can simplify: always show avatar for typing for first block.
            const isFirstInBlock = (idx === 0);

            // Create temp typing row
            const avatar = document.createElement('div');
            avatar.className = `dm-avatar-icon ${isFirstInBlock ? '' : 'hidden'}`;
            avatar.style.backgroundColor = `hsl(${profile.avatar.hue}, 70%, 60%)`;
            avatar.textContent = profile.avatar.text;

            row.appendChild(avatar);
            row.appendChild(typing);
            list.appendChild(row);
            scrollDown();

            setTimeout(() => {
                list.removeChild(row); // Remove typing

                // Show actual message
                this.createDMBubble(list, replies[idx], 'reply', profile, isFirstInBlock);
                scrollDown();

                // Next
                showReply(idx + 1);
            }, 800); // typing duration
        };

        setTimeout(() => showReply(0), delayBase);


        // 3. Composer (Fixed Bottom)
        const composer = document.createElement('div');
        composer.className = 'dm-composer';

        const plus = document.createElement('div');
        plus.className = 'dm-composer-plus';
        plus.textContent = '＋';

        const input = document.createElement('input');
        input.className = 'dm-composer-input';
        input.placeholder = 'Message';
        input.type = 'text';

        const sendBtn = document.createElement('button');
        sendBtn.className = 'dm-composer-send';
        sendBtn.textContent = '➤';

        const triggerSend = () => {
            if (input.value.trim()) {
                this.sendCallback(input.value);
                input.value = '';
            }
        };

        sendBtn.addEventListener('click', triggerSend);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') triggerSend();
        });

        composer.appendChild(plus);
        composer.appendChild(input);
        composer.appendChild(sendBtn);
        d.appendChild(composer);

        this.container.appendChild(d);
    }

    createDMBubble(container, text, type, profile, showAvatar = false) {
        const row = document.createElement('div');
        row.className = `dm-message-row row-${type}`;

        if (type === 'reply' && profile) {
            const avatar = document.createElement('div');
            avatar.className = `dm-avatar-icon ${showAvatar ? '' : 'hidden'}`;
            avatar.style.backgroundColor = `hsl(${profile.avatar.hue}, 70%, 60%)`;
            avatar.textContent = profile.avatar.text;
            row.appendChild(avatar);
        }

        const bubble = document.createElement('div');
        bubble.className = `dm-bubble dm-${type}`;
        bubble.textContent = text;

        row.appendChild(bubble);
        container.appendChild(row);
    }

    /* --- X RENDERER --- */
    renderX(pack) {
        const d = document.createElement('div');
        d.className = 'skin-x';

        // Header
        d.innerHTML = `
            <div class="x-header">
                <div class="x-avatar"></div>
                <div class="x-user-info">
                    <div class="x-name">User Name</div>
                    <div class="x-handle">@username</div>
                </div>
            </div>
            <div class="x-body">
                ${pack.postBody} <br><br>
                ${pack.headlines} <br><br>
                <span class="x-hashtag">${pack.hashtags.join(' ')}</span>
            </div>
            <div class="x-trend-badge">🏆 Trending #${pack.stats.trendRank}</div>
            <div class="x-stats-big">
                <div class="x-stat-item"><strong id="x-reposts">0</strong> Reposts</div>
                <div class="x-stat-item"><strong id="x-quotes">0</strong> Quotes</div>
                <div class="x-stat-item"><strong id="x-likes">0</strong> Likes</div>
                <div class="x-stat-item"><strong id="x-bookmarks">0</strong> Bookmarks</div>
            </div>
            <div class="x-stat-item" style="color:#71767b; font-size:14px; margin-bottom:12px;">
                <span id="x-views">0</span> Views
            </div>
        `;

        // Quote RTs
        const qContainer = document.createElement('div');
        qContainer.className = 'x-quote-container';

        const quotes = [
            { user: "専門家", text: pack.expertQuote },
            { user: "海外セレブ", text: pack.influencerQuote },
            { user: "著名人", text: pack.celebrityQuote },
            { user: "限界オタク", text: pack.otakuQuote }
        ];

        quotes.forEach(q => {
            const item = document.createElement('div');
            item.className = 'x-quote-item';
            item.innerHTML = `
                <div class="x-quote-user">${q.user}</div>
                <div class="x-quote-text">${q.text}</div>
            `;
            qContainer.appendChild(item);
        });
        d.appendChild(qContainer);

        // Replies (Crowd + Official)
        const replies = document.createElement('div');
        replies.style.marginTop = '16px';
        replies.style.color = '#71767b';
        replies.textContent = `Show replies...`;
        d.appendChild(replies);

        this.container.appendChild(d);

        // Animation: Count Up
        this.animateCountUp('x-reposts', pack.stats.reposts);
        this.animateCountUp('x-likes', pack.stats.likes);
        this.animateCountUp('x-bookmarks', pack.stats.bookmarks);
        this.animateCountUp('x-views', pack.stats.views);
        document.getElementById('x-quotes').textContent = Math.floor(pack.stats.reposts * 0.1).toLocaleString();
    }

    animateCountUp(id, target) {
        const el = document.getElementById(id);
        if (!el) return;
        const duration = 1200;
        const startTime = performance.now();
        const start = 0;

        const tick = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 4);
            const current = Math.floor(start + (target - start) * ease);
            el.textContent = current.toLocaleString();

            if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    /* --- NEWS RENDERER --- */
    renderNews(pack) {
        const d = document.createElement('div');
        d.className = 'skin-news';

        d.innerHTML = `
            <div class="news-bg"></div>
            <div class="news-content">
                <div class="news-live-badge">🔴 LIVE</div>
                
                <div class="news-expert-box">
                    <div class="news-expert-label">専門家解説 / EXPERT VIEW</div>
                    <div class="news-expert-text">
                        ${pack.expertPreface} ${pack.expertQuote}
                    </div>
                </div>

                <div class="news-main-headline">
                    <div class="news-headline-text">${pack.headlines}</div>
                </div>

                <div class="news-ticker">
                    <div class="news-ticker-content">
                        BREAKING NEWS: ${pack.text} が確認されました。 ${pack.influencerQuote}  ///  SNSの声: 「${pack.crowdReplies[0]}」「${pack.crowdReplies[1]}」  ///  公式発表: ${pack.officialQuote}  ///  視聴者数: ${pack.stats.views.toLocaleString()}人
                    </div>
                </div>
            </div>
        `;

        this.container.appendChild(d);
    }
}

// --- App Controller ---
document.addEventListener('DOMContentLoaded', () => {
    const engine = new PraiseEngine(PRAISE_DATA);
    let currentSkin = 'dm';
    let currentPack = null;

    // Elements
    const dom = {
        controls: document.querySelector('.controls-container'),
        input: document.getElementById('eventInput'),
        sendBtn: document.getElementById('sendBtn'),
        historyList: document.getElementById('historyList'),
        skinBtns: document.querySelectorAll('.skin-btn')
    };

    function send(text) {
        if (!text) return;
        currentPack = engine.generatePack(text);
        saveToHistory(currentPack);
        render();
        updateHistoryUI();

        // Sync Global Input
        dom.input.value = '';
    }

    const renderer = new SkinRenderer('displayArea', send);
    const dbKey = 'sns-praise-history';

    function render() {
        if (!currentPack) return;
        renderer.render(currentPack, currentSkin);
    }

    function setSkin(skinId) {
        currentSkin = skinId;
        // Update UI
        dom.skinBtns.forEach(b => {
            if (b.dataset.skin === skinId) b.classList.add('active');
            else b.classList.remove('active');
        });

        // Toggle Controls View using class
        if (skinId === 'dm') {
            dom.controls.classList.add('dm-active');
        } else {
            dom.controls.classList.remove('dm-active');
        }

        // Re-render if content exists
        if (currentPack) render();
    }

    // --- History ---
    function loadHistory() {
        const raw = localStorage.getItem(dbKey);
        return raw ? JSON.parse(raw) : [];
    }

    function saveToHistory(pack) {
        const history = loadHistory();
        history.unshift(pack);
        if (history.length > 50) history.pop();
        localStorage.setItem(dbKey, JSON.stringify(history));
    }

    function updateHistoryUI() {
        const history = loadHistory();
        dom.historyList.innerHTML = '';
        history.forEach(pack => {
            const el = document.createElement('div');
            el.className = 'history-item';
            const dateStr = new Date(pack.createdAt).toLocaleString();
            el.innerHTML = `
                <div class="history-date">${dateStr}</div>
                <div class="history-text">${pack.text}</div>
            `;
            el.addEventListener('click', () => {
                currentPack = pack;
                render();
                // Scroll to top
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            dom.historyList.appendChild(el);
        });
    }

    // --- Event Listeners ---
    dom.sendBtn.addEventListener('click', () => send(dom.input.value));

    dom.input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') send(dom.input.value);
    });

    dom.skinBtns.forEach(btn => {
        btn.addEventListener('click', () => setSkin(btn.dataset.skin));
    });

    // --- Init ---
    setSkin(currentSkin); // Init input visibility
    updateHistoryUI();
});
