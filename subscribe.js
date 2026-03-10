export default async function handler(req, res) {
  // CORS — autorise uniquement occupekids.fr
  res.setHeader('Access-Control-Allow-Origin', 'https://occupekids.fr');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prenom, email, newsletter } = req.body;

  if (!prenom || !email) {
    return res.status(400).json({ error: 'Prénom et email requis' });
  }

  const apiKey = process.env.BREVO_API_KEY; // ← clé stockée dans Vercel, jamais dans le code

  try {
    // 1. Ajouter le contact à la liste #11
    const contactRes = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify({
        email,
        attributes: { PRENOM: prenom, NEWSLETTER: newsletter || false },
        listIds: [11],
        updateEnabled: true
      })
    });

    if (!contactRes.ok && contactRes.status !== 204) {
      const err = await contactRes.json();
      throw new Error(err.message || 'Erreur Brevo contacts');
    }

    // 2. Envoyer l'email de confirmation
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify({
        sender: { name: 'OccupeKids 🐣', email: 'contact@occupekids.fr' },
        to: [{ email, name: prenom }],
        subject: "🐣 C'est confirmé ! Tu es inscrit(e) à la Chasse aux Œufs 2026",
        htmlContent: `
          <html><body style="font-family:sans-serif;background:#FFF9F0;padding:40px 20px">
          <div style="max-width:560px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
            <div style="background:linear-gradient(135deg,#FF6B6B,#FF9A3C);padding:40px;text-align:center">
              <div style="font-size:56px">🐣</div>
              <h1 style="color:#fff;font-size:26px;margin:12px 0 8px">C'est confirmé !</h1>
              <p style="color:rgba(255,255,255,0.9);font-size:15px;margin:0">Tu es inscrit(e) à la Chasse aux Œufs Connectée 2026</p>
            </div>
            <div style="padding:36px">
              <p style="color:#2C2C54;font-size:17px;line-height:1.6">Bonjour ${prenom} 👋</p>
              <p style="color:#2C2C54;font-size:16px;line-height:1.6">Super, ton inscription est bien enregistrée ! La chasse commence le <strong>samedi 18 avril 2026</strong>. Tu recevras un email ce matin-là avec le lien pour démarrer les défis.</p>
              <div style="background:#FFF3E0;border-radius:12px;padding:20px;margin:20px 0">
                <p style="color:#FF6B6B;font-size:13px;font-weight:700;text-transform:uppercase;margin:0 0 10px">📅 Le weekend du jeu</p>
                <p style="color:#2C2C54;font-size:15px;margin:0 0 6px">🗓️ <strong>Début :</strong> Samedi 18 avril — dès 8h00</p>
                <p style="color:#2C2C54;font-size:15px;margin:0 0 6px">🏁 <strong>Fin :</strong> Lundi 20 avril — minuit</p>
                <p style="color:#2C2C54;font-size:15px;margin:0">🎯 <strong>5 défis</strong> à relever en famille</p>
              </div>
              <div style="text-align:center;margin:28px 0">
                <a href="https://occupekids.fr/chasse_oeufs_2026.html" style="background:linear-gradient(135deg,#FF6B6B,#FF9A3C);color:#fff;font-size:16px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:50px;display:inline-block">🐰 Voir la page du jeu</a>
              </div>
              <p style="color:#7C7C9A;font-size:14px">À très bientôt,<br><strong style="color:#FF6B6B">L'équipe OccupeKids 🐣</strong></p>
            </div>
            <div style="padding:20px;text-align:center;background:#FFF9F0">
              <p style="color:#AAAACC;font-size:12px;margin:0">OccupeKids.fr — Jeux à imprimer pour toute la famille</p>
            </div>
          </div>
          </body></html>
        `
      })
    });

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Erreur subscribe:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
