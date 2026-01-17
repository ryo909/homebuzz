/**
 * SNS Praise Skins - Logic
 */

// --- Utils ---
class Random {
    constructor(seed) { this.seed = seed; }
    next() { this.seed = (this.seed * 9301 + 49297) % 233280; return this.seed / 233280; }
    nextInt(min, max) { return Math.floor(this.next() * (max - min + 1)) + min; }
    pick(arr) { if (!arr || arr.length === 0) return null; return arr[this.nextInt(0, arr.length - 1)]; }
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
    constructor(data) { this.data = data; }

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
            trendTag: hashtags[0],
            replies: rng.nextInt(20, 500) // Added for X Actions
        };

        // 3. Selection Logic (Seeded)
        const dmProfile = rng.pick(d.dmProfiles);

        // X Specific Meta
        const xMeta = {
            postedAgo: rng.pick(d.timePresets.main),
            expert: rng.pick(d.xProfiles.experts),
            influencer: rng.pick(d.xProfiles.influencers),
            celebrity: rng.pick(d.xProfiles.celebrities),
            otaku: rng.pick(d.xProfiles.otakus),
            official: rng.pick(d.xProfiles.officials),
            // Quote Times
            quoteTimes: Array(4).fill(0).map(() => rng.pick(d.timePresets.sub))
        };

        // 4. Quotes & Templates
        const fmt = (tpl) => tpl.replace(/{text}/g, text);
        const crowdTemplates = rng.pickUnique(d.crowdTemplates, 6);
        const crowdReplies = crowdTemplates.map(t => fmt(t));

        return {
            id: crypto.randomUUID(),
            createdAt: seed,
            text: text,
            seed: seed,
            dmProfileId: dmProfile.id,
            xMeta: xMeta, // Attach X Meta
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
        for (const entry of d.actionDict) if (text.includes(entry.keyword)) return entry.tag;
        const bracketMatch = text.match(/[「『（(](.*?)[」』）)]/);
        if (bracketMatch && bracketMatch[1]) return this.cleanSuffix(bracketMatch[1]);
        const parts = text.split(/[\s,、。]+/);
        if (parts.length > 0) {
            const last = parts[parts.length - 1];
            if (last) return this.cleanSuffix(last);
        }
        return this.cleanSuffix(text.substring(0, 12));
    }
    cleanSuffix(str) { return str.replace(/(した|する|やった|やる|できた|完了|終了|ました|ます)$/, ""); }
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
            case 'dm': this.renderDM(praisePack); break;
            case 'x': this.renderX(praisePack); break;
            case 'news': this.renderNews(praisePack); break;
        }
    }

    /* --- DM RENDERER --- */
    renderDM(pack) {
        const d = document.createElement('div');
        d.className = 'skin-dm';
        const profile = PRAISE_DATA.dmProfiles.find(p => p.id === pack.dmProfileId) || PRAISE_DATA.dmProfiles[0];
        const badgeChar = (profile.badge === 'star') ? '★' : '';

        // Fixed Header
        d.innerHTML += `
            <div class="dm-header">
                <div class="dm-back-btn">←</div>
                <div class="dm-avatar-header" style="background-color: hsl(${profile.avatar.hue}, 70%, 60%)">${profile.avatar.text}</div>
                <div class="dm-header-info">
                    <div class="dm-header-top">
                        <span class="dm-header-name">${profile.displayName}</span>
                        <span class="dm-header-badge">${badgeChar}</span>
                    </div>
                    <div class="dm-header-detail">${profile.handle} • ${profile.bio}</div>
                </div>
                <div class="dm-header-menu">⋯</div>
            </div>`;

        // Message List
        const list = document.createElement('div');
        list.className = 'dm-message-list';
        d.appendChild(list);

        const date = new Date(pack.createdAt);
        const timeStr = `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
        list.innerHTML += `<div class="dm-timestamp-center">今日 ${timeStr}</div>`;

        this.createDMBubble(list, pack.text, 'user', null);
        list.innerHTML += `<div class="dm-read-status">既読</div>`;

        // Replies Logic
        const replies = [pack.influencerQuote, pack.expertQuote, pack.otakuQuote];

        let delay = 400;
        const addReply = (idx) => {
            if (idx >= replies.length) {
                if (pack.officialQuote) {
                    setTimeout(() => {
                        list.innerHTML += `<div class="dm-system-message"><span>👑</span> ${pack.officialQuote}</div>`;
                        list.scrollTop = list.scrollHeight;
                    }, 600);
                }
                return;
            }
            // Typing
            const row = document.createElement('div');
            row.className = 'dm-message-row row-reply';
            // First in block gets avatar logic? Simplified: always show for consistency in this render func
            // But we can do the strict logic:
            const showAvatar = (idx === 0);
            const avatarHtml = `<div class="dm-avatar-icon ${showAvatar ? '' : 'hidden'}" style="background-color:hsl(${profile.avatar.hue},70%,60%)">${profile.avatar.text}</div>`;

            row.innerHTML = `${avatarHtml}<div class="typing-indicator"><div class="dot"></div><div class="dot"></div></div>`;
            list.appendChild(row);
            list.scrollTop = list.scrollHeight;

            setTimeout(() => {
                list.removeChild(row);
                this.createDMBubble(list, replies[idx], 'reply', profile, showAvatar);
                list.scrollTop = list.scrollHeight;
                addReply(idx + 1);
            }, 800);
        };
        setTimeout(() => addReply(0), delay);

        // Fixed Composer
        const composer = document.createElement('div');
        composer.className = 'dm-composer';
        composer.innerHTML = `
            <div class="dm-composer-plus">＋</div>
            <input class="dm-composer-input" type="text" placeholder="Message" />
            <button class="dm-composer-send">➤</button>
        `;
        // Events attached in create logic or here? InnerHTML breaks events.
        // Re-attach events:
        d.appendChild(composer);
        this.container.appendChild(d);

        const input = d.querySelector('.dm-composer-input');
        const sendBtn = d.querySelector('.dm-composer-send');
        const trigger = () => { if (input.value.trim()) { this.sendCallback(input.value); input.value = ''; } };
        sendBtn.onclick = trigger;
        input.onkeypress = (e) => { if (e.key === 'Enter') trigger(); };
    }

    createDMBubble(container, text, type, profile, showAvatar = false) {
        const row = document.createElement('div');
        row.className = `dm-message-row row-${type}`;
        if (type === 'reply') {
            const cls = showAvatar ? '' : 'hidden';
            row.innerHTML += `<div class="dm-avatar-icon ${cls}" style="background-color:hsl(${profile.avatar.hue},70%,60%)">${profile.avatar.text}</div>`;
        }
        row.innerHTML += `<div class="dm-bubble dm-${type}">${text}</div>`;
        container.appendChild(row);
    }

    /* --- X RENDERER --- */
    renderX(pack) {
        const d = document.createElement('div');
        d.className = 'skin-x';
        const m = pack.xMeta || {};

        // Define Action Icons (Text based for now)
        const ico = { msg: '💬', rt: '🔁', like: '❤️', bkm: '🔖', shr: '↗️' };

        // Main Card
        d.innerHTML = `
            <div class="x-main-card">
                <!-- Header -->
                <div class="x-header">
                    <div class="x-avatar" style="background-color: #555;"></div>
                    <div class="x-header-info">
                        <div class="x-header-top">
                            <div class="x-header-name-row">
                                <span class="x-name">User Name</span>
                                <span class="x-handle-row">@username</span>
                            </div>
                            <div class="x-menu">⋯</div>
                        </div>
                    </div>
                </div>

                <!-- Body -->
                <div class="x-body">
                    <div class="x-headline">${pack.headlines}</div>
                    <div class="x-post-text">${pack.postBody}</div>
                    <div class="x-hashtags">${pack.hashtags.join(' ')}</div>
                </div>

                <!-- Trend -->
                <div class="x-trend-badge"><strong>Trending #${pack.stats.trendRank}</strong> ${pack.stats.trendTag}</div>

                <!-- Views -->
                <div class="x-views-row">
                    <strong>${pack.stats.views.toLocaleString()}</strong> Views
                </div>

                <!-- Actions -->
                <div class="x-actions-row">
                    <div class="x-action">${ico.msg} <span style="font-size:12px">${Math.floor(pack.stats.reposts * 0.05).toLocaleString()}</span></div>
                    <div class="x-action retweet">${ico.rt} <span style="font-size:12px">${pack.stats.reposts.toLocaleString()}</span></div>
                    <div class="x-action like">${ico.like} <span style="font-size:12px">${pack.stats.likes.toLocaleString()}</span></div>
                    <div class="x-action">${ico.bkm} <span style="font-size:12px">${pack.stats.bookmarks.toLocaleString()}</span></div>
                    <div class="x-action">${ico.shr}</div>
                </div>

                <!-- Quote RTs (Cards) -->
                <div class="x-quote-label">Quotes</div>
                <div class="x-quote-section">
                    ${this.buildXQuote(m.expert, pack.expertQuote, m.quoteTimes[0])}
                    ${this.buildXQuote(m.influencer, pack.influencerQuote, m.quoteTimes[1])}
                    ${this.buildXQuote(m.celebrity, pack.celebrityQuote, m.quoteTimes[2])}
                    ${this.buildXQuote(m.otaku, pack.otakuQuote, m.quoteTimes[3])}
                </div>
            </div>

            <!-- Replies (Thread) -->
            <div class="x-reply-section">
                 ${this.buildXReply(pack.crowdReplies[0], 'Crowd User 1', m.postedAgo === '1h' ? '2h' : '1h', true)}
                 ${this.buildXReply(pack.crowdReplies[1], 'Crowd User 2', '3h', true)}
                 ${this.buildXReply(pack.crowdReplies[2], 'Crowd User 3', '3h', false)}
                 ${this.buildXReply(pack.officialQuote, '👑 公式表彰', 'Just now', false)}
            </div>
        `;

        this.container.appendChild(d);
        // Animate numbers? Optional, logic removed for simplicity in overhaul
    }

    buildXQuote(profile, text, time) {
        if (!profile) return '';
        return `
            <div class="x-quote-card">
                <div class="x-quote-header">
                    <div class="x-quote-avatar" style="background-color:hsl(${profile.hue},70%,50%)">${profile.avatar}</div>
                    <div class="x-quote-info">
                        <span class="x-quote-name">${profile.name}</span>
                        ${profile.handle} • ${time}
                    </div>
                </div>
                <div class="x-quote-body">${text}</div>
            </div>
        `;
    }

    buildXReply(text, name, time, isThread) {
        // Simplified random avatars for crowd
        const hue = Math.floor(Math.random() * 360);
        const avText = name[0];

        return `
            <div class="x-reply-item">
                <div class="x-reply-avatar-col">
                    <div class="x-reply-avatar" style="background-color:hsl(${hue},60%,50%)">${avText}</div>
                    ${isThread ? '<div class="x-thread-line"></div>' : ''}
                </div>
                <div class="x-reply-content">
                    <div class="x-reply-header">
                        <span class="x-reply-name">${name}</span> @user • ${time}
                    </div>
                    <div class="x-reply-text">${text}</div>
                </div>
            </div>
        `;
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
                    <div class="news-expert-label">専門家解説</div>
                    <div class="news-expert-text">${pack.expertPreface} ${pack.expertQuote}</div>
                </div>
                <div class="news-main-headline">
                    <div class="news-headline-text">${pack.headlines}</div>
                </div>
                <div class="news-ticker">
                    <div class="news-ticker-content">
                        BREAKING: ${pack.text} ... ${pack.influencerQuote} // ${pack.officialQuote}
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
        dom.skinBtns.forEach(b => {
            if (b.dataset.skin === skinId) b.classList.add('active');
            else b.classList.remove('active');
        });
        if (skinId === 'dm') dom.controls.classList.add('dm-active');
        else dom.controls.classList.remove('dm-active');

        if (currentPack) render();
    }

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
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            dom.historyList.appendChild(el);
        });
    }

    dom.sendBtn.addEventListener('click', () => send(dom.input.value));
    dom.input.addEventListener('keypress', (e) => { if (e.key === 'Enter') send(dom.input.value); });
    dom.skinBtns.forEach(btn => btn.addEventListener('click', () => setSkin(btn.dataset.skin)));

    setSkin(currentSkin);
    updateHistoryUI();
});
