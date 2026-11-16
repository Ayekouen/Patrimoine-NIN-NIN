/* Patrimoine NIN NIN — application (PWA) */
'use strict';
const C = window.PF_CONFIG;
const sb = supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true } });

/* ---------- Utilitaires ---------- */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => new Intl.NumberFormat('fr-FR').format(n || 0) + ' F';
const pdfNum = n => new Intl.NumberFormat('fr-FR').format(n || 0).replace(/\s/g, ' ') + ' F';
const digits = t => String(t || '').replace(/\D/g, '');
const motDePasse = (pin, tel) => 'PF-' + pin + '-' + digits(tel);
const emailDe = tel => digits(tel) + '@' + C.domaineComptes;
const ini = n => String(n || '?').split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase();
const dfr = d => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
const dlong = d => new Date(d).toLocaleDateString('fr-FR');
const auj = () => new Date().toISOString().slice(0, 10);
const cleMois = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
const libMois = k => { const [y, m] = k.split('-').map(Number); const s = new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }); return s[0].toUpperCase() + s.slice(1); };
const MOIS = cleMois();
const MOIS_SUIV = (() => { const d = new Date(); d.setMonth(d.getMonth() + 1, 1); return cleMois(d); })();
const libPeriode = p => p === 'Arriérés' ? 'Arriérés' : libMois(p);
const ANNEE = new Date().getFullYear();
const CATS = ['Réparations', 'Entretien / nettoyage', 'Électricité / eau', 'Impôts et taxes', 'Commission collecteur', 'Démarches administratives', 'Gardiennage', 'Autre'];
const ETAPES = { 'À faire': 'p-bad', 'En cours': 'p-warn', 'En attente': 'p-warn', 'Terminée': 'p-ok' };
const STATUTS = { 'Validée': 'p-ok', 'En attente': 'p-warn', 'Refusée': 'p-bad' };
function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.setAttribute('role', 'status'); d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2800); }
function msgErreur(e) {
  const m = (e && (e.message || e.error_description)) || String(e);
  if (/Invalid login/i.test(m)) return 'Numéro ou code PIN incorrect.';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Pas de connexion internet. Réessayez.';
  return m;
}

/* ---------- Icônes ---------- */
const IC = {
  accueil: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  biens: '<path d="M3 21V8l9-5 9 5v13M8 21v-6h8v6M3 21h18"/>',
  encaisser: '<path d="M12 5v14M5 12h14"/>',
  locataires: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.9.7 3.1 2.4 3.5 5.2"/>',
  messages: '<path d="M4 5h16v11H8l-4 4z"/>',
  finances: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0"/>',
  reglages: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'
};
const svg = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k]}</svg>`;

/* ---------- État ---------- */
const S = {
  session: null, moi: null, view: 'accueil', filtre: 'Tous', fin: 'synthese', convo: null, q: '',
  profils: [], biens: [], locataires: [], versements: [], depenses: [], remises: [], demarches: [],
  messages: [], notifs: [], seuil: 50000,
  heritiers: [], distributions: [], dlignes: [], documents: [], reservePct: 10, regles: [], affectations: [], dprel: [], equipes: [], journal: [], recu: {}, terrains: [], terrainF: 'Tous'
};
const estG = () => S.moi?.role === 'Gestionnaire';
const estFam = () => S.moi?.role === 'Famille';
const estCAC = () => S.moi?.role === 'Commissaire aux comptes';
const estLect = () => estFam() || estCAC();
const estT = () => S.moi?.role === 'Trésorier' || S.equipes.some(e => e.profil_id === S.moi?.id && e.role === 'Trésorier');
const aCAC = () => S.profils.some(p => p.actif && p.role === 'Commissaire aux comptes');
const mesEq = () => S.equipes.filter(e => e.profil_id === S.moi?.id);
const peutBien = id => estG() || (!estLect() && (mesEq().some(e => e.bien_id === id && e.role !== 'Commissaire aux comptes') || !mesEq().length));
const ROLES_EQ = ['Collecteur', 'Trésorier', 'Commissaire aux comptes'];
const lectureSeule = () => { toast('Votre compte est en consultation seule.'); };
const bien = id => S.biens.find(b => b.id === id);
const terrain = id => S.terrains.find(t => t.id === id);
const TYPES_BIEN = ['Magasin', 'Conteneur', 'Église', 'Autre'];
const PLURIEL = { Magasin: 'Magasins', Conteneur: 'Conteneurs', 'Église': 'Églises', Autre: 'Autres', Terrain: 'Terrains' };
const loc = id => S.locataires.find(l => l.id === id);
const prof = id => S.profils.find(p => p.id === id);
const nomDe = id => prof(id)?.nom || '—';
const locActifs = () => S.locataires.filter(l => l.actif);
const locDuBien = id => S.locataires.find(l => l.bien_id === id && l.actif);
const paye = lid => S.versements.filter(v => v.locataire_id === lid && v.periode === MOIS).reduce((a, v) => a + v.montant, 0);
function statut(l) {
  const b = bien(l.bien_id); const du = b ? b.loyer : 0, p = paye(l.id);
  if (p >= du) return { k: 'ok', t: 'Payé', court: 'Payé' };
  if (p > 0) return { k: 'warn', t: 'Partiel · reste ' + fmt(du - p), court: 'Partiel' };
  return { k: 'bad', t: 'Impayé', court: 'Impayé' };
}
const versMois = () => S.versements.filter(v => v.date_paiement.slice(0, 7) === MOIS);
const depMois = () => S.depenses.filter(d => d.date_depense.slice(0, 7) === MOIS);
const tRec = () => versMois().reduce((a, v) => a + v.montant, 0);
const tDep = () => depMois().filter(d => d.statut === 'Validée').reduce((a, d) => a + d.montant, 0);
const nonLues = () => S.notifs.filter(n => S.moi && new Date(n.created_at) > new Date(S.moi.notifs_lues_at)).length;

/* ---------- Chargement des données ---------- */
async function q(p) { const { data, error } = await p; if (error) throw error; return data; }
async function charger(quoi) {
  const debutAn = ANNEE + '-01-01';
  const T = {
    profils: () => sb.from('profils').select('*').order('nom'),
    biens: () => sb.from('biens').select('*').order('id'),
    terrains: () => sb.from('terrains').select('*').order('id'),
    locataires: () => sb.from('locataires').select('*').order('nom'),
    versements: () => sb.from('versements').select('*').gte('date_paiement', debutAn).order('created_at'),
    depenses: () => sb.from('depenses').select('*').gte('date_depense', debutAn).order('created_at'),
    remises: () => sb.from('remises').select('*').order('created_at'),
    demarches: () => sb.from('demarches').select('*').order('echeance', { nullsFirst: false }),
    messages: () => sb.from('messages').select('*').order('created_at').limit(1000),
    notifs: () => sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(80),
    parametres: () => sb.from('parametres').select('*'),
    heritiers: () => sb.from('heritiers').select('*').order('part', { ascending: false }).order('nom'),
    distributions: () => sb.from('distributions').select('*').order('debut', { ascending: false }),
    dlignes: () => sb.from('distribution_lignes').select('*'),
    documents: () => sb.from('documents').select('*').order('created_at', { ascending: false }),
    regles: () => sb.from('regles_repartition').select('*').order('ordre').order('created_at'),
    affectations: () => sb.from('affectations').select('*'),
    dprel: () => sb.from('distribution_prelevements').select('*').order('ordre'),
    equipes: () => sb.from('equipes').select('*'),
    journal: () => sb.from('journal').select('*').order('quand', { ascending: false }).limit(300)
  };
  const cles = quoi ? [].concat(quoi) : Object.keys(T);
  const res = await Promise.all(cles.map(k => q(T[k]())));
  cles.forEach((k, i) => {
    if (k === 'parametres') { const s = res[i].find(x => x.cle === 'seuil_validation'); if (s) S.seuil = parseInt(s.valeur, 10);
      const rp = res[i].find(x => x.cle === 'reserve_pct'); if (rp) S.reservePct = parseFloat(rp.valeur);
      const rc = res[i].find(x => x.cle === 'recu'); try { S.recu = rc ? JSON.parse(rc.valeur) : {}; } catch (e) { S.recu = {}; } }
    else S[k] = res[i];
  });
  if (cles.includes('profils')) S.moi = S.profils.find(p => p.id === S.session.user.id) || S.moi;
}

let canal = null, rafraichir = null;
function abonner() {
  if (canal) sb.removeChannel(canal);
  const tables = { versements: 'versements', depenses: 'depenses', remises: 'remises', messages: 'messages', notifications: 'notifs', distributions: 'distributions', distribution_lignes: 'dlignes', distribution_prelevements: 'dprel' };
  const sales = new Set();
  canal = sb.channel('pf');
  Object.entries(tables).forEach(([t, k]) => canal.on('postgres_changes', { event: '*', schema: 'public', table: t }, p => {
    sales.add(k); if (t === 'versements') sales.add('locataires');
    if (t === 'notifications' && p.eventType === 'INSERT') alerter(p.new);
    clearTimeout(rafraichir);
    rafraichir = setTimeout(async () => { const l = [...sales]; sales.clear(); try { await charger(l); render(); } catch (e) { console.warn(e); } }, 400);
  }));
  canal.subscribe();
}
function alerter(n) {
  if (n.pour_role && n.pour_role !== S.moi?.role) return;
  toast(n.texte);
  if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
    navigator.serviceWorker?.ready.then(r => r.showNotification('Patrimoine NIN NIN', { body: n.texte, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', tag: n.id })).catch(() => {});
  }
}

/* ---------- Démarrage, connexion ---------- */
let pinBuf = '';
async function demarrer() {
  if (location.hash.startsWith('#verifier/')) return vVerifier();
  const { data } = await sb.auth.getSession();
  S.session = data.session;
  if (!S.session) {
    let init = true;
    try { init = await q(sb.rpc('est_initialise')); } catch (e) { return ecranErreur(e); }
    return init ? ecranConnexion() : ecranInitialisation();
  }
  try {
    await charger();
    if (!S.moi || !S.moi.actif) { await sb.auth.signOut(); S.session = null; return ecranConnexion('Ce compte est désactivé. Contactez le gestionnaire.'); }
    abonner(); render();
  } catch (e) { ecranErreur(e); }
}
function ecranErreur(e) {
  $('#tabs').hidden = true;
  $('#app').innerHTML = `<div class="boot"><div class="logo">PN</div><p class="err" style="text-align:center">${esc(msgErreur(e))}</p><button class="btn" id="re" style="width:auto">Réessayer</button></div>`;
  $('#re').onclick = () => location.reload();
}
function ecranConnexion(erreur) {
  $('#tabs').hidden = true; close();
  let tel = ''; try { tel = localStorage.getItem('pf_tel') || ''; } catch (e) {}
  const dessiner = (err) => {
    $('#app').innerHTML = `<div class="stack" style="padding-top:18px">
      <div class="logo">PN</div>
      <div><div class="eyebrow">Gestion des biens de la famille</div><h1>Patrimoine NIN NIN</h1></div>
      <div class="card stack">
        <div><label for="lgtel">Numéro de téléphone</label><input id="lgtel" inputmode="tel" autocomplete="tel" placeholder="07 00 00 00 00" value="${esc(tel)}"></div>
        <div><label>Code PIN</label><div class="pin" aria-live="polite">${[0, 1, 2, 3].map(i => `<i class="${i < pinBuf.length ? 'on' : ''}"></i>`).join('')}</div>
        <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map(k => k === '' ? '<span></span>' : `<button type="button" data-k="${k}" aria-label="${k === '⌫' ? 'Effacer' : k}">${k}</button>`).join('')}</div></div>
        <p class="err" id="lgerr" ${err ? '' : 'hidden'}>${esc(err || '')}</p>
      </div>
      <p class="small muted" style="text-align:center">PIN oublié ? Demandez au gestionnaire de le réinitialiser.</p></div>`;
    $('#lgtel').oninput = e => { tel = e.target.value; };
    $$('.pad button').forEach(b => b.onclick = async () => {
      const k = b.dataset.k;
      if (k === '⌫') pinBuf = pinBuf.slice(0, -1); else if (pinBuf.length < 4) pinBuf += k;
      if (pinBuf.length < 4) return majPin();
      majPin();
      if (digits(tel).length < 8) { pinBuf = ''; return dessiner('Saisissez votre numéro de téléphone.'); }
      const pin = pinBuf; pinBuf = '';
      const { error } = await sb.auth.signInWithPassword({ email: emailDe(tel), password: motDePasse(pin, tel) });
      if (error) return dessiner(msgErreur(error));
      try { localStorage.setItem('pf_tel', tel); } catch (e) {}
      demarrer();
    });
  };
  const majPin = () => $$('.pin i').forEach((x, i) => x.classList.toggle('on', i < pinBuf.length));
  dessiner(erreur);
}
function ecranInitialisation() {
  $('#tabs').hidden = true;
  $('#app').innerHTML = `<form class="stack" id="init" style="padding-top:18px">
    <div class="logo">PN</div>
    <div><div class="eyebrow">Première utilisation</div><h1>Créer le compte gestionnaire</h1></div>
    <p class="muted" style="margin:0">Ce compte administre l'application : il ajoute les biens, les locataires et les comptes des collecteurs.</p>
    <div class="card stack">
      <div><label for="inom">Nom complet</label><input id="inom" required autocomplete="name"></div>
      <div><label for="itel">Numéro de téléphone</label><input id="itel" required inputmode="tel" placeholder="07 00 00 00 00"></div>
      <div class="grid2"><div><label for="ipin">Code PIN (4 chiffres)</label><input id="ipin" required inputmode="numeric" maxlength="4" pattern="[0-9]{4}" type="password" autocomplete="new-password"></div>
      <div><label for="ipin2">Confirmer le PIN</label><input id="ipin2" required inputmode="numeric" maxlength="4" pattern="[0-9]{4}" type="password" autocomplete="new-password"></div></div>
      <p class="err" id="ierr" hidden></p>
      <button class="btn" id="ibtn">Créer le compte et commencer</button></div></form>`;
  $('#init').onsubmit = async e => {
    e.preventDefault();
    const nom = $('#inom').value.trim(), tel = $('#itel').value.trim(), pin = $('#ipin').value;
    const err = t => { $('#ierr').textContent = t; $('#ierr').hidden = false; };
    if (digits(tel).length < 8) return err('Numéro de téléphone invalide.');
    if (!/^\d{4}$/.test(pin)) return err('Le PIN doit comporter 4 chiffres.');
    if (pin !== $('#ipin2').value) return err('Les deux PIN ne correspondent pas.');
    $('#ibtn').disabled = true;
    try {
      await q(sb.rpc('initialiser', { p_nom: nom, p_tel: tel, p_mdp: motDePasse(pin, tel) }));
      const { error } = await sb.auth.signInWithPassword({ email: emailDe(tel), password: motDePasse(pin, tel) });
      if (error) throw error;
      try { localStorage.setItem('pf_tel', tel); } catch (x) {}
      demarrer();
    } catch (x) { $('#ibtn').disabled = false; err(msgErreur(x)); }
  };
}

/* ---------- Vérification publique d'un reçu ---------- */
async function vVerifier() {
  $('#tabs').hidden = true;
  const [, num, code] = location.hash.split('/');
  $('#app').innerHTML = `<div class="stack" style="padding-top:18px"><div class="logo">PN</div><h1>Vérification de reçu</h1><div class="card" id="vres">Vérification en cours…</div>
    <button class="btn ghost" id="vback">Ouvrir l'application</button></div>`;
  $('#vback').onclick = () => { location.hash = ''; location.reload(); };
  try {
    const r = await q(sb.rpc('verifier_recu', { p_numero: decodeURIComponent(num || ''), p_code: decodeURIComponent(code || '') }));
    const v = r && r[0];
    $('#vres').innerHTML = v ? `<div class="stack" style="gap:6px"><span class="pill p-ok" style="align-self:flex-start">Reçu authentique</span>
      <div class="row between"><span class="muted">Reçu</span><b>${esc(v.numero)}</b></div>
      <div class="row between"><span class="muted">Locataire</span><span>${esc(v.locataire)}</span></div>
      <div class="row between"><span class="muted">Bien</span><span>${esc(v.bien)}</span></div>
      <div class="row between"><span class="muted">Période</span><span>${esc(libPeriode(v.periode))}</span></div>
      <div class="row between"><span class="muted">Date</span><span>${dlong(v.date_paiement)}</span></div>
      <div class="row between"><span class="muted">Montant</span><b class="num">${fmt(v.montant)}</b></div></div>`
      : `<span class="pill p-bad">Reçu introuvable</span><p class="muted">Ce numéro et ce code ne correspondent à aucun reçu émis. Le document n'est pas authentique ou a été modifié.</p>`;
  } catch (e) { $('#vres').innerHTML = `<p class="err">${esc(msgErreur(e))}</p>`; }
}

/* ---------- Vues ---------- */
function topbar(titre, sous) {
  const n = nonLues();
  return `<div class="top"><div style="min-width:0"><div class="eyebrow">${esc(sous)}</div><h1>${esc(titre)}</h1></div>
  <div class="row" style="gap:8px">${estG() ? `<button class="iconbtn" id="reglages" aria-label="Réglages">${svg('reglages')}</button>` : ''}
  <button class="iconbtn" id="bell" aria-label="Notifications">${svg('bell')}${n ? `<b>${n}</b>` : ''}</button></div></div>`;
}
function vAccueil() {
  const actifs = locActifs();
  const du = actifs.reduce((a, l) => a + (bien(l.bien_id)?.loyer || 0), 0);
  const enc = S.versements.filter(v => v.periode === MOIS).reduce((a, v) => a + v.montant, 0);
  const pct = du ? Math.round(enc / du * 100) : 0;
  const st = actifs.map(statut);
  const relancer = actifs.filter(l => statut(l).k !== 'ok' || l.arriere > 0);
  const libres = S.biens.filter(b => b.actif && !locDuBien(b.id));
  const attente = S.depenses.filter(d => d.statut === 'En attente');
  const demEnCours = S.demarches.filter(g => g.etape !== 'Terminée');
  if (!S.biens.length && estG()) return topbar('Bonjour ' + S.moi.nom.split(' ')[0], S.moi.role) + `<div class="card stack"><h2>Bienvenue</h2>
    <p class="muted" style="margin:0">Commencez par enregistrer le terrain, puis les biens qui s'y trouvent (magasins, conteneurs, église…), les locataires et les comptes de l'équipe.</p>
    <button class="btn" data-act="terrain">Ajouter le premier terrain</button><button class="btn ghost" data-act="reglages">Créer les comptes collecteurs</button></div>`;
  return topbar('Bonjour ' + S.moi.nom.split(' ')[0], S.moi.role + ' · ' + libMois(MOIS)) + `<div class="stack">
    <div class="hero"><div class="eyebrow" style="color:inherit;opacity:.8">Loyers encaissés · ${libMois(MOIS)}</div>
      <div class="big num">${fmt(enc)}</div><div class="small num" style="opacity:.85">sur ${fmt(du)} attendus · ${pct} %</div>
      <div class="bar"><i style="width:${Math.min(pct, 100)}%"></i></div>
      <div class="small num" style="opacity:.85;margin-top:8px">Dépenses ${fmt(tDep())} · Solde net du mois ${fmt(tRec() - tDep())}</div></div>
    <div class="kpis">
      <div class="kpi"><strong class="num" style="color:var(--ok)">${st.filter(s => s.k === 'ok').length}</strong><span class="small muted">À jour</span></div>
      <div class="kpi"><strong class="num" style="color:var(--warn)">${st.filter(s => s.k === 'warn').length}</strong><span class="small muted">Partiels</span></div>
      <div class="kpi"><strong class="num" style="color:var(--bad)">${st.filter(s => s.k === 'bad').length}</strong><span class="small muted">Impayés</span></div></div>
    ${estG() && attente.length ? `<button class="card item" style="border:1px solid var(--warn)" data-fin="depenses"><span class="grow"><b style="color:var(--warn)">${attente.length} dépense(s) à valider</b><span class="small muted ellip">Montants supérieurs à ${fmt(S.seuil)}</span></span><span class="muted">›</span></button>` : ''}
    ${demEnCours.length ? `<button class="card item" data-fin="demarches"><span class="grow"><b>${demEnCours.length} démarche(s) en cours</b><span class="small muted ellip">Prochaine : ${esc(demEnCours[0].titre)}</span></span><span class="muted">›</span></button>` : ''}
    <div class="row between"><h2>À relancer</h2><span class="small muted">${relancer.length} locataire(s)</span></div>
    <div class="list">${relancer.map(l => { const s = statut(l); return `<button class="item" data-loc="${l.id}"><span class="tag">${esc(l.bien_id || '—')}</span>
      <span class="grow"><b class="ellip">${esc(l.nom)}</b><span class="small muted num">${esc(l.tel)}${l.arriere ? ' · arriérés ' + fmt(l.arriere) : ''}</span></span>
      <span class="pill p-${s.k}">${s.court}</span></button>`; }).join('') || '<p class="vide">Tous les loyers du mois sont réglés.</p>'}</div>
    <div class="row between"><h2>Derniers versements</h2></div>
    <div class="list">${S.versements.slice().reverse().slice(0, 5).map(v => `<button class="item" data-rec="${v.id}">
      <span class="grow"><b class="ellip">${esc(loc(v.locataire_id)?.nom)}</b><span class="small muted">${dfr(v.date_paiement)} · ${esc(v.mode)} · par ${esc(nomDe(v.par))}</span></span>
      <b class="num">${fmt(v.montant)}</b></button>`).join('') || '<p class="vide">Aucun versement enregistré.</p>'}</div>
    ${S.terrains.filter(t => t.actif).length > 1 ? `<div class="row between"><h2>Par terrain</h2></div><div class="list grille">${S.terrains.filter(t => t.actif).map(t => { const st = statsTerrain(t.id); const p = st.du ? Math.round(st.enc / st.du * 100) : 0;
      return `<button class="item" data-tf2="${esc(t.id)}"><span class="grow"><b class="ellip">${esc(t.nom)}</b><span class="small muted">${st.bs.length} bien(s) · ${fmt(st.enc)} sur ${fmt(st.du)}</span><span class="bar mini"><i style="width:${Math.min(p, 100)}%"></i></span></span><b class="num small">${p} %</b></button>`; }).join('')}</div>` : ''}
    ${libres.length ? `<div class="card small"><b>Biens libres :</b> ${libres.map(b => esc(b.nom)).join(', ')}</div>` : ''}</div>`;
}
function ligneBien(b) {
  const lo = locDuBien(b.id); const st = lo ? statut(lo) : null;
  return `<button class="item" data-bien="${esc(b.id)}"><span class="tag">${esc(b.id)}</span>
    <span class="grow"><b class="ellip">${esc(b.nom)}</b><span class="small muted ellip">${esc(b.type)} · ${lo ? esc(lo.nom) : 'Libre'}</span></span>
    <span style="text-align:right"><b class="num small" style="display:block">${fmt(b.loyer)}</b>${st ? `<span class="pill p-${st.k}">${st.court}</span>` : '<span class="pill p-neutre">Libre</span>'}</span></button>`;
}
function statsTerrain(tid) {
  const bs = S.biens.filter(b => b.actif && b.terrain_id === tid); const ids = new Set(bs.map(b => b.id));
  const du = bs.reduce((a, b) => a + (locDuBien(b.id) ? b.loyer : 0), 0);
  const enc = S.versements.filter(v => v.periode === MOIS && ids.has(v.bien_id)).reduce((a, v) => a + v.montant, 0);
  const par = TYPES_BIEN.concat('Terrain').map(t => [t, bs.filter(b => b.type === t).length]).filter(x => x[1]);
  return { bs, du, enc, par, occ: bs.filter(b => locDuBien(b.id)).length };
}
function vBiens() {
  const types = ['Tous'].concat(TYPES_BIEN, S.biens.some(b => b.actif && b.type === 'Terrain') ? ['Terrain'] : []);
  const ts = S.terrains.filter(t => t.actif);
  const sansT = S.biens.filter(b => b.actif && !terrain(b.terrain_id));
  const groupes = ts.filter(t => S.terrainF === 'Tous' || S.terrainF === t.id).map(t => [t, S.biens.filter(b => b.actif && b.terrain_id === t.id)]);
  if (sansT.length && S.terrainF === 'Tous') groupes.push([{ id: '', nom: 'Sans terrain' }, sansT]);
  const total = S.biens.filter(b => b.actif).length;
  return topbar('Terrains et biens', ts.length + ' terrain(s) · ' + total + ' bien(s)') + `<div class="stack">
    ${ts.length > 1 ? `<div class="chips">${[['Tous', 'Tous les terrains']].concat(ts.map(t => [t.id, t.nom])).map(([k, n]) => `<button class="chip" data-tf="${esc(k)}" aria-pressed="${S.terrainF === k}">${esc(n)}</button>`).join('')}</div>` : ''}
    <div class="chips">${types.map(t => `<button class="chip" data-f="${t}" aria-pressed="${S.filtre === t}">${t === 'Tous' ? 'Tous types' : PLURIEL[t]}</button>`).join('')}</div>
    ${groupes.map(([t, bs]) => { const l = bs.filter(b => S.filtre === 'Tous' || b.type === S.filtre); const st = t.id ? statsTerrain(t.id) : null;
      return `<section class="card stack terrain" style="gap:10px">
        <div class="row between" style="align-items:flex-start"><div style="min-width:0"><div class="eyebrow">${t.id ? esc(t.id) + (t.lieu ? ' · ' + esc(t.lieu) : '') : 'À rattacher'}</div><h2 style="margin:2px 0 0">${esc(t.nom)}</h2>
          ${st ? `<div class="small muted">${st.par.map(([k, n]) => n + ' ' + (n > 1 ? PLURIEL[k] : k).toLowerCase()).join(' · ') || 'Aucun bien'} · ${st.occ}/${st.bs.length} occupé(s)</div>` : ''}</div>
          ${t.id && estG() ? `<button class="chip" data-terrain="${esc(t.id)}">Modifier</button>` : ''}</div>
        ${st ? `<div class="kpis"><div class="kpi"><strong class="num">${fmt(st.enc)}</strong><span class="small muted">Encaissé ce mois</span></div><div class="kpi"><strong class="num">${fmt(st.du)}</strong><span class="small muted">Attendu</span></div><div class="kpi"><strong class="num">${st.du ? Math.round(st.enc / st.du * 100) : 0} %</strong><span class="small muted">Recouvrement</span></div></div>` : ''}
        <div class="list grille">${l.map(ligneBien).join('') || '<p class="vide">Aucun bien de ce type.</p>'}</div>
        ${t.id && estG() ? `<button class="btn ghost" data-addbien="${esc(t.id)}">Ajouter un bien sur ce terrain</button>` : ''}</section>`; }).join('') || '<p class="vide">Aucun terrain enregistré.</p>'}
    ${estG() ? '<button class="btn" data-act="terrain">Ajouter un terrain</button>' : ''}</div>`;
}
function fTerrain(id) {
  if (!estG()) return lectureSeule();
  const t = id ? terrain(id) : null;
  sheet(`<form class="stack" id="tf">${entete(t ? esc(t.nom) : 'Nouveau terrain')}
    <div class="grid2"><div><label for="tid">Code</label><input id="tid" required maxlength="8" placeholder="TF1" value="${esc(t?.id)}" ${t ? 'readonly' : ''}></div>
    <div><label for="tsu">Superficie</label><input id="tsu" maxlength="40" placeholder="1 200 m²" value="${esc(t?.superficie)}"></div></div>
    <div><label for="tn">Nom du terrain</label><input id="tn" required maxlength="80" placeholder="Terrain familial de Faya" value="${esc(t?.nom)}"></div>
    <div><label for="tl">Lieu</label><input id="tl" maxlength="80" placeholder="Commune, quartier" value="${esc(t?.lieu)}"></div>
    <div><label for="tr">Référence foncière</label><input id="tr" maxlength="80" placeholder="Titre foncier, ACD, n° de lot" value="${esc(t?.reference_fonciere)}"></div>
    <div><label for="tno">Notes</label><textarea id="tno" rows="3">${esc(t?.notes)}</textarea></div>
    <p class="err" id="terr" hidden></p><button class="btn" id="tok">${t ? 'Enregistrer' : 'Ajouter le terrain'}</button>
    ${t && !S.biens.some(b => b.actif && b.terrain_id === t.id) ? '<button type="button" class="btn danger" id="tarch">Retirer ce terrain</button>' : ''}</form>`);
  $('#tf').onsubmit = async e => { e.preventDefault(); occupe($('#tok'), true);
    const o = { id: $('#tid').value.trim().toUpperCase(), nom: $('#tn').value.trim(), lieu: $('#tl').value.trim(), superficie: $('#tsu').value.trim(), reference_fonciere: $('#tr').value.trim(), notes: $('#tno').value.trim() };
    try { if (t) await q(sb.from('terrains').update(o).eq('id', t.id)); else await q(sb.from('terrains').insert(o));
      await charger('terrains'); close(); render(); toast(t ? 'Terrain mis à jour' : 'Terrain ajouté'); }
    catch (x) { occupe($('#tok'), false); $('#terr').textContent = /duplicate/i.test(x.message) ? 'Ce code est déjà utilisé.' : msgErreur(x); $('#terr').hidden = false; } };
  if ($('#tarch')) $('#tarch').onclick = () => confirmer(`Retirer ${t.nom} ?`, 'Retirer le terrain', async () => {
    await q(sb.from('terrains').update({ actif: false }).eq('id', t.id)); await charger('terrains'); close(); render(); toast('Terrain retiré'); });
}
function listeLoc() {
  const qq = digits(S.q) || S.q.toLowerCase();
  return locActifs().filter(l => !qq || (l.nom.toLowerCase().includes(qq) || digits(l.tel).includes(qq))).map(l => { const s = statut(l); return `<button class="item" data-loc="${l.id}">
    <span class="tag rond">${esc(ini(l.nom))}</span><span class="grow"><b class="ellip">${esc(l.nom)}</b>
    <span class="small muted num ellip">${esc(l.tel)} · ${esc(bien(l.bien_id)?.nom || 'Sans bien')}</span></span><span class="pill p-${s.k}">${s.court}</span></button>`; }).join('') || '<p class="vide">Aucun locataire.</p>';
}
function vLocataires() {
  return topbar('Locataires', 'Registre · ' + locActifs().length + ' contrats') + `<div class="stack">
    <input id="q" placeholder="Rechercher un nom ou un numéro" aria-label="Rechercher" value="${esc(S.q)}">
    <div class="list" id="ll">${listeLoc()}</div>
    ${estG() ? '<button class="btn ghost" data-act="locataire">Ajouter un locataire</button>' : ''}</div>`;
}
function cleConv(a, b) { return [a, b].sort().join(':'); }
function vMessages() {
  const autres = S.profils.filter(p => p.id !== S.moi.id && p.actif);
  if (!S.convo) return topbar('Messages', 'Collecteurs et gestionnaires') + `<div class="list">${autres.map(u => {
    const ms = S.messages.filter(m => cleConv(m.de, m.a) === cleConv(S.moi.id, u.id)); const m = ms[ms.length - 1];
    return `<button class="item" data-conv="${u.id}"><span class="tag rond">${esc(ini(u.nom))}</span><span class="grow"><b>${esc(u.nom)}</b> <span class="small muted">· ${u.role}</span>
      <span class="small muted ellip">${m ? esc(m.texte) : 'Aucun message'}</span></span><span class="small muted">${m ? new Date(m.created_at).toTimeString().slice(0, 5) : ''}</span></button>`; }).join('') || '<p class="vide">Aucun autre utilisateur. Le gestionnaire crée les comptes dans les réglages.</p>'}</div>`;
  const u = prof(S.convo); const ms = S.messages.filter(m => cleConv(m.de, m.a) === cleConv(S.moi.id, u.id));
  return `<div class="top"><button class="chip" id="back">‹ Retour</button><h2>${esc(u.nom)}</h2><span style="width:60px"></span></div>
    <div class="msgs">${ms.map(m => `<div class="bub ${m.de === S.moi.id ? 'me' : ''}">${esc(m.texte)}<div class="small" style="opacity:.7;text-align:right">${dfr(m.created_at)} ${new Date(m.created_at).toTimeString().slice(0, 5)}</div></div>`).join('') || '<p class="vide">Écrivez le premier message.</p>'}</div>
    <form id="mf" class="row" style="margin-top:14px"><input id="mt" placeholder="Écrire un message" aria-label="Message" autocomplete="off" maxlength="2000"><button class="btn" style="width:auto">Envoyer</button></form>`;
}

/* ---------- Finances ---------- */
function annee() {
  const mois = []; for (let m = 0; m < 12; m++) { const k = ANNEE + '-' + String(m + 1).padStart(2, '0'); if (k > MOIS) break; mois.push(k); }
  return mois.map(k => [libMois(k).split(' ')[0], S.versements.filter(v => v.date_paiement.slice(0, 7) === k).reduce((a, v) => a + v.montant, 0),
    S.depenses.filter(d => d.date_depense.slice(0, 7) === k && d.statut === 'Validée').reduce((a, d) => a + d.montant, 0)]);
}
function lignesBien() {
  return S.biens.filter(b => b.actif).map(b => { const lo = locDuBien(b.id);
    const r = S.versements.filter(v => v.bien_id === b.id).reduce((a, v) => a + v.montant, 0);
    const d = S.depenses.filter(x => x.bien_id === b.id && x.statut === 'Validée').reduce((a, x) => a + x.montant, 0);
    return [b.id, b.nom, b.type, lo ? lo.nom : 'Libre', b.loyer, r, d, r - d, lo?.arriere || 0]; });
}
function caisse(uid) {
  const inn = S.versements.filter(v => v.par === uid && v.mode === 'Espèces').reduce((a, v) => a + v.montant, 0);
  const out = S.depenses.filter(d => d.par === uid && d.mode === 'Espèces' && d.statut !== 'Refusée').reduce((a, d) => a + d.montant, 0);
  const rem = S.remises.filter(r => r.par === uid).reduce((a, r) => a + r.montant, 0);
  return { inn, out, rem, solde: inn - out - rem };
}
const OBJETS = { biens: 'Bien', locataires: 'Locataire', versements: 'Recette', depenses: 'Dépense', remises: 'Remise', heritiers: 'Héritier', distributions: 'Répartition', distribution_lignes: 'Part d\'héritier', regles_repartition: 'Règle', affectations: 'Bien affecté', equipes: 'Équipe', profils: 'Compte', parametres: 'Réglage', documents: 'Document' };
function resumeJ(j) {
  const o = j.apres || j.avant || {};
  const lib = o.numero || o.libelle || o.nom || o.titre || o.cle || o.bien_id || '';
  const mt = o.montant != null ? ' · ' + fmt(o.montant) : '';
  let ch = '';
  if (j.action === 'Modification' && j.avant && j.apres) ch = Object.keys(j.apres).filter(k => !['updated_at', 'notifs_lues_at'].includes(k) && JSON.stringify(j.apres[k]) !== JSON.stringify(j.avant[k])).slice(0, 4).join(', ');
  return esc(lib + mt) + (ch ? ' <span class="muted">(' + esc(ch) + ')</span>' : '');
}
function vJournal() {
  return `<p class="small muted" style="margin:0">Trace des 300 dernières opérations, non modifiable. Consultable par le gestionnaire et le commissaire aux comptes.</p>
    <div class="list">${S.journal.map(j => `<div class="item" style="cursor:default"><span class="grow"><b class="ellip">${esc(j.action)} · ${esc(OBJETS[j.objet] || j.objet)}</b>
      <span class="small ellip">${resumeJ(j)}</span><span class="small muted">${esc(j.qui_nom || 'Système')} · ${dfr(j.quand)} ${new Date(j.quand).toTimeString().slice(0, 5)}</span></span></div>`).join('') || '<p class="vide">Aucune opération enregistrée.</p>'}</div>`;
}
function vFinances() {
  const segs = [['synthese', 'Synthèse'], ['recettes', 'Recettes'], ['depenses', 'Dépenses'], ['caisse', 'Caisse'], ['famille', 'Héritiers'], ['documents', 'Documents'], ['demarches', 'Démarches'], ['rapports', 'Rapports']].concat(estG() || estCAC() ? [['journal', 'Journal']] : []);
  let h = topbar('Finances', libMois(MOIS)) + `<div class="stack"><div class="chips">${segs.map(([k, t]) => `<button class="chip" data-fin="${k}" aria-pressed="${S.fin === k}">${t}</button>`).join('')}</div>`;
  const f = S.fin;
  if (f === 'synthese') {
    const r = tRec(), d = tDep();
    const parCat = CATS.map(c => [c, depMois().filter(x => x.categorie === c && x.statut === 'Validée').reduce((a, x) => a + x.montant, 0)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
    const max = Math.max(1, ...parCat.map(x => x[1]));
    const sansJ = depMois().filter(x => !x.justificatif && x.statut !== 'Refusée');
    h += `<div class="hero"><div class="eyebrow" style="color:inherit;opacity:.8">Solde net du mois</div><div class="big num">${r - d < 0 ? '−' : ''}${fmt(Math.abs(r - d))}</div>
      <div class="small num" style="opacity:.85">Recettes ${fmt(r)} · Dépenses ${fmt(d)}</div></div>
      <div class="grid2"><button class="kpi" data-fin="recettes"><span class="small muted">Recettes</span><strong class="num" style="color:var(--ok)">+${fmt(r)}</strong><span class="small muted">${versMois().length} versement(s)</span></button>
      <button class="kpi" data-fin="depenses"><span class="small muted">Dépenses</span><strong class="num" style="color:var(--bad)">−${fmt(d)}</strong><span class="small muted">${depMois().length} sortie(s)</span></button></div>
      <h2>Dépenses par catégorie</h2><div class="card stack" style="gap:10px">${parCat.map(([c, m]) => `<div><div class="row between small"><span>${c}</span><b class="num">${fmt(m)}</b></div>
        <div style="height:7px;border-radius:99px;background:var(--soft);margin-top:4px"><i style="display:block;height:100%;width:${m / max * 100}%;background:var(--bad);border-radius:99px;opacity:.75"></i></div></div>`).join('') || '<p class="muted small" style="margin:0">Aucune dépense validée ce mois-ci.</p>'}</div>
      ${sansJ.length ? `<div class="card small" style="border-color:var(--warn)"><b style="color:var(--warn)">Justificatifs manquants :</b> ${sansJ.map(x => esc(x.libelle)).join(', ')}</div>` : ''}`;
  }
  if (f === 'recettes') h += `<div class="list">${S.versements.slice().reverse().map(v => `<button class="item" data-rec="${v.id}"><span class="grow"><b class="ellip">${esc(loc(v.locataire_id)?.nom)}</b>
      <span class="small muted ellip">${esc(v.numero)} · ${dfr(v.date_paiement)} · ${esc(v.mode)} · ${esc(libPeriode(v.periode))}</span></span><b class="num" style="color:var(--ok)">+${fmt(v.montant)}</b></button>`).join('') || '<p class="vide">Aucune recette cette année.</p>'}</div>
    ${estLect() ? '' : '<button class="btn" data-act="encaisser">Enregistrer une recette</button>'}`;
  if (f === 'depenses') h += `<div class="list">${S.depenses.slice().reverse().map(d => `<button class="item" data-dep="${d.id}"><span class="grow"><b class="ellip">${esc(d.libelle)}</b>
      <span class="small muted ellip">${dfr(d.date_depense)} · ${esc(d.categorie)}${d.bien_id ? ' · ' + esc(d.bien_id) : ''}</span></span><span style="text-align:right"><b class="num" style="color:var(--bad);display:block">−${fmt(d.montant)}</b>
      ${d.statut !== 'Validée' ? `<span class="pill ${STATUTS[d.statut]}">${d.statut}</span>` : d.justificatif ? '' : '<span class="pill p-warn">Sans justificatif</span>'}</span></button>`).join('') || '<p class="vide">Aucune dépense cette année.</p>'}</div>
    ${estLect() ? '' : '<button class="btn" data-act="depense">Enregistrer une dépense</button>'}`;
  if (f === 'caisse') {
    const cols = S.profils.filter(p => p.actif && p.role !== 'Famille' && (estG() || estT() || estLect() || p.id === S.moi.id));
    h += cols.map(u => { const c = caisse(u.id); if (!c.inn && !c.rem && u.id !== S.moi.id) return ''; return `<div class="card stack" style="gap:6px"><div class="eyebrow">Espèces en main · ${esc(u.nom)}</div>
      <div class="num" style="font:800 1.7rem var(--display);color:${c.solde > 0 ? 'var(--warn)' : 'var(--ok)'}">${fmt(c.solde)}</div>
      <div class="small muted num">Encaissé ${fmt(c.inn)} − dépenses ${fmt(c.out)} − remis ${fmt(c.rem)}</div>
      ${u.id === S.moi.id && c.solde > 0 && !estG() && !estT() ? `<button class="btn" data-remise="${c.solde}">Remettre ${fmt(c.solde)} au trésorier ou au gestionnaire</button>` : ''}</div>`; }).join('');
    h += `<h2>Remises d'espèces</h2><div class="list">${S.remises.slice().reverse().filter(r => estG() || estT() || estLect() || r.par === S.moi.id).map(r => `<div class="item" style="cursor:default"><span class="grow"><b>${esc(nomDe(r.par))} → caisse centrale</b><span class="small muted">${dfr(r.created_at)}</span></span>
      <span style="text-align:right"><b class="num" style="display:block">${fmt(r.montant)}</b>${r.recu ? `<span class="pill p-ok">Reçue${r.recu_par ? ' · ' + esc(nomDe(r.recu_par)) : ''}</span>` : estG() || estT() ? `<button class="chip" data-recu="${r.id}">Confirmer réception</button>` : '<span class="pill p-warn">À confirmer</span>'}</span></div>`).join('') || '<p class="vide">Aucune remise.</p>'}</div>`;
  }
  if (f === 'demarches') {
    const ord = Object.keys(ETAPES);
    h += `<div class="list">${S.demarches.slice().sort((a, b) => ord.indexOf(a.etape) - ord.indexOf(b.etape)).map(g => `<button class="item" data-dem="${g.id}"><span class="grow"><b class="ellip">${esc(g.titre)}</b>
      <span class="small muted ellip">${esc(g.organisme)}${g.echeance ? ' · échéance ' + dfr(g.echeance) : ''}</span></span><span class="pill ${ETAPES[g.etape]}">${g.etape}</span></button>`).join('') || '<p class="vide">Aucune démarche.</p>'}</div>
      ${estLect() ? '' : '<button class="btn" data-act="demarche">Nouvelle démarche</button>'}`;
  }
  if (f === 'famille') h += vFamille();
  if (f === 'journal') h += vJournal();
  if (f === 'documents') h += vDocuments();
  if (f === 'rapports') {
    const an = annee(), R = an.reduce((a, x) => a + x[1], 0), D = an.reduce((a, x) => a + x[2], 0), mx = Math.max(1, ...an.map(x => Math.max(x[1], x[2])));
    const arr = locActifs().reduce((a, l) => a + l.arriere, 0);
    h += `<div class="card stack" style="gap:8px"><h3>Bilan mensuel · ${libMois(MOIS)}</h3>
      <div class="row between"><span class="muted">Recettes</span><b class="num" style="color:var(--ok)">${fmt(tRec())}</b></div>
      <div class="row between"><span class="muted">Dépenses validées</span><b class="num" style="color:var(--bad)">${fmt(tDep())}</b></div>
      <div class="row between"><span class="muted">Solde net</span><b class="num">${fmt(tRec() - tDep())}</b></div>
      <div class="row between"><span class="muted">Arriérés à recouvrer</span><b class="num">${fmt(arr)}</b></div>
      <div class="grid2"><button class="btn" data-exp="mois">PDF</button><button class="btn ghost" data-exp="xlsx">Excel</button></div></div>
    <div class="card stack" style="gap:8px"><h3>Bilan annuel · ${ANNEE}</h3>
      <div class="barres" role="img" aria-label="Recettes et dépenses par mois">${an.map(([m, r, d]) => `<div><div class="b"><i style="height:${r / mx * 100}%;background:var(--ok)"></i><i style="height:${d / mx * 100}%;background:var(--bad);opacity:.75"></i></div><span class="small muted">${m.slice(0, 3)}</span></div>`).join('')}</div>
      <div class="row small muted" style="gap:14px"><span><i style="display:inline-block;width:9px;height:9px;background:var(--ok);border-radius:2px"></i> Recettes</span><span><i style="display:inline-block;width:9px;height:9px;background:var(--bad);opacity:.75;border-radius:2px"></i> Dépenses</span></div>
      <div class="row between"><span class="muted">Cumul recettes</span><b class="num">${fmt(R)}</b></div>
      <div class="row between"><span class="muted">Cumul dépenses</span><b class="num">${fmt(D)}</b></div>
      <div class="row between"><span class="muted">Résultat de l'année</span><b class="num">${fmt(R - D)}</b></div>
      <button class="btn ghost" data-exp="an">Exporter le bilan annuel en PDF</button></div>
    <div class="card stack" style="gap:8px"><h3>Rapport pour la réunion de famille</h3>
      <p class="small muted" style="margin:0">Argent perçu, dépenses et justificatifs, solde, répartitions, impayés et démarches sur la période, avec les résolutions à faire signer.</p>
      <button class="btn" data-act="reunion">Préparer le rapport de réunion</button></div>
    <h2>Rapport par bien · ${ANNEE}</h2><div class="list">${lignesBien().map(r => `<div class="item" style="cursor:default"><span class="tag">${esc(r[0])}</span><span class="grow"><b class="ellip">${esc(r[1])}</b><span class="small muted num">+${fmt(r[5])} · −${fmt(r[6])}</span></span><b class="num">${fmt(r[7])}</b></div>`).join('') || '<p class="vide">Aucun bien.</p>'}</div>`;
  }
  return h + '</div>';
}

/* ---------- Feuilles (modales) ---------- */
function sheet(html) {
  $('#layer').innerHTML = `<div class="sheet-bg" id="bg"><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`;
  $('#bg').onclick = e => { if (e.target.id === 'bg') close(); };
  $$('#layer [data-close]').forEach(b => b.onclick = close);
}
function close() { $('#layer').innerHTML = ''; }
const entete = t => `<div class="row between"><h2>${t}</h2><button type="button" class="chip" data-close>Fermer</button></div>`;
const occupe = (btn, on) => { if (btn) { btn.disabled = on; } };

function sigPad(c) {
  const r = c.getBoundingClientRect(), dpr = window.devicePixelRatio || 1; c.width = r.width * dpr; c.height = r.height * dpr;
  const x = c.getContext('2d'); x.scale(dpr, dpr); x.lineWidth = 2.2; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = '#18231f';
  let on = false, sale = false;
  const pt = e => { const b = c.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
  c.onpointerdown = e => { on = true; c.setPointerCapture(e.pointerId); x.beginPath(); x.moveTo(...pt(e)); };
  c.onpointermove = e => { if (!on) return; x.lineTo(...pt(e)); x.stroke(); sale = true; };
  c.onpointerup = c.onpointercancel = () => { on = false; };
  return { effacer: () => { x.clearRect(0, 0, c.width, c.height); sale = false; }, vide: () => !sale, data: () => c.toDataURL('image/png') };
}
function fEncaisser(pre) {
  if (estLect()) return lectureSeule();
  const actifs = locActifs().filter(l => l.bien_id && peutBien(l.bien_id));
  if (!actifs.length) return toast(estG() ? 'Aucun locataire enregistré.' : 'Aucun locataire sur les biens qui vous sont confiés.');
  let mode = 'Espèces';
  sheet(`<div class="stack">${entete('Nouvel encaissement')}
    <div><label for="el">Locataire</label><select id="el">${actifs.map(l => { const r = (bien(l.bien_id)?.loyer || 0) - paye(l.id); return `<option value="${l.id}" ${pre === l.id ? 'selected' : ''}>${esc(l.nom)} · ${esc(l.bien_id)}${r > 0 ? ' · reste ' + fmt(r) : ' · à jour'}${l.arriere ? ' · arriérés ' + fmt(l.arriere) : ''}</option>`; }).join('')}</select></div>
    <div><label for="ep">Période couverte</label><select id="ep"><option value="${MOIS}">${libMois(MOIS)} (mois en cours)</option><option value="Arriérés">Arriérés des mois précédents</option><option value="${MOIS_SUIV}">${libMois(MOIS_SUIV)} (avance)</option></select></div>
    <div><label for="em">Montant (FCFA)</label><input id="em" inputmode="numeric" class="num"></div>
    <div><label>Mode de paiement</label><div class="seg" id="seg">${['Espèces', 'Mobile Money', 'Virement'].map(m => `<button type="button" aria-pressed="${m === mode}">${m}</button>`).join('')}</div></div>
    <div id="refw" hidden><label for="er">Référence de la transaction</label><input id="er" placeholder="Ex. Wave TX9921"></div>
    <div><label for="sig">Signature du collecteur</label><canvas id="sig" class="sig"></canvas>
      <div class="row between small muted" style="margin-top:4px"><span>Signez avec le doigt</span><button type="button" class="chip" id="sigc">Effacer</button></div></div>
    <p class="err" id="eerr" hidden></p>
    <button class="btn" id="ok">Valider et générer le reçu</button></div>`);
  const pad = sigPad($('#sig')); $('#sigc').onclick = pad.effacer;
  const remplir = () => { const l = loc($('#el').value), per = $('#ep').value, b = bien(l.bien_id), r = b.loyer - paye(l.id);
    $('#em').value = per === 'Arriérés' ? (l.arriere || '') : per === MOIS ? (r > 0 ? r : b.loyer) : b.loyer; };
  remplir(); $('#el').onchange = remplir; $('#ep').onchange = remplir;
  $$('#seg button').forEach(b => b.onclick = () => { mode = b.textContent; $$('#seg button').forEach(x => x.setAttribute('aria-pressed', x === b)); $('#refw').hidden = mode === 'Espèces'; });
  $('#ok').onclick = async () => {
    const m = parseInt(digits($('#em').value), 10), per = $('#ep').value, l = loc($('#el').value);
    const err = t => { $('#eerr').textContent = t; $('#eerr').hidden = false; };
    if (!m || m <= 0) return err('Saisissez un montant supérieur à 0.');
    if (per === 'Arriérés' && !l.arriere) return err('Ce locataire n\'a pas d\'arriérés.');
    if (per === 'Arriérés' && m > l.arriere) return err('Le montant dépasse les arriérés (' + fmt(l.arriere) + ').');
    if (mode !== 'Espèces' && !$('#er').value.trim()) return err('Indiquez la référence de la transaction.');
    if (pad.vide()) return err('La signature du collecteur est requise.');
    occupe($('#ok'), true);
    try {
      const v = await q(sb.from('versements').insert({ locataire_id: l.id, bien_id: l.bien_id, montant: m, mode, reference: $('#er').value.trim(), periode: per, signature: pad.data(), par: S.moi.id }).select().single());
      S.versements.push(v); if (per === 'Arriérés') l.arriere -= m;
      render(); fRecu(v.id); toast('Versement enregistré · gestionnaires notifiés');
    } catch (e) { occupe($('#ok'), false); err(msgErreur(e)); }
  };
}
const urlVerif = v => location.origin + '/#verifier/' + encodeURIComponent(v.numero) + '/' + v.code_verif;
function situation(l) { const b = bien(l.bien_id); return { reste: Math.max((b?.loyer || 0) - paye(l.id), 0), arr: l.arriere || 0 }; }
function texteRecu(v) {
  const l = loc(v.locataire_id), b = bien(v.bien_id), st = situation(l);
  return `REÇU ${v.numero} – Patrimoine NIN NIN\nLocataire : ${l.nom}\nBien : ${b?.nom}\nPériode : ${libPeriode(v.periode)}\nMontant : ${fmt(v.montant)} (${v.mode}${v.reference ? ' · ' + v.reference : ''})\nDate : ${dlong(v.date_paiement)}\nEncaissé par : ${nomDe(v.par)}\nReste à payer (${libMois(MOIS)}) : ${fmt(st.reste)}\nArriérés restants : ${fmt(st.arr)}\nVérifier : ${urlVerif(v)}`;
}
function qrDans(el, t) { el.innerHTML = ''; if (window.QRCode) new QRCode(el, { text: t, width: 104, height: 104, correctLevel: QRCode.CorrectLevel.M }); else el.textContent = 'QR'; }
function fRecu(id) {
  const v = S.versements.find(x => x.id === id), l = loc(v.locataire_id), b = bien(v.bien_id), st = situation(l);
  sheet(`<div class="stack">${entete('Reçu de paiement')}
    <div class="receipt"><div class="row between"><b style="font-family:var(--display)">Patrimoine NIN NIN</b><span class="num small">${esc(v.numero)}</span></div>
      <p class="small muted" style="margin:4px 0 10px">Reçu de loyer · ${esc(libPeriode(v.periode))}</p>
      <div class="r"><span class="muted">Locataire</span><b>${esc(l.nom)}</b></div>
      <div class="r"><span class="muted">Téléphone</span><span class="num">${esc(l.tel)}</span></div>
      <div class="r"><span class="muted">Bien</span><span>${esc(b?.nom)}</span></div>
      <div class="r"><span class="muted">Période couverte</span><span>${esc(libPeriode(v.periode))}</span></div>
      <div class="r"><span class="muted">Mode</span><span>${esc(v.mode)}${v.reference ? ' · ' + esc(v.reference) : ''}</span></div>
      <div class="r"><span class="muted">Date</span><span>${dlong(v.date_paiement)}</span></div>
      <div class="r"><span class="muted">Montant reçu</span><b class="num" style="font-size:1.2rem">${fmt(v.montant)}</b></div>
      <div class="r"><span class="muted">Reste à payer (${libMois(MOIS)})</span><span class="num">${fmt(st.reste)}</span></div>
      <div class="r"><span class="muted">Arriérés restants</span><span class="num" style="${st.arr ? 'color:var(--bad);font-weight:700' : ''}">${fmt(st.arr)}</span></div>
      <div class="row between" style="margin-top:12px;align-items:flex-end;gap:12px">
        <div style="flex:1;min-width:0"><div class="small muted">Signature du collecteur</div>
          ${v.signature ? `<img src="${v.signature}" alt="Signature" style="height:56px;max-width:100%;background:#fff;border-radius:6px">` : ''}
          <div class="small">${esc(nomDe(v.par))}</div></div>
        <div style="text-align:center"><div id="qr" style="background:#fff;padding:5px;border-radius:6px;display:inline-block"></div><div class="small muted num">${esc(v.code_verif)}</div></div></div></div>
    <button class="btn" id="pdf">Télécharger le reçu (PDF)</button>
    <button class="btn ghost" id="wa">Envoyer par WhatsApp</button>
    <p class="small muted" style="margin:0">Le QR code renvoie vers une page de vérification de l'authenticité du reçu.</p></div>`);
  qrDans($('#qr'), urlVerif(v));
  $('#pdf').onclick = () => recuPDF(v);
  $('#wa').onclick = () => { const n = digits(l.tel); const tel = n.length === 10 ? '225' + n : n; window.open('https://wa.me/' + tel + '?text=' + encodeURIComponent(texteRecu(v)), '_blank', 'noopener'); };
}
function telecharger(nom, blob) {
  const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = nom; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
}
async function partagerOuTelecharger(nom, blob) {
  const f = new File([blob], nom, { type: blob.type });
  if (navigator.canShare && navigator.canShare({ files: [f] }) && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
    try { await navigator.share({ files: [f], title: nom }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  telecharger(nom, blob);
}
const hexRgb = h => { const m = /^#?([\da-f]{6})$/i.exec(h || ''); const n = parseInt(m ? m[1] : '1f5c4a', 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
function reduireImage(f, max = 240) {
  return new Promise((ok, ko) => { const r = new FileReader(); r.onerror = ko; r.onload = () => { const im = new Image(); im.onerror = ko; im.onload = () => {
    const k = Math.min(1, max / Math.max(im.width, im.height)); const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', 0.85)); }; im.src = r.result; }; r.readAsDataURL(f); });
}
function fRecuPerso() {
  const P = { ...S.recu }; let logo = P.logo || '';
  sheet(`<form class="stack" id="rcf">${entete('Personnaliser les reçus')}
    <div><label for="rcf2">Format du reçu</label><select id="rcf2">${Object.entries(FORMATS_RECU).map(([k, t]) => `<option value="${k}" ${(P.format || 'quittance') === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
    <div><label for="rcn">Nom affiché</label><input id="rcn" maxlength="60" value="${esc(P.nom || '')}" placeholder="Succession Famille …"></div>
    <div><label for="rcs">Sous-titre</label><input id="rcs" maxlength="80" value="${esc(P.sous_titre || '')}" placeholder="Gestion du patrimoine familial de Faya"></div>
    <div class="grid2"><div><label for="rca">Adresse</label><input id="rca" maxlength="60" value="${esc(P.adresse || '')}" placeholder="Faya, Abidjan"></div>
      <div><label for="rct">Téléphone</label><input id="rct" maxlength="30" inputmode="tel" value="${esc(P.tel || '')}"></div></div>
    <div><label for="rcm">Mention en bas du reçu</label><textarea id="rcm" rows="2" maxlength="200" placeholder="Merci de conserver ce reçu. Tout paiement doit faire l'objet d'un reçu.">${esc(P.mention || '')}</textarea></div>
    <div class="grid2"><div><label for="rcc">Couleur</label><input id="rcc" type="color" value="${esc(P.couleur || '#1f5c4a')}" style="height:44px;padding:4px"></div>
      <div><label for="rcl">Logo</label><input id="rcl" type="file" accept="image/png,image/jpeg"></div></div>
    <div class="row" id="rclw" ${logo ? '' : 'hidden'}><img id="rcli" src="${esc(logo)}" alt="Logo" style="height:48px;border-radius:6px;border:1px solid var(--line)"><button type="button" class="chip" id="rclx">Retirer le logo</button></div>
    <button type="button" class="btn ghost" id="rcp">Aperçu du reçu (PDF)</button>
    <p class="err" id="rcerr" hidden></p><button class="btn" id="rcok">Enregistrer</button></form>`);
  const lire = () => ({ nom: $('#rcn').value.trim(), sous_titre: $('#rcs').value.trim(), adresse: $('#rca').value.trim(), tel: $('#rct').value.trim(), mention: $('#rcm').value.trim(), couleur: $('#rcc').value, logo, format: $('#rcf2').value });
  $('#rcl').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { logo = await reduireImage(f); $('#rcli').src = logo; $('#rclw').hidden = false; } catch (x) { toast('Image illisible.'); } };
  $('#rclx').onclick = () => { logo = ''; $('#rclw').hidden = true; $('#rcl').value = ''; };
  $('#rcp').onclick = async () => { const anc = S.recu; S.recu = lire(); try { await recuPDF(exempleRecu()); } finally { S.recu = anc; } };
  $('#rcf').onsubmit = async e => { e.preventDefault(); occupe($('#rcok'), true); const val = JSON.stringify(lire());
    try { await q(sb.from('parametres').update({ valeur: val }).eq('cle', 'recu')); S.recu = JSON.parse(val); close(); toast('Reçus personnalisés'); }
    catch (x) { occupe($('#rcok'), false); $('#rcerr').textContent = msgErreur(x); $('#rcerr').hidden = false; } };
}
function exempleRecu() {
  const v = S.versements[S.versements.length - 1];
  if (v) return v;
  const l = locActifs()[0]; if (!l) return null;
  return { numero: 'R-EXEMPLE', locataire_id: l.id, bien_id: l.bien_id, montant: bien(l.bien_id)?.loyer || 0, mode: 'Espèces', reference: '', periode: MOIS, date_paiement: new Date().toISOString().slice(0, 10), par: S.moi.id, code_verif: 'EXEMPLE' };
}
const FORMATS_RECU = { quittance: 'Quittance de loyer avec souche (210 × 99 mm)', carnet: 'Carnet à souche (A6 paysage, 148 × 105 mm)', ticket: 'Ticket (imprimante 80 mm)', a5: 'Pleine page (A5)' };
function enLettres(n) {
  n = Math.round(Number(n) || 0); if (n === 0) return 'zéro';
  const U = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const D = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];
  const cent = x => { // 0..999
    let r = ''; const c = Math.floor(x / 100), d = x % 100;
    if (c) r = (c > 1 ? U[c] + ' cent' + (d === 0 ? 's' : '') : 'cent');
    if (d) { let t;
      if (d < 20) t = U[d];
      else { const dz = Math.floor(d / 10), u = d % 10;
        if (dz === 7 || dz === 9) t = D[dz] + (dz === 7 && u === 1 ? ' et ' : '-') + U[10 + u];
        else t = D[dz] + (u === 1 && dz < 8 ? ' et un' : u ? '-' + U[u] : (dz === 8 ? 's' : '')); }
      r += (r ? ' ' : '') + t; }
    return r; };
  const parts = []; const mi = Math.floor(n / 1e9), mo = Math.floor(n / 1e6) % 1000, k = Math.floor(n / 1000) % 1000, r = n % 1000;
  if (mi) parts.push(cent(mi) + ' milliard' + (mi > 1 ? 's' : ''));
  if (mo) parts.push(cent(mo) + ' million' + (mo > 1 ? 's' : ''));
  if (k) parts.push(k === 1 ? 'mille' : cent(k).replace(/s$/, '') + ' mille');
  if (r) parts.push(cent(r));
  return parts.join(' ');
}
function bornesPeriode(p) {
  if (!/^\d{4}-\d{2}$/.test(p || '')) return ['', ''];
  const [a, m] = p.split('-').map(Number); const f = new Date(a, m, 0).getDate();
  return ['01/' + String(m).padStart(2, '0') + '/' + a, f + '/' + String(m).padStart(2, '0') + '/' + a];
}
function quittancePDF(v, l, b, st, P, rgb, clair, nom, coord, qr) {
  const W = 210, H = 99, S0 = 62; // souche à gauche
  const doc = new jspdf.jsPDF({ unit: 'mm', format: [W, H], orientation: 'landscape' });
  const vide = !v.numero; const z = x => vide ? '' : x;
  const [deb, fin] = bornesPeriode(v.periode); const mt = z(pdfNum(v.montant));
  const lettres = vide ? '' : enLettres(v.montant) + ' francs CFA';
  const ink = rgb, enc = [24, 35, 31];
  const champ = (lib, val, x, y, w, opt = {}) => { // libellé + pointillés + valeur
    doc.setFont('helvetica', 'normal'); doc.setFontSize(opt.fs || 7.5); doc.setTextColor(...ink); doc.text(lib, x, y);
    const lw = doc.getTextWidth(lib) + 1; doc.setDrawColor(...ink); doc.setLineDashPattern([0.4, 0.8], 0); doc.setLineWidth(0.2); doc.line(x + lw, y + 0.6, x + w, y + 0.6); doc.setLineDashPattern([], 0);
    if (val) { doc.setFont('helvetica', 'bold'); doc.setFontSize(opt.vs || 8.5); doc.setTextColor(...enc); doc.text(doc.splitTextToSize(String(val), w - lw - 1)[0], x + lw + 1, y - 0.4); } };
  const titre = (t, x, y, w, fs) => { const h = fs * 0.5, t0 = y - fs * 0.36; doc.setFillColor(...clair); doc.rect(x, t0, w, h, 'F');
    doc.setDrawColor(...ink); doc.setLineWidth(0.15); [t0 - 0.8, t0, t0 + h, t0 + h + 0.8].forEach(yy => doc.line(x, yy, x + w, yy));
    doc.setFont('helvetica', 'bold'); doc.setFontSize(fs); doc.setTextColor(...ink); doc.text(t, x + w / 2, y, { align: 'center' }); };
  // cadre et pointillés de détachement
  doc.setDrawColor(...ink); doc.setLineWidth(0.3); doc.rect(1.5, 1.5, W - 3, H - 3);
  doc.setLineDashPattern([1, 1], 0); doc.line(S0, 3, S0, H - 3); doc.setLineDashPattern([], 0);
  // ---- SOUCHE ----
  let x = 5, y = 9; doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...ink); doc.text(doc.splitTextToSize(nom.toUpperCase(), S0 - 10)[0], x, y); y += 6;
  champ('N°', v.numero, x, y, 22); champ('Local n°', b?.id, x + 24, y, S0 - 33); y += 6.3;
  champ('Nature', z(b?.type || ''), x, y, S0 - 9); y += 6.3;
  champ('M.', l.nom, x, y, S0 - 9); y += 6.3;
  champ('a payé le', z(dlong(v.date_paiement)), x, y, S0 - 9); y += 6.3;
  champ('le montant de son loyer', mt, x, y, S0 - 9); y += 6.3;
  champ('commençant le', deb, x, y, S0 - 9); y += 6.3;
  champ('finissant le', fin, x, y, S0 - 9); y += 6.3;
  champ('Mode', z(v.mode + (v.reference ? ' · ' + v.reference : '')), x, y, S0 - 9); y += 7.5;
  champ('Loyer', mt, x, y, S0 - 9); y += 6.3; champ('Timbre', '', x, y, S0 - 9); y += 6.3;
  doc.setFillColor(...clair); doc.rect(x + 9, y - 4, S0 - 18, 5.5, 'F'); champ('Total', mt, x, y, S0 - 9); y += 5.5;
  if (!vide) { doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(...ink); doc.text('Arriérés : ' + pdfNum(st.arr) + ' · Encaissé par ' + nomDe(v.par), x, y); }
  titre('QUITTANCE DE LOYER', 4, H - 6, S0 - 7, 8);
  // ---- QUITTANCE ----
  const X = S0 + 5, R = W - 6;
  let lx = X; if (P.logo) { try { doc.addImage(P.logo, P.logo.includes('image/png') ? 'PNG' : 'JPEG', X, 5, 13, 13); } catch (e) {} lx = X + 15; }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...ink); doc.text(doc.splitTextToSize(nom.toUpperCase(), 70)[0], lx, 9.5);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); [P.sous_titre, coord].filter(Boolean).forEach((t, i) => doc.text(doc.splitTextToSize(t, 70)[0], lx, 13 + i * 3));
  titre('QUITTANCE DE LOYER', 128, 10, 54, 11);
  champ('N°', '', 150, 17.5, 30, { fs: 8 }); doc.setFont('helvetica', 'bold'); doc.setTextColor(...enc); doc.setFontSize(10); if (v.numero) doc.text(v.numero, 155, 17);
  doc.setTextColor(...ink); doc.setFontSize(8); doc.text('BPF', 183, 6.5); doc.setFillColor(...clair); doc.setDrawColor(...ink); doc.rect(183, 8, R - 183, 11, 'FD');
  doc.setTextColor(...enc); doc.setFontSize(9.5); if (mt) doc.text(mt, (183 + R) / 2, 15, { align: 'center' });
  y = 27; const w = R - X;
  champ('Reçu de M.', l.nom + (l.tel ? '  (' + l.tel + ')' : ''), X, y, w); y += 7.5;
  doc.setFillColor(...clair); doc.rect(X + 18, y - 4, w - 18, 5.5, 'F'); champ('La somme de', vide ? '' : lettres.charAt(0).toUpperCase() + lettres.slice(1) + ' (' + mt + ')', X, y, w); y += 7.5;
  champ('pour le loyer de', vide ? '' : libPeriode(v.periode) === 'Arriérés' ? 'arriérés' : '1 mois', X, y, 52);
  champ('du local n°', z((b?.id || '') + (b?.type ? ' (' + b.type.toLowerCase() + ')' : '')), X + 54, y, w - 54); y += 7.5;
  const tr = b ? terrain(b.terrain_id) : null;
  champ('qu\'il occupe sur le terrain familial sis à', z([tr?.nom, tr?.lieu].filter(Boolean).join(', ')), X, y, w); y += 7.5;
  doc.setFillColor(...clair); doc.rect(X + 8, y - 4, 32, 5.5, 'F'); doc.rect(X + 76, y - 4, 26, 5.5, 'F'); doc.rect(X + 126, y - 4, w - 126, 5.5, 'F');
  champ('le', z(dlong(v.date_paiement)), X, y, 42); champ('période du', deb, X + 54, y, 50); champ('au', fin, X + 106, y, w - 106); y += 7;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...ink); doc.text('Sous toutes réserves de droit DONT QUITTANCE.', X + 54, y);
  // nota
  y += 5; doc.setFont('helvetica', 'normal'); doc.setFontSize(5.6);
  const nota = P.mention ? [P.mention] : ['1. Le locataire ne peut libérer le local sans avoir justifié du paiement de tous ses loyers. 2. Tout congé doit être donné par écrit dans les délais prévus au bail.',
    '3. Les réparations locatives et l\'entretien du local sont à la charge du locataire. 4. Aucune sous-location ni cession sans accord écrit de ' + nom + '.'];
  doc.text('NOTA :', X, y); doc.text(doc.splitTextToSize(nota.join(' '), 72).slice(0, 5), X + 8, y);
  // signature + QR
  doc.setFontSize(6.5); doc.text('Le receveur (nom et signature)', 150, y); if (v.signature) doc.addImage(v.signature, 'PNG', 150, y + 0.5, 28, 11);
  doc.setDrawColor(...ink); doc.setLineDashPattern([0.4, 0.8], 0); doc.line(150, y + 13, 180, y + 13); doc.setLineDashPattern([], 0);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(...enc); if (!vide) doc.text(nomDe(v.par), 150, y + 16.5);
  if (qr) { doc.addImage(qr, 'PNG', R - 17, y - 3, 17, 17); doc.setFont('helvetica', 'normal'); doc.setTextColor(...ink); doc.setFontSize(5.5); doc.text('Code ' + v.code_verif, R - 8.5, y + 16.5, { align: 'center' }); doc.text('Authenticité vérifiable en scannant le QR code', X, H - 4); }
  return doc;
}
async function recuPDF(v) {
  if (!v) return toast('Ajoutez d\'abord un locataire pour voir un exemple.');
  if (!window.jspdf) return toast('Module PDF en cours de chargement, réessayez.');
  const l = loc(v.locataire_id), b = bien(v.bien_id), st = situation(l);
  const P = S.recu || {}; const F = FORMATS_RECU[P.format] ? P.format : 'quittance';
  const rgb = hexRgb(P.couleur || '#1f5c4a'), clair = rgb.map(c => Math.round(c + (255 - c) * 0.88));
  const nom = P.nom || 'Patrimoine NIN NIN', coord = [P.adresse, P.tel].filter(Boolean).join(' · ');
  const tmp = document.createElement('div'); qrDans(tmp, urlVerif(v)); await new Promise(r => setTimeout(r, 80));
  const qr = tmp.querySelector('canvas')?.toDataURL('image/png');
  const img = (d, x, y, w) => { try { d.addImage(P.logo, P.logo.includes('image/png') ? 'PNG' : 'JPEG', x, y, w, w); } catch (e) {} };
  const gris = d => d.setTextColor(95, 107, 102), noir = d => d.setTextColor(24, 35, 31);
  const lignes = [['Reçu de', l.nom + (l.tel ? ' · ' + l.tel : '')], ['Bien', (b?.nom || '') + (b?.lieu ? ' (' + b.lieu + ')' : '')], ['Période', libPeriode(v.periode)],
    ['Mode', v.mode + (v.reference ? ' · ' + v.reference : '')], ['Date', dlong(v.date_paiement)], ['Encaissé par', nomDe(v.par)]];
  let doc;
  if (F === 'quittance') doc = quittancePDF(v, l, b, st, P, rgb, clair, nom, coord, qr);
  else if (F === 'ticket') {
    const W = 80, m = 5; const H = 108 + (P.logo ? 19 : 0) + (P.mention ? 9 : 0);
    doc = new jspdf.jsPDF({ unit: 'mm', format: [W, H] }); let y = 6;
    if (P.logo) { img(doc, W / 2 - 8, y, 16); y += 19; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); noir(doc); doc.text(doc.splitTextToSize(nom.toUpperCase(), W - 2 * m), W / 2, y + 3, { align: 'center' }); y += 7;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); gris(doc);
    [P.sous_titre, coord].filter(Boolean).forEach(t => { doc.text(doc.splitTextToSize(t, W - 2 * m)[0], W / 2, y, { align: 'center' }); y += 3.6; });
    y += 1; doc.setDrawColor(...rgb); doc.setLineDashPattern([1, 1], 0); doc.line(m, y, W - m, y); y += 5;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); noir(doc); doc.text('REÇU DE LOYER  N° ' + v.numero, W / 2, y, { align: 'center' }); y += 6;
    doc.setFontSize(8); lignes.forEach(([k, c]) => { doc.setFont('helvetica', 'normal'); gris(doc); doc.text(k, m, y); noir(doc); const t = doc.splitTextToSize(String(c), W - 2 * m - 22); doc.text(t, W - m, y, { align: 'right' }); y += 4.4 * t.length; });
    y += 1; doc.line(m, y, W - m, y); y += 6;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('MONTANT', m, y); doc.text(pdfNum(v.montant), W - m, y, { align: 'right' }); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); gris(doc); doc.text('Reste du mois : ' + pdfNum(st.reste) + '   ·   Arriérés : ' + pdfNum(st.arr), W / 2, y, { align: 'center' }); y += 3;
    doc.line(m, y, W - m, y); doc.setLineDashPattern([], 0); y += 3;
    if (v.signature) doc.addImage(v.signature, 'PNG', m, y, 32, 12); noir(doc); doc.text(nomDe(v.par), m, y + 15);
    if (qr) doc.addImage(qr, 'PNG', W - m - 22, y - 1, 22, 22); gris(doc); doc.setFontSize(6.5); doc.text('Code ' + v.code_verif, W - m - 11, y + 23.5, { align: 'center' }); y += 28;
    if (P.mention) { doc.text(doc.splitTextToSize(P.mention, W - 2 * m).slice(0, 3), W / 2, y, { align: 'center' }); y += 9; }
    doc.text('Vérifiez ce reçu en scannant le QR code.', W / 2, y, { align: 'center' });
  } else if (F === 'carnet') {
    const W = 148, H = 105, m = 7;
    doc = new jspdf.jsPDF({ unit: 'mm', format: [W, H], orientation: 'landscape' });
    doc.setFillColor(...rgb); doc.rect(0, 0, W, 20, 'F'); const x0 = P.logo ? m + 17 : m;
    if (P.logo) { doc.setFillColor(255, 255, 255); doc.roundedRect(m, 3, 14, 14, 1.5, 1.5, 'F'); img(doc, m + 0.8, 3.8, 12.4); }
    doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.text(doc.splitTextToSize(nom.toUpperCase(), 80)[0], x0, 8.5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); [P.sous_titre, coord].filter(Boolean).forEach((t, i) => doc.text(doc.splitTextToSize(t, 80)[0], x0, 12.5 + i * 3.3));
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.text('REÇU DE LOYER', W - m, 8, { align: 'right' }); doc.setFontSize(10.5); doc.text('N° ' + v.numero, W - m, 14, { align: 'right' });
    let y = 27; doc.setFontSize(8.5);
    lignes.forEach(([k, c]) => { doc.setFont('helvetica', 'normal'); gris(doc); doc.text(k, m, y); noir(doc); doc.text(doc.splitTextToSize(String(c), 62)[0], m + 23, y); doc.setDrawColor(223, 227, 221); doc.line(m, y + 1.8, 95, y + 1.8); y += 6.4; });
    doc.setFillColor(...clair); doc.roundedRect(100, 25, W - m - 100, 17, 2, 2, 'F'); gris(doc); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.text('Montant reçu', 103, 30.5);
    noir(doc); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text(pdfNum(v.montant), W - m - 3, 38.5, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); gris(doc); doc.text('Reste du mois : ' + pdfNum(st.reste), 100, 47); doc.text('Arriérés : ' + pdfNum(st.arr), 100, 51);
    if (qr) doc.addImage(qr, 'PNG', W - m - 22, 55, 22, 22); doc.setFontSize(6.5); doc.text('Code ' + v.code_verif, W - m - 11, 79.5, { align: 'center' });
    gris(doc); doc.setFontSize(7); doc.text('Signature du collecteur', m, 70); if (v.signature) doc.addImage(v.signature, 'PNG', m, 71, 34, 12); noir(doc); doc.text(nomDe(v.par), m, 87);
    doc.setDrawColor(...rgb); doc.line(m, 92, W - m, 92); gris(doc); doc.setFontSize(6.5);
    doc.text(doc.splitTextToSize((P.mention ? P.mention + ' · ' : '') + 'Vérifiez l\'authenticité en scannant le QR code.', W - 2 * m).slice(0, 2), W / 2, 96, { align: 'center' });
  } else {
    doc = new jspdf.jsPDF({ unit: 'mm', format: 'a5' }); const x0 = P.logo ? 30 : 10;
    doc.setFillColor(...rgb); doc.rect(0, 0, 148, 28, 'F');
    if (P.logo) { doc.setFillColor(255, 255, 255); doc.roundedRect(8, 4, 20, 20, 2, 2, 'F'); img(doc, 9, 5, 18); }
    doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.text(doc.splitTextToSize(nom.toUpperCase(), 85)[0], x0, 10);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); [P.sous_titre, coord].filter(Boolean).forEach((t, i) => doc.text(doc.splitTextToSize(t, 85)[0], x0, 15 + i * 4));
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text('REÇU DE LOYER', 138, 10, { align: 'right' }); doc.setFontSize(11); doc.text('N° ' + v.numero, 138, 16, { align: 'right' });
    let y = 38; lignes.forEach(([a, c]) => { doc.setFont('helvetica', 'normal'); doc.setFontSize(10); gris(doc); doc.text(a, 10, y); noir(doc); doc.text(String(c), 60, y); doc.setDrawColor(223, 227, 221); doc.line(10, y + 2.5, 138, y + 2.5); y += 8.5; });
    doc.setFillColor(...clair); doc.roundedRect(10, y, 128, 14, 2, 2, 'F'); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('Montant reçu', 14, y + 9); doc.text(pdfNum(v.montant), 134, y + 9, { align: 'right' }); y += 21;
    doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); doc.text('Reste à payer (' + libMois(MOIS) + ') : ' + pdfNum(st.reste), 10, y); doc.text('Arriérés restants : ' + pdfNum(st.arr), 10, y + 6); y += 14;
    gris(doc); doc.text('Signature du collecteur', 10, y); if (v.signature) doc.addImage(v.signature, 'PNG', 10, y + 2, 50, 18); noir(doc); doc.text(nomDe(v.par), 10, y + 25);
    if (qr) doc.addImage(qr, 'PNG', 108, y - 3, 30, 30); doc.setFontSize(8); gris(doc); doc.text('Code ' + v.code_verif, 123, y + 31, { align: 'center' });
    if (P.mention) doc.text(doc.splitTextToSize(P.mention, 128).slice(0, 2), 74, 189, { align: 'center' });
    doc.text('Scannez le QR code pour vérifier l\'authenticité de ce reçu.', 74, 196, { align: 'center' });
    doc.text('Document généré le ' + new Date().toLocaleDateString('fr-FR') + ' · ' + nom, 74, 202, { align: 'center' });
  }
  await partagerOuTelecharger('Recu_' + v.numero + '_' + l.nom.replace(/[^\wÀ-ÿ]+/g, '_') + '.pdf', doc.output('blob'));
}
function fLoc(id) {
  const l = loc(id), b = bien(l.bien_id), s = statut(l), vs = S.versements.filter(v => v.locataire_id === id).slice().reverse();
  sheet(`<div class="stack">${entete(esc(l.nom))}
    <div class="card stack" style="gap:6px"><div class="row between"><span class="muted">Téléphone</span><b class="num">${esc(l.tel)}</b></div>
      <div class="row between"><span class="muted">Bien</span><span>${esc(b?.nom || '—')}</span></div>
      <div class="row between"><span class="muted">Activité</span><span>${esc(l.activite || '—')}</span></div>
      <div class="row between"><span class="muted">Loyer mensuel</span><b class="num">${fmt(b?.loyer)}</b></div>
      <div class="row between"><span class="muted">${libMois(MOIS)}</span><span class="pill p-${s.k}">${s.t}</span></div>
      <div class="row between"><span class="muted">Arriérés antérieurs</span><b class="num" style="color:${l.arriere ? 'var(--bad)' : 'var(--ok)'}">${fmt(l.arriere)}</b></div></div>
    <h3>Historique des versements</h3>
    <div class="list">${vs.map(v => `<button class="item" data-rec="${v.id}"><span class="grow">${dfr(v.date_paiement)} · ${esc(v.mode)}<span class="small muted ellip">${esc(v.numero)} · ${esc(libPeriode(v.periode))}</span></span><b class="num">${fmt(v.montant)}</b></button>`).join('') || '<p class="vide">Aucun versement cette année.</p>'}</div>
    ${estLect() ? '' : '<button class="btn" id="enc">Encaisser</button>'}
    ${estG() ? '<button class="btn ghost" id="mod">Modifier le locataire</button>' : ''}</div>`);
  if ($('#enc')) $('#enc').onclick = () => fEncaisser(id);
  if ($('#mod')) $('#mod').onclick = () => fLocataire(id);
  $$('#layer [data-rec]').forEach(x => x.onclick = () => fRecu(x.dataset.rec));
}
function fLocataire(id) {
  const l = id ? loc(id) : null;
  const libres = S.biens.filter(b => b.actif && (!locDuBien(b.id) || (l && b.id === l.bien_id)));
  sheet(`<form class="stack" id="lf">${entete(l ? 'Modifier le locataire' : 'Nouveau locataire')}
    <div><label for="ln">Nom complet</label><input id="ln" required value="${esc(l?.nom)}"></div>
    <div><label for="lt">Téléphone</label><input id="lt" required inputmode="tel" value="${esc(l?.tel)}" placeholder="07 00 00 00 00"></div>
    <div><label for="la">Activité</label><input id="la" value="${esc(l?.activite)}"></div>
    <div><label for="lb">Bien attribué</label><select id="lb">${libres.map(b => `<option value="${esc(b.id)}" ${l?.bien_id === b.id ? 'selected' : ''}>${esc(b.nom)}</option>`).join('')}</select></div>
    <div><label for="lar">Arriérés antérieurs (FCFA)</label><input id="lar" inputmode="numeric" class="num" value="${l?.arriere || 0}"></div>
    <p class="err" id="lerr" hidden></p>
    ${libres.length ? `<button class="btn" id="lok">${l ? 'Enregistrer' : 'Ajouter au registre'}</button>` : '<p class="muted">Aucun bien libre. Ajoutez d\'abord un bien.</p>'}
    ${l ? '<button type="button" class="btn danger" id="lfin">Fin de bail (libérer le bien)</button>' : ''}</form>`);
  $('#lf').onsubmit = async e => {
    e.preventDefault(); occupe($('#lok'), true);
    const o = { nom: $('#ln').value.trim(), tel: $('#lt').value.trim(), activite: $('#la').value.trim(), bien_id: $('#lb').value, arriere: parseInt(digits($('#lar').value) || '0', 10) };
    try { if (l) await q(sb.from('locataires').update(o).eq('id', l.id)); else await q(sb.from('locataires').insert(o));
      await charger('locataires'); close(); render(); toast(l ? 'Locataire mis à jour' : 'Locataire ajouté au registre'); }
    catch (x) { occupe($('#lok'), false); $('#lerr').textContent = msgErreur(x); $('#lerr').hidden = false; }
  };
  if ($('#lfin')) $('#lfin').onclick = () => confirmer(`Mettre fin au bail de ${l.nom} ? Le bien ${l.bien_id} redeviendra libre. L'historique est conservé.`, 'Mettre fin au bail', async () => {
    await q(sb.from('locataires').update({ actif: false }).eq('id', l.id)); await charger('locataires'); close(); render(); toast('Bail terminé');
  });
}
function confirmer(texte, action, fn) {
  sheet(`<div class="stack">${entete('Confirmation')}<p style="margin:0">${esc(texte)}</p><button class="btn danger" id="cok">${esc(action)}</button><button class="btn ghost" data-close>Annuler</button></div>`);
  $$('#layer [data-close]').forEach(b => b.onclick = close);
  $('#cok').onclick = async () => { occupe($('#cok'), true); try { await fn(); } catch (e) { toast(msgErreur(e)); close(); } };
}
function fBien(id, tid) {
  const b = id ? bien(id) : null; const lo = b && locDuBien(b.id);
  if (b && lo && !estG()) return fLoc(lo.id);
  if (!estG()) return sheet(`<div class="stack">${entete(esc(b.nom))}<p class="muted" style="margin:0">${esc(b.type)} · ${esc(terrain(b.terrain_id)?.nom || b.lieu)} · loyer ${fmt(b.loyer)}</p><div class="card">Ce bien est libre.</div></div>`);
  sheet(`<form class="stack" id="bf">${entete(b ? esc(b.nom) : 'Nouveau bien')}
    ${lo ? `<button type="button" class="card item" id="voirloc"><span class="grow"><b>Locataire : ${esc(lo.nom)}</b><span class="small muted">Voir la fiche et les versements</span></span><span class="muted">›</span></button>` : ''}
    <div class="grid2"><div><label for="bid">Code</label><input id="bid" required maxlength="8" placeholder="M1" value="${esc(b?.id)}" ${b ? 'readonly' : ''}></div>
    <div><label for="bt">Type</label><select id="bt">${TYPES_BIEN.concat(b?.type === 'Terrain' ? ['Terrain'] : []).map(t => `<option ${b?.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div></div>
    <div><label for="btr">Terrain</label><select id="btr" required>${S.terrains.filter(t => t.actif || t.id === b?.terrain_id).map(t => `<option value="${esc(t.id)}" ${(b?.terrain_id || tid || S.terrains[0]?.id) === t.id ? 'selected' : ''}>${esc(t.nom)}</option>`).join('')}</select></div>
    <div><label for="bn">Désignation</label><input id="bn" required value="${esc(b?.nom)}" placeholder="Magasin 1 – façade route"></div>
    <div><label for="bl">Emplacement sur le terrain</label><input id="bl" value="${esc(b?.lieu)}" placeholder="Côté route, rangée A…"></div>
    <div><label for="by">Loyer mensuel (FCFA)</label><input id="by" required inputmode="numeric" class="num" value="${b?.loyer ?? ''}"></div>
    ${b ? `<div class="card stack" style="gap:8px"><h3>Équipe du bien</h3>
      <div class="list" id="eql">${S.equipes.filter(e => e.bien_id === b.id).map(e => `<div class="item" style="cursor:default"><span class="grow"><b class="ellip">${esc(nomDe(e.profil_id))}</b><span class="small muted">${esc(e.role)}</span></span><button type="button" class="chip" data-eqdel="${e.profil_id}|${esc(e.role)}">Retirer</button></div>`).join('') || '<p class="small muted" style="margin:0">Aucune personne affectée. Les collecteurs sans affectation peuvent encaisser sur tous les biens.</p>'}</div>
      <div class="grid2"><select id="eqp" aria-label="Personne">${S.profils.filter(u => u.actif && !['Gestionnaire', 'Famille'].includes(u.role)).map(u => `<option value="${u.id}">${esc(u.nom)}</option>`).join('')}</select>
      <select id="eqr" aria-label="Rôle sur ce bien">${ROLES_EQ.map(r => `<option>${r}</option>`).join('')}</select></div>
      <button type="button" class="btn ghost" id="eqadd">Affecter à ce bien</button></div>` : ''}
    <p class="err" id="berr" hidden></p><button class="btn" id="bok">${b ? 'Enregistrer' : 'Ajouter le bien'}</button>
    ${b && !lo ? '<button type="button" class="btn danger" id="barch">Retirer ce bien</button>' : ''}</form>`);
  if ($('#voirloc')) $('#voirloc').onclick = () => fLoc(lo.id);
  if ($('#eqadd')) $('#eqadd').onclick = async () => { const pid = $('#eqp').value; if (!pid) return toast('Créez d\'abord un compte collecteur, trésorier ou commissaire.');
    try { await q(sb.from('equipes').insert({ bien_id: b.id, profil_id: pid, role: $('#eqr').value })); await charger('equipes'); fBien(b.id); toast('Affectation enregistrée'); }
    catch (x) { toast(/duplicate/i.test(x.message) ? 'Cette affectation existe déjà.' : msgErreur(x)); } };
  $$('#layer [data-eqdel]').forEach(x => x.onclick = async () => { const [pid, role] = x.dataset.eqdel.split('|');
    try { await q(sb.from('equipes').delete().eq('bien_id', b.id).eq('profil_id', pid).eq('role', role)); await charger('equipes'); fBien(b.id); toast('Affectation retirée'); } catch (y) { toast(msgErreur(y)); } });
  $('#bf').onsubmit = async e => {
    e.preventDefault(); occupe($('#bok'), true);
    if (!$('#btr').value) { occupe($('#bok'), false); $('#berr').textContent = 'Ajoutez d\'abord un terrain.'; $('#berr').hidden = false; return; }
    const o = { id: $('#bid').value.trim().toUpperCase(), type: $('#bt').value, terrain_id: $('#btr').value, nom: $('#bn').value.trim(), lieu: $('#bl').value.trim(), loyer: parseInt(digits($('#by').value) || '0', 10) };
    try { if (b) await q(sb.from('biens').update(o).eq('id', b.id)); else await q(sb.from('biens').insert(o));
      await charger('biens'); close(); render(); toast(b ? 'Bien mis à jour' : 'Bien ajouté'); }
    catch (x) { occupe($('#bok'), false); $('#berr').textContent = /duplicate/i.test(x.message) ? 'Ce code est déjà utilisé.' : msgErreur(x); $('#berr').hidden = false; }
  };
  if ($('#barch')) $('#barch').onclick = () => confirmer(`Retirer ${b.nom} de la liste des biens ? L'historique est conservé.`, 'Retirer le bien', async () => {
    await q(sb.from('biens').update({ actif: false }).eq('id', b.id)); await charger('biens'); close(); render(); toast('Bien retiré'); });
}
function fDepense(pre = {}) {
  if (estLect()) return lectureSeule();
  sheet(`<form class="stack" id="df">${entete('Nouvelle dépense')}
    <div><label for="dl">Libellé</label><input id="dl" required placeholder="Ex. Peinture Conteneur 2" value="${esc(pre.libelle)}"></div>
    <div><label for="dc">Catégorie</label><select id="dc">${CATS.map(c => `<option ${pre.categorie === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
    <div><label for="db">Bien concerné</label><select id="db"><option value="">Général</option>${S.biens.filter(b => b.actif).map(b => `<option value="${esc(b.id)}" ${pre.bien_id === b.id ? 'selected' : ''}>${esc(b.nom)}</option>`).join('')}</select></div>
    <div><label for="dm">Montant (FCFA)</label><input id="dm" inputmode="numeric" class="num" required value="${pre.montant || ''}"></div>
    <div><label for="dmo">Mode de paiement</label><select id="dmo"><option>Espèces</option><option>Mobile Money</option><option>Virement</option></select></div>
    <div><label for="dj">Justificatif (photo ou PDF de la facture)</label><input id="dj" type="file" accept="image/*,application/pdf" capture="environment"></div>
    ${!estG() ? `<p class="small muted" style="margin:0">Au-delà de ${fmt(S.seuil)}, la dépense devra être validée par le gestionnaire.</p>` : ''}
    <p class="err" id="derr" hidden></p><button class="btn" id="dok">Enregistrer la dépense</button></form>`);
  $('#df').onsubmit = async e => {
    e.preventDefault(); const m = parseInt(digits($('#dm').value), 10);
    const err = t => { $('#derr').textContent = t; $('#derr').hidden = false; };
    if (!m) return err('Saisissez un montant supérieur à 0.');
    occupe($('#dok'), true);
    try {
      let chemin = null; const f = $('#dj').files[0];
      if (f) { if (f.size > 8e6) throw new Error('Le fichier dépasse 8 Mo.'); chemin = S.moi.id + '/' + Date.now() + '-' + f.name.replace(/[^\w.-]+/g, '_');
        const { error } = await sb.storage.from('justificatifs').upload(chemin, f); if (error) throw error; }
      const d = await q(sb.from('depenses').insert({ libelle: $('#dl').value.trim(), categorie: $('#dc').value, bien_id: $('#db').value || null, montant: m, mode: $('#dmo').value, justificatif: chemin, par: S.moi.id }).select().single());
      S.depenses.push(d); S.fin = 'depenses'; render(); fBon(d.id);
      toast(d.statut === 'En attente' ? 'Dépense soumise à la validation du gestionnaire' : 'Dépense enregistrée');
    } catch (x) { occupe($('#dok'), false); err(msgErreur(x)); }
  };
}
async function voirJustif(chemin) {
  const { data, error } = await sb.storage.from('justificatifs').createSignedUrl(chemin, 300);
  if (error) return toast(msgErreur(error)); window.open(data.signedUrl, '_blank', 'noopener');
}
function fBon(id) {
  const d = S.depenses.find(x => x.id === id);
  sheet(`<div class="stack">${entete('Bon de dépense')}
    <div class="receipt"><div class="row between"><b style="font-family:var(--display)">Patrimoine NIN NIN</b><span class="num small">${esc(d.numero)}</span></div>
      <p class="small muted" style="margin:4px 0 10px">Pièce de sortie de caisse · <span class="pill ${STATUTS[d.statut]}">${d.statut}</span></p>
      <div class="r"><span class="muted">Libellé</span><b>${esc(d.libelle)}</b></div>
      <div class="r"><span class="muted">Catégorie</span><span>${esc(d.categorie)}</span></div>
      <div class="r"><span class="muted">Bien</span><span>${d.bien_id ? esc(bien(d.bien_id)?.nom) : 'Général'}</span></div>
      <div class="r"><span class="muted">Mode</span><span>${esc(d.mode)}</span></div>
      <div class="r"><span class="muted">Date</span><span>${dlong(d.date_depense)}</span></div>
      <div class="r"><span class="muted">Payé par</span><span>${esc(nomDe(d.par))}</span></div>
      ${d.valide_par && d.statut !== 'Validée' || (d.valide_par && d.valide_par !== d.par) ? `<div class="r"><span class="muted">${d.statut === 'Refusée' ? 'Refusée' : 'Validée'} par</span><span>${esc(nomDe(d.valide_par))}</span></div>` : ''}
      <div class="r"><span class="muted">Montant</span><b class="num" style="font-size:1.2rem">${fmt(d.montant)}</b></div></div>
    ${d.justificatif ? '<button class="btn ghost" id="jv">Voir le justificatif</button>' : (d.par === S.moi.id || estG()) ? `<div><label for="ja">Ajouter le justificatif</label><input id="ja" type="file" accept="image/*,application/pdf" capture="environment"></div>` : '<p class="small muted" style="margin:0">Justificatif manquant.</p>'}
    ${d.statut === 'En attente' && estG() ? `<div class="grid2"><button class="btn" id="dv">Valider</button><button class="btn danger" id="dr">Refuser</button></div>` : ''}
    ${d.statut === 'En attente' && !estG() ? `<p class="small muted" style="margin:0">En attente de validation par le gestionnaire (montant supérieur à ${fmt(S.seuil)}).</p>` : ''}</div>`);
  if ($('#jv')) $('#jv').onclick = () => voirJustif(d.justificatif);
  if ($('#ja')) $('#ja').onchange = async e => {
    const f = e.target.files[0]; if (!f) return; const chemin = S.moi.id + '/' + Date.now() + '-' + f.name.replace(/[^\w.-]+/g, '_');
    try { const { error } = await sb.storage.from('justificatifs').upload(chemin, f); if (error) throw error;
      await q(sb.from('depenses').update({ justificatif: chemin }).eq('id', d.id)); d.justificatif = chemin; render(); fBon(id); toast('Justificatif ajouté'); }
    catch (x) { toast(msgErreur(x)); }
  };
  const decider = async s => { try { const r = await q(sb.from('depenses').update({ statut: s }).eq('id', d.id).select().single()); Object.assign(d, r); render(); fBon(id); toast('Dépense ' + s.toLowerCase()); } catch (x) { toast(msgErreur(x)); } };
  if ($('#dv')) $('#dv').onclick = () => decider('Validée');
  if ($('#dr')) $('#dr').onclick = () => decider('Refusée');
}
function fDemarche(id) {
  if (estLect() && !id) return lectureSeule();
  const g = id ? S.demarches.find(x => x.id === id) : null; let et = g ? g.etape : 'À faire';
  sheet(`<form class="stack" id="gf">${entete(g ? 'Suivi de la démarche' : 'Nouvelle démarche')}
    <div><label for="gt">Intitulé</label><input id="gt" required value="${esc(g?.titre)}" placeholder="Ex. Paiement impôt foncier"></div>
    <div><label for="go">Organisme ou interlocuteur</label><input id="go" value="${esc(g?.organisme)}" placeholder="Mairie, impôts, notaire, CIE…"></div>
    <div><label for="gb">Bien concerné</label><select id="gb"><option value="">Général</option>${S.biens.filter(b => b.actif).map(b => `<option value="${esc(b.id)}" ${g?.bien_id === b.id ? 'selected' : ''}>${esc(b.nom)}</option>`).join('')}</select></div>
    <div><label>Étape</label><div class="seg" id="gseg" style="grid-template-columns:repeat(2,1fr)">${Object.keys(ETAPES).map(e => `<button type="button" aria-pressed="${et === e}">${e}</button>`).join('')}</div></div>
    <div class="grid2"><div><label for="ge">Échéance</label><input id="ge" type="date" value="${g?.echeance || ''}"></div>
    <div><label for="gc">Coût prévu (F)</label><input id="gc" inputmode="numeric" class="num" value="${g?.cout || ''}"></div></div>
    <div><label for="gn">Notes de suivi</label><textarea id="gn" rows="3">${esc(g?.notes)}</textarea></div>
    <button class="btn" id="gok">${g ? 'Mettre à jour' : 'Créer la démarche'}</button>
    ${g && g.cout ? '<button type="button" class="btn ghost" id="gp">Enregistrer le paiement en dépense</button>' : ''}</form>`);
  $$('#gseg button').forEach(b => b.onclick = () => { et = b.textContent; $$('#gseg button').forEach(x => x.setAttribute('aria-pressed', x === b)); });
  $('#gf').onsubmit = async e => {
    e.preventDefault(); occupe($('#gok'), true);
    const o = { titre: $('#gt').value.trim(), organisme: $('#go').value.trim(), bien_id: $('#gb').value || null, etape: et, echeance: $('#ge').value || null, cout: parseInt(digits($('#gc').value) || '0', 10), notes: $('#gn').value.trim(), updated_at: new Date().toISOString() };
    try { if (g) await q(sb.from('demarches').update(o).eq('id', g.id)); else await q(sb.from('demarches').insert(o));
      await charger('demarches'); close(); render(); toast(g ? 'Démarche mise à jour' : 'Démarche créée'); }
    catch (x) { occupe($('#gok'), false); toast(msgErreur(x)); }
  };
  if ($('#gp')) $('#gp').onclick = () => fDepense({ libelle: g.titre, categorie: 'Démarches administratives', bien_id: g.bien_id, montant: g.cout });
}
async function fNotifs() {
  const lim = S.moi.notifs_lues_at;
  sheet(`<div class="stack">${entete('Notifications')}
    ${'Notification' in window && Notification.permission === 'default' ? '<button class="btn ghost" id="nperm">Activer les alertes sur ce téléphone</button>' : ''}
    <div class="list">${S.notifs.map(n => { const nv = new Date(n.created_at) > new Date(lim); return `<div class="item" style="cursor:default"><span class="grow" style="${nv ? 'font-weight:700' : ''}">${esc(n.texte)}<span class="small muted" style="display:block;font-weight:400">${dfr(n.created_at)} · ${new Date(n.created_at).toTimeString().slice(0, 5)}</span></span>${nv ? '<span class="pill p-warn">Nouveau</span>' : ''}</div>`; }).join('') || '<p class="vide">Aucune notification.</p>'}</div></div>`);
  if ($('#nperm')) $('#nperm').onclick = async () => { const r = await Notification.requestPermission(); toast(r === 'granted' ? 'Alertes activées' : 'Alertes refusées'); fNotifs(); };
  try { await q(sb.rpc('marquer_notifs_lues')); S.moi.notifs_lues_at = new Date().toISOString(); render(); } catch (e) {}
}

/* ---------- Réglages (gestionnaire) ---------- */
function fReglages() {
  sheet(`<div class="stack">${entete('Réglages')}
    <h3>Comptes</h3>
    <div class="list">${S.profils.map(p => `<button class="item" data-prof="${p.id}"><span class="tag rond">${esc(ini(p.nom))}</span><span class="grow"><b class="ellip">${esc(p.nom)}${p.id === S.moi.id ? ' (vous)' : ''}</b><span class="small muted num">${esc(p.tel)} · ${p.role}</span></span>${p.actif ? '' : '<span class="pill p-neutre">Désactivé</span>'}</button>`).join('')}</div>
    <button class="btn ghost" id="addc">Créer un compte</button>
    <h3>Reçus</h3>
    <button class="btn ghost" id="recup">Personnaliser les reçus (nom, logo, couleur)</button>
    <h3>Validation des dépenses</h3>
    <form class="row" id="sf"><input id="seuil" inputmode="numeric" class="num" value="${S.seuil}" aria-label="Seuil en FCFA"><button class="btn" style="width:auto">Enregistrer</button></form>
    <p class="small muted" style="margin:0">Les dépenses d'un collecteur supérieures à ce montant attendent votre validation.</p>
    <h3>Mon compte</h3>
    <button class="btn ghost" id="monpin">Changer mon code PIN</button>
    <button class="btn danger" id="out">Se déconnecter</button>
    <p class="small muted" style="margin:0;text-align:center">Patrimoine NIN NIN · version 1.4</p></div>`);
  $$('#layer [data-prof]').forEach(b => b.onclick = () => fCompte(b.dataset.prof));
  $('#addc').onclick = () => fCompte();
  $('#recup').onclick = fRecuPerso;
  $('#sf').onsubmit = async e => { e.preventDefault(); const v = parseInt(digits($('#seuil').value), 10); if (!v) return toast('Montant invalide');
    try { await q(sb.from('parametres').update({ valeur: String(v) }).eq('cle', 'seuil_validation')); S.seuil = v; toast('Seuil enregistré'); } catch (x) { toast(msgErreur(x)); } };
  $('#monpin').onclick = fMonPin; $('#out').onclick = deconnexion;
}
function fCompte(id) {
  const p = id ? prof(id) : null;
  sheet(`<form class="stack" id="cf">${entete(p ? esc(p.nom) : 'Créer un compte')}
    ${p ? `<div class="card stack" style="gap:6px"><div class="row between"><span class="muted">Téléphone</span><b class="num">${esc(p.tel)}</b></div>
      <div class="row between"><span class="muted">Rôle</span><span>${p.role}</span></div>
      ${S.equipes.some(e => e.profil_id === p.id) ? `<div class="row between"><span class="muted">Biens confiés</span><span style="text-align:right">${S.equipes.filter(e => e.profil_id === p.id).map(e => esc(e.bien_id) + ' (' + esc(e.role) + ')').join(', ')}</span></div>` : p.role === 'Collecteur' || p.role === 'Trésorier' ? '<div class="small muted">Aucun bien confié : accès à tous les biens.</div>' : ''}</div>` : `
      <div><label for="cn">Nom complet</label><input id="cn" required></div>
      <div><label for="ct">Téléphone (identifiant de connexion)</label><input id="ct" required inputmode="tel"></div>
      <div><label for="cr">Rôle</label><select id="cr"><option>Collecteur</option><option>Trésorier</option><option value="Commissaire aux comptes">Commissaire aux comptes (contrôle)</option><option>Gestionnaire</option><option value="Famille">Famille (consultation seule)</option></select></div>`}
    <div><label for="cp">${p ? 'Nouveau code PIN' : 'Code PIN (4 chiffres)'}</label><input id="cp" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" ${p ? '' : 'required'} type="password" autocomplete="new-password"></div>
    <p class="err" id="cerr" hidden></p>
    <button class="btn" id="cok">${p ? 'Réinitialiser le PIN' : 'Créer le compte'}</button>
    ${p && p.id !== S.moi.id ? `<button type="button" class="btn ${p.actif ? 'danger' : 'ghost'}" id="cact">${p.actif ? 'Désactiver le compte' : 'Réactiver le compte'}</button>` : ''}
    <p class="small muted" style="margin:0">Communiquez le PIN à la personne de vive voix. Elle pourra ensuite le changer.</p></form>`);
  $('#cf').onsubmit = async e => {
    e.preventDefault(); const pin = $('#cp').value; const err = t => { $('#cerr').textContent = t; $('#cerr').hidden = false; };
    if (!/^\d{4}$/.test(pin)) return err('Le PIN doit comporter 4 chiffres.');
    occupe($('#cok'), true);
    try {
      if (p) { await q(sb.rpc('reinitialiser_pin', { p_id: p.id, p_mdp: motDePasse(pin, p.tel) })); toast('PIN réinitialisé'); }
      else { const tel = $('#ct').value.trim(); if (digits(tel).length < 8) { occupe($('#cok'), false); return err('Numéro invalide.'); }
        await q(sb.rpc('creer_compte', { p_nom: $('#cn').value.trim(), p_tel: tel, p_mdp: motDePasse(pin, tel), p_role: $('#cr').value })); toast('Compte créé'); }
      await charger('profils'); fReglages();
    } catch (x) { occupe($('#cok'), false); err(msgErreur(x)); }
  };
  if ($('#cact')) $('#cact').onclick = async () => { try { await q(sb.from('profils').update({ actif: !p.actif }).eq('id', p.id)); await charger('profils'); fReglages(); toast(p.actif ? 'Compte désactivé' : 'Compte réactivé'); } catch (x) { toast(msgErreur(x)); } };
}
function fMonPin() {
  sheet(`<form class="stack" id="pf">${entete('Changer mon code PIN')}
    <div class="grid2"><div><label for="p1">Nouveau PIN</label><input id="p1" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" required type="password" autocomplete="new-password"></div>
    <div><label for="p2">Confirmer</label><input id="p2" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" required type="password" autocomplete="new-password"></div></div>
    <p class="err" id="perr" hidden></p><button class="btn" id="pok">Enregistrer</button></form>`);
  $('#pf').onsubmit = async e => { e.preventDefault(); const a = $('#p1').value; const err = t => { $('#perr').textContent = t; $('#perr').hidden = false; };
    if (!/^\d{4}$/.test(a)) return err('Le PIN doit comporter 4 chiffres.'); if (a !== $('#p2').value) return err('Les deux PIN ne correspondent pas.');
    occupe($('#pok'), true); const { error } = await sb.auth.updateUser({ password: motDePasse(a, S.moi.tel) });
    if (error) { occupe($('#pok'), false); return err(msgErreur(error)); } close(); toast('PIN modifié'); };
}
async function deconnexion() { if (canal) sb.removeChannel(canal); await sb.auth.signOut(); S.session = null; S.moi = null; close(); ecranConnexion(); }

/* ---------- Exports ---------- */
async function exportXLSX() {
  if (!window.XLSX) return toast('Module Excel en cours de chargement, réessayez.');
  const wb = XLSX.utils.book_new(), arr = locActifs().reduce((a, l) => a + l.arriere, 0);
  const add = (n, rows, w) => { const ws = XLSX.utils.aoa_to_sheet(rows); ws['!cols'] = w.map(x => ({ wch: x })); XLSX.utils.book_append_sheet(wb, ws, n); };
  add('Synthèse', [['Patrimoine NIN NIN – Bilan ' + libMois(MOIS)], [], ['Recettes du mois', tRec()], ['Dépenses validées du mois', tDep()], ['Solde net', tRec() - tDep()], ['Arriérés à recouvrer', arr]], [28, 16]);
  add('Recettes', [['N° reçu', 'Date', 'Locataire', 'Bien', 'Période', 'Mode', 'Référence', 'Montant (F)', 'Encaissé par']].concat(S.versements.map(v => [v.numero, v.date_paiement, loc(v.locataire_id)?.nom, v.bien_id, libPeriode(v.periode), v.mode, v.reference, v.montant, nomDe(v.par)])), [10, 12, 22, 7, 18, 14, 16, 13, 16]);
  add('Dépenses', [['N°', 'Date', 'Libellé', 'Catégorie', 'Bien', 'Mode', 'Montant (F)', 'Statut', 'Justificatif', 'Saisi par']].concat(S.depenses.map(d => [d.numero, d.date_depense, d.libelle, d.categorie, d.bien_id || 'Général', d.mode, d.montant, d.statut, d.justificatif ? 'Oui' : 'Non', nomDe(d.par)])), [9, 12, 32, 24, 9, 14, 13, 12, 12, 16]);
  add('Par bien', [['Code', 'Bien', 'Type', 'Locataire', 'Loyer (F)', 'Recettes (F)', 'Dépenses (F)', 'Net (F)', 'Arriérés (F)']].concat(lignesBien()), [7, 28, 11, 22, 11, 12, 12, 11, 12]);
  add('Annuel ' + ANNEE, [['Mois', 'Recettes (F)', 'Dépenses (F)', 'Solde (F)']].concat(annee().map(([m, r, d]) => [m, r, d, r - d])), [12, 14, 14, 14]);
  add('Locataires', [['Nom', 'Téléphone', 'Bien', 'Activité', 'Statut du mois', 'Arriérés (F)']].concat(locActifs().map(l => [l.nom, l.tel, l.bien_id, l.activite, statut(l).court, l.arriere])), [24, 16, 8, 20, 14, 12]);
  add('Démarches', [['Intitulé', 'Organisme', 'Bien', 'Étape', 'Échéance', 'Coût prévu (F)', 'Notes']].concat(S.demarches.map(g => [g.titre, g.organisme, g.bien_id || 'Général', g.etape, g.echeance, g.cout, g.notes])), [32, 26, 8, 12, 12, 14, 40]);
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  await partagerOuTelecharger('Patrimoine_Famille_' + MOIS + '.xlsx', new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}
async function bilanPDF(annuel) {
  if (!window.jspdf) return toast('Module PDF en cours de chargement, réessayez.');
  const doc = new jspdf.jsPDF({ unit: 'mm', format: 'a4' });
  doc.setFillColor(31, 92, 74); doc.rect(0, 0, 210, 26, 'F'); doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text('PATRIMOINE FAMILLE', 14, 12);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.text(annuel ? 'Bilan annuel ' + ANNEE : 'Bilan mensuel – ' + libMois(MOIS), 14, 20); doc.setTextColor(24, 35, 31);
  let y = 38;
  const sec = t => { if (y > 265) { doc.addPage(); y = 20; } doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text(t, 14, y); y += 7; };
  const tab = (head, rows, xs) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); head.forEach((h, i) => doc.text(h, xs[i], y, i === head.length - 1 || typeof rows[0]?.[i] === 'number' ? { align: 'right' } : {}));
    y += 2; doc.setDrawColor(31, 92, 74); doc.line(14, y, 196, y); y += 5; doc.setFont('helvetica', 'normal');
    rows.forEach(r => { if (y > 282) { doc.addPage(); y = 20; } r.forEach((c, i) => doc.text(typeof c === 'number' ? pdfNum(c) : String(c ?? '').slice(0, 42), xs[i], y, typeof c === 'number' ? { align: 'right' } : {})); y += 6; });
    if (!rows.length) { doc.text('Aucune donnée', 14, y); y += 6; } y += 6;
  };
  if (annuel) { const an = annee(); sec('Recettes et dépenses par mois'); tab(['Mois', 'Recettes', 'Dépenses', 'Solde'], an.map(([m, r, d]) => [m, r, d, r - d]), [14, 110, 150, 196]);
    const R = an.reduce((a, x) => a + x[1], 0), D = an.reduce((a, x) => a + x[2], 0); sec('Totaux'); tab(['', 'Montant'], [['Cumul recettes', R], ['Cumul dépenses', D], ['Résultat', R - D]], [14, 196]); }
  else { sec('Synthèse'); tab(['', 'Montant'], [['Recettes', tRec()], ['Dépenses validées', tDep()], ['Solde net', tRec() - tDep()], ['Arriérés à recouvrer', locActifs().reduce((a, l) => a + l.arriere, 0)]], [14, 196]);
    sec('Recettes'); tab(['Reçu', 'Locataire', 'Mode', 'Montant'], versMois().map(v => [v.numero, loc(v.locataire_id)?.nom, v.mode, v.montant]), [14, 40, 120, 196]);
    sec('Dépenses'); tab(['N°', 'Libellé', 'Statut', 'Montant'], depMois().map(d => [d.numero, d.libelle, d.statut, d.montant]), [14, 36, 130, 196]); }
  sec('Rapport par bien (' + ANNEE + ')'); tab(['Bien', 'Locataire', 'Recettes', 'Dépenses', 'Net'], lignesBien().map(r => [r[1], r[3], r[5], r[6], r[7]]), [14, 80, 140, 168, 196]);
  doc.setFontSize(8); doc.setTextColor(95, 107, 102); doc.text('Généré le ' + new Date().toLocaleDateString('fr-FR') + ' par ' + S.moi.nom, 14, 290);
  await partagerOuTelecharger(annuel ? 'Bilan_annuel_' + ANNEE + '.pdf' : 'Bilan_' + MOIS + '.pdf', doc.output('blob'));
}


/* ---------- Héritiers et répartitions ---------- */
const herDe = id => S.heritiers.find(h => h.id === id);
const lignesDe = did => S.dlignes.filter(l => l.distribution_id === did).sort((a, b) => b.montant - a.montant);
const recuHeritier = hid => S.dlignes.filter(l => l.heritier_id === hid && l.verse).reduce((a, l) => a + l.montant, 0);
const duHeritier = hid => S.dlignes.filter(l => l.heritier_id === hid && !l.verse).reduce((a, l) => a + l.montant, 0);
const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
function vFamille() {
  const act = S.heritiers.filter(h => h.actif), tot = act.reduce((a, h) => a + Number(h.part), 0);
  const nonVerse = S.dlignes.filter(l => !l.verse).reduce((a, l) => a + l.montant, 0);
  return `<div class="card stack" style="gap:6px"><div class="eyebrow">Reste à verser aux héritiers</div>
      <div class="num" style="font:800 1.7rem var(--display);color:${nonVerse ? 'var(--warn)' : 'var(--ok)'}">${fmt(nonVerse)}</div>
      <div class="small muted">${act.length} branche(s) · ${S.regles.filter(r => r.actif).length} prélèvement(s) avant partage · ${S.affectations.length} bien(s) affecté(s)</div></div>
    <div class="card stack" style="gap:6px"><div class="row between"><h3>Règles de répartition</h3>${estG() ? '<button class="chip" data-act="regles">Modifier</button>' : ''}</div>${texteRegles()}</div>
    <h2>Héritiers et parts</h2>
    <div class="list">${act.map(h => `<button class="item" data-her="${h.id}"><span class="tag rond">${esc(ini(h.nom))}</span>
      <span class="grow"><b class="ellip">${esc(h.nom)}</b><span class="small muted ellip">${esc(h.branche || 'Branche')} · reçu ${fmt(recuHeritier(h.id))}${duHeritier(h.id) ? ' · à verser ' + fmt(duHeritier(h.id)) : ''}</span></span>
      <b class="num">${tot ? Math.round(Number(h.part) / tot * 1000) / 10 : 0} %</b></button>`).join('') || '<p class="vide">Aucun héritier enregistré.</p>'}</div>
    ${estG() ? '<button class="btn ghost" data-act="heritier">Ajouter un héritier ou une branche</button>' : ''}
    <div class="row between"><h2>Répartitions</h2><span class="small muted">${S.distributions.length}</span></div>
    <div class="list">${S.distributions.map(d => { const ls = lignesDe(d.id), ok = ls.length && ls.every(l => l.verse);
      return `<button class="item" data-dist="${d.id}"><span class="grow"><b class="ellip">Du ${dlong(d.debut)} au ${dlong(d.fin)}</b>
      <span class="small muted ellip">${esc(d.numero)} · bénéfice ${fmt(d.recettes - d.depenses)} · réserve ${fmt(d.reserve)}</span></span>
      <span style="text-align:right"><b class="num" style="display:block">${fmt(d.a_repartir)}</b><span class="pill ${ok ? 'p-ok' : 'p-warn'}">${ok ? 'Versé' : 'À verser'}</span></span></button>`; }).join('') || '<p class="vide">Aucune répartition pour le moment.</p>'}</div>
    ${estG() ? '<button class="btn" data-act="repartition">Calculer une nouvelle répartition</button>' : ''}`;
}
function fHeritier(id) {
  if (!estG()) { const h = herDe(id); if (!h) return; return sheet(`<div class="stack">${entete(esc(h.nom))}<div class="card stack" style="gap:6px">
    <div class="row between"><span class="muted">Branche</span><span>${esc(h.branche || '—')}</span></div><div class="row between"><span class="muted">Téléphone</span><b class="num">${esc(h.tel || '—')}</b></div>
    <div class="row between"><span class="muted">Déjà reçu</span><b class="num">${fmt(recuHeritier(h.id))}</b></div><div class="row between"><span class="muted">À recevoir</span><b class="num">${fmt(duHeritier(h.id))}</b></div></div></div>`); }
  const h = id ? herDe(id) : null;
  sheet(`<form class="stack" id="hf">${entete(h ? 'Modifier l\'héritier' : 'Nouvel héritier')}
    <div><label for="hn">Nom (personne ou branche)</label><input id="hn" required value="${esc(h?.nom)}" placeholder="Ex. Branche Amian Kouassi"></div>
    <div><label for="hb">Branche ou lien de parenté</label><input id="hb" value="${esc(h?.branche)}" placeholder="Ex. Enfants du premier lit, aîné…"></div>
    <div><label for="ht">Téléphone</label><input id="ht" inputmode="tel" value="${esc(h?.tel)}"></div>
    <div><label for="hp">Part</label><input id="hp" inputmode="decimal" class="num" required value="${h ? Number(h.part) : 1}"></div>
    <p class="small muted" style="margin:0">Indiquez des parts relatives : par exemple 1 pour chaque branche à égalité, ou 2 pour une branche qui reçoit le double. Les pourcentages sont calculés automatiquement.</p>
    <p class="err" id="herr" hidden></p><button class="btn" id="hok">Enregistrer</button>
    ${h ? `<button type="button" class="btn danger" id="hdel">${h.actif ? 'Retirer des prochaines répartitions' : 'Réintégrer'}</button>` : ''}</form>`);
  $('#hf').onsubmit = async e => { e.preventDefault(); const part = parseFloat(String($('#hp').value).replace(',', '.'));
    const err = t => { $('#herr').textContent = t; $('#herr').hidden = false; };
    if (!(part > 0)) return err('La part doit être supérieure à 0.');
    const o = { nom: $('#hn').value.trim(), branche: $('#hb').value.trim(), tel: $('#ht').value.trim(), part };
    occupe($('#hok'), true);
    try { if (h) await q(sb.from('heritiers').update(o).eq('id', h.id)); else await q(sb.from('heritiers').insert(o));
      await charger('heritiers'); close(); render(); toast('Héritier enregistré'); } catch (x) { occupe($('#hok'), false); err(msgErreur(x)); } };
  if ($('#hdel')) $('#hdel').onclick = async () => { try { await q(sb.from('heritiers').update({ actif: !h.actif }).eq('id', h.id)); await charger('heritiers'); close(); render(); toast(h.actif ? 'Héritier retiré des prochaines répartitions' : 'Héritier réintégré'); } catch (x) { toast(msgErreur(x)); } };
}
function texteRegles() {
  const aff = S.affectations.map(x => `<li>${esc(bien(x.bien_id)?.nom || x.bien_id)} : son bénéfice propre revient à <b>${esc(herDe(x.heritier_id)?.nom || '—')}</b></li>`).join('');
  const pr = S.regles.filter(r => r.actif).map(r => `<li>${esc(r.libelle)} : <b>${r.type === 'Pourcentage' ? Number(r.valeur) + ' %' : fmt(Number(r.valeur))}</b></li>`).join('');
  return `<ol class="small" style="margin:0;padding-left:18px;line-height:1.6">
    ${aff ? `<li>Biens affectés<ul style="padding-left:16px">${aff}</ul></li>` : ''}
    <li>Prélèvements sur le bénéfice commun, dans l'ordre${pr ? `<ul style="padding-left:16px">${pr}</ul>` : ' : aucun'}</li>
    <li>Le reste est partagé selon les parts des héritiers ; les francs d'arrondi restent en caisse.</li></ol>`;
}
function calculRepartition(s) {
  const act = S.heritiers.filter(h => h.actif), tot = act.reduce((a, h) => a + Number(h.part), 0);
  const lig = Object.fromEntries(act.map(h => [h.id, { h, aff: 0, part: 0 }]));
  const net = s.r - s.d; let pool = net;
  S.affectations.forEach(x => { if (!lig[x.heritier_id]) return;
    let m = s.vs.filter(v => v.bien_id === x.bien_id).reduce((a, v) => a + v.montant, 0) - s.ds.filter(v => v.bien_id === x.bien_id && v.statut === 'Validée').reduce((a, v) => a + v.montant, 0);
    if (m > 0) { m = Math.min(m, pool); lig[x.heritier_id].aff += m; pool -= m; } });
  const base = Math.max(pool, 0); let reste = base;
  const prel = S.regles.filter(r => r.actif).map(r => { let m = r.type === 'Pourcentage' ? Math.round(base * Number(r.valeur) / 100) : Math.round(Number(r.valeur)); m = Math.min(Math.max(m, 0), reste); reste -= m; return { libelle: r.libelle, regle: r.type === 'Pourcentage' ? Number(r.valeur) + ' %' : 'montant fixe', montant: m }; });
  let dist = 0; act.forEach(h => { const m = tot ? Math.floor(reste * Number(h.part) / tot) : 0; lig[h.id].part = m; dist += m; });
  if (reste - dist > 0) prel.push({ libelle: 'Arrondis gardés en caisse', regle: '', montant: reste - dist });
  return { net, prel, lignes: Object.values(lig), tot };
}
function fRegles() {
  const regles = S.regles.map(r => ({ ...r }));
  const dessine = () => {
    sheet(`<div class="stack">${entete('Règles de répartition')}
      <h3>1. Biens affectés à un héritier</h3>
      <p class="small muted" style="margin:0">Le bénéfice propre d'un bien affecté (ses loyers moins ses dépenses) revient en entier à l'héritier choisi, avant tout partage.</p>
      <div class="list">${S.biens.filter(b => b.actif).map(b => { const x = S.affectations.find(a => a.bien_id === b.id);
        return `<div class="item" style="cursor:default"><span class="tag">${esc(b.id)}</span><span class="grow"><b class="ellip">${esc(b.nom)}</b></span>
        <select data-aff="${esc(b.id)}" style="width:auto;max-width:48%"><option value="">Commun</option>${S.heritiers.filter(h => h.actif).map(h => `<option value="${h.id}" ${x?.heritier_id === h.id ? 'selected' : ''}>${esc(h.nom)}</option>`).join('')}</select></div>`; }).join('') || '<p class="vide">Aucun bien.</p>'}</div>
      <h3>2. Prélèvements avant partage</h3>
      <p class="small muted" style="margin:0">Appliqués dans l'ordre sur le bénéfice commun. Un pourcentage se calcule sur le bénéfice commun ; un montant fixe est plafonné à ce qui reste.</p>
      <div class="list">${regles.map((r, i) => `<div class="item" style="cursor:default;flex-wrap:wrap;gap:8px">
        <span class="grow" style="min-width:140px"><b class="ellip">${i + 1}. ${esc(r.libelle)}</b><span class="small muted">${r.type === 'Pourcentage' ? Number(r.valeur) + ' % du bénéfice' : fmt(Number(r.valeur)) + ' fixe'}${r.actif ? '' : ' · désactivée'}</span></span>
        <span class="row" style="gap:6px">${i ? `<button class="chip" data-up="${i}" aria-label="Monter">↑</button>` : ''}<button class="chip" data-edit="${i}">Modifier</button></span></div>`).join('') || '<p class="vide">Aucun prélèvement : tout le bénéfice commun est partagé.</p>'}</div>
      <button class="btn ghost" id="radd">Ajouter un prélèvement</button>
      <h3>3. Partage du reste</h3>
      <p class="small muted" style="margin:0">Selon les parts de chaque héritier (modifiables dans la liste des héritiers).</p></div>`);
    $$('#layer [data-aff]').forEach(sel => sel.onchange = async () => {
      try { if (sel.value) await q(sb.from('affectations').upsert({ bien_id: sel.dataset.aff, heritier_id: sel.value }));
        else await q(sb.from('affectations').delete().eq('bien_id', sel.dataset.aff));
        await charger('affectations'); render(); toast('Affectation enregistrée'); } catch (x) { toast(msgErreur(x)); } });
    $$('#layer [data-up]').forEach(b => b.onclick = async () => { const i = +b.dataset.up; [regles[i - 1], regles[i]] = [regles[i], regles[i - 1]];
      try { await Promise.all(regles.map((r, k) => q(sb.from('regles_repartition').update({ ordre: k + 1 }).eq('id', r.id)))); await charger('regles'); render(); fRegles(); } catch (x) { toast(msgErreur(x)); } });
    $$('#layer [data-edit]').forEach(b => b.onclick = () => fRegle(regles[+b.dataset.edit], regles.length));
    $('#radd').onclick = () => fRegle(null, regles.length);
  };
  dessine();
}
function fRegle(r, n) {
  sheet(`<form class="stack" id="rgf">${entete(r ? 'Modifier le prélèvement' : 'Nouveau prélèvement')}
    <div><label for="rgl">Libellé</label><input id="rgl" required value="${esc(r?.libelle)}" placeholder="Ex. Rémunération du gestionnaire"></div>
    <div class="grid2"><div><label for="rgt">Type</label><select id="rgt"><option ${r?.type === 'Pourcentage' ? 'selected' : ''}>Pourcentage</option><option ${r?.type === 'Montant fixe' ? 'selected' : ''}>Montant fixe</option></select></div>
    <div><label for="rgv">Valeur (% ou F)</label><input id="rgv" inputmode="decimal" class="num" required value="${r ? Number(r.valeur) : ''}"></div></div>
    ${r ? `<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="rga" style="width:auto" ${r.actif ? 'checked' : ''}> Règle active</label>` : ''}
    <p class="err" id="rgerr" hidden></p><button class="btn" id="rgok">Enregistrer</button>
    ${r ? '<button type="button" class="btn danger" id="rgdel">Supprimer cette règle</button>' : ''}<button type="button" class="btn ghost" id="rgret">Retour aux règles</button></form>`);
  $('#rgret').onclick = fRegles;
  $('#rgf').onsubmit = async e => { e.preventDefault(); const v = parseFloat(String($('#rgv').value).replace(/\s/g, '').replace(',', '.')), t = $('#rgt').value;
    const err = x => { $('#rgerr').textContent = x; $('#rgerr').hidden = false; };
    if (!(v >= 0)) return err('Valeur invalide.'); if (t === 'Pourcentage' && v > 100) return err('Un pourcentage ne peut dépasser 100.');
    const o = { libelle: $('#rgl').value.trim(), type: t, valeur: v, actif: r ? $('#rga').checked : true };
    occupe($('#rgok'), true);
    try { if (r) await q(sb.from('regles_repartition').update(o).eq('id', r.id)); else await q(sb.from('regles_repartition').insert({ ...o, ordre: n + 1 }));
      await charger('regles'); render(); fRegles(); toast('Règle enregistrée'); } catch (x) { occupe($('#rgok'), false); err(msgErreur(x)); } };
  if ($('#rgdel')) $('#rgdel').onclick = async () => { try { await q(sb.from('regles_repartition').delete().eq('id', r.id)); await charger('regles'); render(); fRegles(); toast('Règle supprimée'); } catch (x) { toast(msgErreur(x)); } };
}
async function sommesPeriode(debut, fin) {
  const [vs, ds] = await Promise.all([
    q(sb.from('versements').select('montant,bien_id,date_paiement,numero,locataire_id,mode,periode').gte('date_paiement', debut).lte('date_paiement', fin).order('date_paiement')),
    q(sb.from('depenses').select('*').gte('date_depense', debut).lte('date_depense', fin).order('date_depense'))]);
  return { vs, ds, r: vs.reduce((a, v) => a + v.montant, 0), d: ds.filter(x => x.statut === 'Validée').reduce((a, x) => a + x.montant, 0) };
}
function fRepartition() {
  const act = S.heritiers.filter(h => h.actif);
  if (!act.length) return toast('Enregistrez d\'abord les héritiers et leurs parts.');
  const der = S.distributions[0]; const deb = der ? new Date(der.fin) : null; if (deb) deb.setDate(deb.getDate() + 1);
  const d0 = deb ? iso(deb) : MOIS + '-01', f0 = auj();
  sheet(`<form class="stack" id="rpf">${entete('Nouvelle répartition')}
    <div class="grid2"><div><label for="rd">Du</label><input id="rd" type="date" required value="${d0}"></div><div><label for="rfn">Au</label><input id="rfn" type="date" required value="${f0}"></div></div>
    <div><label for="rn">Observations (facultatif)</label><input id="rn" placeholder="Ex. Décidé en réunion du 30 novembre"></div>
    <div class="card stack" id="rprev" style="gap:6px"><p class="small muted" style="margin:0">Calcul en cours…</p></div>
    <p class="err" id="rerr" hidden></p><button class="btn" id="rok">Valider la répartition</button>
    <p class="small muted" style="margin:0">Les règles de répartition en vigueur s'appliquent. Le calcul définitif est refait par le serveur à partir des recettes et des dépenses validées de la période.</p></form>`);
  const apercu = async () => {
    const d = $('#rd').value, f = $('#rfn').value; if (!d || !f || f < d) return;
    try { const s = await sommesPeriode(d, f), c = calculRepartition(s);
      $('#rprev').innerHTML = `<div class="row between"><span class="muted">Recettes</span><b class="num" style="color:var(--ok)">${fmt(s.r)}</b></div>
        <div class="row between"><span class="muted">Dépenses validées</span><b class="num" style="color:var(--bad)">${fmt(s.d)}</b></div>
        <div class="row between"><span class="muted">Bénéfice</span><b class="num">${fmt(c.net)}</b></div>
        ${c.net > 0 ? c.prel.map(p => `<div class="row between small"><span class="muted">${esc(p.libelle)}${p.regle ? ' (' + esc(p.regle) + ')' : ''}</span><b class="num">− ${fmt(p.montant)}</b></div>`).join('')
          + '<div class="row between" style="margin-top:4px"><b>Parts des héritiers</b></div>'
          + c.lignes.map(l => `<div class="row between small"><span>${esc(l.h.nom)}${l.aff ? ' (dont bien affecté ' + fmt(l.aff) + ')' : ''}</span><b class="num">${fmt(l.aff + l.part)}</b></div>`).join('')
          : '<p class="small" style="margin:0;color:var(--bad)">Pas de bénéfice sur cette période.</p>'}`;
    } catch (x) { $('#rprev').innerHTML = `<p class="small" style="margin:0">${esc(msgErreur(x))}</p>`; } };
  ['#rd', '#rfn'].forEach(s => $(s).onchange = apercu); apercu();
  $('#rpf').onsubmit = async e => { e.preventDefault(); occupe($('#rok'), true);
    try { const id = await q(sb.rpc('creer_distribution', { p_debut: $('#rd').value, p_fin: $('#rfn').value, p_notes: $('#rn').value.trim() }));
      await charger(['distributions', 'dlignes', 'dprel']); S.fin = 'famille'; render(); fDistribution(id); toast('Répartition enregistrée'); }
    catch (x) { occupe($('#rok'), false); $('#rerr').textContent = msgErreur(x); $('#rerr').hidden = false; } };
}
function fDistribution(id) {
  const d = S.distributions.find(x => x.id === id); if (!d) return; const ls = lignesDe(id);
  sheet(`<div class="stack">${entete('Répartition ' + esc(d.numero))}
    <div class="card stack" style="gap:6px"><div class="row between"><span class="muted">Période</span><span>${dlong(d.debut)} → ${dlong(d.fin)}</span></div>
      <div class="row between"><span class="muted">Recettes</span><b class="num">${fmt(d.recettes)}</b></div>
      <div class="row between"><span class="muted">Dépenses validées</span><b class="num">${fmt(d.depenses)}</b></div>
      ${S.dprel.filter(p => p.distribution_id === d.id).map(p => `<div class="row between small"><span class="muted">${esc(p.libelle)}${p.regle ? ' (' + esc(p.regle) + ')' : ''}</span><b class="num">− ${fmt(p.montant)}</b></div>`).join('')}
      <div class="row between"><span class="muted">Réparti aux héritiers</span><b class="num">${fmt(d.a_repartir)}</b></div>
      ${d.notes ? `<p class="small muted" style="margin:0">${esc(d.notes)}</p>` : ''}</div>
    ${d.vise_par ? `<div class="card stack" style="gap:4px;border-color:${d.visa_avis === 'Conforme' ? 'var(--ok)' : 'var(--warn)'}"><b>Visa du commissaire aux comptes : ${esc(d.visa_avis)}</b>
      <span class="small muted">${esc(nomDe(d.vise_par))} · ${dlong(d.vise_le)}</span>${d.visa_observations ? `<p class="small" style="margin:0">${esc(d.visa_observations)}</p>` : ''}</div>`
      : aCAC() ? `<div class="card small" style="border-color:var(--warn)"><b style="color:var(--warn)">En attente du visa du commissaire aux comptes.</b> Les parts ne peuvent pas encore être versées.</div>` : ''}
    ${estCAC() && !d.vise_par ? '<button class="btn" id="dvisa">Viser cette répartition</button>' : ''}
    <h3>Parts</h3>
    <div class="list">${ls.map(l => { const h = herDe(l.heritier_id); return `<div class="item" style="cursor:default"><span class="grow"><b class="ellip">${esc(h?.nom)}</b>
      <span class="small muted ellip">${l.verse ? 'Versé le ' + dlong(l.verse_le) + ' · ' + esc(l.mode) + (l.reference ? ' · ' + esc(l.reference) : '') : 'Part ' + Number(l.part) + (l.part_affectee ? ' · dont bien affecté ' + fmt(l.part_affectee) : '')}</span></span>
      <span style="text-align:right"><b class="num" style="display:block">${fmt(l.montant)}</b>${l.verse ? '<span class="pill p-ok">Versé</span>' : (estG() || estT()) && (d.vise_par || !aCAC()) ? `<button class="chip" data-verser="${l.id}">Marquer versé</button>` : '<span class="pill p-warn">À verser</span>'}</span></div>`; }).join('')}</div>
    <button class="btn ghost" id="dpdf">État de répartition (PDF)</button>
    ${estG() && !ls.some(l => l.verse) ? '<button class="btn danger" id="dsup">Annuler cette répartition</button>' : ''}</div>`);
  $$('#layer [data-verser]').forEach(b => b.onclick = () => fVerser(b.dataset.verser, id));
  $('#dpdf').onclick = () => repartitionPDF(d);
  if ($('#dvisa')) $('#dvisa').onclick = () => fVisa(id);
  if ($('#dsup')) $('#dsup').onclick = () => confirmer('Annuler définitivement cette répartition ? Aucune part n\'a encore été versée.', 'Annuler la répartition', async () => {
    await q(sb.from('distributions').delete().eq('id', id)); await charger(['distributions', 'dlignes', 'dprel']); close(); render(); toast('Répartition annulée'); });
}
function fVisa(did) {
  const d = S.distributions.find(x => x.id === did); let avis = 'Conforme';
  sheet(`<form class="stack" id="vf">${entete('Visa · ' + esc(d.numero))}
    <p class="small muted" style="margin:0">Vérifiez les recettes, les dépenses justifiées, les prélèvements et les parts avant de viser. Le visa est définitif.</p>
    <div><label>Avis</label><div class="seg" id="vseg">${['Conforme', 'Réserves'].map(m => `<button type="button" aria-pressed="${m === avis}">${m}</button>`).join('')}</div></div>
    <div><label for="vo">Observations</label><textarea id="vo" rows="4" placeholder="Obligatoire en cas de réserves"></textarea></div>
    <p class="err" id="verr" hidden></p><button class="btn" id="vok">Apposer le visa</button></form>`);
  $$('#vseg button').forEach(b => b.onclick = () => { avis = b.textContent; $$('#vseg button').forEach(x => x.setAttribute('aria-pressed', x === b)); });
  $('#vf').onsubmit = async e => { e.preventDefault(); occupe($('#vok'), true);
    try { await q(sb.rpc('viser_distribution', { p_id: did, p_avis: avis, p_obs: $('#vo').value.trim() })); await charger('distributions'); fDistribution(did); toast('Visa enregistré'); }
    catch (x) { occupe($('#vok'), false); $('#verr').textContent = msgErreur(x); $('#verr').hidden = false; } };
}
function fVerser(lid, did) {
  const l = S.dlignes.find(x => x.id === lid), h = herDe(l.heritier_id);
  sheet(`<form class="stack" id="vf">${entete('Versement à ' + esc(h?.nom))}
    <div class="card row between"><span class="muted">Montant</span><b class="num">${fmt(l.montant)}</b></div>
    <div class="grid2"><div><label for="vd">Date</label><input id="vd" type="date" required value="${auj()}"></div>
    <div><label for="vm">Mode</label><select id="vm"><option>Espèces</option><option>Mobile Money</option><option>Virement</option></select></div></div>
    <div><label for="vr">Référence (n° de transaction, reçu…)</label><input id="vr"></div>
    <button class="btn" id="vok">Confirmer le versement</button></form>`);
  $('#vf').onsubmit = async e => { e.preventDefault(); occupe($('#vok'), true);
    try { await q(sb.from('distribution_lignes').update({ verse: true, verse_le: $('#vd').value, mode: $('#vm').value, reference: $('#vr').value.trim() }).eq('id', lid));
      await charger('dlignes'); render(); fDistribution(did); toast('Versement enregistré'); } catch (x) { occupe($('#vok'), false); toast(msgErreur(x)); } };
}

/* ---------- Documents du terrain ---------- */
const TYPES_DOC = ['Titre foncier / ACD', 'Plan / bornage', 'Procès-verbal', 'Contrat / bail', 'Facture / devis', 'Photo', 'Autre'];
function vDocuments() {
  const groupes = TYPES_DOC.map(t => [t, S.documents.filter(d => d.type === t)]).filter(g => g[1].length);
  return `${groupes.map(([t, ds]) => `<h2>${t}</h2><div class="list">${ds.map(d => `<button class="item" data-doc="${d.id}"><span class="grow"><b class="ellip">${esc(d.titre)}</b>
      <span class="small muted ellip">${d.bien_id ? esc(bien(d.bien_id)?.nom || d.bien_id) : 'Terrain'} · ${dfr(d.created_at)} · ${esc(nomDe(d.par))}</span></span><span class="muted">Ouvrir</span></button>`).join('')}</div>`).join('')
    || '<p class="vide">Aucun document. Rangez ici le titre foncier ou l\'ACD, le plan, les procès-verbaux et les contrats.</p>'}
    ${estG() ? '<button class="btn" data-act="document">Ajouter un document</button>' : ''}`;
}
function fDocument() {
  sheet(`<form class="stack" id="docf">${entete('Nouveau document')}
    <div><label for="dot">Titre</label><input id="dot" required placeholder="Ex. ACD du terrain de Faya"></div>
    <div><label for="doy">Type</label><select id="doy">${TYPES_DOC.map(t => `<option>${t}</option>`).join('')}</select></div>
    <div><label for="dob">Bien concerné</label><select id="dob"><option value="">Tout le terrain</option>${S.biens.filter(b => b.actif).map(b => `<option value="${esc(b.id)}">${esc(b.nom)}</option>`).join('')}</select></div>
    <div><label for="dof">Fichier (PDF ou photo, 15 Mo maximum)</label><input id="dof" type="file" required accept="image/*,application/pdf"></div>
    <p class="err" id="doerr" hidden></p><button class="btn" id="dook">Enregistrer</button></form>`);
  $('#docf').onsubmit = async e => { e.preventDefault(); const f = $('#dof').files[0]; const err = t => { $('#doerr').textContent = t; $('#doerr').hidden = false; };
    if (!f) return err('Choisissez un fichier.'); if (f.size > 15e6) return err('Le fichier dépasse 15 Mo.');
    occupe($('#dook'), true);
    try { const chemin = Date.now() + '-' + f.name.replace(/[^\w.-]+/g, '_');
      const { error } = await sb.storage.from('documents').upload(chemin, f); if (error) throw error;
      await q(sb.from('documents').insert({ titre: $('#dot').value.trim(), type: $('#doy').value, bien_id: $('#dob').value || null, chemin, taille: f.size }));
      await charger('documents'); close(); render(); toast('Document enregistré'); } catch (x) { occupe($('#dook'), false); err(msgErreur(x)); } };
}
function fVoirDocument(id) {
  const d = S.documents.find(x => x.id === id); if (!d) return;
  sheet(`<div class="stack">${entete(esc(d.titre))}
    <div class="card stack" style="gap:6px"><div class="row between"><span class="muted">Type</span><span>${esc(d.type)}</span></div>
      <div class="row between"><span class="muted">Bien</span><span>${d.bien_id ? esc(bien(d.bien_id)?.nom || d.bien_id) : 'Tout le terrain'}</span></div>
      <div class="row between"><span class="muted">Ajouté le</span><span>${dlong(d.created_at)} par ${esc(nomDe(d.par))}</span></div></div>
    <button class="btn" id="doo">Ouvrir le document</button>
    ${estG() ? '<button class="btn danger" id="dos">Supprimer</button>' : ''}</div>`);
  $('#doo').onclick = async () => { const { data, error } = await sb.storage.from('documents').createSignedUrl(d.chemin, 300); if (error) return toast(msgErreur(error)); window.open(data.signedUrl, '_blank', 'noopener'); };
  if ($('#dos')) $('#dos').onclick = () => confirmer('Supprimer définitivement « ' + d.titre + ' » ?', 'Supprimer', async () => {
    await sb.storage.from('documents').remove([d.chemin]); await q(sb.from('documents').delete().eq('id', d.id)); await charger('documents'); close(); render(); toast('Document supprimé'); });
}

/* ---------- Rapport de réunion de famille ---------- */
function fReunion() {
  const d0 = new Date(); d0.setMonth(d0.getMonth() - 1, 1);
  sheet(`<form class="stack" id="ruf">${entete('Rapport de réunion')}
    <div><label for="rut">Intitulé de la réunion</label><input id="rut" value="Réunion de famille – gestion du patrimoine"></div>
    <div class="grid2"><div><label for="rud">Période du</label><input id="rud" type="date" required value="${iso(d0)}"></div><div><label for="ruf2">au</label><input id="ruf2" type="date" required value="${auj()}"></div></div>
    <div><label for="rul">Date et lieu de la réunion</label><input id="rul" placeholder="Ex. 30 novembre 2026, en ligne"></div>
    <div><label for="rup">Présents</label><input id="rup" placeholder="Noms des participants"></div>
    <div><label for="rur">Résolutions et décisions (une par ligne)</label><textarea id="rur" rows="5" placeholder="Ex. Réfection de la toiture du magasin M2 avant fin décembre"></textarea></div>
    <button class="btn" id="ruok">Générer le rapport (PDF)</button></form>`);
  $('#ruf').onsubmit = async e => { e.preventDefault(); occupe($('#ruok'), true);
    try { await reunionPDF({ titre: $('#rut').value.trim(), debut: $('#rud').value, fin: $('#ruf2').value, lieu: $('#rul').value.trim(), presents: $('#rup').value.trim(), resolutions: $('#rur').value.split('\n').map(s => s.trim()).filter(Boolean) }); }
    catch (x) { toast(msgErreur(x)); } occupe($('#ruok'), false); };
}
function pdfBase(titre, sous) {
  const doc = new jspdf.jsPDF({ unit: 'mm', format: 'a4' }); let y = 38;
  doc.setFillColor(31, 92, 74); doc.rect(0, 0, 210, 26, 'F'); doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text(titre.toUpperCase().slice(0, 60), 14, 12);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.text(sous, 14, 20); doc.setTextColor(24, 35, 31);
  const P = {
    doc, get y() { return y; }, set y(v) { y = v; },
    page(h = 10) { if (y + h > 280) { doc.addPage(); y = 20; } },
    sec(t) { P.page(14); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text(t, 14, y); y += 7; },
    txt(t, o = {}) { doc.setFont('helvetica', o.b ? 'bold' : 'normal'); doc.setFontSize(o.s || 10); doc.splitTextToSize(t, 182).forEach(l => { P.page(); doc.text(l, 14, y); y += 5; }); y += 1; },
    tab(head, rows, xs) {
      P.page(14); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); head.forEach((h, i) => doc.text(h, xs[i], y, i > 0 && typeof rows[0]?.[i] === 'number' ? { align: 'right' } : {}));
      y += 2; doc.setDrawColor(31, 92, 74); doc.line(14, y, 196, y); y += 5; doc.setFont('helvetica', 'normal');
      rows.forEach(r => { P.page(); r.forEach((c, i) => { const larg = Math.floor(((xs[i + 1] ?? 196) - xs[i] - 3) / 1.85); doc.text(typeof c === 'number' ? pdfNum(c) : String(c ?? '').slice(0, Math.max(larg, 12)), xs[i], y, typeof c === 'number' ? { align: 'right' } : {}); }); y += 6; });
      if (!rows.length) { doc.text('Aucune donnée', 14, y); y += 6; } y += 5; },
    pied() { const n = doc.getNumberOfPages(); for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(95, 107, 102); doc.text('Patrimoine NIN NIN · généré le ' + new Date().toLocaleDateString('fr-FR') + ' par ' + S.moi.nom + ' · page ' + i + '/' + n, 14, 290); } }
  };
  return P;
}
async function reunionPDF(o) {
  if (!window.jspdf) return toast('Module PDF en cours de chargement, réessayez.');
  if (o.fin < o.debut) return toast('La date de fin précède la date de début.');
  const s = await sommesPeriode(o.debut, o.fin), P = pdfBase(o.titre || 'Réunion de famille', 'Période du ' + dlong(o.debut) + ' au ' + dlong(o.fin));
  if (o.lieu) P.txt('Date et lieu : ' + o.lieu); if (o.presents) P.txt('Présents : ' + o.presents); P.y += 2;
  const valid = s.ds.filter(d => d.statut === 'Validée'), attente = s.ds.filter(d => d.statut === 'En attente');
  const sansJ = valid.filter(d => !d.justificatif).length;
  const dists = S.distributions.filter(d => d.debut <= o.fin && d.fin >= o.debut);
  P.sec('1. Synthèse financière');
  P.tab(['', 'Montant'], [['Argent perçu (loyers)', s.r], ['Dépenses validées', s.d], ['Solde de la période', s.r - s.d], ['Réparti aux héritiers', dists.reduce((a, d) => a + d.a_repartir, 0)], ['Arriérés à recouvrer (à ce jour)', locActifs().reduce((a, l) => a + l.arriere, 0)]], [14, 196]);
  P.sec('2. Argent perçu par bien');
  const parBien = {}; s.vs.forEach(v => { parBien[v.bien_id] = (parBien[v.bien_id] || 0) + v.montant; });
  P.tab(['Bien', 'Locataire', 'Perçu'], Object.entries(parBien).map(([b, m]) => [bien(b)?.nom || b, locDuBien(b)?.nom || '—', m]), [14, 80, 196]);
  P.sec('3. Dépenses de la période');
  P.tab(['N°', 'Libellé', 'Justificatif', 'Montant'], valid.map(d => [d.numero, d.libelle, d.justificatif ? 'Oui' : 'Manquant', d.montant]), [14, 34, 150, 196]);
  if (sansJ) P.txt(sansJ + ' dépense(s) validée(s) sans justificatif : à régulariser.', { b: true });
  if (attente.length) P.txt(attente.length + ' dépense(s) en attente de validation pour ' + fmt(attente.reduce((a, d) => a + d.montant, 0)).replace(/\s/g, ' ') + '.');
  P.sec('4. Répartitions entre héritiers');
  if (!dists.length) P.txt('Aucune répartition sur la période.');
  dists.forEach(d => { P.txt('Répartition ' + d.numero + ' (' + dlong(d.debut) + ' – ' + dlong(d.fin) + ') : prélèvements ' + pdfNum(d.reserve) + ', réparti ' + pdfNum(d.a_repartir), { b: true });
    P.tab(['Héritier', 'Statut', 'Montant'], lignesDe(d.id).map(l => [herDe(l.heritier_id)?.nom || '—', l.verse ? 'Versé le ' + dlong(l.verse_le) : 'À verser', l.montant]), [14, 100, 196]); });
  P.sec('5. Locataires en retard (à ce jour)');
  P.tab(['Locataire', 'Bien', 'Arriérés'], locActifs().filter(l => l.arriere > 0 || statut(l).k !== 'ok').map(l => [l.nom, bien(l.bien_id)?.nom || '—', l.arriere + Math.max((bien(l.bien_id)?.loyer || 0) - paye(l.id), 0)]), [14, 90, 196]);
  P.sec('6. Démarches en cours');
  P.tab(['Démarche', 'Étape', 'Coût prévu'], S.demarches.filter(g => g.etape !== 'Terminée').map(g => [g.titre, g.etape, g.cout]), [14, 130, 196]);
  P.page((o.resolutions.length || 4) * 7 + 45); P.sec('7. Résolutions');
  if (o.resolutions.length) o.resolutions.forEach((r, i) => P.txt((i + 1) + '. ' + r)); else { for (let i = 0; i < 4; i++) { P.page(); P.doc.setDrawColor(180); P.doc.line(14, P.y, 196, P.y); P.y += 9; } }
  P.page(24); P.y += 8; P.doc.setFont('helvetica', 'bold'); P.doc.setFontSize(10);
  P.doc.text('Le président de séance', 40, P.y, { align: 'center' }); P.doc.text('Le secrétaire de séance', 170, P.y, { align: 'center' });
  P.pied();
  await partagerOuTelecharger('Rapport_reunion_' + o.debut + '_' + o.fin + '.pdf', P.doc.output('blob'));
}
async function repartitionPDF(d) {
  if (!window.jspdf) return toast('Module PDF en cours de chargement, réessayez.');
  const P = pdfBase('État de répartition ' + d.numero, 'Période du ' + dlong(d.debut) + ' au ' + dlong(d.fin));
  P.sec('Calcul');
  P.tab(['', 'Montant'], [['Recettes', d.recettes], ['Dépenses validées', d.depenses], ['Bénéfice', d.recettes - d.depenses]].concat(S.dprel.filter(p => p.distribution_id === d.id).map(p => [p.libelle + (p.regle ? ' (' + p.regle + ')' : ''), p.montant])).concat([['Montant réparti aux héritiers', d.a_repartir]]), [14, 196]);
  P.sec('Parts des héritiers');
  P.tab(['Héritier', 'Statut', 'Dont bien affecté', 'Montant'], lignesDe(d.id).map(l => [herDe(l.heritier_id)?.nom || '—', l.verse ? 'Versé le ' + dlong(l.verse_le) + ' (' + l.mode + ')' : 'À verser', l.part_affectee || 0, l.montant]), [14, 70, 160, 196]);
  if (d.notes) P.txt('Observations : ' + d.notes);
  P.pied();
  await partagerOuTelecharger('Repartition_' + d.numero + '.pdf', P.doc.output('blob'));
}

/* ---------- Rendu et événements ---------- */
function render() {
  if (!S.moi) return;
  const v = { accueil: vAccueil, biens: vBiens, locataires: vLocataires, messages: vMessages, finances: vFinances }[S.view] || vAccueil;
  $('#app').innerHTML = v();
  const tabs = [['accueil', 'Accueil'], ['biens', 'Biens'], ['locataires', 'Locataires'], ['encaisser', 'Encaisser'], ['finances', 'Finances'], ['messages', 'Messages']].filter(([k]) => !(k === 'encaisser' && estLect()));
  $('#tabs').hidden = false;
  $('#tabs>div').innerHTML = `<div class="brand"><span class="logo">PN</span><span><b>${esc(S.recu?.nom || 'Patrimoine NIN NIN')}</b><span class="small muted">${esc(S.moi.nom)} · ${esc(S.moi.role)}</span></span></div>` + tabs.map(([k, t]) => `<button class="tab ${k === 'encaisser' ? 'cta' : ''}" data-v="${k}" ${S.view === k ? 'aria-current="page"' : ''}><span class="ic">${svg(k)}</span>${t}</button>`).join('');
  $$('.tab').forEach(b => b.onclick = () => { if (b.dataset.v === 'encaisser') return fEncaisser(); S.view = b.dataset.v; S.convo = null; render(); scrollTo(0, 0); });
  const on = (sel, fn) => $$(sel).forEach(b => b.onclick = () => fn(b));
  if ($('#bell')) $('#bell').onclick = fNotifs;
  if ($('#reglages')) $('#reglages').onclick = fReglages;
  on('#app [data-loc]', b => fLoc(b.dataset.loc));
  on('#app [data-rec]', b => fRecu(b.dataset.rec));
  on('#app [data-bien]', b => fBien(b.dataset.bien));
  on('#app [data-terrain]', b => fTerrain(b.dataset.terrain));
  on('#app [data-addbien]', b => fBien(null, b.dataset.addbien));
  on('#app [data-tf]', b => { S.terrainF = b.dataset.tf; render(); });
  on('#app [data-tf2]', b => { S.terrainF = b.dataset.tf2; S.view = 'biens'; render(); });
  on('#app [data-dep]', b => fBon(b.dataset.dep));
  on('#app [data-dem]', b => fDemarche(b.dataset.dem));
  on('#app [data-f]', b => { S.filtre = b.dataset.f; render(); });
  on('#app [data-fin]', b => { S.fin = b.dataset.fin; S.view = 'finances'; render(); });
  on('#app [data-go]', b => { S.view = b.dataset.go; render(); if (b.dataset.go === 'biens') fBien(); });
  on('#app [data-conv]', b => { S.convo = b.dataset.conv; render(); scrollTo(0, document.body.scrollHeight); });
  on('#app [data-act]', b => ({ encaisser: () => fEncaisser(), depense: () => fDepense(), demarche: () => fDemarche(), bien: () => fBien(), locataire: () => fLocataire(), reglages: fReglages, regles: fRegles, heritier: () => fHeritier(), repartition: fRepartition, document: fDocument, reunion: fReunion, terrain: () => fTerrain() })[b.dataset.act]());
  on('#app [data-her]', b => fHeritier(b.dataset.her));
  on('#app [data-dist]', b => fDistribution(b.dataset.dist));
  on('#app [data-doc]', b => fVoirDocument(b.dataset.doc));
  on('#app [data-exp]', b => ({ xlsx: exportXLSX, mois: () => bilanPDF(false), an: () => bilanPDF(true) })[b.dataset.exp]());
  on('#app [data-remise]', async b => { b.disabled = true; try { await q(sb.from('remises').insert({ montant: parseInt(b.dataset.remise, 10), par: S.moi.id })); await charger('remises'); render(); toast('Remise enregistrée, en attente de confirmation'); } catch (e) { b.disabled = false; toast(msgErreur(e)); } });
  on('#app [data-recu]', async b => { b.disabled = true; try { await q(sb.from('remises').update({ recu: true, recu_par: S.moi.id, recu_at: new Date().toISOString() }).eq('id', b.dataset.recu)); await charger('remises'); render(); toast('Réception confirmée'); } catch (e) { b.disabled = false; toast(msgErreur(e)); } });
  if ($('#q')) $('#q').oninput = e => { S.q = e.target.value; $('#ll').innerHTML = listeLoc(); on('#ll [data-loc]', b => fLoc(b.dataset.loc)); };
  if ($('#back')) $('#back').onclick = () => { S.convo = null; render(); };
  if ($('#mf')) $('#mf').onsubmit = async e => { e.preventDefault(); const t = $('#mt').value.trim(); if (!t) return; $('#mt').value = '';
    try { const m = await q(sb.from('messages').insert({ de: S.moi.id, a: S.convo, texte: t }).select().single()); if (!S.messages.find(x => x.id === m.id)) S.messages.push(m); render(); $('#mt').focus(); scrollTo(0, document.body.scrollHeight); }
    catch (x) { toast(msgErreur(x)); $('#mt').value = t; } };
}

/* ---------- Réseau, service worker, session ---------- */
const majReseau = () => { $('#offline').hidden = navigator.onLine; };
addEventListener('online', () => { majReseau(); if (S.moi) charger().then(render).catch(() => {}); });
addEventListener('offline', majReseau);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.moi) charger().then(render).catch(() => {}); });
sb.auth.onAuthStateChange((ev, session) => { if (ev === 'SIGNED_OUT' && S.moi) { S.moi = null; ecranConnexion(); } if (session) S.session = session; });
addEventListener('hashchange', () => { if (location.hash.startsWith('#verifier/')) vVerifier(); });
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
majReseau();
demarrer();
