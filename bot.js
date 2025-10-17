const { Telegraf } = require('telegraf');
const axios = require('axios');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('Missing TELEGRAM_BOT_TOKEN env var');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

bot.start((ctx) => ctx.reply('Welcome! Use /price <coin_id> or /chart <coin_id>. Example: /price bitcoin'));

bot.command('price', async (ctx) => {
  const parts = ctx.message.text.split(' ').filter(Boolean);
  const id = parts[1] || 'bitcoin';
  try {
    const resp = await axios.get(`${COINGECKO_BASE}/simple/price`, { params: { ids: id, vs_currencies: 'usd', include_24hr_change: 'true' } });
    if (!resp.data[id]) return ctx.reply('Coin not found. Use id from CoinGecko (e.g., bitcoin, ethereum, dogecoin)');
    const p = resp.data[id].usd;
    const ch = resp.data[id].usd_24h_change;
    ctx.reply(`${id.toUpperCase()} — $${p.toLocaleString()} (24h: ${ch.toFixed(2)}%)`);
  } catch (err) {
    ctx.reply('Error fetching price: ' + err.message);
  }
});

bot.command('chart', async (ctx) => {
  const parts = ctx.message.text.split(' ').filter(Boolean);
  const id = parts[1] || 'bitcoin';
  const days = parts[2] || 1;
  try {
    const resp = await axios.get(`${COINGECKO_BASE}/coins/${id}/market_chart`, { params: { vs_currency: 'usd', days } });
    const prices = resp.data.prices.slice(-100);
    const labels = prices.map(p => new Date(p[0]).toISOString().slice(11,19));
    const data = prices.map(p => p[1]);
    const chartConfig = encodeURIComponent(JSON.stringify({
      type: 'line',
      data: { labels, datasets: [{ label: id, data }] }
    }));
    const chartUrl = `https://quickchart.io/chart?c=${chartConfig}`;
    await ctx.replyWithPhoto({ url: chartUrl });
  } catch (err) {
    ctx.reply('Error creating chart: ' + err.message);
  }
});

bot.launch().then(() => console.log('Bot launched'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
