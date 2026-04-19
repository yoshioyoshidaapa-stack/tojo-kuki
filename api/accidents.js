// Vercel Serverless Function
// 東武東上線の事故データを jinshinjiko.com から取得
// 3ページ並列取得（最大300件）→ 日付リスト＋24時間分布を返す

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

  const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (compatible; tojo-kuki/1.0; +https://tojo-kuki.vercel.app)',
    'Accept': 'text/html,application/xhtml+xml',
    'Accept-Language': 'ja,en;q=0.9'
  };
  const BASE = 'https://jinshinjiko.com/routes/39?limit=100&offset=';

  try {
    const results = await Promise.allSettled([
      fetch(BASE + '0',   { headers: HEADERS }),
      fetch(BASE + '100', { headers: HEADERS }),
      fetch(BASE + '200', { headers: HEADERS }),
    ]);

    const htmls = await Promise.all(
      results.map(r =>
        r.status === 'fulfilled' && r.value.ok ? r.value.text() : Promise.resolve('')
      )
    );
    const html = htmls.join('');

    const re = /(\d{4})\/(\d{2})\/(\d{2})\s+(\d{1,2}):\d{2}/g;
    const dates = new Set();
    const hourly = new Array(24).fill(0);
    let m;
    while ((m = re.exec(html)) !== null) {
      const yr = parseInt(m[1]);
      if (yr >= 2010 && yr <= new Date().getFullYear()) {
        dates.add(m[1] + '-' + m[2] + '-' + m[3]);
        hourly[parseInt(m[4])]++;
      }
    }

    const sorted = [...dates].sort().reverse();
    res.json({
      dates: sorted,
      count: sorted.length,
      hourlyDistribution: hourly,
      fetched: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
      dates: [],
      count: 0,
      hourlyDistribution: new Array(24).fill(0)
    });
  }
};
