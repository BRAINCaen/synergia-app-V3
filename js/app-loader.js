
<section id="auth-section">
    <h2>Connexion à Synergia</h2>
    <form id="auth-form">
        <input type="email" id="email" placeholder="Email" required autocomplete="username" />
        <input type="password" id="password" placeholder="Mot de passe" required autocomplete="current-password" />
        <button type="submit">Se connecter</button>
    </form>
    <div style="text-align:center;margin:1.2rem 0 0.2rem 0;font-size:1rem;">ou</div>
    <button id="google-signin-btn" type="button" style="background:#fff;color:#222;border:1px solid #c9d1e0;display:flex;align-items:center;justify-content:center;gap:10px;padding:0.7rem 1rem;margin:0 auto;border-radius:6px;cursor:pointer;box-shadow:0 2px 8px #0001;">
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" width="22" height="22"> Connexion avec Google
    </button>
    <div id="auth-error"></div>
</section>
