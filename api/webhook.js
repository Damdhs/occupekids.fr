const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const customerEmail = session.customer_details?.email;
    const folders = session.metadata?.folders?.split('|||') || [];

    if (customerEmail && folders.length > 0) {
      await sendDownloadEmail(customerEmail, folders, session);
    }
  }

  res.status(200).json({ received: true });
};

async function sendDownloadEmail(email, folders, session) {
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

  const mailOptions = {
    from: `"Occupe Ton Kids 🎴" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: '🎉 Tes jeux sont prêts à imprimer !',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="text-align:center;margin-bottom:30px;">
          <h1 style="color:#F97316;">Occupe Ton Kids 🎴</h1>
        </div>
        <h2 style="color:#333;">Merci pour ton achat ! 🎉</h2>
        <p style="color:#555;font-size:16px;">Tes jeux à imprimer sont prêts ! Clique sur les boutons ci-dessous pour télécharger tes packs :</p>
        <div style="margin:24px 0;">
          ${linksHTML}
        </div>
        <p style="color:#555;font-size:14px;">⚠️ Ces liens sont valables à vie — garde cet email précieusement !</p>
        <p style="color:#555;font-size:14px;">Tu peux imprimer autant de fois que tu veux.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
        <p style="color:#999;font-size:12px;">Une question ? Réponds directement à cet email.</p>
        <p style="color:#999;font-size:12px;">Occupe Ton Kids — Des jeux à imprimer pour toute la famille 🎲</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`Email envoyé à ${email}`);
}
