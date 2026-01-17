/**
 * SNS Praise Skins - Logic
 */

// --- Utils ---
const NewsUtils = {
    clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); },
    roundTo(n, decimals) { const p = Math.pow(10, decimals); return Math.round(n * p) / p; },
    pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; },
    randInt(rng, min, max) { return Math.floor(rng() * (max - min + 1)) + min; },
    formatDateTimeJP(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        return `${y}/${m}/${day} ${hh}:${mm}`;
    },
    formatTimeHM(d) {
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        return `${hh}:${mm}`;
    },
    addMinutes(date, mins) { return new Date(date.getTime() + mins * 60_000); },
    extractKeyword(textRaw, maxLen = 12) {
        const text = (textRaw || "").trim();
        if (!text) return "今日やった";
        const m1 = text.match(/（([^）]+)）/);
        if (m1?.[1]) return this.truncate(this.cleanTail(m1[1]), maxLen);
        const m2 = text.match(/\(([^)]+)\)/);
        if (m2?.[1]) return this.truncate(this.cleanTail(m2[1]), maxLen);
        const seps = ["、", "・", "／", "/", "|", "｜", "-", "—", "–", "：", ":", ">", "＞"];
        let part = text;
        for (const s of seps) {
            const arr = part.split(s).map((x) => x.trim()).filter(Boolean);
            if (arr.length >= 2) part = arr[arr.length - 1];
        }
        const particle = part.match(/^(.+?)(を|に|へ|で|と|が|は|の)\b/);
        if (particle?.[1]) part = particle[1];
        part = this.cleanTail(part);
        if (!part) part = text;
        return this.truncate(part, maxLen);
    },
    truncate(s, n) {
        const t = (s || "").trim();
        if (t.length <= n) return t;
        return t.slice(0, n);
    },
    cleanTail(s) {
        let t = (s || "").trim();
        const endings = ["した", "する", "やった", "やる", "できた", "完了", "終了", "ました", "ます"];
        for (const e of endings) {
            if (t.endsWith(e)) {
                t = t.slice(0, -e.length).trim();
                break;
            }
        }
        return t;
    },
    splitToParagraphs(postBodyRaw, paragraphCount = 4) {
        const body = (postBodyRaw || "").trim();
        if (!body) return [];
        const hasNl = body.includes("\n");
        let sentences = [];
        if (hasNl) {
            sentences = body.split("\n").map((x) => x.trim()).filter(Boolean);
        } else {
            sentences = body.split("。").map((x) => x.trim()).filter(Boolean).map((x) => x + "。");
        }
        if (sentences.length <= 1) return [body];
        const k = this.clamp(paragraphCount, 3, 5);
        const result = [];
        const per = Math.ceil(sentences.length / k);
        for (let i = 0; i < sentences.length; i += per) {
            result.push(sentences.slice(i, i + per).join(hasNl ? "\n" : ""));
        }
        return result.filter(Boolean);
    },
    pickUnique(rng, arr, count) {
        const pool = [...arr];
        const out = [];
        const c = Math.min(count, pool.length);
        for (let i = 0; i < c; i++) {
            const idx = Math.floor(rng() * pool.length);
            out.push(pool[idx]);
            pool.splice(idx, 1);
        }
        return out;
    },
    pickUpdatedAgo(rng, presets) {
        if (presets && presets.length) return this.pick(rng, presets);
        const mins = this.pick(rng, [2, 3, 5, 7, 11, 15]);
        return `Updated ${mins}m ago`;
    },
    buildTimeline(createdAt, offsets, step1, step2, step3) {
        const base = createdAt instanceof Date ? createdAt : new Date(createdAt);
        const t1 = this.formatTimeHM(this.addMinutes(base, offsets.a));
        const t2 = this.formatTimeHM(this.addMinutes(base, offsets.b));
        const t3 = this.formatTimeHM(this.addMinutes(base, offsets.c));
        return [
            { time: t1, text: step1 },
            { time: t2, text: step2 },
            { time: t3, text: step3 }
        ];
    },
    toShortQuote(s, maxLen = 54) {
        const t = (s || "").replace(/\s+/g, " ").trim();
        if (!t) return "";
        if (t.length <= maxLen) return t;
        return t.slice(0, maxLen - 1) + "…";
    },
    formatSignedPercent(n, decimals = 2) {
        const v = this.roundTo(n, decimals);
        const sign = v >= 0 ? "+" : "";
        return `${sign}${v.toFixed(decimals)}%`;
    }
};

const PapalUtils = {
    pad4(n) { return String(n).padStart(4, "0"); },
    buildDocId(format, createdAt, nnnn) {
        const d = new Date(createdAt);
        const YYYY = d.getFullYear();
        const MM = String(d.getMonth() + 1).padStart(2, "0");
        const DD = String(d.getDate()).padStart(2, "0");
        return format
            .replace("{YYYY}", String(YYYY))
            .replace("{MM}", MM)
            .replace("{DD}", DD)
            .replace("{NNNN}", this.pad4(nnnn));
    },
    toShortLine(s, maxLen = 70) {
        const t = (s || "").replace(/\s+/g, " ").trim();
        if (!t) return "";
        if (t.length <= maxLen) return t;
        return t.slice(0, maxLen - 1) + "…";
    }
};

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

        // 6. Stock Pack (if data available)
        let stockPack = null;
        if (d.stock) {
            stockPack = this.generateStockPack(text, rng, d);
        }

        const pack = {
            id: crypto.randomUUID(),
            createdAt: seed,
            text: text,
            seed: seed,
            dmProfileId: dmProfile.id,
            xMeta: xMeta, // Attach X Meta
            ytMeta: ytMeta, // Attach YouTube Meta
            stockPack: stockPack, // Attach Stock Pack
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

        // 7. News Digital (Seed fixed)
        if (d.newsDigital) {
            pack.newsDigital = this.generateNewsDigitalPack(text, seed, d, pack);
        }
        // 8. Papal (Seed fixed)
        if (d.papal) {
            pack.papal = this.generatePapalPack(text, seed, d, pack);
        }
        // 9. EarthCam (Seed fixed)
        if (d.earthCam) {
            pack.earthCam = this.generateEarthCamPack(text, seed, d, pack);
        }

        return pack;
    }

    generateStockPack(text, rng, d) {
        const stock = d.stock;
        const ranges = stock.numberRanges;

        // Category detection
        let category = 'other';
        for (const [cat, keywords] of Object.entries(stock.categoryMatch)) {
            if (keywords.some(kw => text.includes(kw))) {
                category = cat;
                break;
            }
        }

        // Keyword extraction (first 12 chars or full text)
        const keyword = text.length > 12 ? text.substring(0, 12) : text;

        // Ticker selection
        const tickerOptions = stock.tickerPresetsByCategory[category] || stock.tickerPresetsByCategory.other;
        const ticker = rng.pick(tickerOptions);

        // Company name
        const companyTemplate = rng.pick(stock.companyNameTemplates);
        const companyName = companyTemplate.replace(/{keyword}/g, keyword);

        // Market mood
        const marketMood = rng.pick(stock.marketMoodLabels);

        // Price data
        const priceNow = this.randFloat(rng, ranges.price.min, ranges.price.max, ranges.price.decimals);
        const isSpike = rng.next() < (ranges.pctChangeSpike?.probability || 0.08);
        const pctChange = isSpike
            ? this.randFloat(rng, ranges.pctChangeSpike.min, ranges.pctChangeSpike.max, ranges.pctChangeSpike.decimals)
            : this.randFloat(rng, ranges.pctChange.min, ranges.pctChange.max, ranges.pctChange.decimals);
        const changeAbs = parseFloat((priceNow * pctChange / 100).toFixed(1));
        const volume = rng.nextInt(ranges.volume.min, ranges.volume.max);
        const marketCap = rng.nextInt(ranges.marketCap.min, ranges.marketCap.max);
        const volatility = this.randFloat(rng, ranges.volatility.min, ranges.volatility.max, ranges.volatility.decimals);

        // Chart marker
        const markerTemplate = rng.pick(stock.chartEventMarkerTemplates);
        const markerLabel = markerTemplate.replace(/{text}/g, text).replace(/{keyword}/g, keyword);

        // World tickers
        const worldTickers = stock.worldTickerPresets.map(t => {
            let move;
            if (t.symbol === 'KASU500') move = this.randFloat(rng, ranges.worldMove.min, ranges.worldMove.max, ranges.worldMove.decimals);
            else if (t.symbol === 'WORLD_GDP') move = this.randFloat(rng, ranges.worldGdpMove.min, ranges.worldGdpMove.max, ranges.worldGdpMove.decimals);
            else move = this.randFloat(rng, ranges.oilMove.min, ranges.oilMove.max, ranges.oilMove.decimals);
            return { ...t, move };
        });

        // Market news (3 items)
        const newsTemplates = rng.pickUnique(stock.marketNewsTemplates, 3);
        const newsItems = newsTemplates.map((tpl, i) => ({
            text: tpl.replace(/{keyword}/g, keyword),
            ago: [2, 7, 15][i] || (i + 1) * 5
        }));

        // Order book (8 levels)
        const orderBook = {
            bids: [],
            asks: []
        };
        const step = priceNow * 0.001; // 0.1% step
        for (let i = 0; i < 8; i++) {
            orderBook.bids.push({
                price: parseFloat((priceNow - step * (i + 1)).toFixed(1)),
                size: rng.nextInt(100, 5000),
                label: rng.pick(stock.orderBookBidLabels)
            });
            orderBook.asks.push({
                price: parseFloat((priceNow + step * (i + 1)).toFixed(1)),
                size: rng.nextInt(50, 2000),
                label: rng.pick(stock.orderBookAskLabels)
            });
        }

        // Tape trades (12 items)
        const tape = [];
        let lastPrice = priceNow;
        for (let i = 0; i < 12; i++) {
            const delta = (rng.next() - 0.4) * 0.5; // slight upward bias
            lastPrice = parseFloat((lastPrice + delta).toFixed(1));
            tape.push({
                time: `${10 + i}:${Math.floor(rng.next() * 60).toString().padStart(2, '0')}`,
                price: lastPrice,
                size: rng.nextInt(10, 500),
                side: rng.next() > 0.3 ? 'buy' : 'sell'
            });
        }

        // Chart data for each tab
        const charts = {};
        const tabs = ['1D', '1W', '1M', '1Y', 'ALL'];
        const chartRules = stock.renderRules.chartTypeByTab;

        tabs.forEach(tab => {
            const chartType = chartRules[tab] || 'line';
            const n = tab === '1D' ? 48 : tab === '1W' ? 35 : tab === '1M' ? 30 : tab === '1Y' ? 52 : 100;
            const eventIdx = Math.floor(n * (0.55 + rng.next() * 0.2));

            if (chartType === 'candles') {
                const candles = this.genCandles(rng, n, priceNow * 0.85);
                charts[tab] = { type: 'candles', data: candles, eventIdx };
            } else {
                const series = this.genLineSeries(rng, n, priceNow * 0.85);
                charts[tab] = { type: 'line', data: series, eventIdx };
            }
        });

        return {
            category,
            keyword,
            ticker,
            companyName,
            marketMood,
            priceNow,
            pctChange,
            changeAbs,
            volume,
            marketCap,
            volatility,
            high: parseFloat((priceNow * 1.02).toFixed(1)),
            low: parseFloat((priceNow * 0.97).toFixed(1)),
            markerLabel,
            worldTickers,
            newsItems,
            orderBook,
            tape,
            charts
        };
    }

    randFloat(rng, min, max, decimals = 2) {
        const val = rng.next() * (max - min) + min;
        return parseFloat(val.toFixed(decimals));
    }

    genLineSeries(rng, n, base) {
        let p = base;
        const eventIdx = Math.floor(n * (0.55 + rng.next() * 0.2));
        const gap = 1 + (0.05 + rng.next() * 0.25);
        const series = [];
        for (let i = 0; i < n; i++) {
            const drift = 1 + (0.002 + rng.next() * 0.02);
            const wiggle = 1 + ((rng.next() - 0.5) * 0.06);
            p = p * drift * wiggle;
            if (i === eventIdx) p = p * gap;
            series.push(parseFloat(p.toFixed(1)));
        }
        return series;
    }

    genCandles(rng, n, base) {
        let p = base;
        const eventIdx = Math.floor(n * (0.55 + rng.next() * 0.2));
        const gap = 1 + (0.06 + rng.next() * 0.28);
        const candles = [];
        for (let i = 0; i < n; i++) {
            const open = p;
            const body = (rng.next() - 0.5) * 0.06;
            let close = open * (1 + body);
            const wickUp = open * (1 + rng.next() * 0.04);
            const wickDn = open * (1 - rng.next() * 0.04);
            if (i === eventIdx) close = close * gap;
            const high = Math.max(open, close, wickUp);
            const low = Math.min(open, close, wickDn);
            candles.push({
                o: parseFloat(open.toFixed(1)),
                h: parseFloat(high.toFixed(1)),
                l: parseFloat(low.toFixed(1)),
                c: parseFloat(close.toFixed(1))
            });
            p = close;
        }
        return candles;
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
    generateNewsDigitalPack(text, seed, d, praisePack) {
        // Seeded RNG
        const s = typeof seed === 'number' ? seed : Date.now();
        // Create a simple RNG function compatible with Utils
        // Using Xoshiro-like or simple weak RNG for deterministic UI
        let localSeed = s + 9999;
        const rng = () => {
            localSeed = (localSeed * 9301 + 49297) % 233280;
            return localSeed / 233280;
        };

        const nd = d.newsDigital;
        const brand = NewsUtils.pick(rng, nd.brandPresets);
        const label = NewsUtils.pick(rng, nd.labelPresets);
        const byline = NewsUtils.pick(rng, nd.bylinePresets);
        const updatedAgo = NewsUtils.pick(rng, nd.updatedAgoPresets) || NewsUtils.pickUpdatedAgo(rng);
        const keyword = NewsUtils.extractKeyword(text);

        const subhead = NewsUtils.pick(rng, nd.subheadTemplates).replace(/{keyword}/g, keyword);
        const lead = NewsUtils.pick(rng, nd.leadTemplates).replace(/{text}/g, text);

        // Timeline
        const offset = NewsUtils.pick(rng, nd.timelineMinuteOffsets);
        const step1 = NewsUtils.pick(rng, nd.timelineTemplates.step1).replace(/{text}/g, text).replace(/{text}/g, keyword).replace(/{keyword}/g, keyword);
        const step2 = NewsUtils.pick(rng, nd.timelineTemplates.step2);
        const step3 = NewsUtils.pick(rng, nd.timelineTemplates.step3);
        const createdAt = new Date(praisePack.createdAt);
        const timeline = NewsUtils.buildTimeline(createdAt, offset, step1, step2, step3);

        // Markets
        const markets = nd.marketsPanelPresets.map(preset => {
            let key = 'oil';
            if (preset.symbol === 'KASU500') key = 'kasu500';
            else if (preset.symbol === 'WORLD_GDP') key = 'worldGdp';

            // Try to reuse Stock Pack data if reasonable? 
            // stockPack might not match symbol exactly or logic differs. 
            // We use newsDigital ranges for consistency with request.
            const range = nd.marketsMoveRanges[key] || { min: -1, max: 1, decimals: 2 };
            const val = NewsUtils.randInt(rng, range.min * 100, range.max * 100) / 100;
            return {
                ...preset,
                value: val,
                formatted: NewsUtils.formatSignedPercent(val, range.decimals)
            };
        });

        // Related
        const related = NewsUtils.pickUnique(rng, nd.relatedHeadlineTemplates, 3).map(t => t.replace(/{keyword}/g, keyword));

        // Newsletter
        const newsletter = {
            title: NewsUtils.pick(rng, nd.newsletterTemplates.title),
            desc: NewsUtils.pick(rng, nd.newsletterTemplates.desc),
            cta: NewsUtils.pick(rng, nd.newsletterTemplates.cta)
        };

        // Voices Title
        const voicesTitle = NewsUtils.pick(rng, nd.voicesTitlePresets);

        return {
            brand, label, byline, updatedAgo, keyword, subhead, lead,
            timeline, markets, related, newsletter, voicesTitle,
            fictionNotice: nd.fictionNotice
        };
    }
    generatePapalPack(text, seed, d, praisePack) {
        // Seeded RNG
        const s = typeof seed === 'number' ? seed : Date.now();
        let localSeed = s + 7777; // Different offset
        const rng = () => {
            localSeed = (localSeed * 9301 + 49297) % 233280;
            return localSeed / 233280;
        };
        // Simple helper using local rng
        const pick = (arr) => arr[Math.floor(rng() * arr.length)];
        const pickUnique = (arr, count) => {
            const pool = [...arr];
            const out = [];
            for (let i = 0; i < count; i++) {
                if (pool.length === 0) break;
                const idx = Math.floor(rng() * pool.length);
                out.push(pool[idx]);
                pool.splice(idx, 1);
            }
            return out;
        };

        const pd = d.papal;
        const brand = pick(pd.brandPresets);
        const crest = pick(pd.crestSvgPresets);
        const confidentialityBadge = pick(pd.confidentialityBadges);
        const dept = pick(pd.deptPresets);
        const signatory = pick(pd.signatoryPresets);
        const recipientName = "You";

        const keyword = NewsUtils.extractKeyword(text);
        const nnnn = Math.floor(rng() * 9000) + 1000;
        const docId = PapalUtils.buildDocId(pd.docIdFormat, praisePack.createdAt, nnnn);
        const updatedAgo = pick(pd.timeHints.updatedAgoPresets);

        // Invitation
        const invitationBody = pick(pd.invitationTemplates)
            .replace(/{text}/g, text)
            .replace(/{dept}/g, dept); // Note: Simple replacement, assuming plain text

        // Agenda
        const agendaTitle = pick(pd.agendaTitlePresets);
        const agendaItemsRaw = pick(pd.agendaItemsTemplates);
        const agendaItems = agendaItemsRaw.map(it => it.replace(/{keyword}/g, keyword));

        // Counsel
        const counselTitle = pick(pd.counselTitlePresets);
        const expertShort = PapalUtils.toShortLine(praisePack.expertQuote, 70);
        const templateCounsel = pick(pd.counselTemplates).replace(/{keyword}/g, keyword);
        // Mix 50/50
        const useExpert = rng() > 0.5;
        const counsel = useExpert ? expertShort : templateCounsel;

        // Communique
        const communiqueTitle = pick(pd.communiqueTitlePresets);
        const communiqueBody = pick(pd.communiqueTemplates).replace(/{counsel}/g, counsel);

        // Seal
        const sealText = pick(pd.sealTextPresets);

        // World Reaction
        const worldReactionTitle = pick(pd.worldReactionTitlePresets);
        const worldReactionPreface = pick(pd.worldReactionPrefaceTemplates);

        // Shorten quotes
        const infQuote = PapalUtils.toShortLine(praisePack.influencerQuote, 60);
        const celQuote = PapalUtils.toShortLine(praisePack.celebrityQuote, 60);
        const reactions = [
            { type: 'influencer', text: infQuote },
            { type: 'celebrity', text: celQuote }
        ];

        // Crowd - pick 6 short ones
        // praisePack.crowdReplies are already strings
        const crowd = pickUnique(praisePack.crowdReplies, 6).map(r => PapalUtils.toShortLine(r, 40));

        return {
            brand, crest, confidentialityBadge, dept, signatory, recipientName,
            docId, updatedAgo, keyword,
            invitationBody, agendaTitle, agendaItems,
            counselTitle, counsel,
            communiqueTitle, communiqueBody,
            sealText,
            worldReactionTitle, worldReactionPreface, reactions, crowd,
            fictionNotice: pd.fictionNotice
        };
    }
    generateEarthCamPack(text, seed, d, praisePack) {
        // Seeded RNG
        const s = typeof seed === 'number' ? seed : Date.now();
        let localSeed = s + 54321;
        const rng = () => {
            localSeed = (localSeed * 9301 + 49297) % 233280;
            return localSeed / 233280;
        };
        const randInt = (min, max) => Math.floor(rng() * (max - min + 1)) + min;
        const pick = (arr) => arr[Math.floor(rng() * arr.length)];

        const ed = d.earthCam;

        // Region
        const region = pick(ed.regions);

        // Stats
        const viewersBase = randInt(10, 900) * 100000 + randInt(0, 99999);
        const viewers = "👁 " + viewersBase.toLocaleString() + " watching";

        const recVal = randInt(ed.recoveryRange[0], ed.recoveryRange[1]);
        const recovery = `🌿 Recovery +${recVal}%`;

        const verVal = randInt(ed.verifiedRange[0], ed.verifiedRange[1]) / 10;
        const trust = `✅ Verified: ${verVal}%`;

        // Recovery Index Gauge
        const riBefore = randInt(ed.recoveryIndexRange ? ed.recoveryIndexRange[0] : 48, ed.recoveryIndexRange ? ed.recoveryIndexRange[1] : 76);
        const riDelta = randInt(ed.recoveryDeltaRange ? ed.recoveryDeltaRange[0] : 6, ed.recoveryDeltaRange ? ed.recoveryDeltaRange[1] : 18);
        const riAfter = Math.min(99, riBefore + riDelta);

        // Ticker
        // Mix user text into ticker? The request says "yellow ticker (scrolls 1 line) logs that 'world became better'"
        // "input text -> world became better" should be visualized.
        // We use templates from ed.tickerTemplates
        // We generate ~10 items.
        // Also inject "Cause: {text}" once.
        let tickerItems = [];
        for (let i = 0; i < 8; i++) {
            let t = pick(ed.tickerTemplates);
            t = t.replace(/{text}/g, text); // Simple replace
            tickerItems.push(t);
        }
        // Join with separator
        const tickerText = tickerItems.join(" /// ");

        // Pins - always at least 6
        const pinCount = Math.max(6, randInt(ed.pinCountRange[0], ed.pinCountRange[1]));
        const pins = [];
        for (let i = 0; i < pinCount; i++) {
            let valid = false;
            let x, y;
            let safety = 0;
            while (!valid && safety < 100) {
                safety++;
                x = randInt(120, 680); // bound rect
                y = randInt(120, 680);
                const dist = Math.sqrt(Math.pow(x - 400, 2) + Math.pow(y - 400, 2));
                if (dist < 260) valid = true;
            }
            if (valid) {
                // Label
                const pct = randInt(5, 40);
                const label = pick(ed.pinTemplates).replace(/{n}/g, pct);
                const words = ed.pinLabelWords || ["Hope", "Life"];
                const shortLabel = `${pick(words)} +${pct}%`;
                pins.push({ x, y, label, shortLabel, pct });
            }
        }

        return {
            region, viewers, recovery, trust, tickerText, pins,
            recoveryIndex: { before: riBefore, delta: riDelta, after: riAfter }
        };
    }
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
        if (this.utcInterval) {
            clearInterval(this.utcInterval);
            this.utcInterval = null;
        }
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
            case 'stock':
                console.log('RENDER_STOCK', { hasPack: !!praisePack, hasStockPack: !!(praisePack && praisePack.stockPack) });
                if (praisePack && praisePack.stockPack) {
                    this.renderStock(praisePack);
                } else {
                    this.renderPlaceholder('株価', '文字を入力して送信すると、株価チャートが生成されます');
                }
                break;
            case 'newsDigital':
                console.log('RENDER_NEWS_DIGITAL', { hasPack: !!praisePack });
                if (praisePack && praisePack.newsDigital) {
                    this.renderNewsDigital(praisePack);
                } else {
                    this.renderPlaceholder('新聞', '文字を入力して送信すると、記事が生成されます');
                }
                break;
            case 'papal':
                if (praisePack && praisePack.papal) {
                    this.renderPapal(praisePack);
                } else {
                    this.renderPlaceholder('教皇庁', '文字を入力して送信すると、勅書が生成されます');
                }
                break;
            case 'earthcam':
                if (praisePack && praisePack.earthCam) {
                    this.renderEarthCam(praisePack);
                } else {
                    this.renderPlaceholder('地球儀', '文字を入力して送信すると、ライブカメラが起動します');
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

    /* --- STOCK RENDERER --- */
    renderStock(pack) {
        const sp = pack.stockPack;
        const d = document.createElement('div');
        d.className = 'skin-stock';

        // State
        let selectedTab = '1D';

        // Formatters
        const formatComma = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        const formatSigned = (n, dec = 1) => (n >= 0 ? '+' : '') + n.toFixed(dec);
        const formatSignedPct = (n, dec = 2) => (n >= 0 ? '+' : '') + n.toFixed(dec) + '%';
        const formatMarketCap = n => {
            const T = 1e12, HM = 1e8;
            if (n >= T) return (n / T).toFixed(1) + '兆';
            if (n >= HM) return Math.round(n / HM) + '億';
            return formatComma(n);
        };
        const formatAgo = m => m < 60 ? `${m}分前` : `${Math.floor(m / 60)}時間前`;

        // Build SVG helpers
        const buildLineSvg = (series, eventIdx, width, height, padding) => {
            if (!series || series.length === 0) return '';
            const min = Math.min(...series);
            const max = Math.max(...series) || min + 1;
            const range = max - min || 1;
            const usableH = height - padding * 2;
            const usableW = width - 20;
            const dx = usableW / (series.length - 1 || 1);

            let path = 'M ';
            const points = series.map((v, i) => {
                const x = 10 + dx * i;
                const y = padding + (1 - (v - min) / range) * usableH;
                return { x, y };
            });
            path += points.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ');

            const marker = eventIdx >= 0 && eventIdx < points.length ? points[eventIdx] : null;
            return { path, points, marker };
        };

        const buildCandlesSvg = (candles, eventIdx, width, height, padding) => {
            if (!candles || candles.length === 0) return { items: [], marker: null };
            const allVals = candles.flatMap(c => [c.h, c.l]);
            const min = Math.min(...allVals);
            const max = Math.max(...allVals) || min + 1;
            const range = max - min || 1;
            const usableH = height - padding * 2;
            const usableW = width - 20;
            const step = usableW / candles.length;
            const bodyW = Math.min(step * 0.6, 8);

            const toY = v => padding + (1 - (v - min) / range) * usableH;

            const items = candles.map((c, i) => {
                const cx = 10 + step * i + step / 2;
                const up = c.c >= c.o;
                return {
                    wickX: cx, wickY1: toY(c.h), wickY2: toY(c.l),
                    bodyX: cx - bodyW / 2, bodyY: toY(Math.max(c.o, c.c)), bodyH: Math.abs(toY(c.o) - toY(c.c)) || 1, bodyW,
                    up
                };
            });

            const markerX = eventIdx >= 0 && eventIdx < items.length ? items[eventIdx].wickX : null;
            return { items, markerX };
        };

        // Render chart
        const renderChart = (tabId) => {
            const chart = sp.charts[tabId];
            if (!chart) return '<div class="stock-chart-empty">No data</div>';

            const width = 300, height = 140, padding = 10;

            if (chart.type === 'line') {
                const { path, marker } = buildLineSvg(chart.data, chart.eventIdx, width, height, padding);
                return `
                    <svg class="stock-chart-svg" viewBox="0 0 ${width} ${height}">
                        <path class="stock-line" d="${path}" fill="none" stroke="#4ade80" stroke-width="2"/>
                        ${marker ? `
                            <line class="stock-marker-line" x1="${marker.x}" y1="0" x2="${marker.x}" y2="${height}" stroke="#fbbf24" stroke-dasharray="2"/>
                            <circle cx="${marker.x}" cy="${marker.y}" r="4" fill="#fbbf24"/>
                        ` : ''}
                    </svg>
                    <div class="stock-marker-label">${sp.markerLabel}</div>
                `;
            } else {
                const { items, markerX } = buildCandlesSvg(chart.data, chart.eventIdx, width, height, padding);
                return `
                    <svg class="stock-chart-svg" viewBox="0 0 ${width} ${height}">
                        ${items.map(c => `
                            <line class="stock-wick" x1="${c.wickX}" y1="${c.wickY1}" x2="${c.wickX}" y2="${c.wickY2}" stroke="${c.up ? '#4ade80' : '#f87171'}" stroke-width="1"/>
                            <rect class="stock-body ${c.up ? 'up' : 'down'}" x="${c.bodyX}" y="${c.bodyY}" width="${c.bodyW}" height="${c.bodyH}" fill="${c.up ? '#4ade80' : '#f87171'}"/>
                        `).join('')}
                        ${markerX !== null ? `<line class="stock-marker-line" x1="${markerX}" y1="0" x2="${markerX}" y2="${height}" stroke="#fbbf24" stroke-dasharray="2"/>` : ''}
                    </svg>
                    <div class="stock-marker-label">${sp.markerLabel}</div>
                `;
            }
        };

        // Build HTML
        d.innerHTML = `
            <div class="stock-header">
                <div class="stock-ticker-row">
                    <span class="stock-ticker">${sp.ticker}</span>
                    <span class="stock-mood-badge">${sp.marketMood}</span>
                    <button class="stock-action-btn">⭐</button>
                    <button class="stock-action-btn">↗️</button>
                </div>
                <div class="stock-company">${sp.companyName}</div>
            </div>
            
            <div class="stock-price-card">
                <div class="stock-price-main">
                    <span class="stock-price-now">${formatComma(sp.priceNow)}</span>
                    <span class="stock-price-change ${sp.pctChange >= 0 ? 'up' : 'down'}">
                        ${formatSigned(sp.changeAbs)} (${formatSignedPct(sp.pctChange)})
                    </span>
                </div>
                <div class="stock-metrics-row">
                    <div class="stock-metric"><span class="stock-metric-label">出来高</span><span class="stock-metric-val">${formatComma(sp.volume)}</span></div>
                    <div class="stock-metric"><span class="stock-metric-label">時価総額</span><span class="stock-metric-val">${formatMarketCap(sp.marketCap)}</span></div>
                    <div class="stock-metric"><span class="stock-metric-label">ボラ</span><span class="stock-metric-val">${sp.volatility.toFixed(1)}%</span></div>
                </div>
                <div class="stock-metrics-row">
                    <div class="stock-metric"><span class="stock-metric-label">高値</span><span class="stock-metric-val">${formatComma(sp.high)}</span></div>
                    <div class="stock-metric"><span class="stock-metric-label">安値</span><span class="stock-metric-val">${formatComma(sp.low)}</span></div>
                </div>
                <div class="stock-analyst-note">📊 ${pack.expertQuote}</div>
            </div>
            
            <div class="stock-chart-section">
                <div class="stock-chart-tabs">
                    ${['1D', '1W', '1M', '1Y', 'ALL'].map(tab => `
                        <button class="stock-chart-tab ${tab === selectedTab ? 'active' : ''}" data-tab="${tab}">${tab}</button>
                    `).join('')}
                </div>
                <div class="stock-chart-area" id="stockChartArea">
                    ${renderChart(selectedTab)}
                </div>
            </div>
            
            <div class="stock-world-tickers">
                ${sp.worldTickers.map(t => `
                    <div class="stock-world-item">
                        <span class="stock-world-name">${t.name}</span>
                        <span class="stock-world-move ${t.move >= 0 ? 'up' : 'down'}">${formatSignedPct(t.move)}</span>
                    </div>
                `).join('')}
            </div>
            
            <div class="stock-news-section">
                <div class="stock-news-header">📰 Market News</div>
                ${sp.newsItems.map(n => `
                    <div class="stock-news-item">
                        <span class="stock-news-text">${n.text}</span>
                        <span class="stock-news-ago">${formatAgo(n.ago)}</span>
                    </div>
                `).join('')}
                <div class="stock-overseas-note">🌍 ${pack.influencerQuote}</div>
            </div>
            
            <div class="stock-book-section">
                <div class="stock-book-header">📈 Order Book</div>
                <div class="stock-book-grid">
                    <div class="stock-book-col bids">
                        <div class="stock-book-col-header">Bid (買い)</div>
                        ${sp.orderBook.bids.map(b => `
                            <div class="stock-book-row bid">
                                <span class="stock-book-price">${b.price.toFixed(1)}</span>
                                <span class="stock-book-size">${formatComma(b.size)}</span>
                                <span class="stock-book-label">${b.label}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div class="stock-book-col asks">
                        <div class="stock-book-col-header">Ask (売り)</div>
                        ${sp.orderBook.asks.map(a => `
                            <div class="stock-book-row ask">
                                <span class="stock-book-price">${a.price.toFixed(1)}</span>
                                <span class="stock-book-size">${formatComma(a.size)}</span>
                                <span class="stock-book-label">${a.label}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            <div class="stock-tape-section">
                <div class="stock-tape-header">📜 Tape (約定履歴)</div>
                <div class="stock-tape-list">
                    ${sp.tape.map(t => `
                        <div class="stock-tape-row ${t.side}">
                            <span class="stock-tape-time">${t.time}</span>
                            <span class="stock-tape-price">${t.price.toFixed(1)}</span>
                            <span class="stock-tape-size">${formatComma(t.size)}</span>
                            <span class="stock-tape-side">${t.side === 'buy' ? '買' : '売'}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        this.container.appendChild(d);

        // Tab switching
        d.querySelectorAll('.stock-chart-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                d.querySelectorAll('.stock-chart-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                selectedTab = tab.dataset.tab;
                d.querySelector('#stockChartArea').innerHTML = renderChart(selectedTab);
            });
        });
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
    renderNewsDigital(pack) {
        const nd = pack.newsDigital;
        const d = document.createElement('div');
        d.className = 'skin-newsDigital';

        // --- Header (Black Bar) ---
        const header = document.createElement('div');
        header.className = 'nd-header';
        header.innerHTML = `
            <div class="nd-header-inner">
                <div class="nd-brand">${nd.brand.name}</div>
                <div class="nd-nav">
                    ${PRAISE_DATA.newsDigital.navItems.map(item => `<span class="nd-nav-item">${item}</span>`).join('')}
                </div>
                <div class="nd-header-right">
                    <span class="nd-label-badge">${nd.label}</span>
                    <span class="nd-updated">${nd.updatedAgo}</span>
                    <span class="nd-search-icon">🔍</span>
                </div>
            </div>
        `;
        d.appendChild(header);

        // --- Container ---
        const container = document.createElement('div');
        container.className = 'nd-container';

        // --- Main Column ---
        const main = document.createElement('div');
        main.className = 'nd-main';

        // 1. Label
        const labelDiv = document.createElement('div');
        labelDiv.className = 'nd-label-upper';
        labelDiv.textContent = nd.label;
        main.appendChild(labelDiv);

        // 2. Headline
        const headline = document.createElement('h1');
        headline.className = 'nd-headline';
        headline.textContent = pack.headlines;
        main.appendChild(headline);

        // 3. Subhead
        const subhead = document.createElement('h2');
        subhead.className = 'nd-subhead';
        subhead.textContent = nd.subhead;
        main.appendChild(subhead);

        // 4. Meta (Byline + Date)
        const meta = document.createElement('div');
        meta.className = 'nd-article-meta';
        const dateStr = NewsUtils.formatDateTimeJP(new Date(pack.createdAt));
        meta.innerHTML = `<span class="nd-byline">${nd.byline}</span> <span class="nd-date">${dateStr}</span> <span class="nd-updated-sm">${nd.updatedAgo}</span>`;
        main.appendChild(meta);

        // 5. Lead
        const lead = document.createElement('div');
        lead.className = 'nd-lead';
        lead.textContent = nd.lead;
        main.appendChild(lead);

        // 6. Body
        const bodyDiv = document.createElement('div');
        bodyDiv.className = 'nd-body';
        const paragraphs = NewsUtils.splitToParagraphs(pack.postBody, 4);

        // Insert quote in the middle
        const quoteIdx = Math.floor(paragraphs.length / 2);
        const pullQuoteText = pack.expertQuote || pack.officialQuote;

        paragraphs.forEach((pText, i) => {
            const p = document.createElement('p');
            p.textContent = pText;
            bodyDiv.appendChild(p);

            if (i === quoteIdx && pullQuoteText) {
                const q = document.createElement('div');
                q.className = 'nd-pull-quote';
                q.innerHTML = `<span class="nd-quote-mark">“</span>${NewsUtils.toShortQuote(pullQuoteText)}<span class="nd-quote-mark">”</span>`;
                bodyDiv.appendChild(q);
            }
        });
        main.appendChild(bodyDiv);

        // 7. Expert Analysis box
        const expertBox = document.createElement('div');
        expertBox.className = 'nd-expert-box';
        expertBox.innerHTML = `
            <div class="nd-expert-title">Expert Analysis</div>
            <div class="nd-expert-content">
                <span class="nd-expert-preface">${pack.expertPreface}</span>
                <span class="nd-expert-body">${pack.expertQuote}</span>
            </div>
        `;
        main.appendChild(expertBox);

        // 8. Timeline
        const timeline = document.createElement('div');
        timeline.className = 'nd-timeline';
        timeline.innerHTML = '<div class="nd-sec-title">TIMELINE</div>';
        nd.timeline.forEach(step => {
            timeline.innerHTML += `
                <div class="nd-tl-row">
                    <span class="nd-tl-time">${step.time}</span>
                    <span class="nd-tl-text">${step.text}</span>
                </div>
            `;
        });
        main.appendChild(timeline);

        // 9. Voices
        const voices = document.createElement('div');
        voices.className = 'nd-voices';
        voices.innerHTML = `<div class="nd-sec-title">${nd.voicesTitle}</div>`;
        const voicesGrid = document.createElement('div');
        voicesGrid.className = 'nd-voices-grid';
        pack.crowdReplies.slice(0, 6).forEach(rep => {
            voicesGrid.innerHTML += `<div class="nd-voice-card">${NewsUtils.toShortQuote(rep, 40)}</div>`;
        });
        voices.appendChild(voicesGrid);
        main.appendChild(voices);

        // 10. Notice
        const notice = document.createElement('div');
        notice.className = 'nd-notice';
        nd.fictionNotice.forEach(line => {
            notice.innerHTML += `<div>${line}</div>`;
        });
        main.appendChild(notice);

        container.appendChild(main);

        // --- Sidebar ---
        const sidebar = document.createElement('div');
        sidebar.className = 'nd-sidebar';

        // Markets
        const markets = document.createElement('div');
        markets.className = 'nd-sidebar-section nd-markets';
        markets.innerHTML = '<div class="nd-sidebar-title">MARKETS</div>';
        nd.markets.forEach(m => {
            const cls = m.value >= 0 ? 'pos' : 'neg';
            markets.innerHTML += `
                <div class="nd-market-row">
                    <div class="nd-market-name">${m.name}</div>
                    <div class="nd-market-val ${cls}">${m.formatted}</div>
                </div>
            `;
        });
        sidebar.appendChild(markets);

        // World Reaction (Influencer/Celebrity)
        const react = document.createElement('div');
        react.className = 'nd-sidebar-section';
        react.innerHTML = '<div class="nd-sidebar-title">WORLD REACTION</div>';
        [pack.influencerQuote, pack.celebrityQuote].forEach(q => {
            if (q) {
                react.innerHTML += `<div class="nd-react-quote">"${NewsUtils.toShortQuote(q, 60)}"</div>`;
            }
        });
        sidebar.appendChild(react);

        // Related
        const related = document.createElement('div');
        related.className = 'nd-sidebar-section';
        related.innerHTML = '<div class="nd-sidebar-title">RELATED STORIES</div>';
        nd.related.forEach(r => {
            related.innerHTML += `<div class="nd-related-link">${r}</div>`;
        });
        sidebar.appendChild(related);

        // Newsletter
        const newsL = document.createElement('div');
        newsL.className = 'nd-sidebar-section nd-newsletter';
        newsL.innerHTML = `
            <div class="nd-nl-title">${nd.newsletter.title}</div>
            <div class="nd-nl-desc">${nd.newsletter.desc}</div>
            <div class="nd-nl-input">Your email</div>
            <div class="nd-nl-btn">${nd.newsletter.cta}</div>
        `;
        sidebar.appendChild(newsL);

        container.appendChild(sidebar);
        d.appendChild(container);

        this.container.appendChild(d);
    }
    renderPapal(pack) {
        const d = document.createElement('div');
        d.className = 'skin-papal';
        const pd = pack.papal || {};

        // Helper to avoid nulls
        const safe = (s) => s || '';

        d.innerHTML = `
            <div class="papal-sheet">
                <!-- Header -->
                <div class="papal-header">
                    <div class="papal-brand">
                        <div class="papal-crest">${safe(pd.crest.svg)}</div>
                        <div class="papal-brand-text">
                            <div class="papal-brand-line">${safe(pd.brand.headerLine)}</div>
                            <div class="papal-brand-mono">${safe(pd.brand.monogram)}</div>
                        </div>
                    </div>
                    <div class="papal-meta">
                        <div class="papal-doc-id">${safe(pd.docId)}</div>
                        <div class="papal-badge">${safe(pd.confidentialityBadge)}</div>
                        <div class="papal-updated">${safe(pd.updatedAgo)}</div>
                        <div class="papal-seal-stamp">${safe(pd.sealText)}</div>
                    </div>
                </div>

                <!-- Invitation -->
                <div class="papal-section papal-invitation">
                    <div class="papal-to">To: ${safe(pd.recipientName)}</div>
                    <div class="papal-body-text">${safe(pd.invitationBody).replace(/\n/g, '<br>')}</div>
                    
                    <div class="papal-sign-area">
                        <div class="papal-sign-role">${safe(pd.dept)}</div>
                        <div class="papal-sign-name">${safe(pd.signatory)}</div>
                    </div>
                </div>

                <!-- Agenda -->
                <div class="papal-section papal-agenda">
                    <div class="papal-sec-title">${safe(pd.agendaTitle)}</div>
                    <ol class="papal-agenda-list">
                        ${(pd.agendaItems || []).map(item => `<li>${item}</li>`).join('')}
                    </ol>
                </div>

                <!-- Counsel -->
                <div class="papal-section papal-counsel">
                    <div class="papal-sec-title">${safe(pd.counselTitle)}</div>
                    <div class="papal-counsel-box">
                        <span class="papal-quote-mark">“</span>
                        ${safe(pd.counsel)}
                        <span class="papal-quote-mark">”</span>
                    </div>
                </div>

                <!-- Communique -->
                <div class="papal-section papal-communique">
                    <div class="papal-communique-box">
                        <div class="papal-communique-title">${safe(pd.communiqueTitle)}</div>
                        <div class="papal-communique-body">${safe(pd.communiqueBody).replace(/\n/g, '<br>')}</div>
                        <div class="papal-adopted-stamp">ADOPTED</div>
                    </div>
                </div>

                <!-- World Reaction -->
                <div class="papal-section papal-reaction">
                    <div class="papal-sec-title">${safe(pd.worldReactionTitle)}</div>
                    <div class="papal-react-preface">${safe(pd.worldReactionPreface)}</div>
                    
                    <div class="papal-react-grid">
                        ${(pd.reactions || []).map(r => `
                            <div class="papal-react-card">
                                <div class="papal-react-type">${r.type.toUpperCase()}</div>
                                <div class="papal-react-text">"${r.text}"</div>
                            </div>
                        `).join('')}
                    </div>

                    <div class="papal-crowd-list">
                        ${(pd.crowd || []).map(c => `<div class="papal-crowd-item">• ${c}</div>`).join('')}
                    </div>
                </div>

                <!-- Footer -->
                <div class="papal-footer">
                    ${(pd.fictionNotice || []).map(n => `<div>${n}</div>`).join('')}
                </div>
            </div>
        `;

        this.container.appendChild(d);
    }
    renderEarthCam(pack) {
        const d = document.createElement('div');
        d.className = 'skin-earthcam skin-earthcam-entry';
        const ed = pack.earthCam || {};

        // --- Recovery Layer (Glows under pins) ---
        const recoveryCircles = (ed.pins || []).map((p, idx) => `
            <g transform="translate(${p.x} ${p.y})">
               <circle r="50" fill="#0f6" opacity="0.5" filter="url(#recoverBlur)"/>
               <circle r="30" fill="#0ff" opacity="0.4" filter="url(#recoverBlur)"/>
               <circle r="15" fill="#4f8" opacity="0.6"/>
            </g>
        `).join('');

        // --- Pins & Labels ---
        const pinsHtml = (ed.pins || []).map((p, idx) => {
            const w = (p.shortLabel || "").length * 5 + 16;
            return `
            <g class="pin-group" transform="translate(${p.x} ${p.y})">
                <circle r="5" class="pin-core"/>
                <circle r="14" class="pin-ring"/>
                <circle r="22" class="pin-wave" style="animation-delay: -${idx * 0.4}s"/>
                <g class="pin-label" transform="translate(14 -14)" opacity="0.9">
                    <rect x="0" y="-12" width="${w}" height="16" rx="4" fill="rgba(0,0,0,0.6)" stroke="rgba(255,255,255,0.3)" stroke-width="0.5"/>
                    <text x="4" y="0" fill="#fff" font-size="9" font-family="sans-serif" font-weight="bold">${p.shortLabel || ""}</text>
                </g>
            </g>
        `}).join('');

        // --- Gauge ---
        const ri = ed.recoveryIndex || { before: 50, delta: 10, after: 60 };
        const gaugeHtml = `
            <div class="earthcam-gauge-wrap">
                <div class="earthcam-gauge-label">GLOBAL RECOVERY INDEX</div>
                <div class="earthcam-gauge-track">
                    <div class="earthcam-gauge-bar" style="width: ${ri.before}%"></div>
                    <div class="earthcam-gauge-delta" style="left: ${ri.before}%; width: ${ri.delta}%"></div>
                </div>
                <div class="earthcam-gauge-val">${ri.before} → ${ri.after} (+${ri.delta})</div>
            </div>
        `;

        // SVG
        const svg = `
<svg viewBox="0 0 800 800" class="earth-svg" aria-label="EarthCam Globe">
  <defs>
    <clipPath id="sphereClip"><circle cx="400" cy="400" r="280"/></clipPath>
    <radialGradient id="oceanGrad" cx="35%" cy="30%" r="75%">
      <stop offset="0%"  stop-color="#1b6cff"/>
      <stop offset="55%" stop-color="#0f3f9d"/>
      <stop offset="100%" stop-color="#081b3a"/>
    </radialGradient>
    <radialGradient id="nightGrad" cx="72%" cy="40%" r="85%">
      <stop offset="0%" stop-color="rgba(0,0,0,0)"/>
      <stop offset="55%" stop-color="rgba(0,0,0,0.25)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.7)"/>
    </radialGradient>
    <radialGradient id="recoverGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#0ff" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#0ff" stop-opacity="0"/>
    </radialGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="7" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="recoverBlur">
      <feGaussianBlur stdDeviation="4"/>
    </filter>
    <filter id="cloudNoise">
      <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" seed="7" result="noise"/>
      <feColorMatrix in="noise" type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.28 0" result="alphaNoise"/>
      <feGaussianBlur in="alphaNoise" stdDeviation="1"/>
    </filter>
    <linearGradient id="scanGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0)"/>
      <stop offset="50%" stop-color="rgba(255,255,255,0.10)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="800" height="800" class="earth-bg"/>
  <circle cx="400" cy="400" r="295" class="atmo-ring" filter="url(#glow)"/>
  <circle cx="400" cy="400" r="280" class="sphere-outline"/>
  <g clip-path="url(#sphereClip)">
    
    <!-- Rotating Globe Group -->
    <g class="globe-group">
        <rect x="120" y="120" width="560" height="560" fill="url(#oceanGrad)"/>
        <g class="grid">
            <line x1="120" y1="220" x2="680" y2="220"/>
            <line x1="120" y1="310" x2="680" y2="310"/>
            <line x1="120" y1="400" x2="680" y2="400"/>
            <line x1="120" y1="490" x2="680" y2="490"/>
            <line x1="120" y1="580" x2="680" y2="580"/>
            <line x1="240" y1="120" x2="240" y2="680"/>
            <line x1="320" y1="120" x2="320" y2="680"/>
            <line x1="400" y1="120" x2="400" y2="680"/>
            <line x1="480" y1="120" x2="480" y2="680"/>
            <line x1="560" y1="120" x2="560" y2="680"/>
        </g>
        <g class="land">
            <path d="M245,365 C275,320 332,300 360,330 C382,360 360,412 320,425 C282,437 238,412 245,365 Z"/>
            <path d="M470,292 C520,282 568,320 555,365 C540,415 478,440 448,398 C425,365 435,303 470,292 Z"/>
            <path d="M470,495 C520,465 565,502 553,542 C540,592 480,604 452,563 C430,535 440,510 470,495 Z"/>
        </g>
        <g class="cloud-layer">
            <rect x="120" y="120" width="560" height="560" filter="url(#cloudNoise)" class="clouds"/>
        </g>
        <circle cx="430" cy="395" r="320" fill="url(#nightGrad)"/>
    </g>

    <g class="recovery-layer">
        ${recoveryCircles}
    </g>
    <g class="pins">
      ${pinsHtml}
    </g>
  </g>
  <rect x="0" y="0" width="800" height="800" fill="url(#scanGrad)" class="scanline"/>
</svg>`;

        d.innerHTML = `
            <div class="earthcam-wrap">
              <div class="earthcam-hud">
                <div class="earthcam-hud-scroll">
                  <div class="earthcam-live"><span class="earthcam-dot"></span>LIVE</div>
                  <div class="earthcam-tag">EarthCam</div>
                  <div class="earthcam-tag" id="earthcam-region">${ed.region}</div>
                  <div class="earthcam-tag" id="earthcam-utc">UTC --:--:--</div>
                  <div class="earthcam-tag" id="earthcam-viewers">${ed.viewers}</div>
                  <div class="earthcam-tag" id="earthcam-recover">${ed.recovery}</div>
                  <div class="earthcam-tag" id="earthcam-trust">${ed.trust}</div>
                </div>
              </div>

              ${gaugeHtml}

              <div class="earthcam-stage">
                ${svg}
              </div>

              <div class="earthcam-ticker">
                <div class="ticker-track" id="earthcam-ticker-text">
                  ${ed.tickerText}
                </div>
              </div>
            </div>
        `;

        this.container.appendChild(d);

        const updateClock = () => {
            const el = document.getElementById('earthcam-utc');
            if (el) {
                const now = new Date();
                const h = String(now.getUTCHours()).padStart(2, '0');
                const m = String(now.getUTCMinutes()).padStart(2, '0');
                const s = String(now.getUTCSeconds()).padStart(2, '0');
                el.innerText = `UTC ${h}:${m}:${s}`;
            }
        };
        updateClock();
        this.utcInterval = setInterval(updateClock, 1000);
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
        skinSwitcher: document.querySelector('.skin-switcher') // Changed from skinBtns selection
    };

    // --- Tab Generation Logic (Patch) ---
    const fallbackTabs = [
        { id: "dm", label: "LINE" },
        { id: "x", label: "X" },
        { id: "news", label: "速報" },
        { id: "newsDigital", label: "新聞" },
        { id: "papal", label: "教皇庁" },
        { id: "earthcam", label: "地球儀" },
        { id: "youtube", label: "YouTube" },
        { id: "stock", label: "株価" }
    ];

    // Use data.navItems if array, else fallback
    let tabs = Array.isArray(PRAISE_DATA.navItems) ? PRAISE_DATA.navItems : fallbackTabs;

    // Normalize
    tabs = tabs.map(t => ({
        id: t.id ?? t.skinId,
        label: t.label ?? t.name ?? t.title
    }));

    // Ensure newsDigital exists
    if (!tabs.some(t => t.id === "newsDigital")) {
        tabs.push({ id: "newsDigital", label: "新聞" });
    }
    // Ensure papal exists
    if (!tabs.some(t => t.id === "papal")) {
        tabs.push({ id: "papal", label: "教皇庁" });
    }
    // Ensure earthcam exists
    if (!tabs.some(t => t.id === "earthcam")) {
        tabs.push({ id: "earthcam", label: "地球儀" });
    }

    // Render Tabs
    if (dom.skinSwitcher) {
        dom.skinSwitcher.innerHTML = tabs.map(t =>
            `<button class="skin-btn ${t.id === currentSkin ? 'active' : ''}" data-skin="${t.id}">${t.label}</button>`
        ).join('');
    }

    // Update dom ref
    dom.skinBtns = document.querySelectorAll('.skin-btn');

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
