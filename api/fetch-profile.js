import fetch from "node-fetch";

export default async function handler(req, res) {
  const { url } = req.query;

  try {
    // Instagram
    if (url.includes("instagram.com")) {
      const username = url.split("instagram.com/")[1].replace("/", "");

      const ig = await fetch(`https://www.picuki.com/profile/${username}`);
      const html = await ig.text();

      const profilePic = html.match(/profile-avatar" src="([^"]+)"/)?.[1];
      const followers = html.match(/Followers<\/span><span>([^<]+)</)?.[1];
      const posts = html.match(/Posts<\/span><span>([^<]+)</)?.[1];

      return res.status(200).json({
        platform: "instagram",
        username,
        profilePic,
        followers,
        posts,
        recent: []
      });
    }

    // TikTok
    if (url.includes("tiktok.com")) {
      const username = url.split("tiktok.com/@")[1].replace("/", "");

      const tk = await fetch(`https://www.tiktok.com/@${username}`);
      const html = await tk.text();

      const followers = html.match(/"followerCount":(\d+)/)?.[1] || 0;
      const avatar = html.match(/"avatarLarger":"([^"]+)"/)?.[1] || "";

      return res.status(200).json({
        platform: "tiktok",
        username,
        profilePic: avatar,
        followers,
        posts: 0,
        recent: []
      });
    }

    return res.status(400).json({ error: "Unsupported URL" });
  } catch (e) {
    return res.status(500).json({ error: "Failed to load profile" });
  }
}
