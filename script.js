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

        // 5. YouTube Meta (if data available)
        let ytMeta = null;
        if (d.ytTitleTemplates && d.ytChannelPresets) {
            const ytChannel = rng.pick(d.ytChannelPresets);
            const ytRanges = d.ytNumberRanges;

            // Generate comments for each role
            const ytComments = [];

            // Pinned (official)
            const officialUser = rng.pick(d.ytCommentUserPresets.official);
            ytComments.push({
                id: 'pinned',
                user: officialUser,
                text: fmt(rng.pick(d.officialTemplates)),
                likes: rng.nextInt(ytRanges.commentLikes.min, ytRanges.commentLikes.max) * 10,
                time: rng.pick(d.ytMetaPresets.postedAt),
                pinned: true,
                edited: false,
                replies: []
            });

            // Top comments (expert, influencer, celebrity, otaku)
            const roles = ['expert', 'influencer', 'celebrity', 'otaku'];
            const roleTemplates = {
                expert: d.expertTemplates,
                influencer: d.influencerTemplates,
                celebrity: d.celebrityTemplates,
                otaku: d.otakuTemplates
            };

            roles.forEach(role => {
                const user = rng.pick(d.ytCommentUserPresets[role]);
                ytComments.push({
                    id: `top_${role}`,
                    user: user,
                    text: fmt(rng.pick(roleTemplates[role])),
                    likes: rng.nextInt(ytRanges.commentLikes.min, ytRanges.commentLikes.max),
                    time: rng.pick(d.ytMetaPresets.postedAt),
                    pinned: false,
                    edited: rng.next() > 0.7,
                    replies: []
                });
            });

            // Reply thread (crowd with 6 replies)
            const crowdUsers = rng.pickUnique(d.ytCommentUserPresets.crowd, 6);
            const replyThreadParent = {
                id: 'thread_parent',
                user: crowdUsers[0],
                text: crowdReplies[0],
                likes: rng.nextInt(ytRanges.commentLikes.min, ytRanges.commentLikes.max),
                time: rng.pick(d.ytMetaPresets.postedAt),
                pinned: false,
                edited: false,
                replies: crowdReplies.slice(1).map((reply, i) => ({
                    id: `reply_${i}`,
                    user: crowdUsers[i + 1] || crowdUsers[0],
                    text: reply,
                    likes: rng.nextInt(10, 500),
                    time: rng.pick(d.ytMetaPresets.postedAt)
                }))
            };
            ytComments.push(replyThreadParent);

            ytMeta = {
                title: fmt(rng.pick(d.ytTitleTemplates)),
                channel: ytChannel,
                videoLength: rng.pick(d.ytMetaPresets.videoLength),
                postedAt: rng.pick(d.ytMetaPresets.postedAt),
                views: rng.nextInt(ytRanges.views.min, ytRanges.views.max),
                likes: rng.nextInt(ytRanges.likes.min, ytRanges.likes.max),
                commentsCount: rng.nextInt(ytRanges.comments.min, ytRanges.comments.max),
                comments: ytComments
            };
        }

        return {
            id: crypto.randomUUID(),
            createdAt: seed,
            text: text,
            seed: seed,
            dmProfileId: dmProfile.id,
            xMeta: xMeta, // Attach X Meta
            ytMeta: ytMeta, // Attach YouTube Meta
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
// --- Conversation Manager ---
class ConversationManager {
    constructor() {
        this.storageKey = 'praise_conversations_v1';
        this.conversations = {}; // key: profileId, value: { profileId, messages:[], unreadCount, lastAt }
    }

    init() {
        this.load();
        // Ensure all profiles have entries
        PRAISE_DATA.dmProfiles.forEach(p => {
            if (!this.conversations[p.id]) {
                this.conversations[p.id] = {
                    profileId: p.id,
                    messages: [],
                    unreadCount: 0,
                    lastAt: 0
                };
            }
        });
        this.save();
    }

    load() {
        const raw = localStorage.getItem(this.storageKey);
        if (raw) {
            this.conversations = JSON.parse(raw);
        }
    }

    save() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.conversations));
    }

    // Triggered by User Send
    receiveUpdates(pack) {
        console.log('RECEIVE_UPDATES_START', { packId: pack.id, seed: pack.seed });

        // 1. Pick responders (Seeded) - Ensure seed is numeric
        const seedNum = typeof pack.seed === 'number' ? pack.seed : parseInt(pack.seed) || Date.now();
        const rng = new Random(seedNum);
        // Pick 3 responders usually
        const responders = rng.pickUnique(PRAISE_DATA.dmProfiles, 3);
        console.log('RECEIVE_UPDATES_RESPONDERS', { count: responders.length, ids: responders.map(r => r.id) });

        // 2. Generate messages for them
        const templates = PRAISE_DATA.dmTalkTemplates;

        responders.forEach((profile, idx) => {
            // Unique seed for each responder's message selection - use numeric hash
            const respSeed = seedNum + (profile.id.charCodeAt(0) || 0) * 1000 + idx;
            const respRng = new Random(respSeed);
            const template = respRng.pick(templates);
            const msgText = template.replace('{text}', pack.text);
            console.log('RECEIVE_UPDATES_MSG', { profileId: profile.id, msgText: msgText.substring(0, 30) });

            this.addMessage(profile.id, {
                sender: 'them',
                text: msgText,
                at: Date.now() // Use current time for "Just now" feel, or pack.createdAt
            });
        });
        this.save();
        console.log('RECEIVE_UPDATES_DONE');
    }

    addMessage(profileId, msg) {
        if (!this.conversations[profileId]) return;
        const conv = this.conversations[profileId];
        conv.messages.push(msg);
        conv.unreadCount++;
        conv.lastAt = msg.at;
    }

    markRead(profileId) {
        if (this.conversations[profileId]) {
            this.conversations[profileId].unreadCount = 0;
            this.save();
        }
    }

    getSortedList() {
        return Object.values(this.conversations).sort((a, b) => b.lastAt - a.lastAt);
    }

    getConversation(profileId) {
        return this.conversations[profileId];
    }
}

// --- Skin Renderer ---
class SkinRenderer {
    constructor(displayId, sendCallback, conversationManager) {
        this.container = document.getElementById(displayId);
        this.currentSkin = null;
        this.currentPack = null;
        this.sendCallback = sendCallback;
        this.conversationManager = conversationManager;

        // DM View State
        this.dmState = {
            view: 'list', // 'list' | 'detail'
            activeProfileId: null
        };
    }

    render(praisePack, skinId) {
        console.log('RENDER_CALLED', { skinId, hasPack: !!praisePack });
        this.currentPack = praisePack;
        this.currentSkin = skinId;
        this.container.innerHTML = '';

        switch (skinId) {
            case 'dm':
                console.log('RENDER_DM');
                this.renderDM();
                break;
            case 'x':
                console.log('RENDER_X', { hasPack: !!praisePack });
                if (praisePack) {
                    this.renderX(praisePack);
                } else {
                    this.renderPlaceholder('X', '文字を入力して送信すると、投稿が生成されます');
                }
                break;
            case 'news':
                console.log('RENDER_NEWS', { hasPack: !!praisePack });
                if (praisePack) {
                    this.renderNews(praisePack);
                } else {
                    this.renderPlaceholder('速報', '文字を入力して送信すると、速報が生成されます');
                }
                break;
            case 'youtube':
                console.log('RENDER_YOUTUBE', { hasPack: !!praisePack });
                if (praisePack && praisePack.ytMeta) {
                    this.renderYouTube(praisePack);
                } else {
                    this.renderPlaceholder('YouTube', '文字を入力して送信すると、動画コメントが生成されます');
                }
                break;
        }
    }

    renderPlaceholder(title, message) {
        const d = document.createElement('div');
        d.className = 'skin-placeholder';
        d.innerHTML = `
            <div class="placeholder-content">
                <div class="placeholder-title">${title}</div>
                <div class="placeholder-message">${message}</div>
            </div>
        `;
        this.container.appendChild(d);
    }

    /* --- DM RENDERER (Inbox Style) --- */
    renderDM() {
        if (this.dmState.view === 'list') {
            this.renderDMList();
        } else {
            this.renderDMDetail();
        }
    }

    renderDMList() {
        const d = document.createElement('div');
        d.className = 'skin-dm-list'; // New styling class

        // Header
        const header = document.createElement('div');
        header.className = 'dm-list-header';
        header.innerHTML = `
            <div class="dm-list-action">編集</div>
            <div class="dm-list-title">トーク</div>
            <div class="dm-list-action">✎</div>
        `;
        d.appendChild(header);

        // List
        const listContainer = document.createElement('div');
        listContainer.className = 'dm-list-body';

        const conversations = this.conversationManager.getSortedList();

        conversations.forEach(conv => {
            const p = PRAISE_DATA.dmProfiles.find(x => x.id === conv.profileId);
            if (!p) return;

            const lastMsg = conv.messages.length > 0 ? conv.messages[conv.messages.length - 1] : null;
            const snippet = lastMsg ? lastMsg.text : '新着メッセージはありません';
            const unreadClass = conv.unreadCount > 0 ? '' : 'hidden';

            // Time formatting (Simple)
            let timeDisp = '';
            if (lastMsg) {
                const dt = new Date(lastMsg.at);
                timeDisp = `${dt.getHours()}:${dt.getMinutes().toString().padStart(2, '0')}`;
            }

            const item = document.createElement('div');
            item.className = 'dm-list-item';
            item.innerHTML = `
                <div class="dm-list-avatar" style="background-color:hsl(${p.avatar.hue}, 70%, 60%)">${p.avatar.text}</div>
                <div class="dm-list-content">
                    <div class="dm-list-name">${p.displayName}</div>
                    <div class="dm-list-snippet">${snippet}</div>
                </div>
                <div class="dm-list-right">
                    <span class="dm-list-time">${timeDisp}</span>
                    <div class="dm-list-badge ${unreadClass}">${conv.unreadCount}</div>
                </div>
            `;
            item.onclick = () => {
                this.dmState.view = 'detail';
                this.dmState.activeProfileId = p.id;
                this.conversationManager.markRead(p.id);
                this.renderDM(); // Re-render
            };
            listContainer.appendChild(item);
        });

        d.appendChild(listContainer);
        this.container.appendChild(d);
    }

    renderDMDetail() {
        const pId = this.dmState.activeProfileId;
        const conv = this.conversationManager.getConversation(pId);
        const p = PRAISE_DATA.dmProfiles.find(x => x.id === pId);

        const d = document.createElement('div');
        d.className = 'skin-dm-detail';

        // Header
        const header = document.createElement('div');
        header.className = 'dm-detail-header';
        header.innerHTML = `
            <div class="dm-back-btn">←</div>
            <div class="dm-detail-name">${p.displayName}</div>
            <div class="dm-detail-menu">≡</div>
        `;
        d.querySelector('.dm-back-btn').onclick = () => {
            this.dmState.view = 'list';
            this.dmState.activeProfileId = null;
            this.renderDM();
        };

        d.appendChild(header);

        // Body
        const body = document.createElement('div');
        body.className = 'dm-detail-body';

        // Render Messages
        conv.messages.forEach(msg => {
            const row = document.createElement('div');
            row.className = `dm-msg-row ${msg.sender}`; // 'me' or 'them'

            if (msg.sender === 'them') {
                row.innerHTML = `
                    <div class="dm-msg-avatar" style="background-color:hsl(${p.avatar.hue}, 70%, 60%)">${p.avatar.text}</div>
                    <div class="dm-msg-bubble">${msg.text}</div>
                    <div class="dm-msg-time"></div>
                `;
            } else {
                row.innerHTML = `<div class="dm-msg-bubble">${msg.text}</div>`;
            }
            body.appendChild(row);
        });

        d.appendChild(body);

        // Dummy Footer
        const footer = document.createElement('div');
        footer.className = 'dm-detail-footer';
        footer.innerHTML = `
            <div class="dm-footer-plus">＋</div>
            <div class="dm-footer-input">メッセージを入力</div>
            <div class="dm-footer-mic">🎤</div>
        `;
        d.appendChild(footer);

        this.container.appendChild(d);
        // Scroll to bottom
        setTimeout(() => body.scrollTop = body.scrollHeight, 0);
    }

    /* --- X RENDERER --- */
    renderX(pack) {
        this.container.innerHTML = '';

        const d = document.createElement('div');
        d.className = 'skin-x';

        // --- 1. User Post Section (Calm, Fixed User) ---
        const userSection = document.createElement('div');
        userSection.className = 'x-user-section';

        const fixedUser = PRAISE_DATA.xFixedUser;
        const seed = pack.seed;

        // Pick a calm template using seed
        const templates = PRAISE_DATA.xUserPostTemplates;
        // Seeded random for template
        // Simple seeded random function
        const seededRandom = function (s) {
            let t = 0;
            for (let i = 0; i < s.length; i++) t += s.charCodeAt(i);
            const x = Math.sin(t) * 10000;
            return x - Math.floor(x);
        };
        const rVal = seededRandom(seed + 'xBodyTemplate');
        const template = templates[Math.floor(rVal * templates.length)];
        const userBodyText = template.replace('{text}', pack.text);

        // Generate consistent time
        const rTime = seededRandom(seed + 'xTimeMain');
        const timePresets = PRAISE_DATA.timePresets.main;
        const timeStr = timePresets[Math.floor(rTime * timePresets.length)];

        userSection.innerHTML = `
            <div class="x-user-post-container">
                <div class="x-post-header">
                    <div class="x-avatar user-avatar">${fixedUser.avatar}</div>
                    <div class="x-user-info">
                        <span class="x-display-name">${fixedUser.name}</span>
                        <span class="x-handle">${fixedUser.handle}</span>
                    </div>
                    <div class="x-more-menu">···</div>
                </div>
                <!-- Calm Body -->
                <div class="x-post-body calm-body">
                    ${userBodyText}
                </div>
                <div class="x-post-meta">
                    <span class="x-time">${timeStr}</span> · <span class="x-date">2026/01/17</span>
                </div>
            </div>
        `;
        d.appendChild(userSection);

        // --- 2. External Buzz Section (The Hype) ---
        const externalSection = document.createElement('div');
        externalSection.className = 'x-external-section';

        // Use the original "headline" as the "Target of Buzz" or Trending Topic
        const trendingHTML = `
            <div class="x-trend-context-bar">
                <span class="x-trend-rank">Trending</span>
                <span class="x-trend-topic">${pack.headlines}</span>
            </div>
        `;

        // Stats
        const stats = pack.stats; // Use existing stats
        const views = stats.views.toLocaleString();

        const statsArea = `
            <div class="x-buzz-metrics">
                <div class="x-metric-views"><span class="x-val">${views}</span> <span class="x-lbl">Views</span></div>
                <div class="x-metric-row">
                    <div class="x-metric"><span class="x-val">${stats.reposts.toLocaleString()}</span> <span class="x-lbl">Reposts</span></div>
                    <div class="x-metric"><span class="x-val">${stats.likes.toLocaleString()}</span> <span class="x-lbl">Likes</span></div>
                    <div class="x-metric"><span class="x-val">${stats.bookmarks.toLocaleString()}</span> <span class="x-lbl">Bookmarks</span></div>
                </div>
            </div>
        `;

        // Actions - Horizontal with numbers
        const actions = `
            <div class="x-action-bar">
                <div class="x-action-item"><span>💬</span><span>${Math.floor(stats.reposts * 0.1).toLocaleString()}</span></div>
                <div class="x-action-item retweeted"><span>🔁</span><span>${stats.reposts.toLocaleString()}</span></div>
                <div class="x-action-item liked"><span>❤️</span><span>${stats.likes.toLocaleString()}</span></div>
                <div class="x-action-item"><span>🔖</span><span>${stats.bookmarks.toLocaleString()}</span></div>
                <div class="x-action-item"><span>↗️</span></div>
            </div>
        `;

        externalSection.innerHTML = trendingHTML + statsArea + actions;

        // Thread Container
        const thread = document.createElement('div');
        thread.className = 'x-thread-container';

        // 1. Experts (Serious)
        const expert = PRAISE_DATA.xProfiles.experts[0]; // Simplification: assume consistent order or use seed in future
        if (expert) {
            thread.innerHTML += this.buildXQuote(expert, pack.expertQuote, '2h');
        }

        // 2. Influencers (Emoji)
        const inf = PRAISE_DATA.xProfiles.influencers[0];
        if (inf) {
            thread.innerHTML += this.buildXQuote(inf, pack.influencerQuote, '1h');
        }

        // 3. Celebrities
        const celeb = PRAISE_DATA.xProfiles.celebrities[0];
        if (celeb) {
            thread.innerHTML += this.buildXQuote(celeb, pack.celebrityQuote, '30m');
        }

        // 4. Otakus
        const otaku = PRAISE_DATA.xProfiles.otakus[0];
        if (otaku) {
            thread.innerHTML += this.buildXQuote(otaku, pack.otakuQuote, '10m');
        }

        // 5. Replies
        pack.crowdReplies.forEach((txt, i) => {
            thread.innerHTML += this.buildXReply(txt, `User${i + 100}`, '5m', true);
        });

        // 6. Official
        if (pack.officialQuote) {
            const off = PRAISE_DATA.xProfiles.officials[0];
            const officialHtml = `
                <div class="x-official-note">
                    <div class="x-official-icon">🎉</div>
                    <div class="x-official-content">
                        <b>${off ? off.name : 'Official'}</b> commended this post.
                    </div>
                </div>
             `;
            thread.innerHTML += officialHtml;
        }

        externalSection.appendChild(thread);
        d.appendChild(externalSection);

        this.container.appendChild(d);
    }

    buildXQuote(profile, text, time) {
        if (!profile) return '';
        return `<div class="x-quote-card">
                <div class="x-quote-header">
                    <div class="x-quote-avatar" style="background-color:hsl(${profile.hue},70%,50%)">${profile.avatar}</div>
                    <div class="x-quote-info">
                        <span class="x-quote-name">${profile.name}</span>
                        ${profile.handle} • ${time}
                    </div>
                </div>
                <div class="x-quote-body">${text}</div>
            </div>`;
    }

    buildXReply(text, name, time, isThread) {
        // Simplified random avatars for crowd
        const hue = Math.floor(Math.random() * 360);
        const avText = name[0];

        return `<div class="x-reply-item">
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
            </div>`;
    }


    /* --- NEWS RENDERER --- */
    renderNews(pack) {
        const d = document.createElement('div');
        d.className = 'skin-news';

        // Pick station name using seed
        const stations = PRAISE_DATA.newsStationNames || ['KASU NEWS'];
        const seedStr = String(pack.seed);
        const stationIdx = Math.abs(seedStr.charCodeAt(0) || 0) % stations.length;
        const stationName = stations[stationIdx];

        // Current time
        const now = new Date();
        const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

        // Views as concurrent viewers
        const viewers = pack.stats ? pack.stats.views.toLocaleString() : '128,394';

        d.innerHTML = `
            <div class="news-bg"></div>
            <div class="news-hud">
                <div class="news-hud-left">
                    <span class="news-live-dot">●</span>
                    <span class="news-live-text">LIVE</span>
                    <span class="news-station">${stationName}</span>
                </div>
                <div class="news-hud-right">
                    <span class="news-time">${timeStr}</span>
                    <span class="news-viewers">${viewers}人視聴中</span>
                </div>
            </div>
            <div class="news-scroll-ticker">
                <div class="news-scroll-content">
                    続報：${pack.influencerQuote} ／ SNS反応：${pack.otakuQuote} ／ 専門家：${pack.expertPreface}
                </div>
            </div>
            <div class="news-content">
                <div class="news-expert-box">
                    <div class="news-expert-label">専門家解説</div>
                    <div class="news-expert-text">${pack.expertQuote}</div>
                </div>
                <div class="news-main-headline">
                    <div class="news-headline-text">${pack.headlines}</div>
                </div>
            </div>
        `;
        this.container.appendChild(d);
    }

    /* --- YOUTUBE RENDERER --- */
    renderYouTube(pack) {
        const yt = pack.ytMeta;
        const d = document.createElement('div');
        d.className = 'skin-youtube';

        // State for expandable replies
        const expandedState = {};

        // Build comments HTML
        const buildCommentHtml = (comment, isReply = false) => {
            const user = comment.user;
            const verifiedBadge = user.verified ? '<span class="yt-verified">✓</span>' : '';
            const pinnedBadge = comment.pinned ? '<div class="yt-pinned-badge">📌 固定済み</div>' : '';
            const editedText = comment.edited ? '（編集済み）' : '';
            const likesCount = comment.likes.toLocaleString();

            // Truncate long text
            const maxLen = 100;
            const isTruncated = comment.text.length > maxLen;
            const displayText = isTruncated ? comment.text.substring(0, maxLen) + '...' : comment.text;

            return `
                <div class="yt-comment ${isReply ? 'yt-reply' : ''}" data-id="${comment.id}">
                    ${pinnedBadge}
                    <div class="yt-comment-row">
                        <div class="yt-comment-avatar" style="background-color:hsl(${user.hue}, 60%, 50%)">${user.avatar}</div>
                        <div class="yt-comment-content">
                            <div class="yt-comment-header">
                                <span class="yt-comment-name">${user.name}</span>${verifiedBadge}
                                <span class="yt-comment-time">${comment.time}${editedText}</span>
                            </div>
                            <div class="yt-comment-text ${isTruncated ? 'yt-truncated' : ''}">${displayText}</div>
                            ${isTruncated ? `<button class="yt-read-more" data-full="${encodeURIComponent(comment.text)}">続きを読む</button>` : ''}
                            <div class="yt-comment-actions">
                                <button class="yt-like-btn" data-likes="${comment.likes}">👍 <span class="yt-like-count">${likesCount}</span></button>
                                <button class="yt-dislike-btn">👎</button>
                                <button class="yt-reply-btn">返信</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        };

        // Build reply thread
        const buildReplyThread = (parentComment) => {
            if (!parentComment.replies || parentComment.replies.length === 0) return '';
            const count = parentComment.replies.length;
            const repliesHtml = parentComment.replies.map(r => buildCommentHtml(r, true)).join('');
            return `
                <div class="yt-reply-thread" data-parent="${parentComment.id}">
                    <button class="yt-replies-toggle" data-count="${count}">
                        <span class="yt-toggle-icon">▶</span> 返信${count}件を表示
                    </button>
                    <div class="yt-replies-container" style="display: none;">
                        ${repliesHtml}
                    </div>
                </div>
            `;
        };

        // Build all comments
        let commentsHtml = '';
        yt.comments.forEach(comment => {
            commentsHtml += buildCommentHtml(comment);
            commentsHtml += buildReplyThread(comment);
        });

        d.innerHTML = `
            <div class="yt-player-area">
                <div class="yt-video-placeholder">
                    <div class="yt-play-icon">▶</div>
                </div>
                <div class="yt-video-progress"></div>
            </div>
            <div class="yt-video-info">
                <div class="yt-video-title">${yt.title}</div>
                <div class="yt-video-meta">
                    <span>${yt.views.toLocaleString()}回視聴</span>
                    <span>•</span>
                    <span>${yt.postedAt}</span>
                </div>
                <div class="yt-video-actions">
                    <button class="yt-action-btn liked">👍 ${yt.likes.toLocaleString()}</button>
                    <button class="yt-action-btn">👎</button>
                    <button class="yt-action-btn">↗️ 共有</button>
                    <button class="yt-action-btn">📥 保存</button>
                </div>
            </div>
            <div class="yt-channel-row">
                <div class="yt-channel-avatar" style="background-color:hsl(${yt.channel.hue}, 60%, 50%)">${yt.channel.avatar}</div>
                <div class="yt-channel-info">
                    <div class="yt-channel-name">${yt.channel.name}${yt.channel.verified ? ' <span class="yt-verified">✓</span>' : ''}</div>
                    <div class="yt-channel-handle">${yt.channel.handle}</div>
                </div>
                <button class="yt-subscribe-btn">登録済み</button>
            </div>
            <div class="yt-comments-section">
                <div class="yt-comments-header">
                    <span class="yt-comments-count">コメント ${yt.commentsCount.toLocaleString()}件</span>
                    <div class="yt-sort-chips">
                        <button class="yt-sort-chip active">人気順</button>
                        <button class="yt-sort-chip">新しい順</button>
                    </div>
                </div>
                <div class="yt-guidelines-notice">
                    <span>💬</span> コメントは敬意を持って行いましょう
                </div>
                <div class="yt-comments-list">
                    ${commentsHtml}
                </div>
                <div class="yt-comment-input-bar">
                    <div class="yt-input-avatar">あ</div>
                    <input type="text" placeholder="コメントを追加..." disabled>
                </div>
            </div>
        `;

        this.container.appendChild(d);

        // Add event listeners
        this.attachYouTubeEvents(d);
    }

    attachYouTubeEvents(container) {
        // Reply toggle
        container.querySelectorAll('.yt-replies-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const thread = btn.closest('.yt-reply-thread');
                const repliesContainer = thread.querySelector('.yt-replies-container');
                const icon = btn.querySelector('.yt-toggle-icon');
                const count = btn.dataset.count;

                if (repliesContainer.style.display === 'none') {
                    repliesContainer.style.display = 'block';
                    icon.textContent = '▼';
                    btn.innerHTML = `<span class="yt-toggle-icon">▼</span> 返信${count}件を非表示`;
                } else {
                    repliesContainer.style.display = 'none';
                    icon.textContent = '▶';
                    btn.innerHTML = `<span class="yt-toggle-icon">▶</span> 返信${count}件を表示`;
                }
            });
        });

        // Like button
        container.querySelectorAll('.yt-like-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.classList.contains('liked')) return;
                btn.classList.add('liked');
                const countSpan = btn.querySelector('.yt-like-count');
                const currentLikes = parseInt(btn.dataset.likes);
                countSpan.textContent = (currentLikes + 1).toLocaleString();
            });
        });

        // Read more
        container.querySelectorAll('.yt-read-more').forEach(btn => {
            btn.addEventListener('click', () => {
                const textEl = btn.previousElementSibling;
                textEl.textContent = decodeURIComponent(btn.dataset.full);
                textEl.classList.remove('yt-truncated');
                btn.remove();
            });
        });

        // Sort chips
        container.querySelectorAll('.yt-sort-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                container.querySelectorAll('.yt-sort-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
            });
        });
    }
}

// --- App Controller ---
document.addEventListener('DOMContentLoaded', () => {
    const engine = new PraiseEngine(PRAISE_DATA);
    let currentSkin = 'dm';
    let currentPack = null;

    // Init Managers
    const conversationManager = new ConversationManager();
    conversationManager.init();

    const dom = {
        controls: document.querySelector('.controls-container'),
        input: document.getElementById('eventInput'),
        sendBtn: document.getElementById('sendBtn'),
        historyList: document.getElementById('historyList'),
        historyArea: document.getElementById('historyArea'),
        skinBtns: document.querySelectorAll('.skin-btn')
    };

    function send(text) {
        try {
            console.log('ON_SEND_START', { activeTab: currentSkin, textLen: text ? text.length : 0, textPreview: text ? text.substring(0, 20) : '' });

            if (!text || !text.trim()) {
                console.log('ON_SEND_GUARD_RETURN', { reason: 'text empty or whitespace' });
                return;
            }

            console.log('ON_SEND_GENERATING_PACK');
            currentPack = engine.generatePack(text.trim());
            console.log('ON_SEND_PACK_GENERATED', { eventId: currentPack.id });

            // Update Conversations (Inbox Logic)
            try {
                conversationManager.receiveUpdates(currentPack);
                console.log('ON_SEND_CONVERSATIONS_UPDATED');
            } catch (convErr) {
                console.error('ON_SEND_CONVERSATION_ERROR', convErr);
            }

            saveToHistory(currentPack);

            // Clear input BEFORE render to ensure it's cleared
            dom.input.value = '';
            console.log('ON_SEND_INPUT_CLEARED', { inputValueAfterClear: dom.input.value });

            render();

            updateHistoryUI();
            updateDebugHUD();
            console.log('ON_SEND_DONE', { eventId: currentPack.id, currentEventText: currentPack.text });
        } catch (err) {
            console.error('ON_SEND_ERROR', err);
        }
    }

    const renderer = new SkinRenderer('displayArea', send, conversationManager);
    const dbKey = 'sns-praise-history';

    function render() {
        console.log('RENDER_CALLED', { currentSkin, hasCurrentPack: !!currentPack, packId: currentPack ? currentPack.id : null });
        renderer.render(currentPack, currentSkin);
        updateDebugHUD();
    }

    // Debug HUD
    function updateDebugHUD() {
        let hud = document.getElementById('debugHUD');
        if (!hud) {
            hud = document.createElement('div');
            hud.id = 'debugHUD';
            hud.style.cssText = 'position:fixed;bottom:10px;right:10px;background:rgba(0,0,0,0.8);color:#0f0;padding:8px;font-size:10px;font-family:monospace;z-index:9999;border-radius:4px;';
            document.body.appendChild(hud);
        }
        hud.innerHTML = `
            activeTab: ${currentSkin}<br>
            inputLen: ${dom.input.value.length}<br>
            packId: ${currentPack ? currentPack.id.substring(0, 8) : 'null'}<br>
            packText: ${currentPack ? currentPack.text.substring(0, 15) : 'null'}
        `;
    }

    function setSkin(skinId) {
        currentSkin = skinId;
        dom.skinBtns.forEach(b => {
            if (b.dataset.skin === skinId) b.classList.add('active');
            else b.classList.remove('active');
        });

        // Hide history for all skins; DM uses internal inbox, X/News don't need it
        dom.historyArea.style.display = 'none';

        if (skinId === 'dm') {
            dom.controls.classList.add('dm-active');
        } else {
            dom.controls.classList.remove('dm-active');
        }

        render();
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

    dom.sendBtn.addEventListener('click', () => {
        console.log('CLICK_SEND', { inputValue: dom.input.value, inputLen: dom.input.value.length, currentSkin });
        send(dom.input.value);
    });
    dom.input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            console.log('KEYPRESS_ENTER', { inputValue: dom.input.value });
            send(dom.input.value);
        }
    });
    dom.input.addEventListener('input', (e) => {
        console.log('INPUT_CHANGE', { value: e.target.value, len: e.target.value.length });
    });
    dom.skinBtns.forEach(btn => btn.addEventListener('click', () => {
        console.log('SKIN_BTN_CLICK', { skin: btn.dataset.skin });
        setSkin(btn.dataset.skin);
    }));

    setSkin(currentSkin);
    updateHistoryUI();
});
