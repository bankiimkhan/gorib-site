const hosts = [
  'http://172.16.50.14/DHAKA-FLIX-14/',
  'http://172.16.50.7/DHAKA-FLIX-7/'
];

async function fetchLinks(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return [];
    const html = await res.text();
    const regex = /<a href="([^"]+)">([^<]+)<\/a>/g;
    const links = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
      const href = match[1];
      const text = match[2].trim();
      if (href !== '..' && !href.includes('browsehappy') && text !== 'Parent Directory') {
        links.push({ href, text });
      }
    }
    return links;
  } catch (e) {
    return [];
  }
}

async function run() {
  for (const h of hosts) {
    console.log(`\n=== HOST: ${h} ===`);
    const categories = await fetchLinks(h);
    for (const cat of categories) {
      const fullUrl = cat.href.startsWith('http') ? cat.href : `${h.replace(/\/DHAKA-FLIX-\d+\/$/, '')}${cat.href}`;
      console.log(`\nCategory: ${cat.text} (${fullUrl})`);
      const sub = await fetchLinks(fullUrl);
      console.log(`  Sub-items count: ${sub.length}`);
      if (sub.length > 0) {
        console.log(`  First 5 items:`, sub.slice(0, 5).map(s => s.text));
        console.log(`  Last 3 items:`, sub.slice(-3).map(s => s.text));
      }
    }
  }
}

run();

