// Vercel Serverless Function
// 東武東上線の最新事故データを jinshinjiko.com から取得して返す

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // 1時間キャッシュ（Vercel Edge）
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

  try {
    const upstream = await fetch(
      'https://jinshinjiko.com/routes/39?limit=100&offset=0',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; tojo-kuki/1.0; +https://tojo-kuki.vercel.app)',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'ja,en;q=0.9'
        }
      }
    );
    if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);

    const html = await upstream.text();

    // テーブル内の日時 "YYYY/MM/DD HH:MM" を抽出
    const re = /(\d{4})\/(\d{2})\/(\d{2})\s+\d{1,2}:\d{2}/g;
    const dates = new Set();
    let m;
    while ((m = re.exec(html)) !== null) {
      const yr = parseInt(m[1]);
      if (yr >= 2010 && yr <= new Date().getFullYear()) {
        dates.add(`${m[1]}-${m[2]}-${m[3]}`);
      }
    }

    const sorted = [...dates].sort().reverse();
    res.json({
      dates: sorted,
      count: sorted.length,
      fetched: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message, dates: [], count: 0 });
  }
};
