import { useState, useEffect, useCallback } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  onSnapshot,
  addDoc,
  setDoc,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";

// ─── FIREBASE CONFIG ─────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyAYMWuMkD4DAEyWD2TD3G4yuzoq5ZhEEzw",
  authDomain: "techfusion1-48c57.firebaseapp.com",
  projectId: "techfusion1-48c57",
  storageBucket: "techfusion1-48c57.firebasestorage.app",
  messagingSenderId: "138369541636",
  appId: "1:138369541636:web:c5fa9620cef7ec93fe7751",
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ─── LOGO SVG ────────────────────────────────────────────────────────────────
const TechFusionLogo = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M 52 128 A 55 55 0 0 0 148 128" stroke="#e02020" strokeWidth="14" strokeLinecap="round" fill="none"/>
    <path d="M 46 103 A 55 55 0 0 1 149 85" stroke="#e02020" strokeWidth="14" strokeLinecap="round" fill="none"/>
    <line x1="20" y1="110" x2="72" y2="110" stroke="#e02020" strokeWidth="14" strokeLinecap="round"/>
    <circle cx="20" cy="110" r="9" fill="#e02020"/>
    <line x1="128" y1="110" x2="180" y2="110" stroke="#e02020" strokeWidth="14" strokeLinecap="round"/>
    <circle cx="180" cy="110" r="9" fill="#e02020"/>
    <line x1="95" y1="85" x2="152" y2="85" stroke="#e02020" strokeWidth="14" strokeLinecap="round"/>
    <circle cx="95" cy="85" r="9" fill="#e02020"/>
    <line x1="112" y1="65" x2="132" y2="65" stroke="#e02020" strokeWidth="14" strokeLinecap="round"/>
  </svg>
);

const TechFusionLogoSmall = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M 52 128 A 55 55 0 0 0 148 128" stroke="#e02020" strokeWidth="14" strokeLinecap="round" fill="none"/>
    <path d="M 46 103 A 55 55 0 0 1 149 85" stroke="#e02020" strokeWidth="14" strokeLinecap="round" fill="none"/>
    <line x1="20" y1="110" x2="72" y2="110" stroke="#e02020" strokeWidth="14" strokeLinecap="round"/>
    <circle cx="20" cy="110" r="9" fill="#e02020"/>
    <line x1="128" y1="110" x2="180" y2="110" stroke="#e02020" strokeWidth="14" strokeLinecap="round"/>
    <circle cx="180" cy="110" r="9" fill="#e02020"/>
    <line x1="95" y1="85" x2="152" y2="85" stroke="#e02020" strokeWidth="14" strokeLinecap="round"/>
    <circle cx="95" cy="85" r="9" fill="#e02020"/>
    <line x1="112" y1="65" x2="132" y2="65" stroke="#e02020" strokeWidth="14" strokeLinecap="round"/>
  </svg>
);

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const now     = () => new Date().toISOString().slice(0, 16).replace("T", " ");
const today   = () => new Date().toISOString().slice(0, 10);
const daysUntil = (d) => {
  if (!d) return 9999;
  const diff = new Date(d) - new Date(today());
  return Math.ceil(diff / 86400000);
};
const fmtDate = (d) => {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

const MOIS_NOMS = ["Janvier","Fevrier","Mars","Avril","Mai","Juin","Juillet","Aout","Septembre","Octobre","Novembre","Decembre"];
const getMoisAnneeLabel = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  return `${MOIS_NOMS[dt.getMonth()]} ${dt.getFullYear()}`;
};

// ─── STATUT CONFIG ───────────────────────────────────────────────────────────
const STATUT_CONFIG = {
  "Actif":      { bg: "rgba(16,185,129,.12)", color: "#10b981", border: "rgba(16,185,129,.3)",  ico: "✅" },
  "Inactif":    { bg: "rgba(239,68,68,.12)",  color: "#ef4444", border: "rgba(239,68,68,.3)",   ico: "🚫" },
  "En attente": { bg: "rgba(245,158,11,.12)", color: "#f59e0b", border: "rgba(245,158,11,.3)",  ico: "⏳" },
};

const getRappelInfo = (s) => {
  if (s.statut !== "Actif") return null;
  const j = daysUntil(s.dateFin);
  if (j === 0) return { label: "Expire aujourd'hui", color: "#ef4444", bg: "rgba(239,68,68,.12)", border: "rgba(239,68,68,.3)", urgence: 3 };
  if (j <= 3)  return { label: `J-${j} avant expiration`, color: "#ef4444", bg: "rgba(239,68,68,.1)", border: "rgba(239,68,68,.25)", urgence: 2 };
  if (j <= 7)  return { label: `J-${j} avant expiration`, color: "#fb923c", bg: "rgba(251,146,60,.1)", border: "rgba(251,146,60,.25)", urgence: 1 };
  return null;
};

// ─── TARIFS PAR SERVICE ──────────────────────────────────────────────────────
const TARIFS = {
  "Netflix":     2500,
  "ChatGPT":     2000,
  "Prime":       2000,
  "Spotify":     2000,
  "CapCut":      3000,
  "Crunchyroll": 3000,
};
const getTarif = (service) => {
  if (!service) return 0;
  const key = Object.keys(TARIFS).find(k => service.toLowerCase().includes(k.toLowerCase()));
  return key ? TARIFS[key] : 0;
};

// Firestore schema V10:
// services/{id}    → { nom, createdBy, createdAt }
// emails/{id}      → { serviceId, adresse, createdBy, createdAt }
// subscribers/{id} → { emailId, nom, mois, prix, net, dateAbonnement, dateFin, statut, service }
// transactions/{id}, depenses/{id}, logs/{id}, history/{id}  (identiques v9)

export default function TechFusion() {
  // ── Auth state ──────────────────────────────────────────────────────────────
  const [screen, setScreen]           = useState("loading");
  const [loginEmail, setLoginEmail]   = useState("");
  const [loginPwd, setLoginPwd]       = useState("");
  const [showPwd, setShowPwd]         = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent]   = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [authErr, setAuthErr]         = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // ── Firestore data ──────────────────────────────────────────────────────────
  const [services, setServices]       = useState([]);
  const [emails, setEmails]           = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [depenses, setDepenses]       = useState([]);
  const [logs, setLogs]               = useState([]);
  const [history, setHistory]         = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [dbReady, setDbReady]         = useState(false);

  // ── App UI state ────────────────────────────────────────────────────────────
  const [page, setPage]               = useState("accueil");
  const [openService, setOpenService] = useState(null); // serviceId
  const [openEmail, setOpenEmail]     = useState(null); // emailId
  const [toast, setToast]             = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // ── Recherche ───────────────────────────────────────────────────────────────
  const [rechercheDebut, setRechercheDebut]   = useState("");
  const [rechercheFin, setRechercheFin]       = useState("");
  const [rechercheQuery, setRechercheQuery]   = useState("");
  const [rechercheStatut, setRechercheStatut] = useState("Tous");

  // ── Historique ───────────────────────────────────────────────────────────────
  const [histMoisSelIdx, setHistMoisSelIdx]     = useState(null);
  const [histDropdownOpen, setHistDropdownOpen] = useState(false);

  // ── Rappels ──────────────────────────────────────────────────────────────────
  const [expandedSub, setExpandedSub]         = useState(null);
  const [renewModalSubId, setRenewModalSubId] = useState(null);
  const [renewMois, setRenewMois]             = useState("");
  const [renewPrixOverride, setRenewPrixOverride] = useState("");
  const [renewNetOverride, setRenewNetOverride]   = useState("");
  const [renewDateFinOverride, setRenewDateFinOverride] = useState("");

  // ── Modals ───────────────────────────────────────────────────────────────────
  const [showNewService, setShowNewService]   = useState(false);
  const [newServiceNom, setNewServiceNom]     = useState("");
  const [showNewEmail, setShowNewEmail]       = useState(false);
  const [newEmailAdresse, setNewEmailAdresse] = useState("");
  const [showAddSub, setShowAddSub]           = useState(false);
  const [showMoveSub, setShowMoveSub]         = useState(false);
  const [movingSubId, setMovingSubId]         = useState(null);
  const [moveTargetEmailId, setMoveTargetEmailId] = useState("");
  const [showAddDep, setShowAddDep]           = useState(false);
  const [showDelHist, setShowDelHist]         = useState(false);
  const [newSub, setNewSub] = useState({ nom: "", mois: "", prix: "", statut: "Actif" });
  const [newDep, setNewDep] = useState({ date: "", montant: "", service: "", motif: "" });

  // ── Firebase Auth listener ───────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const snap = await getDoc(doc(db, "admins", user.uid));
          if (snap.exists()) {
            setCurrentAdmin({ uid: user.uid, ...snap.data() });
            setScreen("app");
            setPage("accueil");
          } else {
            await signOut(auth);
            setScreen("login");
            setAuthErr("Compte non autorisé.");
          }
        } catch (e) {
          setScreen("login");
          setAuthErr("Erreur de connexion à la base de données.");
        }
      } else {
        setCurrentAdmin(null);
        setScreen("login");
      }
    });
    return unsub;
  }, []);

  // ── Firestore listeners ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentAdmin) return;
    const unsubs = [];

    unsubs.push(onSnapshot(collection(db, "services"), snap => {
      setServices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }));

    unsubs.push(onSnapshot(collection(db, "emails"), snap => {
      setEmails(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }));

    unsubs.push(onSnapshot(collection(db, "subscribers"), snap => {
      setSubscribers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }));

    unsubs.push(onSnapshot(collection(db, "depenses"), snap => {
      setDepenses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }));

    unsubs.push(onSnapshot(collection(db, "logs"), snap => {
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      arr.sort((a, b) => (b.date + b.heure).localeCompare(a.date + a.heure));
      setLogs(arr);
    }));

    unsubs.push(onSnapshot(collection(db, "history"), snap => {
      setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }));

    unsubs.push(onSnapshot(collection(db, "transactions"), snap => {
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      arr.sort((a, b) => (b.datePaiement || "").localeCompare(a.datePaiement || ""));
      setTransactions(arr);
    }));

    setDbReady(true);
    return () => unsubs.forEach(u => u());
  }, [currentAdmin]);

  // ── Auto-expiry (toutes les minutes) ────────────────────────────────────────
  useEffect(() => {
    if (!currentAdmin || !dbReady) return;
    const checkExpiry = async () => {
      const todayStr = today();
      for (const s of subscribers) {
        if (s.statut === "Actif" && s.dateFin && s.dateFin < todayStr) {
          await updateDoc(doc(db, "subscribers", s.id), { statut: "Inactif", expiredAuto: true });
        }
      }
    };
    checkExpiry();
    const scheduleMidnight = () => {
      const now2 = new Date();
      const nextMidnight = new Date(now2);
      nextMidnight.setHours(23, 59, 55, 0);
      if (nextMidnight <= now2) nextMidnight.setDate(nextMidnight.getDate() + 1);
      return setTimeout(() => { checkExpiry(); scheduleMidnight(); }, nextMidnight - now2);
    };
    const midnightTimer = scheduleMidnight();
    const interval = setInterval(checkExpiry, 60000);
    return () => { clearInterval(interval); clearTimeout(midnightTimer); };
  }, [currentAdmin, dbReady, subscribers]);

  // ── Toast ────────────────────────────────────────────────────────────────────
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Log helper ───────────────────────────────────────────────────────────────
  const addLog = useCallback(async (action) => {
    const d = new Date();
    try {
      await addDoc(collection(db, "logs"), {
        admin: currentAdmin?.name || "Systeme",
        adminColor: currentAdmin?.color || "#3d5070",
        action,
        date: d.toISOString().slice(0, 10),
        heure: d.toTimeString().slice(0, 5),
      });
    } catch (e) { console.error("Log error:", e); }
  }, [currentAdmin]);

  // ── AUTH ─────────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginPwd) return setAuthErr("Remplissez tous les champs.");
    setAuthLoading(true); setAuthErr("");
    try {
      await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPwd);
    } catch (e) {
      const msg = e.code === "auth/invalid-credential" || e.code === "auth/wrong-password" || e.code === "auth/user-not-found"
        ? "Email ou mot de passe incorrect."
        : e.code === "auth/too-many-requests"
        ? "Trop de tentatives. Réessayez plus tard."
        : "Erreur de connexion.";
      setAuthErr(msg);
    } finally { setAuthLoading(false); }
  };

  const handleForgot = async () => {
    if (!forgotEmail.trim()) return setAuthErr("Entrez votre email.");
    setAuthLoading(true); setAuthErr("");
    try {
      await sendPasswordResetEmail(auth, forgotEmail.trim());
      setForgotSent(true);
    } catch (e) {
      setAuthErr("Email introuvable ou erreur Firebase.");
    } finally { setAuthLoading(false); }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentAdmin(null);
    setLoginEmail(""); setLoginPwd("");
    setShowUserMenu(false);
    setDbReady(false);
  };

  // ── SERVICES CRUD ────────────────────────────────────────────────────────────
  const createService = async () => {
    if (!newServiceNom.trim()) return showToast("Nom requis", "error");
    try {
      await addDoc(collection(db, "services"), {
        nom: newServiceNom.trim(),
        createdBy: currentAdmin.name,
        createdAt: now(),
      });
      await addLog(`A cree le service "${newServiceNom.trim()}"`);
      setNewServiceNom(""); setShowNewService(false);
      showToast(`Service "${newServiceNom.trim()}" créé !`);
    } catch (e) { showToast("Erreur Firestore", "error"); }
  };

  const deleteService = async (id) => {
    const svc = services.find(x => x.id === id);
    try {
      // Supprimer emails liés + leurs abonnés
      const linkedEmails = emails.filter(e => e.serviceId === id);
      for (const em of linkedEmails) {
        for (const s of subscribers.filter(x => x.emailId === em.id)) {
          await deleteDoc(doc(db, "subscribers", s.id));
        }
        await deleteDoc(doc(db, "emails", em.id));
      }
      await deleteDoc(doc(db, "services", id));
      if (openService === id) { setOpenService(null); setOpenEmail(null); }
      await addLog(`A supprime le service "${svc?.nom}"`);
      showToast("Service supprimé", "error");
    } catch (e) { showToast("Erreur Firestore", "error"); }
  };

  // ── EMAILS CRUD ──────────────────────────────────────────────────────────────
  const createEmail = async () => {
    if (!newEmailAdresse.trim()) return showToast("Adresse requise", "error");
    try {
      await addDoc(collection(db, "emails"), {
        serviceId: openService,
        adresse: newEmailAdresse.trim(),
        createdBy: currentAdmin.name,
        createdAt: now(),
      });
      await addLog(`A cree l'email "${newEmailAdresse.trim()}"`);
      setNewEmailAdresse(""); setShowNewEmail(false);
      showToast("Email ajouté !");
    } catch (e) { showToast("Erreur Firestore", "error"); }
  };

  const deleteEmail = async (id) => {
    const em = emails.find(x => x.id === id);
    try {
      for (const s of subscribers.filter(x => x.emailId === id)) {
        await deleteDoc(doc(db, "subscribers", s.id));
      }
      await deleteDoc(doc(db, "emails", id));
      if (openEmail === id) setOpenEmail(null);
      await addLog(`A supprime l'email "${em?.adresse}"`);
      showToast("Email supprimé", "error");
    } catch (e) { showToast("Erreur Firestore", "error"); }
  };

  // ── SUBSCRIBER CRUD ──────────────────────────────────────────────────────────
  const addSubscriber = async () => {
    if (!newSub.nom.trim()) return showToast("Nom requis", "error");
    if (!newSub.mois || parseInt(newSub.mois) < 1) return showToast("Nombre de mois requis", "error");

    const currentEmailObj = emails.find(e => e.id === openEmail);
    const currentServiceObj = services.find(s => s.id === openService);
    const serviceNom = currentServiceObj?.nom || "";

    const moisNum    = parseInt(newSub.mois);
    const tarif      = getTarif(serviceNom);
    const dateAbo    = today();
    const dateFinObj = new Date(dateAbo);
    dateFinObj.setMonth(dateFinObj.getMonth() + moisNum);
    const dateFin    = dateFinObj.toISOString().slice(0, 10);
    const prixCalc   = tarif * moisNum;
    const prixFinal  = newSub.prix !== "" ? parseFloat(newSub.prix) || 0 : prixCalc;

    // Vérifier doublon dans le même email
    const dup = subscribers.find(s =>
      s.emailId === openEmail &&
      s.nom.trim().toLowerCase() === newSub.nom.trim().toLowerCase()
    );
    if (dup) return showToast(`Doublon : ${dup.nom} existe déjà dans cet email`, "error");

    const subData = {
      emailId:        openEmail,
      service:        serviceNom,
      nom:            newSub.nom.trim(),
      mois:           moisNum,
      prix:           prixFinal,
      net:            prixFinal,
      dateAbonnement: dateAbo,
      dateFin:        dateFin,
      statut:         newSub.statut,
    };

    try {
      const docRef = await addDoc(collection(db, "subscribers"), subData);
      if (subData.statut !== "En attente") {
        await addDoc(collection(db, "transactions"), {
          abonneId:    docRef.id,
          nom:         subData.nom,
          service:     serviceNom,
          email:       currentEmailObj?.adresse || "",
          montant:     prixFinal,
          datePaiement: dateAbo,
          type:        "inscription",
        });
      }
      await addLog(`A ajoute l'abonne "${subData.nom}" [${subData.statut}]`);
      setNewSub({ nom: "", mois: "", prix: "", statut: "Actif" });
      setShowAddSub(false);
      showToast("Abonné ajouté !");
    } catch (e) { showToast("Erreur Firestore", "error"); }
  };

  const deleteSubscriber = async (id) => {
    const s = subscribers.find(x => x.id === id);
    try {
      await deleteDoc(doc(db, "subscribers", id));
      await addLog(`A supprime l'abonne "${s?.nom}"`);
      showToast("Abonné supprimé", "error");
    } catch (e) { showToast("Erreur Firestore", "error"); }
  };

  const toggleStatut = async (id, forceTo) => {
    const s = subscribers.find(x => x.id === id);
    let nxt = forceTo || (s.statut === "Actif" ? "Inactif" : s.statut === "Inactif" ? "Actif" : "Actif");
    try {
      await updateDoc(doc(db, "subscribers", id), { statut: nxt, expiredAuto: false });
      await addLog(`A change statut "${s?.nom}" -> ${nxt}`);
      showToast(`Statut → ${nxt}`);
    } catch (e) { showToast("Erreur Firestore", "error"); }
  };

  // Spec 1 — Déplacer : vers un autre email, bloqué si même nom existe déjà
  const moveSubscriber = async () => {
    if (!moveTargetEmailId) return showToast("Choisir un email de destination", "error");
    const s = subscribers.find(x => x.id === movingSubId);
    const targetEmail = emails.find(e => e.id === moveTargetEmailId);
    const targetService = services.find(sv => sv.id === targetEmail?.serviceId);

    const dup = subscribers.find(x =>
      x.id !== movingSubId &&
      x.emailId === moveTargetEmailId &&
      x.nom.trim().toLowerCase() === (s?.nom || "").trim().toLowerCase()
    );
    if (dup) return showToast(`Doublon : ${dup.nom} existe déjà dans "${targetEmail?.adresse}"`, "error");

    try {
      await updateDoc(doc(db, "subscribers", movingSubId), {
        emailId: moveTargetEmailId,
        service: targetService?.nom || s?.service || "",
      });
      const txs = transactions.filter(t => t.abonneId === movingSubId);
      for (const tx of txs) {
        await updateDoc(doc(db, "transactions", tx.id), { email: targetEmail?.adresse || "" });
      }
      await addLog(`A deplace "${s?.nom}" vers "${targetEmail?.adresse}"`);
      setShowMoveSub(false); setMovingSubId(null); setMoveTargetEmailId("");
      showToast("Abonné déplacé !");
    } catch (e) { showToast("Erreur Firestore", "error"); }
  };

  // Renouvellement
  const renewSubscriber = (id) => { setRenewModalSubId(id); setRenewMois(""); setRenewPrixOverride(""); setRenewNetOverride(""); setRenewDateFinOverride(""); };

  const confirmRenew = async () => {
    const id = renewModalSubId;
    const s = subscribers.find(x => x.id === id);
    if (!s) return;
    const moisAdd = parseInt(renewMois) || 0;
    if (moisAdd <= 0) return showToast("Nombre de mois invalide", "error");

    const tarif     = getTarif(s.service);
    const newDateAbo = today();
    const finObj    = new Date(newDateAbo);
    finObj.setMonth(finObj.getMonth() + moisAdd);
    const newFinAuto = finObj.toISOString().slice(0, 10);
    const newFin    = renewDateFinOverride || newFinAuto;
    const prixCalc  = tarif * moisAdd;
    const netCalc   = prixCalc;
    const prixFinal = renewPrixOverride !== "" ? parseFloat(renewPrixOverride) || 0 : prixCalc;
    const netFinal  = renewNetOverride  !== "" ? parseFloat(renewNetOverride)  || 0 : netCalc;

    try {
      await updateDoc(doc(db, "subscribers", id), {
        dateFin:        newFin,
        dateAbonnement: newDateAbo,
        mois:           moisAdd,
        prix:           prixFinal,
        net:            netFinal,
        statut:         "Actif",
        expiredAuto:    false,
      });
      const em = emails.find(e => e.id === s.emailId);
      await addDoc(collection(db, "transactions"), {
        abonneId:    id,
        nom:         s.nom,
        service:     s.service || "",
        email:       em?.adresse || "",
        montant:     netFinal,
        datePaiement: newDateAbo,
        type:        "renouvellement",
      });
      await addLog(`A renouvele l'abonnement de "${s.nom}" (${moisAdd} mois) jusqu'au ${fmtDate(newFin)}`);
      showToast(`✅ ${s.nom} renouvelé jusqu'au ${fmtDate(newFin)} — ${netFinal.toLocaleString()} FCFA`);
      setRenewModalSubId(null); setRenewMois(""); setRenewPrixOverride(""); setRenewNetOverride(""); setRenewDateFinOverride("");
    } catch (e) { showToast("Erreur Firestore", "error"); }
  };

  // Supprimer depuis Rappels = delete Firestore
  const deleteFromRappels = async (id) => {
    const s = subscribers.find(x => x.id === id);
    try {
      await deleteDoc(doc(db, "subscribers", id));
      await addLog(`Suppression depuis Rappels : "${s?.nom}" (historique paiements conserve)`);
      showToast(`${s?.nom} supprimé.`, "error");
    } catch (e) { showToast("Erreur Firestore", "error"); }
  };

  // ── DEPENSES ─────────────────────────────────────────────────────────────────
  const addDepense = async () => {
    if (!newDep.date || !newDep.montant) return showToast("Date et montant requis", "error");
    try {
      await addDoc(collection(db, "depenses"), { ...newDep, montant: +newDep.montant, admin: currentAdmin.name });
      await addLog(`A enregistre une depense de ${(+newDep.montant).toLocaleString()} FCFA (${newDep.service})`);
      setNewDep({ date: "", montant: "", service: "", motif: "" });
      setShowAddDep(false);
      showToast("Dépense enregistrée !");
    } catch (e) { showToast("Erreur Firestore", "error"); }
  };

  const deleteDepense = async (id, service) => {
    try {
      await deleteDoc(doc(db, "depenses", id));
      await addLog(`A supprime une depense (${service})`);
      showToast("Dépense supprimée", "error");
    } catch (e) { showToast("Erreur Firestore", "error"); }
  };

  // ── HISTORY ──────────────────────────────────────────────────────────────────
  const deleteHistoryItem = async (id) => {
    try {
      await deleteDoc(doc(db, "history", id));
      await addLog("A supprime un enregistrement d'historique");
      showToast("Historique supprimé", "error");
    } catch (e) { showToast("Erreur Firestore", "error"); }
  };

  const clearHistory = async () => {
    try {
      for (const h of history) await deleteDoc(doc(db, "history", h.id));
      await addLog("A efface tout l'historique");
      setShowDelHist(false);
      showToast("Historique effacé", "error");
    } catch (e) { showToast("Erreur Firestore", "error"); }
  };

  // ── LOGS ─────────────────────────────────────────────────────────────────────
  const clearLogs = async () => {
    try {
      for (const l of logs) await deleteDoc(doc(db, "logs", l.id));
      showToast("Journal effacé", "error");
    } catch (e) { showToast("Erreur Firestore", "error"); }
  };

  // ── Derived ──────────────────────────────────────────────────────────────────
  const totalDep     = depenses.reduce((s, d) => s + d.montant, 0);
  const totalRev     = transactions.reduce((s, t) => s + (t.montant || 0), 0);
  const capital      = totalRev - totalDep;
  const enAttente    = subscribers.filter(s => s.statut === "En attente");
  const expiringSoon = subscribers.filter(s => s.statut === "Actif" && daysUntil(s.dateFin) <= 7 && daysUntil(s.dateFin) >= 0);

  const rappelsJ0      = subscribers.filter(s => s.statut === "Actif" && daysUntil(s.dateFin) === 0);
  const rappelsJ3      = subscribers.filter(s => s.statut === "Actif" && daysUntil(s.dateFin) >= 1 && daysUntil(s.dateFin) <= 3);
  const rappelsJ7      = subscribers.filter(s => s.statut === "Actif" && daysUntil(s.dateFin) >= 4 && daysUntil(s.dateFin) <= 7);
  const rappelsUrgents = subscribers.filter(s => s.statut === "Actif" && daysUntil(s.dateFin) >= 0 && daysUntil(s.dateFin) <= 3);
  const rappelsActifs  = subscribers.filter(s => s.statut === "Actif" && daysUntil(s.dateFin) >= 0 && daysUntil(s.dateFin) <= 7);
  // Inactifs dont la dateFin est dépassée depuis > 3 jours → "Non renouvelé"
  const nonRenouveles  = subscribers.filter(s => s.statut === "Inactif" && s.dateFin && daysUntil(s.dateFin) < -3 && daysUntil(s.dateFin) >= -30);

  // Emails du service ouvert
  const serviceEmails = emails.filter(e => e.serviceId === openService);
  // Abonnés de l'email ouvert
  const emailSubs = subscribers.filter(s => s.emailId === openEmail);
  const currentEmailObj   = emails.find(e => e.id === openEmail);
  const currentServiceObj = services.find(s => s.id === openService);

  // ─── STYLES ──────────────────────────────────────────────────────────────────
  const S = {
    root:    { fontFamily: "system-ui,sans-serif", background: "#060a14", minHeight: "100vh", color: "#dde3f0" },
    main:    { flex: 1, padding: "20px 16px", overflowY: "auto" },
    card:    { background: "linear-gradient(145deg, #0f1525 0%, #111a2e 100%)", border: "1px solid #141d2e", borderRadius: 14, padding: 20 },
    btn:     (c = "#e02020") => ({ background: `linear-gradient(135deg, ${c}, ${c}cc)`, color: "#fff", border: "none", borderRadius: 9, padding: "9px 18px", cursor: "pointer", fontFamily: "system-ui,sans-serif", fontWeight: 600, fontSize: 13, transition: "all .2s" }),
    ghost:   { background: "transparent", color: "#64748b", border: "1px solid #141d2e", borderRadius: 9, padding: "9px 18px", cursor: "pointer", fontFamily: "system-ui,sans-serif", fontSize: 13 },
    danger:  { background: "rgba(239,68,68,.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,.25)", borderRadius: 9, padding: "7px 14px", cursor: "pointer", fontFamily: "system-ui,sans-serif", fontSize: 12, fontWeight: 600 },
    input:   { background: "#0a0f1e", border: "1px solid #141d2e", borderRadius: 9, padding: "10px 13px", color: "#dde3f0", fontFamily: "system-ui,sans-serif", fontSize: 13, width: "100%", outline: "none" },
    label:   { fontSize: 10, color: "#3d5070", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 5 },
    modalBg: { position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(5px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
    modal:   { background: "#0f1525", border: "1px solid #141d2e", borderRadius: 18, padding: 26, width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto" },
    thStyle: { textAlign: "left", padding: "7px 12px", color: "#3d5070", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 },
    tdStyle: { padding: "10px 12px", borderTop: "1px solid #0e1626", fontSize: 13 },
    pill:    (cfg) => ({ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }),
  };

  const StatutBadge = ({ statut }) => {
    const cfg = STATUT_CONFIG[statut] || STATUT_CONFIG["Inactif"];
    return <span style={S.pill(cfg)}>{cfg.ico} {statut}</span>;
  };

  // ══════════════════════════════════════════════════════════════════════════
  // LOADING
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === "loading") {
    return (
      <div style={{ ...S.root, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <TechFusionLogo size={60} />
        <div style={{ color: "#3d5070", fontSize: 14, fontWeight: 600 }}>Connexion en cours...</div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // AUTH SCREENS
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === "login" || screen === "forgot") {
    return (
      <div style={{ ...S.root, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{`*{box-sizing:border-box;margin:0;padding:0;} input::placeholder{color:#2a3a52}`}</style>
        <div style={{ width: 380 }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
              <TechFusionLogo size={72} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.5px" }}>Tech Fusion</div>
            <div style={{ fontSize: 12, color: "#3d5070", marginTop: 4 }}>Gestion d'abonnements digitaux</div>
          </div>

          <div style={{ ...S.card, padding: 28 }}>
            {screen === "login" ? (
              <>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#dde3f0", marginBottom: 20 }}>Connexion administrateur</div>
                {authErr && (
                  <div style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", borderRadius: 9, padding: "10px 14px", color: "#ef4444", fontSize: 12, marginBottom: 14 }}>{authErr}</div>
                )}
                <div style={{ marginBottom: 14 }}>
                  <label style={S.label}>Adresse email</label>
                  <input style={S.input} type="email" placeholder="admin@techfusion.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} />
                </div>
                <div style={{ marginBottom: 6 }}>
                  <label style={S.label}>Mot de passe</label>
                  <div style={{ position: "relative" }}>
                    <input style={{ ...S.input, paddingRight: 44 }} type={showPwd ? "text" : "password"} placeholder="••••••••" value={loginPwd} onChange={e => setLoginPwd(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} />
                    <button onClick={() => setShowPwd(!showPwd)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#3d5070", fontSize: 15 }}>{showPwd ? "🙈" : "👁️"}</button>
                  </div>
                </div>
                <div style={{ textAlign: "right", marginBottom: 20 }}>
                  <span onClick={() => { setScreen("forgot"); setAuthErr(""); setForgotSent(false); setForgotEmail(""); }} style={{ fontSize: 12, color: "#e02020", cursor: "pointer", fontWeight: 600 }}>Mot de passe oublié ?</span>
                </div>
                <button style={{ ...S.btn(), width: "100%", padding: "12px", fontSize: 14, opacity: authLoading ? 0.6 : 1 }} onClick={handleLogin} disabled={authLoading}>
                  {authLoading ? "Connexion..." : "Se connecter"}
                </button>
              </>
            ) : (
              <>
                <button onClick={() => { setScreen("login"); setAuthErr(""); setForgotSent(false); setForgotEmail(""); }} style={{ background: "none", border: "none", color: "#3d5070", cursor: "pointer", fontSize: 13, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>← Retour</button>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#dde3f0", marginBottom: 8 }}>Récupération de compte</div>
                {!forgotSent ? (
                  <>
                    {authErr && <div style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", borderRadius: 9, padding: "10px 14px", color: "#ef4444", fontSize: 12, marginBottom: 14 }}>{authErr}</div>}
                    <p style={{ fontSize: 12, color: "#3d5070", marginBottom: 14, lineHeight: 1.6 }}>Un email de réinitialisation sera envoyé à votre adresse.</p>
                    <div style={{ marginBottom: 18 }}>
                      <label style={S.label}>Email</label>
                      <input style={S.input} type="email" placeholder="votre@email.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleForgot()} />
                    </div>
                    <button style={{ ...S.btn(), width: "100%", padding: 12, opacity: authLoading ? 0.6 : 1 }} onClick={handleForgot} disabled={authLoading}>
                      {authLoading ? "Envoi..." : "Envoyer le lien"}
                    </button>
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "16px 0" }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>📧</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#10b981", marginBottom: 8 }}>Email envoyé !</div>
                    <p style={{ fontSize: 12, color: "#3d5070", lineHeight: 1.6, marginBottom: 20 }}>
                      Consultez votre boite mail <b style={{ color: "#e02020" }}>{forgotEmail}</b> et suivez le lien pour réinitialiser votre mot de passe.
                    </p>
                    <button style={S.btn()} onClick={() => { setScreen("login"); setForgotSent(false); setForgotEmail(""); }}>Retour connexion</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // APP
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ ...S.root, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0;} ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:#060a14} ::-webkit-scrollbar-thumb{background:#1e2d4a;border-radius:4px} input::placeholder{color:#2a3a52} select option{background:#0a0f1e} table{width:100%;border-collapse:collapse}`}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 999, background: toast.type === "success" ? "rgba(16,185,129,.15)" : "rgba(239,68,68,.15)", border: `1px solid ${toast.type === "success" ? "#10b981" : "#ef4444"}`, borderRadius: 11, padding: "11px 18px", color: toast.type === "success" ? "#10b981" : "#ef4444", fontWeight: 700, fontSize: 13, backdropFilter: "blur(8px)", whiteSpace: "nowrap" }}>{toast.msg}</div>
      )}

      {/* ── TOP HEADER ─────────────────────────────────────────────────────── */}
      <div style={{ background: "#080c17", borderBottom: "1px solid #141d2e", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <TechFusionLogoSmall size={30} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#ffffff", letterSpacing: "-0.3px" }}>TechFusion</div>
            <div style={{ fontSize: 9, color: "#3d5070", fontWeight: 600 }}>ADMIN PANEL</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {(rappelsUrgents.length > 0 || enAttente.length > 0) && (
            <div onClick={() => setPage("rappels")} style={{ background: rappelsUrgents.length > 0 ? "#ef4444" : "#f59e0b", color: "#fff", borderRadius: 20, padding: "2px 9px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>
              {rappelsUrgents.length > 0 ? `🔔 ${rappelsUrgents.length}` : `⏳ ${enAttente.length}`}
            </div>
          )}
          <div style={{ position: "relative" }}>
            <div onClick={() => setShowUserMenu(!showUserMenu)} style={{ width: 32, height: 32, background: `linear-gradient(135deg,${currentAdmin.color || "#e02020"},${(currentAdmin.color || "#e02020")}99)`, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff", cursor: "pointer" }}>{currentAdmin.avatar || currentAdmin.name?.[0] || "A"}</div>
            {showUserMenu && (
              <div style={{ position: "absolute", top: 40, right: 0, background: "#0f1525", border: "1px solid #141d2e", borderRadius: 12, padding: 12, minWidth: 180, zIndex: 200, boxShadow: "0 8px 32px rgba(0,0,0,.5)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#dde3f0", marginBottom: 2 }}>Admin {currentAdmin.name}</div>
                <div style={{ fontSize: 10, color: currentAdmin.role === "super_admin" ? "#f59e0b" : "#10b981", marginBottom: 12 }}>
                  {currentAdmin.role === "super_admin" ? "⭐ Super Admin" : "● Admin"}
                </div>
                <button onClick={handleLogout} style={{ ...S.danger, width: "100%", textAlign: "center", fontSize: 12 }}>🚪 Déconnexion</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ───────────────────────────────────────────────────── */}
      <div style={{ ...S.main, flex: 1, paddingBottom: 80 }}>

        {/* ──────────────────── ACCUEIL ──────────────────── */}
        {page === "accueil" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "#dde3f0", letterSpacing: "-0.5px" }}>Tableau de bord</h1>
              <p style={{ color: "#3d5070", fontSize: 12, marginTop: 3 }}>Bienvenue, Admin {currentAdmin.name}</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ ...S.card, borderColor: "#1e3a5f" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: "#3d5070", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>👥 Abonnés</div>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(37,99,235,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>👥</div>
                </div>
                <div style={{ fontSize: 38, fontWeight: 900, color: "#dde3f0", lineHeight: 1, marginBottom: 10 }}>{subscribers.length}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ background: "rgba(16,185,129,.1)", color: "#10b981", border: "1px solid rgba(16,185,129,.25)", borderRadius: 20, padding: "3px 11px", fontSize: 12, fontWeight: 700 }}>✅ {subscribers.filter(s => s.statut === "Actif").length} actifs</span>
                  {subscribers.filter(s => s.statut === "Inactif").length > 0 && <span style={{ background: "rgba(239,68,68,.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,.25)", borderRadius: 20, padding: "3px 11px", fontSize: 12, fontWeight: 700 }}>🚫 {subscribers.filter(s => s.statut === "Inactif").length} inactifs</span>}
                  {enAttente.length > 0 && <span style={{ background: "rgba(245,158,11,.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,.25)", borderRadius: 20, padding: "3px 11px", fontSize: 12, fontWeight: 700 }}>⏳ {enAttente.length} en attente</span>}
                </div>
              </div>

              <div style={{ ...S.card, borderColor: "#3f1a1a" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: "#3d5070", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>📤 Dépenses totales</div>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(239,68,68,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📤</div>
                </div>
                <div style={{ fontSize: 32, fontWeight: 900, color: "#ef4444", lineHeight: 1, marginBottom: 6 }}>{totalDep.toLocaleString()}</div>
                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 10 }}>FCFA</div>
                <div style={{ fontSize: 12, color: "#475569" }}>{depenses.length} opération{depenses.length > 1 ? "s" : ""}</div>
              </div>

              <div style={{ ...S.card, borderColor: capital >= 0 ? "rgba(16,185,129,.3)" : "rgba(239,68,68,.3)", background: capital >= 0 ? "linear-gradient(145deg,#0a1a12,#0d2018)" : "linear-gradient(145deg,#1a0a0a,#200d0d)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: "#3d5070", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>💎 Capital net</div>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: capital >= 0 ? "rgba(16,185,129,.15)" : "rgba(239,68,68,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>💎</div>
                </div>
                <div style={{ fontSize: 32, fontWeight: 900, color: capital >= 0 ? "#10b981" : "#ef4444", lineHeight: 1, marginBottom: 6 }}>{capital >= 0 ? "+" : ""}{capital.toLocaleString()}</div>
                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 10 }}>FCFA</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "#10b981" }}>↑ Revenus : {totalRev.toLocaleString()} F</span>
                  <span style={{ fontSize: 12, color: "#64748b" }}>·</span>
                  <span style={{ fontSize: 12, color: "#ef4444" }}>↓ {totalDep.toLocaleString()} F</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ──────────────────── RECHERCHE ──────────────────── */}
        {page === "recherche" && (() => {
          const hasFilter = rechercheDebut || rechercheFin || rechercheQuery.trim() || rechercheStatut !== "Tous";

          const txPeriode = (() => {
            if (!rechercheDebut && !rechercheFin) return [];
            return transactions.filter(t => {
              const d = t.datePaiement || "";
              if (rechercheDebut && d < rechercheDebut) return false;
              if (rechercheFin   && d > rechercheFin)   return false;
              return true;
            });
          })();

          const resultats = (() => {
            if (!hasFilter) return [];
            return subscribers.filter(s => {
              const dateRef = s.dateAbonnement || "";
              if (rechercheDebut && dateRef < rechercheDebut) return false;
              if (rechercheFin && dateRef > rechercheFin) return false;
              if (rechercheQuery.trim()) {
                const q = rechercheQuery.toLowerCase();
                if (!(s.nom.toLowerCase().includes(q) || (s.service||"").toLowerCase().includes(q))) return false;
              }
              if (rechercheStatut !== "Tous" && s.statut !== rechercheStatut) return false;
              return true;
            });
          })();

          const abonnesUniqPeriode = rechercheDebut || rechercheFin
            ? [...new Set(txPeriode.map(t => t.abonneId))].length
            : null;
          const argentPeriode = txPeriode.reduce((s, t) => s + (t.montant || 0), 0);

          const setQuickMonth = (monthOffset) => {
            const d = new Date();
            d.setMonth(d.getMonth() + monthOffset);
            const y = d.getFullYear();
            const m = d.getMonth();
            const debut = `${y}-${String(m+1).padStart(2,"0")}-01`;
            const lastDay = new Date(y, m+1, 0).getDate();
            const fin = `${y}-${String(m+1).padStart(2,"0")}-${lastDay}`;
            setRechercheDebut(debut);
            setRechercheFin(fin);
            setRechercheQuery("");
            setRechercheStatut("Tous");
          };

          return (
            <div>
              <div style={{ marginBottom: 18 }}>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: "#dde3f0", marginBottom: 4 }}>🔍 Recherche</h1>
                <p style={{ color: "#3d5070", fontSize: 12 }}>Trouvez vos abonnés par période ou nom</p>
              </div>

              <div style={{ ...S.card, marginBottom: 14 }}>
                <div style={{ marginBottom: 14 }}>
                  <label style={S.label}>Raccourcis rapides</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                    {[{ l: "Ce mois", offset: 0 }, { l: "Mois dernier", offset: -1 }, { l: "Il y a 2 mois", offset: -2 }].map(btn => (
                      <button key={btn.l} onClick={() => setQuickMonth(btn.offset)} style={{ ...S.ghost, fontSize: 12, padding: "6px 14px" }}>{btn.l}</button>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={S.label}>Du</label>
                    <input style={S.input} type="date" value={rechercheDebut} onChange={e => setRechercheDebut(e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={S.label}>Au</label>
                    <input style={S.input} type="date" value={rechercheFin} onChange={e => setRechercheFin(e.target.value)} />
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={S.label}>Statut</label>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 4 }}>
                    {["Tous","Actif","Inactif","En attente"].map(st => (
                      <button key={st} onClick={() => setRechercheStatut(st)} style={{ background: rechercheStatut === st ? "rgba(224,32,32,.12)" : "transparent", border: `1px solid ${rechercheStatut === st ? "rgba(224,32,32,.4)" : "#141d2e"}`, borderRadius: 8, padding: "5px 13px", cursor: "pointer", color: rechercheStatut === st ? "#e02020" : "#3d5070", fontSize: 12, fontWeight: rechercheStatut === st ? 700 : 400, fontFamily: "system-ui,sans-serif" }}>{st}</button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={S.label}>Nom / Service</label>
                  <input style={S.input} type="text" placeholder="Moussa, Netflix..." value={rechercheQuery} onChange={e => setRechercheQuery(e.target.value)} />
                </div>
                <button onClick={() => { setRechercheQuery(""); setRechercheStatut("Tous"); setRechercheDebut(""); setRechercheFin(""); }} style={{ ...S.ghost, fontSize: 12, color: "#ef4444", borderColor: "rgba(239,68,68,.25)" }}>✕ Réinitialiser</button>
              </div>

              {hasFilter ? (
                <div>
                  {(rechercheDebut || rechercheFin) && (
                    <div style={{ ...S.card, marginBottom: 12, background: "linear-gradient(145deg,#0a0f1e,#0d1428)", borderColor: "rgba(96,165,250,.25)" }}>
                      <div style={{ fontSize: 10, color: "#3d5070", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>💰 Bilan de la période</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div style={{ background: "#090e1c", borderRadius: 9, padding: "10px 13px", borderLeft: "2px solid #60a5fa" }}>
                          <div style={{ fontSize: 9, color: "#3d5070", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Paiements reçus</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: "#60a5fa", marginTop: 4 }}>{abonnesUniqPeriode ?? 0}</div>
                          <div style={{ fontSize: 10, color: "#3d5070", marginTop: 2 }}>{txPeriode.length} transaction{txPeriode.length > 1 ? "s" : ""}</div>
                        </div>
                        <div style={{ background: "#090e1c", borderRadius: 9, padding: "10px 13px", borderLeft: "2px solid #10b981" }}>
                          <div style={{ fontSize: 9, color: "#3d5070", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Argent encaissé</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: "#10b981", marginTop: 4 }}>{argentPeriode.toLocaleString()}</div>
                          <div style={{ fontSize: 10, color: "#3d5070", marginTop: 2 }}>FCFA</div>
                        </div>
                      </div>
                      {txPeriode.length > 0 && (
                        <div style={{ marginTop: 12, borderTop: "1px solid #141d2e", paddingTop: 10 }}>
                          <div style={{ fontSize: 10, color: "#3d5070", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 7 }}>Détail transactions</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                            {txPeriode.map(t => (
                              <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", background: "#090e1c", borderRadius: 8, border: "1px solid #141d2e" }}>
                                <div>
                                  <span style={{ fontWeight: 700, fontSize: 12, color: "#dde3f0" }}>{t.nom}</span>
                                  <span style={{ fontSize: 10, color: "#3d5070", marginLeft: 7 }}>{t.service} · {t.email}</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ fontSize: 10, color: t.type === "renouvellement" ? "#7c3aed" : "#10b981", fontWeight: 700, background: t.type === "renouvellement" ? "rgba(124,58,237,.12)" : "rgba(16,185,129,.12)", borderRadius: 20, padding: "2px 8px" }}>{t.type}</span>
                                  <span style={{ fontSize: 12, color: "#10b981", fontWeight: 700 }}>{(t.montant || 0).toLocaleString()} F</span>
                                  <span style={{ fontSize: 10, color: "#3d5070" }}>{fmtDate(t.datePaiement)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {(abonnesUniqPeriode > 0 || resultats.length > 0) ? (
                    <div>
                      <div style={{ ...S.card, marginBottom: 12, background: "linear-gradient(145deg,#0a1a12,#0d2018)", borderColor: "rgba(16,185,129,.25)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                          <div style={{ fontSize: 42, fontWeight: 900, color: "#10b981", lineHeight: 1 }}>{abonnesUniqPeriode ?? resultats.length}</div>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: "#dde3f0" }}>abonné{(abonnesUniqPeriode ?? resultats.length) > 1 ? "s" : ""} sur la période</div>
                            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                              {resultats.length} encore actifs en base
                              {abonnesUniqPeriode !== null && abonnesUniqPeriode > resultats.length && <span style={{ color: "#f59e0b" }}> · {abonnesUniqPeriode - resultats.length} supprimé{abonnesUniqPeriode - resultats.length > 1 ? "s" : ""} (paiements conservés)</span>}
                            </div>
                          </div>
                        </div>
                        {resultats.length > 0 && (
                          <div style={{ borderTop: "1px solid rgba(16,185,129,.15)", paddingTop: 12 }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              {resultats.map((s, i) => {
                                const cfg = STATUT_CONFIG[s.statut] || STATUT_CONFIG["Inactif"];
                                const initials = s.nom.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase();
                                const avatarColor = ["#2563eb","#7c3aed","#10b981","#f59e0b","#ef4444","#ec4899","#06b6d4"][s.id.charCodeAt(1) % 7];
                                const em = emails.find(e => e.id === s.emailId);
                                return (
                                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#090e1c", borderRadius: 10, border: "1px solid #141d2e" }}>
                                    <div style={{ fontSize: 11, color: "#2a3a52", fontWeight: 700, minWidth: 20 }}>{i+1}</div>
                                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg,${avatarColor},${avatarColor}88)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{initials}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                        <span style={{ fontWeight: 700, fontSize: 13, color: "#dde3f0" }}>{s.nom}</span>
                                        <span style={S.pill(cfg)}>{cfg.ico} {s.statut}</span>
                                      </div>
                                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>
                                        {s.service}{em && <span style={{ color: "#3d5070" }}> · {em.adresse}</span>}
                                      </div>
                                    </div>
                                    <div style={{ fontSize: 12, color: "#10b981", fontWeight: 700, flexShrink: 0 }}>{s.net?.toLocaleString()} F</div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ ...S.card, textAlign: "center", padding: 40, color: "#3d5070" }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>😶</div>
                      <div style={{ fontSize: 14 }}>Aucun abonné trouvé</div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ ...S.card, textAlign: "center", padding: 40, color: "#3d5070" }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>📅</div>
                  <div style={{ fontSize: 14, color: "#475569", fontWeight: 600, marginBottom: 4 }}>Choisissez une période</div>
                  <div style={{ fontSize: 12 }}>Utilisez un raccourci ou saisissez un intervalle</div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ──────────────────── MENU — 3 niveaux ──────────────────── */}
        {page === "dashboard" && (
          <div>
            {/* Fil d'Ariane */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, fontSize: 12, color: "#3d5070" }}>
              <span onClick={() => { setOpenService(null); setOpenEmail(null); }} style={{ cursor: openService ? "pointer" : "default", color: openService ? "#60a5fa" : "#3d5070" }}>📊 Menu</span>
              {openService && (
                <>
                  <span>›</span>
                  <span onClick={() => setOpenEmail(null)} style={{ cursor: openEmail ? "pointer" : "default", color: openEmail ? "#60a5fa" : "#dde3f0" }}>{currentServiceObj?.nom}</span>
                </>
              )}
              {openEmail && (
                <>
                  <span>›</span>
                  <span style={{ color: "#dde3f0" }}>{currentEmailObj?.adresse}</span>
                </>
              )}
            </div>

            {/* Header + bouton action */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: "#dde3f0", letterSpacing: "-0.5px" }}>
                  {!openService ? "📊 Menu — Services"
                    : !openEmail ? `🎬 ${currentServiceObj?.nom}`
                    : `📧 ${currentEmailObj?.adresse}`}
                </h1>
                <p style={{ color: "#3d5070", fontSize: 12, marginTop: 3 }}>
                  {!openService ? `${services.length} service${services.length > 1 ? "s" : ""}`
                    : !openEmail ? `${serviceEmails.length} email${serviceEmails.length > 1 ? "s" : ""}`
                    : `${emailSubs.length} profil${emailSubs.length > 1 ? "s" : ""}`}
                </p>
              </div>
              <div style={{ display: "flex", gap: 9 }}>
                {openEmail ? (
                  <>
                    <button style={S.ghost} onClick={() => setOpenEmail(null)}>← Retour</button>
                    <button style={S.btn()} onClick={() => setShowAddSub(true)}>+ Ajouter profil</button>
                  </>
                ) : openService ? (
                  <>
                    <button style={S.ghost} onClick={() => setOpenService(null)}>← Retour</button>
                    <button style={S.btn()} onClick={() => setShowNewEmail(true)}>+ Nouvel email</button>
                  </>
                ) : (
                  <button style={S.btn()} onClick={() => setShowNewService(true)}>+ Nouveau service</button>
                )}
              </div>
            </div>

            {/* Niveau 1 — Services */}
            {!openService && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px,1fr))", gap: 12 }}>
                {services.map(svc => {
                  const svcEmails = emails.filter(e => e.serviceId === svc.id);
                  const svcSubs = subscribers.filter(s => svcEmails.some(e => e.id === s.emailId));
                  const pending = svcSubs.filter(s => s.statut === "En attente").length;
                  const icon = svc.nom.toLowerCase().includes("netflix") ? "🎬"
                    : svc.nom.toLowerCase().includes("spotify") ? "🎵"
                    : svc.nom.toLowerCase().includes("chatgpt") ? "🤖"
                    : svc.nom.toLowerCase().includes("prime") ? "📦"
                    : svc.nom.toLowerCase().includes("capcut") ? "✂️"
                    : svc.nom.toLowerCase().includes("crunchyroll") ? "🎌"
                    : "📁";
                  return (
                    <div key={svc.id} style={{ ...S.card, cursor: "pointer", transition: "all .2s", position: "relative" }} onClick={() => setOpenService(svc.id)}>
                      <div style={{ fontSize: 24, marginBottom: 10 }}>{icon}</div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#dde3f0", marginBottom: 4 }}>{svc.nom}</div>
                      <div style={{ fontSize: 11, color: "#3d5070", marginBottom: 4 }}>{svcEmails.length} email{svcEmails.length > 1 ? "s" : ""}</div>
                      {pending > 0 && <div style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700, marginBottom: 4 }}>⏳ {pending} en attente</div>}
                      <div style={{ fontSize: 10, color: "#2a3a52", marginTop: 6 }}>par {svc.createdBy}</div>
                      <button onClick={e => { e.stopPropagation(); deleteService(svc.id); }} style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", cursor: "pointer", color: "#3d5070", fontSize: 14 }}>🗑️</button>
                    </div>
                  );
                })}
                <div style={{ ...S.card, cursor: "pointer", border: "1px dashed #1e2d4a", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#3d5070", minHeight: 120 }} onClick={() => setShowNewService(true)}>
                  <span style={{ fontSize: 20 }}>+</span>
                  <span style={{ fontSize: 13 }}>Nouveau service</span>
                </div>
              </div>
            )}

            {/* Niveau 2 — Emails */}
            {openService && !openEmail && (
              <div>
                {serviceEmails.length === 0 ? (
                  <div style={{ ...S.card, textAlign: "center", padding: 50, color: "#3d5070" }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
                    <div style={{ fontSize: 14 }}>Aucun email dans ce service</div>
                    <button style={{ ...S.btn(), marginTop: 16 }} onClick={() => setShowNewEmail(true)}>+ Ajouter le premier email</button>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 12 }}>
                    {serviceEmails.map(em => {
                      const emSubs = subscribers.filter(s => s.emailId === em.id);
                      const pending = emSubs.filter(s => s.statut === "En attente").length;
                      return (
                        <div key={em.id} style={{ ...S.card, cursor: "pointer", transition: "all .2s", position: "relative" }} onClick={() => setOpenEmail(em.id)}>
                          <div style={{ fontSize: 22, marginBottom: 8 }}>📧</div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: "#dde3f0", marginBottom: 4, wordBreak: "break-all" }}>{em.adresse}</div>
                          <div style={{ fontSize: 11, color: "#3d5070", marginBottom: 4 }}>{emSubs.length} profil{emSubs.length > 1 ? "s" : ""}</div>
                          {pending > 0 && <div style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700 }}>⏳ {pending} en attente</div>}
                          <button onClick={e => { e.stopPropagation(); deleteEmail(em.id); }} style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", cursor: "pointer", color: "#3d5070", fontSize: 14 }}>🗑️</button>
                        </div>
                      );
                    })}
                    <div style={{ ...S.card, cursor: "pointer", border: "1px dashed #1e2d4a", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#3d5070", minHeight: 110 }} onClick={() => setShowNewEmail(true)}>
                      <span style={{ fontSize: 20 }}>+</span>
                      <span style={{ fontSize: 13 }}>Nouvel email</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Niveau 3 — Profils */}
            {openEmail && (
              <div>
                {emailSubs.length === 0 ? (
                  <div style={{ ...S.card, textAlign: "center", padding: 50, color: "#3d5070" }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
                    <div style={{ fontSize: 14 }}>Aucun profil dans cet email</div>
                    <button style={{ ...S.btn(), marginTop: 16 }} onClick={() => setShowAddSub(true)}>+ Ajouter le premier profil</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {emailSubs.map(s => {
                      const rappel = getRappelInfo(s);
                      const cfg = STATUT_CONFIG[s.statut] || STATUT_CONFIG["Inactif"];
                      const isOpen = expandedSub === s.id;
                      const initials = s.nom.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                      const avatarColor = ["#2563eb","#7c3aed","#10b981","#f59e0b","#ef4444","#ec4899","#06b6d4"][s.id.charCodeAt(1) % 7];
                      const j = daysUntil(s.dateFin);

                      return (
                        <div key={s.id} style={{ ...S.card, padding: 0, overflow: "hidden", border: rappel ? `1px solid ${rappel.border}` : "1px solid #141d2e", transition: "all .2s" }}>
                          {/* Header cliquable */}
                          <div onClick={() => setExpandedSub(isOpen ? null : s.id)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", cursor: "pointer" }}>
                            <div style={{ position: "relative", flexShrink: 0 }}>
                              <div style={{ width: 46, height: 46, borderRadius: "50%", background: `linear-gradient(135deg,${avatarColor},${avatarColor}88)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#fff", border: `2px solid ${avatarColor}44` }}>{initials}</div>
                              <div style={{ position: "absolute", bottom: 1, right: 1, width: 12, height: 12, borderRadius: "50%", background: cfg.color, border: "2px solid #0f1525" }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                                <div style={{ fontWeight: 700, fontSize: 14, color: "#dde3f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.nom}</div>
                                <span style={S.pill(cfg)}>{cfg.ico} {s.statut}</span>
                                {rappel && <span style={{ background: rappel.bg, color: rappel.color, border: `1px solid ${rappel.border}`, borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>{rappel.label}</span>}
                              </div>
                              <div style={{ fontSize: 11, color: "#64748b" }}>
                                {s.statut === "Actif" && s.dateFin ? `Expire le ${fmtDate(s.dateFin)}` : s.statut === "En attente" ? "En attente de paiement" : "Inactif"}
                                {" · "}<b style={{ color: "#10b981" }}>{s.net?.toLocaleString()} FCFA</b>
                              </div>
                            </div>
                            <div style={{ color: "#3d5070", fontSize: 16, transition: "transform .2s", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", flexShrink: 0 }}>›</div>
                          </div>

                          {/* Fiche ID Client */}
                          {isOpen && (
                            <div style={{ borderTop: "1px solid #141d2e", padding: "16px 18px", background: "#090e1c" }}>
                              {/* Partie haute — ID Client */}
                              <div style={{ marginBottom: 14 }}>
                                <div style={{ fontSize: 10, color: "#3d5070", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>🪪 ID Client</div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                  {[
                                    { l: "Nom complet",       v: s.nom,                                    full: true },
                                    { l: "Nombre de mois",    v: s.mois ? `${s.mois} mois` : "—" },
                                    { l: "Prix",              v: s.prix ? `${s.prix.toLocaleString()} F` : "—" },
                                    { l: "Net",               v: s.net  ? `${s.net.toLocaleString()} F`  : "—", green: true },
                                    { l: "Date abonnement",   v: fmtDate(s.dateAbonnement) || "—" },
                                    { l: "Date expiration",   v: fmtDate(s.dateFin) || "—", warn: j <= 7 && j >= 0 },
                                  ].map((item, i) => (
                                    <div key={i} style={{ background: "#0f1525", borderRadius: 8, padding: "9px 11px", border: "1px solid #141d2e", gridColumn: item.full ? "1 / -1" : undefined }}>
                                      <div style={{ fontSize: 9, color: "#3d5070", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>{item.l}</div>
                                      <div style={{ fontSize: 13, fontWeight: 600, color: item.green ? "#10b981" : item.warn ? "#fb923c" : "#dde3f0" }}>{item.v}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Partie basse — Statut */}
                              <div style={{ marginBottom: 14 }}>
                                <div style={{ fontSize: 10, color: "#3d5070", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Statut</div>
                                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                                  {["Actif", "Inactif", "En attente"].map(st => (
                                    <button key={st} onClick={() => toggleStatut(s.id, st)} style={{ background: s.statut === st ? STATUT_CONFIG[st].bg : "transparent", border: `1px solid ${s.statut === st ? STATUT_CONFIG[st].border : "#141d2e"}`, borderRadius: 8, padding: "5px 13px", cursor: "pointer", color: s.statut === st ? STATUT_CONFIG[st].color : "#3d5070", fontSize: 12, fontWeight: 700, fontFamily: "system-ui,sans-serif" }}>{STATUT_CONFIG[st].ico} {st}</button>
                                  ))}
                                </div>
                              </div>

                              {/* Boutons d'action */}
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <button onClick={() => { setMovingSubId(s.id); setShowMoveSub(true); }} style={{ ...S.ghost, padding: "6px 14px", fontSize: 12 }}>↗ Déplacer</button>
                                <button onClick={() => { deleteSubscriber(s.id); setExpandedSub(null); }} style={S.danger}>🗑️ Supprimer</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ──────────────────── DEPENSES ──────────────────── */}
        {page === "depenses" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={() => setPage("accueil")} style={{ ...S.ghost, padding: "7px 13px", fontSize: 12, display: "flex", alignItems: "center", gap: 5, color: "#60a5fa", borderColor: "rgba(96,165,250,.25)" }}>← Retour</button>
                <div>
                  <h1 style={{ fontSize: 22, fontWeight: 800, color: "#dde3f0", letterSpacing: "-0.5px" }}>💰 Dépenses</h1>
                  <p style={{ color: "#3d5070", fontSize: 12, marginTop: 3 }}>Total : <b style={{ color: "#ef4444" }}>{totalDep.toLocaleString()} FCFA</b></p>
                </div>
              </div>
              <button style={S.btn()} onClick={() => setShowAddDep(true)}>+ Nouvelle dépense</button>
            </div>
            {depenses.length === 0 ? (
              <div style={{ ...S.card, textAlign: "center", padding: 50, color: "#3d5070" }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
                <div style={{ fontSize: 14 }}>Aucune dépense enregistrée</div>
              </div>
            ) : (
              <div style={S.card}>
                <div style={{ overflowX: "auto" }}>
                  <table>
                    <thead>
                      <tr>{["Date","Montant","Service","Motif","Admin","Actions"].map(h => <th key={h} style={S.thStyle}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {[...depenses].sort((a,b) => b.date.localeCompare(a.date)).map(d => (
                        <tr key={d.id}>
                          <td style={{ ...S.tdStyle, color: "#64748b" }}>{fmtDate(d.date)}</td>
                          <td style={{ ...S.tdStyle, color: "#ef4444", fontWeight: 700 }}>{d.montant?.toLocaleString()} FCFA</td>
                          <td style={{ ...S.tdStyle, color: "#94a3b8" }}>{d.service}</td>
                          <td style={{ ...S.tdStyle, color: "#64748b" }}>{d.motif}</td>
                          <td style={{ ...S.tdStyle, color: "#3d5070", fontSize: 11 }}>{d.admin}</td>
                          <td style={S.tdStyle}><button onClick={() => deleteDepense(d.id, d.service)} style={S.danger}>🗑️</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ──────────────────── TRANSACTIONS ──────────────────── */}
        {page === "transactions" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={() => setPage("accueil")} style={{ ...S.ghost, padding: "7px 13px", fontSize: 12, display: "flex", alignItems: "center", gap: 5, color: "#60a5fa", borderColor: "rgba(96,165,250,.25)" }}>← Retour</button>
                <div>
                  <h1 style={{ fontSize: 22, fontWeight: 800, color: "#dde3f0", letterSpacing: "-0.5px" }}>📝 Historique paiements</h1>
                  <p style={{ color: "#3d5070", fontSize: 12, marginTop: 3 }}>{transactions.length} transaction{transactions.length > 1 ? "s" : ""} · {transactions.reduce((s,t)=>s+(t.montant||0),0).toLocaleString()} FCFA</p>
                </div>
              </div>
            </div>
            {transactions.length === 0 ? (
              <div style={{ ...S.card, textAlign: "center", padding: 50, color: "#3d5070" }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
                <div style={{ fontSize: 14 }}>Aucune transaction</div>
              </div>
            ) : (
              <div style={S.card}>
                <div style={{ overflowX: "auto" }}>
                  <table>
                    <thead>
                      <tr>{["Date","Abonné","Service","Email","Montant","Type"].map(h => <th key={h} style={S.thStyle}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {transactions.map(t => (
                        <tr key={t.id}>
                          <td style={{ ...S.tdStyle, color: "#64748b" }}>{fmtDate(t.datePaiement)}</td>
                          <td style={{ ...S.tdStyle, color: "#dde3f0", fontWeight: 600 }}>{t.nom}</td>
                          <td style={{ ...S.tdStyle, color: "#94a3b8" }}>{t.service}</td>
                          <td style={{ ...S.tdStyle, color: "#3d5070", fontSize: 11 }}>{t.email}</td>
                          <td style={{ ...S.tdStyle, color: "#10b981", fontWeight: 700 }}>{(t.montant||0).toLocaleString()} F</td>
                          <td style={S.tdStyle}>
                            <span style={{ background: t.type === "renouvellement" ? "rgba(124,58,237,.15)" : "rgba(16,185,129,.12)", color: t.type === "renouvellement" ? "#7c3aed" : "#10b981", border: `1px solid ${t.type === "renouvellement" ? "rgba(124,58,237,.3)" : "rgba(16,185,129,.3)"}`, borderRadius: 20, padding: "2px 9px", fontSize: 10, fontWeight: 700 }}>
                              {t.type === "renouvellement" ? "🔄 Renouvellement" : "✨ Inscription"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ──────────────────── HISTORIQUE ──────────────────── */}
        {page === "historique" && (() => {
          const sortedHistory = [...history].sort((a, b) => (b.mois || "").localeCompare(a.mois || ""));
          const currentMonthEntry = sortedHistory.length > 0 ? sortedHistory[0] : null;
          const otherMonths = sortedHistory.slice(1);
          const selectedEntry = histMoisSelIdx !== null ? sortedHistory[histMoisSelIdx] : currentMonthEntry;

          return (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button onClick={() => setPage("accueil")} style={{ ...S.ghost, padding: "7px 13px", fontSize: 12, display: "flex", alignItems: "center", gap: 5, color: "#60a5fa", borderColor: "rgba(96,165,250,.25)" }}>← Retour</button>
                  <div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, color: "#dde3f0", letterSpacing: "-0.5px" }}>📅 Historique mensuel</h1>
                    <p style={{ color: "#3d5070", fontSize: 12, marginTop: 3 }}>{history.length} mois enregistrés</p>
                  </div>
                </div>
                {history.length > 0 && <button style={S.danger} onClick={() => setShowDelHist(true)}>🗑️ Effacer tout</button>}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 18 }}>
                {[
                  { l: "Total abonnés", v: subscribers.length,                                   c: "#2563eb", ico: "👥" },
                  { l: "Actifs",        v: subscribers.filter(s=>s.statut==="Actif").length,      c: "#10b981", ico: "✅" },
                  { l: "Abandons",      v: subscribers.filter(s=>s.statut==="Inactif").length,    c: "#ef4444", ico: "🚪" },
                  { l: "En attente",    v: subscribers.filter(s=>s.statut==="En attente").length, c: "#f59e0b", ico: "⏳" },
                  { l: "Expirent <7j", v: expiringSoon.length,                                    c: "#fb923c", ico: "⏰" },
                ].map((st, i) => (
                  <div key={i} style={{ background: "#090e1c", border: `1px solid ${st.c}22`, borderRadius: 11, padding: "10px 12px" }}>
                    <div style={{ fontSize: 9, color: "#3d5070", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{st.ico} {st.l}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: st.c, marginTop: 4 }}>{st.v}</div>
                  </div>
                ))}
              </div>

              {history.length === 0 ? (
                <div style={{ ...S.card, textAlign: "center", padding: 50, color: "#3d5070" }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
                  <div style={{ fontSize: 14 }}>Historique vide</div>
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                    {currentMonthEntry && (
                      <button onClick={() => { setHistMoisSelIdx(null); setHistDropdownOpen(false); }} style={{ background: histMoisSelIdx === null ? "rgba(224,32,32,.12)" : "#090e1c", border: `1px solid ${histMoisSelIdx === null ? "rgba(224,32,32,.4)" : "#141d2e"}`, borderRadius: 9, padding: "8px 16px", cursor: "pointer", color: histMoisSelIdx === null ? "#e02020" : "#64748b", fontSize: 13, fontWeight: 700, fontFamily: "system-ui,sans-serif" }}>
                        📆 {currentMonthEntry.mois} <span style={{ fontSize: 10, background: "#e02020", color: "#fff", borderRadius: 20, padding: "1px 7px", marginLeft: 5 }}>En cours</span>
                      </button>
                    )}
                    {otherMonths.length > 0 && (
                      <div style={{ position: "relative" }}>
                        <button onClick={() => setHistDropdownOpen(p => !p)} style={{ background: histMoisSelIdx !== null ? "rgba(96,165,250,.1)" : "#090e1c", border: `1px solid ${histMoisSelIdx !== null ? "rgba(96,165,250,.4)" : "#141d2e"}`, borderRadius: 9, padding: "8px 16px", cursor: "pointer", color: histMoisSelIdx !== null ? "#60a5fa" : "#64748b", fontSize: 13, fontWeight: 600, fontFamily: "system-ui,sans-serif", display: "flex", alignItems: "center", gap: 7 }}>
                          {histMoisSelIdx !== null ? `📆 ${sortedHistory[histMoisSelIdx].mois}` : "Autres mois"}
                          <span style={{ fontSize: 10 }}>{histDropdownOpen ? "▲" : "▼"}</span>
                        </button>
                        {histDropdownOpen && (
                          <div style={{ position: "absolute", top: 44, left: 0, background: "#0f1525", border: "1px solid #141d2e", borderRadius: 12, padding: 8, zIndex: 150, minWidth: 200, boxShadow: "0 8px 32px rgba(0,0,0,.6)" }}>
                            {otherMonths.map((h, relIdx) => {
                              const absIdx = relIdx + 1;
                              return (
                                <button key={h.id} onClick={() => { setHistMoisSelIdx(absIdx); setHistDropdownOpen(false); }} style={{ display: "block", width: "100%", textAlign: "left", background: histMoisSelIdx === absIdx ? "rgba(96,165,250,.1)" : "transparent", border: "none", borderRadius: 8, padding: "9px 13px", cursor: "pointer", color: histMoisSelIdx === absIdx ? "#60a5fa" : "#94a3b8", fontSize: 13, fontFamily: "system-ui,sans-serif", marginBottom: 2 }}>
                                  📆 {h.mois}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {selectedEntry && (
                    <div style={{ ...S.card, marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <div style={{ fontWeight: 700, fontSize: 16, color: "#dde3f0" }}>📆 {selectedEntry.mois}</div>
                        <button onClick={() => { deleteHistoryItem(selectedEntry.id); if (histMoisSelIdx !== null) setHistMoisSelIdx(null); }} style={S.danger}>🗑️</button>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                        {[
                          { l: "Abonnés",        v: selectedEntry.abonnes,         c: "#60a5fa" },
                          { l: "Nouveaux",        v: selectedEntry.nouveaux,        c: "#10b981" },
                          { l: "Expirés",         v: selectedEntry.expires,         c: "#fb923c" },
                          { l: "Renouvellements", v: selectedEntry.renouvellements, c: "#7c3aed" },
                          { l: "Dépenses",        v: `${selectedEntry.depenses?.toLocaleString()}F`, neg: true },
                          { l: "Revenus",         v: `${selectedEntry.revenus?.toLocaleString()}F`, c: "#10b981" },
                          { l: "Capital",         v: `${(selectedEntry.revenus-selectedEntry.depenses)?.toLocaleString()}F`, c: (selectedEntry.revenus-selectedEntry.depenses)>=0 ? "#10b981" : "#ef4444" },
                          { l: "Abandons",        v: selectedEntry.abandons ?? 0,   c: "#ef4444" },
                        ].map((st, i) => (
                          <div key={i} style={{ background: "#090e1c", borderRadius: 9, padding: "10px 13px", borderLeft: `2px solid ${st.c || (st.neg ? "#ef4444" : "#3d5070")}` }}>
                            <div style={{ fontSize: 9, color: "#3d5070", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{st.l}</div>
                            <div style={{ fontSize: 17, fontWeight: 800, color: st.c || (st.neg ? "#ef4444" : "#dde3f0"), marginTop: 4 }}>{st.v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* ──────────────────── RAPPELS ──────────────────── */}
        {page === "rappels" && (() => {
          const totalRappels = rappelsJ0.length + rappelsJ3.length + rappelsJ7.length;
          const totalNonRen = nonRenouveles.length;

          const RappelCard = ({ s, urgence }) => {
            const j = daysUntil(s.dateFin);
            const em = emails.find(e => e.id === s.emailId);
            const initials = s.nom.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase();
            const avatarColor = ["#2563eb","#7c3aed","#10b981","#f59e0b","#ef4444","#ec4899","#06b6d4"][s.id.charCodeAt(1) % 7];
            const colors = {
              0: { border: "rgba(239,68,68,.45)", bg: "rgba(239,68,68,.07)", accent: "#ef4444", label: "Expire AUJOURD'HUI" },
              1: { border: "rgba(239,68,68,.3)",  bg: "rgba(239,68,68,.05)", accent: "#ef4444", label: `Expire dans ${j} jour${j>1?"s":""}` },
              2: { border: "rgba(251,146,60,.3)", bg: "rgba(251,146,60,.05)", accent: "#fb923c", label: `Expire dans ${j} jour${j>1?"s":""}` },
            };
            const c = colors[urgence] || colors[2];
            return (
              <div style={{ background: "linear-gradient(145deg,#0f1525,#111a2e)", border: `1px solid ${c.border}`, borderRadius: 13, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 10 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: `linear-gradient(135deg,${avatarColor},${avatarColor}88)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: "#fff", border: `2px solid ${avatarColor}44`, flexShrink: 0 }}>{initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#dde3f0", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.nom}</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginBottom: 3 }}>{s.service}{em ? ` · ${em.adresse}` : ""}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ background: c.bg, color: c.accent, border: `1px solid ${c.border}`, borderRadius: 20, padding: "2px 9px", fontSize: 10, fontWeight: 700 }}>⏰ {c.label}</span>
                      <span style={{ fontSize: 11, color: "#3d5070" }}>fin {fmtDate(s.dateFin)}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  <button onClick={() => renewSubscriber(s.id)} style={{ background: "rgba(16,185,129,.15)", color: "#10b981", border: "1px solid rgba(16,185,129,.3)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "system-ui,sans-serif", fontSize: 11, fontWeight: 700 }}>🔄 Renouveler</button>
                  {/* Supprimer depuis Rappels */}
                  <button onClick={() => deleteFromRappels(s.id)} style={{ background: "rgba(100,116,139,.1)", color: "#94a3b8", border: "1px solid rgba(100,116,139,.25)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "system-ui,sans-serif", fontSize: 11, fontWeight: 700 }}>🗑️ Supprimer</button>
                </div>
              </div>
            );
          };

          return (
            <div>
              <div style={{ marginBottom: 20 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: "#dde3f0", letterSpacing: "-0.5px" }}>🔔 Rappels d'expiration</h1>
                <p style={{ color: "#3d5070", fontSize: 12, marginTop: 3 }}>
                  {totalRappels === 0 ? "Aucun abonné n'expire dans les 7 prochains jours" : `${totalRappels} abonné${totalRappels > 1 ? "s" : ""} à renouveler`}
                </p>
              </div>

              {totalRappels > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
                  {[
                    { label: "Expire aujourd'hui", count: rappelsJ0.length, color: "#ef4444", bg: "rgba(239,68,68,.12)", border: "rgba(239,68,68,.3)",   icon: "🔴" },
                    { label: "Dans 1–3 jours",     count: rappelsJ3.length, color: "#ef4444", bg: "rgba(239,68,68,.08)", border: "rgba(239,68,68,.25)",   icon: "🟠" },
                    { label: "Dans 4–7 jours",     count: rappelsJ7.length, color: "#fb923c", bg: "rgba(251,146,60,.1)", border: "rgba(251,146,60,.25)",  icon: "🟡" },
                  ].map((item, i) => (
                    <div key={i} style={{ background: item.bg, border: `1px solid ${item.border}`, borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
                      <div style={{ fontSize: 16, marginBottom: 4 }}>{item.icon}</div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: item.color, lineHeight: 1 }}>{item.count}</div>
                      <div style={{ fontSize: 9, color: item.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4, opacity: 0.8 }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {totalRappels === 0 ? (
                <div style={{ ...S.card, textAlign: "center", padding: 60 }}>
                  <div style={{ fontSize: 48, marginBottom: 14 }}>✅</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#dde3f0", marginBottom: 6 }}>Tout est à jour !</div>
                  <div style={{ fontSize: 13, color: "#3d5070" }}>Aucun abonné n'expire dans les 7 prochains jours.</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  {rappelsJ0.length > 0 && (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 8px #ef4444" }} />
                        <span style={{ fontSize: 12, fontWeight: 800, color: "#ef4444", textTransform: "uppercase", letterSpacing: 1 }}>🔴 Expire aujourd'hui — {rappelsJ0.length} abonné{rappelsJ0.length > 1 ? "s" : ""}</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {rappelsJ0.map(s => <RappelCard key={s.id} s={s} urgence={0} />)}
                      </div>
                    </div>
                  )}
                  {rappelsJ3.length > 0 && (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
                        <span style={{ fontSize: 12, fontWeight: 800, color: "#ef4444", textTransform: "uppercase", letterSpacing: 1 }}>🟠 Dans 1 à 3 jours — {rappelsJ3.length} abonné{rappelsJ3.length > 1 ? "s" : ""}</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {rappelsJ3.map(s => <RappelCard key={s.id} s={s} urgence={1} />)}
                      </div>
                    </div>
                  )}
                  {rappelsJ7.length > 0 && (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#fb923c" }} />
                        <span style={{ fontSize: 12, fontWeight: 800, color: "#fb923c", textTransform: "uppercase", letterSpacing: 1 }}>🟡 Dans 4 à 7 jours — {rappelsJ7.length} abonné{rappelsJ7.length > 1 ? "s" : ""}</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {rappelsJ7.map(s => <RappelCard key={s.id} s={s} urgence={2} />)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* ──────────────────── JOURNAL ──────────────────── */}
        {page === "logs" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={() => setPage("accueil")} style={{ ...S.ghost, padding: "7px 13px", fontSize: 12, display: "flex", alignItems: "center", gap: 5, color: "#60a5fa", borderColor: "rgba(96,165,250,.25)" }}>← Retour</button>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: "#dde3f0", letterSpacing: "-0.5px" }}>📋 Journal d'activité</h1>
              </div>
              <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
                <div style={{ fontSize: 12, color: "#3d5070" }}>{logs.length} actions</div>
                {logs.length > 0 && <button onClick={clearLogs} style={S.danger}>Effacer</button>}
              </div>
            </div>
            <div style={S.card}>
              {logs.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "#3d5070" }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
                  <div>Journal vide</div>
                </div>
              ) : logs.map((log, i) => (
                <div key={log.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 0", borderBottom: i < logs.length - 1 ? "1px solid #0e1626" : "none" }}>
                  <div style={{ width: 34, height: 34, background: `${log.adminColor}22`, border: `1px solid ${log.adminColor}44`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, color: log.adminColor, flexShrink: 0 }}>{log.admin[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "#94a3b8" }}><b style={{ color: log.adminColor }}>Admin {log.admin}</b> {log.action}</div>
                    <div style={{ fontSize: 11, color: "#3d5070", marginTop: 3 }}>{log.date} à {log.heure}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ── BOTTOM NAVIGATION ──────────────────────────────────────────────── */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100, background: "#080c17", borderTop: "1px solid #141d2e", display: "flex", alignItems: "stretch", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {[
          { id: "accueil",      icon: "🏠", label: "Accueil"    },
          { id: "recherche",    icon: "🔍", label: "Recherche"  },
          { id: "dashboard",    icon: "📊", label: "Menu"       },
          { id: "rappels",      icon: "🔔", label: "Rappels"    },
          { id: "depenses",     icon: "💰", label: "Dépenses"   },
          { id: "transactions", icon: "📝", label: "Paiements"  },
          { id: "historique",   icon: "📅", label: "Historique" },
        ].map(item => {
          const active = page === item.id;
          const badge = item.id === "rappels" ? (rappelsUrgents.length > 0 ? rappelsUrgents.length : rappelsActifs.length > 0 ? rappelsActifs.length : 0) : 0;
          return (
            <div key={item.id} onClick={() => { setPage(item.id); if (item.id !== "dashboard") { setOpenService(null); setOpenEmail(null); } }} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "8px 2px 6px", cursor: "pointer", position: "relative", borderTop: active ? "2px solid #e02020" : "2px solid transparent", transition: "all .15s" }}>
              <div style={{ fontSize: 18, lineHeight: 1, marginBottom: 2 }}>{item.icon}</div>
              <div style={{ fontSize: 9, fontWeight: active ? 700 : 400, color: active ? "#e02020" : "#3d5070", letterSpacing: 0.2 }}>{item.label}</div>
              {badge > 0 && (
                <div style={{ position: "absolute", top: 4, right: "calc(50% - 18px)", background: rappelsUrgents.length > 0 ? "#ef4444" : "#f59e0b", color: "#fff", borderRadius: 20, padding: "0px 5px", fontSize: 9, fontWeight: 800, minWidth: 14, textAlign: "center" }}>{badge}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* ═══════════════ MODALS ═══════════════ */}

      {/* Modal Nouveau Service */}
      {showNewService && (
        <div style={S.modalBg} onClick={e => e.target === e.currentTarget && setShowNewService(false)}>
          <div style={S.modal}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#dde3f0", marginBottom: 20 }}>📁 Créer un nouveau service</div>
            <label style={S.label}>Nom du service (ex: Netflix, Spotify)</label>
            <input style={{ ...S.input, marginBottom: 20 }} placeholder="Netflix, ChatGPT, Spotify..." value={newServiceNom} onChange={e => setNewServiceNom(e.target.value)} onKeyDown={e => e.key === "Enter" && createService()} autoFocus />
            <div style={{ display: "flex", gap: 9 }}>
              <button style={{ ...S.ghost, flex: 1 }} onClick={() => setShowNewService(false)}>Annuler</button>
              <button style={{ ...S.btn(), flex: 2 }} onClick={createService}>Créer le service</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nouvel Email */}
      {showNewEmail && (
        <div style={S.modalBg} onClick={e => e.target === e.currentTarget && setShowNewEmail(false)}>
          <div style={S.modal}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#dde3f0", marginBottom: 6 }}>📧 Ajouter un email</div>
            <div style={{ fontSize: 11, color: "#3d5070", marginBottom: 18 }}>Service : <b style={{ color: "#60a5fa" }}>{currentServiceObj?.nom}</b></div>
            <label style={S.label}>Adresse email</label>
            <input style={{ ...S.input, marginBottom: 20 }} placeholder="netflix@gmail.com" value={newEmailAdresse} onChange={e => setNewEmailAdresse(e.target.value)} onKeyDown={e => e.key === "Enter" && createEmail()} autoFocus />
            <div style={{ display: "flex", gap: 9 }}>
              <button style={{ ...S.ghost, flex: 1 }} onClick={() => setShowNewEmail(false)}>Annuler</button>
              <button style={{ ...S.btn(), flex: 2 }} onClick={createEmail}>Ajouter l'email</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ajouter profil — V16 : bidirectionnel mois ↔ prix */}
      {showAddSub && (() => {
        const serviceNom = currentServiceObj?.nom || "";
        const tarif      = getTarif(serviceNom);
        const today2     = today();

        // Handlers bidirectionnels
        const handleMoisChange = (val) => {
          const m = parseInt(val) || 0;
          const prixCalc = tarif > 0 && m > 0 ? tarif * m : "";
          setNewSub({ ...newSub, mois: val, prix: prixCalc !== "" ? prixCalc.toString() : "" });
        };

        const handlePrixChange = (val) => {
          const p = parseFloat(val) || 0;
          const moisCalc = tarif > 0 && p > 0 ? Math.round(p / tarif) : "";
          setNewSub({ ...newSub, prix: val, mois: moisCalc !== "" ? moisCalc.toString() : "" });
        };

        // Calculs affichage
        const moisNum = parseInt(newSub.mois) || 0;
        const prixNum = parseFloat(newSub.prix) || 0;
        const dateFinAuto = (() => {
          if (!moisNum) return "";
          const d = new Date(today2);
          d.setMonth(d.getMonth() + moisNum);
          return d.toISOString().slice(0, 10);
        })();
        const isModified = tarif > 0 && prixNum > 0 && moisNum > 0 && prixNum !== tarif * moisNum;

        return (
          <div style={S.modalBg} onClick={e => e.target === e.currentTarget && setShowAddSub(false)}>
            <div style={S.modal}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#dde3f0", marginBottom: 4 }}>Nouvel abonné</div>
              <div style={{ fontSize: 11, color: "#3d5070", marginBottom: 18 }}>
                {serviceNom && <span style={{ color: "#60a5fa" }}>{serviceNom}</span>}
                {tarif > 0 && <span style={{ color: "#64748b" }}> · {tarif.toLocaleString()} FCFA/mois</span>}
                {currentEmailObj?.adresse && <span style={{ color: "#3d5070" }}> · {currentEmailObj.adresse}</span>}
              </div>

              {/* Nom complet */}
              <div style={{ marginBottom: 14 }}>
                <label style={S.label}>Nom complet ✍️</label>
                <input style={S.input} placeholder="Moussa Traoré" value={newSub.nom} onChange={e => setNewSub({ ...newSub, nom: e.target.value })} autoFocus />
              </div>

              {/* Champs bidirectionnels mois ↔ prix */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                {/* Nombre de mois */}
                <div style={{ background: "#090e1c", borderRadius: 10, padding: "10px 13px", border: "1px solid rgba(96,165,250,.3)" }}>
                  <label style={{ ...S.label, marginBottom: 4 }}>
                    Mois ✍️ {moisNum > 0 && <span style={{ color: "#60a5fa", fontWeight: 400 }}>{moisNum} mois</span>}
                  </label>
                  <input
                    style={{ ...S.input, padding: "6px 8px", fontSize: 15, fontWeight: 800, color: "#60a5fa", background: "transparent", border: "none", width: "100%" }}
                    type="number" min="1" placeholder="1, 2, 3..."
                    value={newSub.mois}
                    onChange={e => handleMoisChange(e.target.value)}
                  />
                </div>

                {/* Prix total */}
                <div style={{ background: "#090e1c", borderRadius: 10, padding: "10px 13px", border: `1px solid ${isModified ? "rgba(245,158,11,.4)" : "rgba(16,185,129,.3)"}` }}>
                  <label style={{ ...S.label, marginBottom: 4 }}>
                    Prix FCFA {isModified
                      ? <span style={{ color: "#f59e0b", fontWeight: 400 }}>modifié</span>
                      : <span style={{ color: "#10b981", fontWeight: 400 }}>auto</span>}
                  </label>
                  <input
                    style={{ ...S.input, padding: "6px 8px", fontSize: 15, fontWeight: 800, color: isModified ? "#f59e0b" : "#10b981", background: "transparent", border: "none", width: "100%" }}
                    type="number" min="0" placeholder={tarif > 0 && moisNum > 0 ? (tarif * moisNum).toString() : "0"}
                    value={newSub.prix}
                    onChange={e => handlePrixChange(e.target.value)}
                  />
                </div>

                {/* Date abonnement */}
                <div style={{ background: "#090e1c", borderRadius: 10, padding: "10px 13px", border: "1px solid rgba(96,165,250,.15)" }}>
                  <label style={S.label}>Date abonnement</label>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#60a5fa", marginTop: 4 }}>{fmtDate(today2)}</div>
                </div>

                {/* Date expiration */}
                <div style={{ background: "#090e1c", borderRadius: 10, padding: "10px 13px", border: `1px solid ${dateFinAuto ? "rgba(16,185,129,.25)" : "rgba(96,165,250,.15)"}` }}>
                  <label style={S.label}>Date expiration</label>
                  <div style={{ fontSize: 13, fontWeight: 600, color: dateFinAuto ? "#10b981" : "#3d5070", marginTop: 4 }}>
                    {dateFinAuto ? fmtDate(dateFinAuto) : "—"}
                  </div>
                </div>
              </div>

              {/* Info recap */}
              {moisNum > 0 && prixNum > 0 && (
                <div style={{ background: "rgba(16,185,129,.07)", border: "1px solid rgba(16,185,129,.2)", borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontSize: 11, color: "#10b981" }}>
                  ✅ {moisNum} mois · {prixNum.toLocaleString()} FCFA
                  {dateFinAuto && ` · Expire le ${fmtDate(dateFinAuto)}`}
                </div>
              )}

              {/* Statut */}
              <div style={{ marginBottom: 6 }}>
                <label style={S.label}>Statut initial</label>
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  {["Actif", "En attente"].map(st => (
                    <button key={st} onClick={() => setNewSub({ ...newSub, statut: st })} style={{ background: newSub.statut === st ? (st === "Actif" ? "rgba(16,185,129,.15)" : "rgba(245,158,11,.15)") : "transparent", border: `1px solid ${newSub.statut === st ? (st === "Actif" ? "rgba(16,185,129,.4)" : "rgba(245,158,11,.4)") : "#141d2e"}`, borderRadius: 8, padding: "7px 16px", cursor: "pointer", color: newSub.statut === st ? (st === "Actif" ? "#10b981" : "#f59e0b") : "#3d5070", fontSize: 12, fontWeight: 700, fontFamily: "system-ui,sans-serif" }}>
                      {st === "Actif" ? "✅ Actif" : "⏳ En attente"}
                    </button>
                  ))}
                </div>
                {newSub.statut === "En attente" && <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 6 }}>ℹ️ En attente : compté dans les abonnés mais pas dans les revenus</div>}
              </div>

              <div style={{ display: "flex", gap: 9, marginTop: 20 }}>
                <button style={{ ...S.ghost, flex: 1 }} onClick={() => setShowAddSub(false)}>Annuler</button>
                <button style={{ ...S.btn(), flex: 2 }} onClick={addSubscriber}>Enregistrer l'abonné</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal Déplacer — Spec 1 : liste des emails */}
      {showMoveSub && (
        <div style={S.modalBg} onClick={e => e.target === e.currentTarget && setShowMoveSub(false)}>
          <div style={{ ...S.modal, maxWidth: 380 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#dde3f0", marginBottom: 18 }}>↗ Déplacer l'abonné</div>
            <label style={S.label}>Email de destination</label>
            <select style={{ ...S.input, marginBottom: 20 }} value={moveTargetEmailId} onChange={e => setMoveTargetEmailId(e.target.value)}>
              <option value="">-- Choisir un email --</option>
              {emails.filter(em => em.id !== openEmail).map(em => {
                const svc = services.find(s => s.id === em.serviceId);
                return <option key={em.id} value={em.id}>{svc ? `${svc.nom} · ` : ""}{em.adresse}</option>;
              })}
            </select>
            <div style={{ display: "flex", gap: 9 }}>
              <button style={{ ...S.ghost, flex: 1 }} onClick={() => setShowMoveSub(false)}>Annuler</button>
              <button style={{ ...S.btn(), flex: 2 }} onClick={moveSubscriber}>Déplacer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dépense */}
      {showAddDep && (
        <div style={S.modalBg} onClick={e => e.target === e.currentTarget && setShowAddDep(false)}>
          <div style={{ ...S.modal, maxWidth: 420 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#dde3f0", marginBottom: 20 }}>Nouvelle dépense</div>
            {[
              { k:"date",    l:"Date",          t:"date"    },
              { k:"montant", l:"Montant (FCFA)", p:"15000"   },
              { k:"service", l:"Service",        p:"Netflix" },
              { k:"motif",   l:"Motif",          p:"Renouvellement compte" },
            ].map(f => (
              <div key={f.k} style={{ marginBottom: 13 }}>
                <label style={S.label}>{f.l}</label>
                <input style={S.input} type={f.t || "text"} placeholder={f.p || ""} value={newDep[f.k]} onChange={e => setNewDep({ ...newDep, [f.k]: e.target.value })} />
              </div>
            ))}
            <div style={{ fontSize: 11, color: "#3d5070", marginBottom: 16 }}>Enregistré par : Admin {currentAdmin.name}</div>
            <div style={{ display: "flex", gap: 9 }}>
              <button style={{ ...S.ghost, flex: 1 }} onClick={() => setShowAddDep(false)}>Annuler</button>
              <button style={{ ...S.btn(), flex: 2 }} onClick={addDepense}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Renouvellement */}
      {renewModalSubId && (() => {
        const s = subscribers.find(x => x.id === renewModalSubId);
        const moisNum  = parseInt(renewMois) || 0;
        const tarif    = getTarif(s?.service);
        const prixAuto = tarif * moisNum;
        const netAuto  = prixAuto;
        const today2   = today();
        const dateFinAuto = (() => {
          if (!moisNum) return "";
          const d = new Date(today2);
          d.setMonth(d.getMonth() + moisNum);
          return d.toISOString().slice(0, 10);
        })();
        return (
          <div style={S.modalBg} onClick={e => e.target === e.currentTarget && setRenewModalSubId(null)}>
            <div style={{ ...S.modal, maxWidth: 380 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#dde3f0", marginBottom: 6 }}>🔄 Renouveler l'abonnement</div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 20 }}>{s?.nom} · {s?.service}</div>
              <label style={S.label}>Nombre de mois</label>
              <input style={{ ...S.input, marginBottom: 14 }} type="number" min="1" placeholder="1, 2, 3..." value={renewMois} onChange={e => setRenewMois(e.target.value)} autoFocus />
              {moisNum > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 18 }}>
                  <div style={{ background: "#090e1c", borderRadius: 9, padding: "10px 12px", border: "1px solid rgba(16,185,129,.25)" }}>
                    <label style={S.label}>Somme (FCFA) {renewPrixOverride === "" ? <span style={{ color: "#10b981", fontWeight: 400 }}>auto</span> : <span style={{ color: "#f59e0b", fontWeight: 400 }}>modifié</span>}</label>
                    <input style={{ ...S.input, padding: "6px 8px", fontSize: 15, fontWeight: 800, color: "#10b981", background: "transparent", border: "none", width: "100%" }} type="number" placeholder={prixAuto > 0 ? prixAuto.toString() : "0"} value={renewPrixOverride} onChange={e => setRenewPrixOverride(e.target.value)} />
                  </div>
                  <div style={{ background: "#090e1c", borderRadius: 9, padding: "10px 12px", border: "1px solid rgba(16,185,129,.25)" }}>
                    <label style={S.label}>Net (FCFA) {renewNetOverride === "" ? <span style={{ color: "#10b981", fontWeight: 400 }}>auto</span> : <span style={{ color: "#f59e0b", fontWeight: 400 }}>modifié</span>}</label>
                    <input style={{ ...S.input, padding: "6px 8px", fontSize: 15, fontWeight: 800, color: "#10b981", background: "transparent", border: "none", width: "100%" }} type="number" placeholder={netAuto > 0 ? netAuto.toString() : "0"} value={renewNetOverride} onChange={e => setRenewNetOverride(e.target.value)} />
                  </div>
                  <div style={{ background: "#090e1c", borderRadius: 9, padding: "10px 12px", border: "1px solid rgba(96,165,250,.2)" }}>
                    <label style={S.label}>Nouvelle date début (auto)</label>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#60a5fa" }}>{fmtDate(today2)}</div>
                  </div>
                  <div style={{ background: "#090e1c", borderRadius: 9, padding: "10px 12px", border: renewDateFinOverride ? "1px solid rgba(245,158,11,.4)" : "1px solid rgba(96,165,250,.2)" }}>
                    <label style={S.label}>Nouvelle date fin {renewDateFinOverride ? <span style={{ color: "#f59e0b", fontWeight: 400 }}>modifiée</span> : <span style={{ color: "#60a5fa", fontWeight: 400 }}>auto</span>}</label>
                    <input style={{ ...S.input, padding: "6px 8px", fontSize: 12, fontWeight: 600, color: renewDateFinOverride ? "#f59e0b" : "#60a5fa", background: "transparent", border: "none", width: "100%" }} type="date" value={renewDateFinOverride || dateFinAuto} onChange={e => setRenewDateFinOverride(e.target.value !== dateFinAuto ? e.target.value : "")} />
                  </div>
                </div>
              )}
              <div style={{ display: "flex", gap: 9 }}>
                <button style={{ ...S.ghost, flex: 1 }} onClick={() => setRenewModalSubId(null)}>Annuler</button>
                <button style={{ ...S.btn(), flex: 2 }} onClick={confirmRenew} disabled={moisNum <= 0}>✅ Confirmer le renouvellement</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal Effacer historique */}
      {showDelHist && (
        <div style={S.modalBg} onClick={e => e.target === e.currentTarget && setShowDelHist(false)}>
          <div style={{ ...S.modal, maxWidth: 360, textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>⚠️</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#dde3f0", marginBottom: 8 }}>Effacer tout l'historique ?</div>
            <p style={{ fontSize: 13, color: "#3d5070", lineHeight: 1.6, marginBottom: 22 }}>Cette action est irréversible.</p>
            <div style={{ display: "flex", gap: 9 }}>
              <button style={{ ...S.ghost, flex: 1 }} onClick={() => setShowDelHist(false)}>Annuler</button>
              <button style={{ ...S.btn("#ef4444"), flex: 1 }} onClick={clearHistory}>Effacer tout</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
