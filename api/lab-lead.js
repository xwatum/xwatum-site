module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  let d = req.body;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { return res.status(400).json({ ok: false, error: 'bad_json' }); } }
  if (!d || d.kind !== 'lead') return res.status(200).json({ ok: true, ignored: true });
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return res.status(500).json({ ok: false, error: 'not_configured' });
  const t = v => String(v == null ? '' : v).slice(0, 300);
  const c = d.contact || {}, cl = d.client || {}, p = d.proposal || {};
  if (!c.phone || t(c.phone).length < 5) return res.status(400).json({ ok: false, error: 'no_contact' });
  const text = [
    '🔔 Заявка · XWATUM Energy Lab', '',
    '👤 ' + (t(c.name) || '—') + ' · ' + t(c.phone) + (c.city ? ' · ' + t(c.city) : ''),
    '🏠 ' + t(cl.type) + ' · ' + t(cl.dailyKWh) + ' кВт·ч/сут · пик ' + t(cl.peakKW) + ' кВт',
    '🛡 Резерв: ' + (cl.scope === 'all' ? 'весь объект' : (cl.loads || []).map(t).join(', ')) + ' · ' + t(cl.autonomyH) + ' ч',
    '⚡ Накопитель ' + (p.essKWh || []).map(t).join('–') + ' кВт·ч · инвертор ' + t(p.inverterKW) + ' кВт' +
      (p.pvKW ? ' · СЭС ' + t(p.pvKW) + ' кВт' : '') + (p.generatorKW ? ' · ДГУ ' + t(p.generatorKW) + ' кВт' : ''),
    '⏱ Автономность ≈ ' + t(p.autonomyH) + ' ч',
    '💰 ≈ ' + Math.round(((d.costRub || {}).total || 0) / 1000).toLocaleString('ru-RU') + ' тыс. ₽ (демо-цены)',
    c.comment ? '💬 ' + t(c.comment) : '', '# ' + t(d.session)
  ].filter(Boolean).join('\n');
  try {
    const r = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text })
    });
    if (!r.ok) return res.status(502).json({ ok: false, error: 'telegram_error', detail: (await r.text()).slice(0, 300) });
    return res.status(200).json({ ok: true });
  } catch (e) { return res.status(502).json({ ok: false, error: 'network' }); }
};
