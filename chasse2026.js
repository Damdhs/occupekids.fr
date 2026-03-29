// Compte à rebours
function updateCountdown() {
  var target = new Date(2026, 3, 4, 8, 0, 0); // 4 avril 2026 à 08h (local)

  var now = new Date();

  console.log("NOW :", now);
  console.log("TARGET :", target);

  var diff = target - now;

  if (diff <= 0) {
    document.getElementById('days').textContent = '0';
    document.getElementById('hours').textContent = '0';
    document.getElementById('minutes').textContent = '0';
    document.getElementById('seconds').textContent = '0';
    return;
  }

  document.getElementById('days').textContent = Math.floor(diff / (1000 * 60 * 60 * 24));
  document.getElementById('hours').textContent = Math.floor((diff / (1000 * 60 * 60)) % 24);
  document.getElementById('minutes').textContent = Math.floor((diff / (1000 * 60)) % 60);
  document.getElementById('seconds').textContent = Math.floor((diff / 1000) % 60);
}

updateCountdown();
setInterval(updateCountdown, 1000);

// FAQ
function toggleFaq(el) {
  var item = el.parentElement;
  item.classList.toggle('open');
}

// Formulaire
function handleSubmit() {
  var prenom = document.getElementById('prenom').value.trim();
  var email = document.getElementById('email').value.trim();
  var newsletter = document.getElementById('newsletter').checked;
  var errorEl = document.getElementById('formError');

  if (!prenom) {
    errorEl.textContent = "Merci d'entrer le prénom de l'enfant !";
    errorEl.style.display = 'block';
    return;
  }
  if (!email || email.indexOf('@') === -1) {
    errorEl.textContent = "Merci d'entrer un email valide !";
    errorEl.style.display = 'block';
    return;
  }

  errorEl.style.display = 'none';
  var btn = document.querySelector('.submit-btn');
  btn.textContent = '⏳ Inscription en cours...';
  btn.disabled = true;

  fetch('/api/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prenom: prenom, email: email, newsletter: newsletter })
  })
  .then(function(response) {
    return response.json().then(function(data) {
      return { ok: response.ok, data: data };
    });
  })
  .then(function(result) {
    if (result.ok) {
      document.getElementById('formContainer').style.display = 'none';
      document.getElementById('formSuccess').style.display = 'block';
    } else {
      errorEl.textContent = result.data.error || "Une erreur s'est produite, réessayez !";
      errorEl.style.display = 'block';
      btn.textContent = '🐣 Je rejoins la chasse !';
      btn.disabled = false;
    }
  })
  .catch(function() {
    errorEl.textContent = "Erreur de connexion, réessayez dans quelques secondes.";
    errorEl.style.display = 'block';
    btn.textContent = '🐣 Je rejoins la chasse !';
    btn.disabled = false;
  });
}
