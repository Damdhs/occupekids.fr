const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const body = req.body;
    
    // Gère les deux formats : ancien (envelope) et nouveau (instantané)
    let event;
    
    if (body && body.type) {
      // Nouveau format instantané - pas de vérification de signature nécessaire
      event = body;
    } else {
      // Ancien format avec signature
      const sig = req.headers['stripe-signature'];
      try {
        event = stripe.webhooks.constructEvent(
          JSON.stringify(body),
          sig,
          process.env.STRIPE_WEBHOOK_SECRET
        );
      } catch (err) {
        console.error('Webhook signature error:', err.message);
        return res.status(400).json({ error: err.message });
      }
    }

    console.log('Webhook reçu:', event.type);

    if (event.type === 'checkout.session.completed') {
      const session = event.data?.object || event.data;
      const customerEmail = session.customer_details?.email || session.customer_email;
      const folders = session.metadata?.folders?.split('|||') || [];

      console.log('Email client:', customerEmail);
      console.log('Nombre de packs:', folders.length);

      if (customerEmail && folders.length > 0) {
        await sendDownloadEmail(customerEmail, folders);
        console.log('Email envoyé avec succès !');
      } else {
        console.log('Email ou folders manquants');
      }
    }

    res.status(200).json({ received: true });

  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: err.message });
  }
};

async function sendDownloadEmail(email, folders) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const linksHTML = folders.map((folder, i) =>
    `<a href="${folder}" style="display:block;background:#F97316;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:8px 0;text-align:center;">📥 Télécharger le Pack ${i + 1}</a>`
  ).join('');

  await transporter.sendMail({
    from: `"Occupe Ton Kids 🎴" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: '🎉 Tes jeux sont prêts à imprimer !',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h1 style="color:#F97316;text-align:center;">Occupe Ton Kids 🎴</h1>
        <h2 style="color:#333;">Merci pour ton achat ! 🎉</h2>
        <p style="color:#555;font-size:16px;">Tes jeux à imprimer sont prêts ! Clique sur les boutons ci-dessous pour télécharger tes packs :</p>
        <div style="margin:24px 0;">${linksHTML}</div>
        <p style="color:#555;font-size:14px;">⚠️ Ces liens sont valables à vie — garde cet email précieusement !</p>
        <p style="color:#555;font-size:14px;">Tu peux imprimer autant de fois que tu veux.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
        <p style="color:#999;font-size:12px;">Une question ? Réponds directement à cet email.</p>
      </div>
    `,
  });
}
