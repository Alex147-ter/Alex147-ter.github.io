/* ============================================================
   Conti-GO — local-backend.js
   ------------------------------------------------------------
   Backend 100% local (usa localStorage del navegador). Reemplaza
   la dependencia de Supabase para que el registro, el login, el
   Hub y los pagos funcionen de inmediato, sin "Failed to fetch".

   Expone las mismas funciones que usaban las páginas:
     contigoRegister, contigoLogin, contigoLogout,
     contigoGetSessionProfile, contigoGetPaymentQr,
     contigoSetPaymentQr, contigoCreatePaymentRequest,
     contigoConfirmPayment, contigoListPayments,
     contigoSubscribePayments, contigoListCourses,
     contigoAddCourse, contigoDeleteCourse, contigoAddVideo,
     contigoDeleteVideo
   ============================================================ */
(function () {
  "use strict";

  const ADMIN_SECRET_CODE = "CONTIGO-ADMIN-2026";

  const K_USERS = "contigo_users";
  const K_SESSION = "contigo_session";
  const K_COURSES = "contigo_courses";
  const K_PAYMENTS = "contigo_payments";
  const K_SETTINGS = "contigo_settings";

  function uid() {
    return "id_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }
  function readJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch (e) { return fallback; }
  }
  function writeJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

  /* ---------------- AUTH ---------------- */

  window.contigoRegister = async function ({ name, email, password, wantsAdmin, adminKey }) {
    const users = readJSON(K_USERS, []);
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { ok: false, message: "Ya existe una cuenta con ese correo." };
    }
    if (wantsAdmin && adminKey !== ADMIN_SECRET_CODE) {
      return { ok: false, message: "Código de administrador incorrecto." };
    }
    const user = {
      id: uid(), name, email, password,
      role: wantsAdmin ? "admin" : "user",
      has_paid: false,
      created_at: new Date().toISOString(),
    };
    users.push(user);
    writeJSON(K_USERS, users);
    writeJSON(K_SESSION, { id: user.id, name: user.name, email: user.email, role: user.role, has_paid: user.has_paid });
    return { ok: true, needsEmailConfirm: false };
  };

  window.contigoLogin = async function ({ email, password }) {
    const users = readJSON(K_USERS, []);
    const match = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!match) return { ok: false, message: "Correo o contraseña incorrectos." };
    writeJSON(K_SESSION, { id: match.id, name: match.name, email: match.email, role: match.role, has_paid: match.has_paid });
    return { ok: true, user: match };
  };

  window.contigoLogout = async function () {
    localStorage.removeItem(K_SESSION);
  };

  window.contigoGetSessionProfile = async function () {
    const session = readJSON(K_SESSION, null);
    if (!session) return null;
    // Refresca has_paid/role desde la tabla de usuarios por si un admin lo cambió.
    const users = readJSON(K_USERS, []);
    const fresh = users.find(u => u.id === session.id);
    if (fresh) {
      const updated = { id: fresh.id, name: fresh.name, email: fresh.email, role: fresh.role, has_paid: fresh.has_paid };
      writeJSON(K_SESSION, updated);
      return updated;
    }
    return session;
  };

  /* ---------------- SETTINGS / QR DE PAGO ---------------- */

  window.contigoGetPaymentQr = async function () {
    const settings = readJSON(K_SETTINGS, {});
    return settings.qr_image_url || null;
  };

  window.contigoSetPaymentQr = async function (file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const settings = readJSON(K_SETTINGS, {});
        settings.qr_image_url = reader.result; // base64 dataURL
        writeJSON(K_SETTINGS, settings);
        resolve({ ok: true, url: reader.result });
      };
      reader.onerror = () => resolve({ ok: false, message: "No se pudo leer la imagen." });
      reader.readAsDataURL(file);
    });
  };

  /* ---------------- PAGOS ---------------- */

  window.contigoCreatePaymentRequest = async function ({ courseTitle, amount, note }) {
    const session = readJSON(K_SESSION, null);
    if (!session) return { ok: false, message: "Debes iniciar sesión." };

    const payments = readJSON(K_PAYMENTS, []);
    payments.push({
      id: uid(),
      user_id: session.id,
      email: session.email,
      course_title: courseTitle || null,
      amount: amount || 19.90,
      note: note || "",
      status: "pendiente",
      created_at: new Date().toISOString(),
    });
    writeJSON(K_PAYMENTS, payments);
    return { ok: true };
  };

  window.contigoListPayments = async function () {
    return readJSON(K_PAYMENTS, []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  };

  window.contigoConfirmPayment = async function (paymentId, userId) {
    const payments = readJSON(K_PAYMENTS, []);
    const payment = payments.find(p => p.id === paymentId);
    if (!payment) return { ok: false, message: "Pago no encontrado." };
    payment.status = "completado";
    writeJSON(K_PAYMENTS, payments);

    const users = readJSON(K_USERS, []);
    const user = users.find(u => u.id === userId);
    if (user) {
      user.has_paid = true;
      writeJSON(K_USERS, users);
    }
    return { ok: true };
  };

  // No hay backend en tiempo real: simplemente refresca cada pocos segundos.
  window.contigoSubscribePayments = function (callback) {
    setInterval(callback, 6000);
  };

  /* ---------------- CURSOS Y VIDEOS (Hub) ---------------- */

  window.contigoListCourses = async function () {
    return readJSON(K_COURSES, []);
  };

  window.contigoAddCourse = async function ({ title, cat, instructor, level, description }) {
    if (!title) return { ok: false, message: "El título es obligatorio." };
    const courses = readJSON(K_COURSES, []);
    courses.push({ id: uid(), title, cat, instructor, level, description, videos: [] });
    writeJSON(K_COURSES, courses);
    return { ok: true };
  };

  window.contigoDeleteCourse = async function (courseId) {
    let courses = readJSON(K_COURSES, []);
    courses = courses.filter(c => c.id !== courseId);
    writeJSON(K_COURSES, courses);
    return { ok: true };
  };

  window.contigoAddVideo = async function (courseId, { title, url }) {
    if (!title || !url) return { ok: false, message: "Completa título y link." };
    const courses = readJSON(K_COURSES, []);
    const course = courses.find(c => c.id === courseId);
    if (!course) return { ok: false, message: "Curso no encontrado." };
    course.videos = course.videos || [];
    course.videos.push({ id: uid(), title, url });
    writeJSON(K_COURSES, courses);
    return { ok: true };
  };

  window.contigoDeleteVideo = async function (videoId) {
    const courses = readJSON(K_COURSES, []);
    courses.forEach(c => { c.videos = (c.videos || []).filter(v => v.id !== videoId); });
    writeJSON(K_COURSES, courses);
    return { ok: true };
  };
})();
