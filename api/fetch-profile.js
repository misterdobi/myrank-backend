// ---------------------------------------------
// Ranking Logic
// ---------------------------------------------
function computeRankingMetrics(posts, followers = 1) {
  if (!posts || posts.length === 0) {
    return {
      engagementRate: 0,
      avgLikes: 0,
      avgComments: 0,
      postsPerWeek: 0,
      consistency: 0,
      creatorScore: 0,
    };
  }

  const totalLikes = posts.reduce((sum, p) => sum + (p.likes || 0), 0);
  const totalComments = posts.reduce((sum, p) => sum + (p.comments || 0), 0);

  const avgLikes = totalLikes / posts.length;
  const avgComments = totalComments / posts.length;

  const engagementRate = (totalLikes + totalComments) / followers;

  const timestamps = posts.map((p) => new Date(p.timestamp).getTime());
  const oldest = Math.min(...timestamps);
  const newest = Math.max(...timestamps);
  const weeks = Math.max(1, (newest - oldest) / (1000 * 60 * 60 * 24 * 7));
  const postsPerWeek = posts.length / weeks;

  const sorted = timestamps.sort();
  const intervals = sorted.slice(1).map((t, i) => t - sorted[i]);

  const avgInterval =
    intervals.reduce((a, b) => a + b, 0) / intervals.length || 1;

  const variance =
    intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) /
      intervals.length || 0;

  const consistency = 1 / (1 + variance);

  const creatorScore =
    engagementRate * 0.4 + postsPerWeek * 0.3 + consistency * 0.3;

  return {
    engagementRate,
    avgLikes,
    avgComments,
    postsPerWeek,
    consistency,
    creatorScore,
  };
}

// ---------------------------------------------
// Instagram Scraper (Public Data Only)
// ---------------------------------------------
async function scrapeInstagramProfile(url) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
      }
    });

    if (!res.ok) {
      console.error("Instagram returned status:", res.status);
      return null;
    }

    const html = await res.text();

    if (!html || html.length < 5000) {
      console.error("Instagram returned empty or blocked HTML");
      return null;
    }

    const usernameMatch = html.match(/"username":"(.*?)"/);
    const followersMatch = html.match(/"edge_followed_by":{"count":(\d+)}/);

    const postRegex =
      /"edge_media_preview_like":{"count":(\d+)}.*?"edge_media_to_comment":{"count":(\d+)}.*?"taken_at_timestamp":(\d+)/g;

    const posts = [];
    let match;

    while ((match = postRegex.exec(html)) !== null) {
      posts.push({
        likes: Number(match[1]),
        comments: Number(match[2]),
        timestamp: new Date(Number(match[3]) * 1000).toISOString()
      });
    }

    return {
      username: usernameMatch ? usernameMatch[1] : null,
      followers: followersMatch ? Number(followersMatch[1]) : 0,
      posts
    };
  } catch (err) {
    console.error("SCRAPER ERROR:", err);
    return null;
  }
}


// ---------------------------------------------
// API Route (CommonJS for Vercel)
// ---------------------------------------------
module.exports = async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Missing ?url=" });
  }

  const data = await scrapeInstagramProfile(url);

  if (!data) {
    return res.status(500).json({ error: "Failed to scrape profile" });
  }

  const metrics = computeRankingMetrics(data.posts, data.followers);

  return res.status(200).json({
    platform: "instagram",
    username: data.username,
    followers: data.followers,
    recent: data.posts,
    metrics,
  });
};
