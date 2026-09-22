// Cloudflare Workers stub for sharp (server-side image optimization is disabled via unoptimized: true)
function sharp() {
  throw new Error("sharp is not available on Cloudflare Workers. Use unoptimized images or Cloudflare Images.");
}

module.exports = sharp;
module.exports.default = sharp;

