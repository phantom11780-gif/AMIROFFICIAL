
"use strict";

/* =====================================================
   AMIR OFFICIAL — Main Website Script
   Supabase + Admin + Articles + Search + Recovery
===================================================== */

/* ---------- 1. SUPABASE CONFIG ---------- */

const SUPABASE_URL = "https://tfbanllbaopeqyexlfxm.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_huzTGcD3rQtxOXJFGK-90Q__TBHiLzE";

const STORAGE_BUCKET = "site-media";

let db = null;
let currentUser = null;
let isAdmin = false;
let articles = [];
let categories = [];
let articlePosition = 0;
let editingArticleId = null;
let currentLanguage = "fa";
let currentCategoryFilter = "all";
let currentSearch = "";
let recoveryFormOpen = false;

const $ = id => document.getElementById(id);

function notify(message) {
  alert(message);
}

function setMessage(message, color) {
  const el = $("adminMessage");
  if (!el) return;
  el.textContent = message;
  if (color) el.style.color = color;
}

function escapeText(value) {
  return String(value ?? "");
}

function makeSlug(value) {
  return escapeText(value)
    .trim()
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "") || "article";
}

function formatDate(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString(
      currentLanguage === "fa" ? "fa-IR" : "en-US"
    );
  } catch {
    return "";
  }
}

/* ---------- 2. INITIALIZATION ---------- */

async function initializeSupabase() {
  if (!window.supabase) {
    console.error("Supabase library not loaded.");
    return;
  }

  if (!SUPABASE_ANON_KEY ||
      SUPABASE_ANON_KEY.includes("HIDDEN")) {
    console.error("Supabase public key is missing.");
    return;
  }

  db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

  // Listen for auth events, including password recovery.
  db.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      showPasswordRecoveryForm();
    }

    if (event === "SIGNED_OUT") {
      currentUser = null;
      isAdmin = false;
      loadArticles();
    }

    if (event === "SIGNED_IN" && session) {
      checkAdmin(session.user);
    }
  });

  const { data, error } = await db.auth.getSession();

  if (error) {
    console.error("Session error:", error.message);
  }

  if (data?.session?.user) {
    await checkAdmin(data.session.user);
  }

  await loadArticles();
  createPublicTools();
  recordSiteVisit();
}

/* ---------- 3. MOBILE MENU ---------- */

function toggleMenu() {
  $("navlinks")?.classList.toggle("open");
}

function goTo(id) {
  const section = $(id);

  if (section) {
    section.scrollIntoView({ behavior: "smooth" });
  }

  $("navlinks")?.classList.remove("open");
}

/* ---------- 4. LANGUAGE ---------- */

function setLang(lang) {
  if (!["fa", "en"].includes(lang)) return;

  currentLanguage = lang;

  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "fa" ? "rtl" : "ltr";

  document.body.style.fontFamily =
    lang === "fa"
      ? "Tahoma, Arial, sans-serif"
      : "Arial, sans-serif";

  document.querySelectorAll("[data-fa]").forEach(el => {
    const value = el.getAttribute("data-" + lang);
    if (value !== null) el.textContent = value;
  });

  $("faBtn")?.classList.toggle("active", lang === "fa");
  $("enBtn")?.classList.toggle("active", lang === "en");

  renderArticles();
}

/* ---------- 5. LOAD CATEGORIES AND ARTICLES ---------- */

async function loadArticles() {
  if (!db) return;

  const { data: categoryData, error: categoryError } =
    await db
      .from("categories")
      .select("id,name,slug")
      .order("name");

  if (categoryError) {
    console.error("Category error:", categoryError.message);
    categories = [];
  } else {
    categories = categoryData || [];
  }

  let query = db
    .from("articles")
    .select("*")
    .order("published_at", { ascending: false, nullsFirst: false });

  // Public visitors only receive published articles through RLS.
  const { data, error } = await query;

  if (error) {
    console.error("Article error:", error.message);
    return;
  }

  articles = (data || []).map(article => {
    const category = categories.find(
      item => item.id === article.category_id
    );

    return {
      ...article,
      category: category?.name || "",
      description: article.excerpt || article.content || "",
      icon: "✦"
    };
  });

  renderCategoryFilters();
  renderArticles();

  if (isAdmin) renderAdminList();
}

/* ---------- 6. SEARCH AND CATEGORY FILTER ---------- */

function getFilteredArticles() {
  return articles.filter(article => {
    const search = currentSearch.toLowerCase();

    const matchesSearch =
      !search ||
      String(article.title || "").toLowerCase().includes(search) ||
      String(article.description || "").toLowerCase().includes(search) ||
      String(article.category || "").toLowerCase().includes(search);

    const matchesCategory =
      currentCategoryFilter === "all" ||
      String(article.category_id) === String(currentCategoryFilter);

    return matchesSearch && matchesCategory;
  });
}

function createPublicTools() {
  const track = $("articleTrack");
  if (!track) return;

  const parent = track.parentElement;
  if (!parent || $("articleSearch")) return;

  const tools = document.createElement("div");
  tools.id = "articleTools";
  tools.style.cssText =
    "display:flex;flex-wrap:wrap;gap:10px;margin:18px 0;";

  const search = document.createElement("input");
  search.id = "articleSearch";
  search.type = "search";
  search.placeholder = "جست‌وجوی مطالب...";
  search.setAttribute("aria-label", "جست‌وجوی مطالب");
  search.style.cssText =
    "flex:1;min-width:180px;padding:12px;border-radius:9px;border:1px solid #b99a45;background:#151515;color:white;";

  search.addEventListener("input", () => {
    currentSearch = search.value.trim();
    articlePosition = 0;
    renderArticles();
  });

  const categorySelect = document.createElement("select");
  categorySelect.id = "articleCategoryFilter";
  categorySelect.style.cssText =
    "padding:12px;border-radius:9px;border:1px solid #b99a45;background:#151515;color:white;";

  categorySelect.addEventListener("change", () => {
    currentCategoryFilter = categorySelect.value;
    articlePosition = 0;
    renderArticles();
  });

  tools.append(search, categorySelect);
  parent.insertBefore(tools, track);
  renderCategoryFilters();
}

function renderCategoryFilters() {
  const select = $("articleCategoryFilter");
  if (!select) return;

  const oldValue = currentCategoryFilter;
  select.innerHTML = "";

  const all = document.createElement("option");
  all.value = "all";
  all.textContent = currentLanguage === "fa"
    ? "همه دسته‌بندی‌ها"
    : "All categories";
  select.appendChild(all);

  categories.forEach(category => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.name;
    select.appendChild(option);
  });

  select.value = oldValue;
}

/* ---------- 7. ARTICLE DISPLAY ---------- */

function renderArticles() {
  const track = $("articleTrack");
  const dots = $("articleDots");

  if (!track || !dots) return;

  track.innerHTML = "";
  dots.innerHTML = "";

  const filtered = getFilteredArticles();

  if (!filtered.length) {
    const empty = document.createElement("p");
    empty.textContent = currentLanguage === "fa"
      ? "مطلبی پیدا نشد."
      : "No articles found.";
    track.appendChild(empty);
    return;
  }

  filtered.forEach(article => {
    const card = document.createElement("article");
    card.className = "article";
    card.style.cursor = "pointer";

    if (article.cover_image) {
      const image = document.createElement("img");
      image.src = article.cover_image;
      image.alt = article.title || "Article image";
      image.loading = "lazy";
      image.style.cssText =
        "width:100%;height:180px;object-fit:cover;border-radius:12px;";
      card.appendChild(image);
    } else {
      const icon = document.createElement("div");
      icon.className = "article-icon";
      icon.textContent = "✦";
      card.appendChild(icon);
    }

    const category = document.createElement("div");
    category.className = "article-tag";
    category.textContent = article.category;

    const title = document.createElement("h3");
    title.textContent = article.title || "";

    const description = document.createElement("p");
    description.textContent = article.description || "";

    const label = document.createElement("small");
    label.textContent = "AMIROFFICIAL";

    const date = document.createElement("small");
    date.textContent = formatDate(article.published_at);

    card.append(category, title, description, label, date);

    card.addEventListener("click", () => {
      openArticle(article.id);
    });

    track.appendChild(card);
  });

  const visible = getVisibleArticles();
  const maxPosition = Math.max(0, filtered.length - visible);

  articlePosition = Math.min(articlePosition, maxPosition);

  for (let i = 0; i <= maxPosition; i++) {
    const dot = document.createElement("button");
    dot.className = "dot" + (i === articlePosition ? " active" : "");
    dot.type = "button";
    dot.setAttribute("aria-label", "Page " + (i + 1));

    dot.addEventListener("click", () => {
      articlePosition = i;
      updateArticleSlider();
    });

    dots.appendChild(dot);
  }

  updateArticleSlider();
}

function getVisibleArticles() {
  if (window.innerWidth <= 600) return 1;
  if (window.innerWidth <= 850) return 2;
  return 3;
}

function updateArticleSlider() {
  const track = $("articleTrack");
  const firstCard = track?.querySelector(".article");

  if (!firstCard) return;

  const filtered = getFilteredArticles();
  const maxPosition = Math.max(
    0,
    filtered.length - getVisibleArticles()
  );

  articlePosition = Math.max(
    0,
    Math.min(articlePosition, maxPosition)
  );

  const amount =
    firstCard.getBoundingClientRect().width + 16;

  track.style.transform =
    `translateX(${articlePosition * amount}px)`;

  document.querySelectorAll(".dot").forEach((dot, index) => {
    dot.classList.toggle("active", index === articlePosition);
  });
}

function moveArticles(direction) {
  const maxPosition = Math.max(
    0,
    getFilteredArticles().length - getVisibleArticles()
  );

  articlePosition += direction;

  if (articlePosition > maxPosition) articlePosition = 0;
  if (articlePosition < 0) articlePosition = maxPosition;

  updateArticleSlider();
}

window.addEventListener("resize", () => {
  articlePosition = 0;
  renderArticles();
});

/* ---------- 8. ARTICLE DETAILS ---------- */

function openArticle(id) {
  const article = articles.find(
    item => String(item.id) === String(id)
  );

  if (!article) return;

  recordArticleView(article.id);

  let modal = $("articleDetailModal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "articleDetailModal";
    modal.style.cssText =
      "position:fixed;inset:0;z-index:9998;background:#000e;display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto;";

    const panel = document.createElement("div");
    panel.id = "articleDetailPanel";
    panel.style.cssText =
      "position:relative;max-width:750px;width:100%;max-height:90vh;overflow:auto;background:#111;color:white;border:1px solid #c9a64b;border-radius:16px;padding:24px;";

    const close = document.createElement("button");
    close.textContent = "✕";
    close.type = "button";
    close.style.cssText =
      "float:left;background:#c9a64b;border:0;padding:8px 12px;border-radius:7px;cursor:pointer;";
    close.onclick = () => modal.remove();

    panel.appendChild(close);
    modal.appendChild(panel);
    modal.addEventListener("click", e => {
      if (e.target === modal) modal.remove();
    });

    document.body.appendChild(modal);
  }

  const panel = $("articleDetailPanel");
  panel.querySelectorAll(".article-detail-content").forEach(el => el.remove());

  const content = document.createElement("div");
  content.className = "article-detail-content";

  if (article.cover_image) {
    const image = document.createElement("img");
    image.src = article.cover_image;
    image.alt = article.title || "";
    image.style.cssText =
      "width:100%;max-height:360px;object-fit:cover;border-radius:12px;margin-top:18px;";
    content.appendChild(image);
  }

  const title = document.createElement("h2");
  title.textContent = article.title || "";

  const category = document.createElement("p");
  category.textContent = article.category || "";

  const body = document.createElement("p");
  body.textContent = article.content || article.excerpt || "";
  body.style.cssText = "white-space:pre-wrap;line-height:2;";

  const share = document.createElement("button");
  share.type = "button";
  share.textContent = currentLanguage === "fa"
    ? "اشتراک‌گذاری مطلب"
    : "Share article";
  share.onclick = async () => {
    const shareData = {
      title: article.title,
      text: article.excerpt || "",
      url: location.origin + location.pathname + "#article-" + article.id
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.log("Share cancelled.");
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareData.url);
      notify("لینک مطلب کپی شد.");
    }
  };

  content.append(title, category, body, share);
  panel.appendChild(content);

  loadComments(article.id, content);
}

/* ---------- 9. ADMIN ROLE ---------- */

async function checkAdmin(user) {
  if (!db || !user) {
    currentUser = null;
    isAdmin = false;
    return false;
  }

  const { data, error } = await db
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data || data.role !== "admin") {
    currentUser = null;
    isAdmin = false;
    return false;
  }

  currentUser = user;
  isAdmin = true;
  return true;
}

/* ---------- 10. ADMIN LOGIN FORM ---------- */

function prepareLoginForm() {
  const form = $("normalLogin");
  if (!form) return;

  const password = $("adminPassword");
  if (!password) return;

  if (!$("adminEmail")) {
    const email = document.createElement("input");
    email.id = "adminEmail";
    email.type = "email";
    email.placeholder = "ایمیل مدیر";
    email.autocomplete = "username";
    email.required = true;
    email.style.cssText =
      "width:100%;box-sizing:border-box;margin-bottom:10px;padding:12px;";
    form.insertBefore(email, password);
  }

  if (!$("forgotPasswordButton")) {
    const forgot = document.createElement("button");
    forgot.id = "forgotPasswordButton";
    forgot.type = "button";
    forgot.textContent = "فراموشی رمز عبور";
    forgot.style.cssText =
      "display:block;margin:10px auto;background:transparent;color:#d6b65c;border:0;cursor:pointer;";
    forgot.onclick = sendPasswordRecovery;
    password.insertAdjacentElement("afterend", forgot);
  }
}

/* ---------- 11. PASSWORD RECOVERY EMAIL ---------- */

async function sendPasswordRecovery() {
  if (!db) return setMessage("اتصال به سرور برقرار نیست.");

  const email = $("adminEmail")?.value.trim();

  if (!email) {
    setMessage("ابتدا ایمیل مدیر را وارد کن.");
    return;
  }

  setMessage("در حال ارسال ایمیل بازیابی...");

  const { error } = await db.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname
  });

  if (error) {
    setMessage("ارسال انجام نشد: " + error.message);
    return;
  }

  setMessage("اگر ایمیل در سیستم ثبت شده باشد، لینک بازیابی برای آن ارسال می‌شود.");
}

/* ---------- 12. NEW PASSWORD FORM ---------- */

function showPasswordRecoveryForm() {
  if (recoveryFormOpen || !$("adminModal")) return;

  recoveryFormOpen = true;

  const overlay = document.createElement("div");
  overlay.id = "passwordRecoveryBox";
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:99999;background:#000e;display:flex;align-items:center;justify-content:center;padding:18px;direction:rtl;";

  const form = document.createElement("form");
  form.style.cssText =
    "max-width:420px;width:100%;background:#111;color:white;border:1px solid #c9a64b;border-radius:16px;padding:25px;";

  const heading = document.createElement("h2");
  heading.textContent = "تعیین رمز جدید";
  heading.style.color = "#d8b75a";

  const description = document.createElement("p");
  description.textContent = "رمز جدید را وارد و تکرار کن.";

  const password = document.createElement("input");
  password.type = "password";
  password.placeholder = "رمز جدید، حداقل ۸ کاراکتر";
  password.minLength = 8;
  password.required = true;
  password.autocomplete = "new-password";

  const repeat = document.createElement("input");
  repeat.type = "password";
  repeat.placeholder = "تکرار رمز جدید";
  repeat.required = true;
  repeat.autocomplete = "new-password";

  [password, repeat].forEach(input => {
    input.style.cssText =
      "display:block;width:100%;box-sizing:border-box;padding:13px;margin:12px 0;background:#222;color:white;border:1px solid #987b36;border-radius:8px;";
  });

  const message = document.createElement("p");
  message.setAttribute("role", "status");

  const button = document.createElement("button");
  button.type = "submit";
  button.textContent = "ذخیره رمز جدید";
  button.style.cssText =
    "width:100%;padding:14px;background:#c9a64b;color:#111;border:0;border-radius:8px;font-weight:bold;";

  form.append(heading, description, password, repeat, button, message);
  overlay.appendChild(form);
  document.body.appendChild(overlay);

  form.addEventListener("submit", async event => {
    event.preventDefault();

    if (password.value.length < 8) {
      message.textContent = "رمز باید حداقل ۸ کاراکتر باشد.";
      return;
    }

    if (password.value !== repeat.value) {
      message.textContent = "رمزها با هم یکسان نیستند.";
      return;
    }

    button.disabled = true;
    message.textContent = "در حال ذخیره رمز...";

    const { error } = await db.auth.updateUser({
      password: password.value
    });

    if (error) {
      message.textContent = "خطا: " + error.message;
      button.disabled = false;
      return;
    }

    message.textContent = "رمز با موفقیت تغییر کرد.";
    heading.textContent = "رمز جدید ذخیره شد";
    description.textContent = "اکنون می‌توانی وارد پنل مدیریت شوی.";
    button.textContent = "رفتن به ورود";
    password.value = "";
    repeat.value = "";

    button.onclick = async () => {
      await db.auth.signOut();
      window.location.href = "/";
    };

    recoveryFormOpen = false;
  });
}

/* ---------- 13. ADMIN MODAL ---------- */

async function openAdmin() {
  $("adminModal")?.classList.add("show");

  if ($("setupPassword")) $("setupPassword").style.display = "none";
  if ($("normalLogin")) $("normalLogin").style.display = "block";
  if ($("adminLogin")) $("adminLogin").style.display = "block";
  if ($("adminEditor")) $("adminEditor").style.display = "none";

  setMessage("");
  prepareLoginForm();

  if (!db) return;

  const { data } = await db.auth.getSession();

  if (data?.session?.user) {
    const allowed = await checkAdmin(data.session.user);
    if (allowed) showAdminEditor();
  }
}

function closeAdmin() {
  $("adminModal")?.classList.remove("show");
}

function showAdminEditor() {
  if ($("adminLogin")) $("adminLogin").style.display = "none";
  if ($("adminEditor")) $("adminEditor").style.display = "block";
  renderAdminList();
  renderAdminStats();
}

/* ---------- 14. ADMIN LOGIN ---------- */

async function loginAdmin() {
  if (!db) return setMessage("اتصال Supabase برقرار نیست.");

  const email = $("adminEmail")?.value.trim();
  const password = $("adminPassword")?.value;

  if (!email || !password) {
    setMessage("ایمیل و رمز عبور را وارد کن.");
    return;
  }

  setMessage("در حال ورود...");

  const { data, error } = await db.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    setMessage("ورود ناموفق بود. ایمیل یا رمز را بررسی کن.");
    console.error(error.message);
    return;
  }

  const allowed = await checkAdmin(data.user);

  if (!allowed) {
    await db.auth.signOut();
    setMessage("این حساب دسترسی مدیریت ندارد.");
    return;
  }

  setMessage("");
  showAdminEditor();
  await loadArticles();
}

function setupAdminPassword() {
  setMessage("برای ورود از ایمیل و رمز حساب Supabase استفاده کن.");
}

/* ---------- 15. CATEGORY MANAGEMENT ---------- */

async function getOrCreateCategory(name) {
  const normalized = name.trim();

  if (!normalized) throw new Error("نام دسته‌بندی را وارد کن.");

  const existing = categories.find(
    item => item.name.trim() === normalized
  );

  if (existing) return existing.id;

  const slug = makeSlug(normalized);

  const { data: found, error: findError } = await db
    .from("categories")
    .select("id,name,slug")
    .eq("slug", slug)
    .maybeSingle();

  if (findError) throw findError;
  if (found) return found.id;

  const { data, error } = await db
    .from("categories")
    .insert({ name: normalized, slug })
    .select()
    .single();

  if (error) throw error;

  categories.push(data);
  return data.id;
}

/* ---------- 16. IMAGE UPLOAD ---------- */

async function uploadArticleImage(file) {
  if (!file) return null;

  if (!isAdmin) throw new Error("دسترسی مدیر لازم است.");

  if (!file.type.startsWith("image/")) {
    throw new Error("فقط فایل تصویر مجاز است.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("حجم تصویر باید کمتر از ۵ مگابایت باشد.");
  }

  const extension = file.name.split(".").pop().toLowerCase();
  const path =
    "articles/" + currentUser.id + "/" + Date.now() + "." + extension;

  const { error } = await db.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, {
      upsert: false,
      contentType: file.type
    });

  if (error) throw error;

  const { data } = db.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}

/* ---------- 17. ADD OR EDIT ARTICLE ---------- */

async function addArticle() {
  if (!isAdmin || !currentUser) {
    return notify("ابتدا با حساب مدیر وارد شو.");
  }

  const title = $("newTitle")?.value.trim();
  const category = $("newCategory")?.value.trim();
  const description = $("newDescription")?.value.trim();

  if (!title || !category || !description) {
    return notify("عنوان، دسته‌بندی و متن مطلب الزامی است.");
  }

  const button = document.querySelector(
    '#adminEditor button[onclick="addArticle()"]'
  );

  if (button) {
    button.disabled = true;
    button.textContent = "در حال ذخیره...";
  }

  try {
    const categoryId = await getOrCreateCategory(category);

    let coverImage = null;
    const imageInput = $("newCoverImage");

    if (imageInput?.files?.[0]) {
      coverImage = await uploadArticleImage(imageInput.files[0]);
    }

    const status = $("newStatus")?.value || "published";

    const articleData = {
      title,
      slug: makeSlug(title) + "-" + Date.now(),
      excerpt: description,
      content: description,
      category_id: categoryId,
      status,
      published_at: status === "published"
        ? new Date().toISOString()
        : null,
      author_id: currentUser.id,
      updated_at: new Date().toISOString()
    };

    if (coverImage) articleData.cover_image = coverImage;

    let result;

    if (editingArticleId !== null) {
      delete articleData.slug;
      delete articleData.author_id;

      const { data, error } = await db
        .from("articles")
        .update(articleData)
        .eq("id", editingArticleId)
        .select()
        .single();

      result = { data, error };
    } else {
      const { data, error } = await db
        .from("articles")
        .insert(articleData)
        .select()
        .single();

      result = { data, error };
    }

    if (result.error) throw result.error;

    cancelEdit();
    if ($("newCoverImage")) $("newCoverImage").value = "";

    await loadArticles();
    notify("مطلب با موفقیت ذخیره شد.");

  } catch (error) {
    console.error(error);
    notify("خطا در ذخیره مطلب: " + error.message);
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "افزودن مطلب";
    }
  }
}

/* ---------- 18. EDIT ARTICLE ---------- */

function editArticle(id) {
  if (!isAdmin) return;

  const article = articles.find(
    item => String(item.id) === String(id)
  );

  if (!article) return;

  editingArticleId = article.id;

  if ($("newTitle")) $("newTitle").value = article.title || "";
  if ($("newCategory")) $("newCategory").value = article.category || "";
  if ($("newDescription")) {
    $("newDescription").value = article.content || article.description || "";
  }
  if ($("newStatus")) $("newStatus").value = article.status || "published";

  const button = document.querySelector(
    '#adminEditor button[onclick="addArticle()"]'
  );

  if (button) button.textContent = "ذخیره تغییرات";

  let cancel = $("cancelEditButton");

  if (!cancel && button) {
    cancel = document.createElement("button");
    cancel.id = "cancelEditButton";
    cancel.type = "button";
    cancel.textContent = "لغو ویرایش";
    cancel.onclick = cancelEdit;
    button.insertAdjacentElement("afterend", cancel);
  }

  if (cancel) cancel.style.display = "inline-block";

  $("newTitle")?.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}

function cancelEdit() {
  editingArticleId = null;

  if ($("newTitle")) $("newTitle").value = "";
  if ($("newCategory")) $("newCategory").value = "";
  if ($("newDescription")) $("newDescription").value = "";

  const button = document.querySelector(
    '#adminEditor button[onclick="addArticle()"]'
  );

  if (button) button.textContent = "افزودن مطلب";

  if ($("cancelEditButton")) {
    $("cancelEditButton").style.display = "none";
  }
}

/* ---------- 19. DELETE ARTICLE ---------- */

async function deleteArticle(id) {
  if (!isAdmin) return;

  if (!confirm("این مطلب حذف شود؟")) return;

  const { error } = await db
    .from("articles")
    .delete()
    .eq("id", id);

  if (error) {
    notify("حذف انجام نشد: " + error.message);
    return;
  }

  if (String(editingArticleId) === String(id)) cancelEdit();

  await loadArticles();
  notify("مطلب حذف شد.");
}

/* ---------- 20. ADMIN ARTICLE LIST ---------- */

function renderAdminList() {
  const list = $("adminArticleList");
  if (!list) return;

  list.innerHTML = "";

  articles.forEach(article => {
    const row = document.createElement("div");
    row.className = "admin-item";
    row.style.cssText =
      "display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:10px 0;padding:10px;border-bottom:1px solid #8d7436;";

    const title = document.createElement("span");
    title.textContent = article.title || "بدون عنوان";
    title.style.flex = "1";

    const status = document.createElement("small");
    status.textContent = article.status === "published"
      ? "منتشرشده"
      : "پیش‌نویس";

    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "ویرایش";
    edit.onclick = () => editArticle(article.id);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-btn";
    remove.textContent = "حذف";
    remove.onclick = () => deleteArticle(article.id);

    row.append(title, status, edit, remove);
    list.appendChild(row);
  });
}

/* ---------- 21. ADMIN STATS ---------- */

async function renderAdminStats() {
  if (!isAdmin || !$("adminEditor")) return;

  let box = $("adminStats");

  if (!box) {
    box = document.createElement("div");
    box.id = "adminStats";
    box.style.cssText =
      "display:flex;flex-wrap:wrap;gap:12px;margin:16px 0;padding:14px;border:1px solid #c9a64b;border-radius:12px;";
    $("adminEditor").prepend(box);
  }

  const published = articles.filter(
    item => item.status === "published"
  ).length;

  const drafts = articles.filter(
    item => item.status !== "published"
  ).length;

  box.textContent =
    "کل مطالب: " + articles.length +
    " | منتشرشده: " + published +
    " | پیش‌نویس: " + drafts;

  // Global visit statistics require the article_views table.
  const { count, error } = await db
    .from("article_views")
    .select("*", { count: "exact", head: true });

  const visits = document.createElement("span");
  visits.textContent = error
    ? " | آمار بازدید سراسری هنوز راه‌اندازی نشده"
    : " | بازدید ثبت‌شده: " + count;

  box.appendChild(visits);
}

/* ---------- 22. ARTICLE VIEW COUNTER ---------- */

async function recordArticleView(articleId) {
  if (!db || !articleId) return;

  const { error } = await db
    .from("article_views")
    .insert({
      article_id: articleId
    });

  if (error) {
    console.info("Article views table is not configured yet.");
  }
}

async function recordSiteVisit() {
  // Global website visit analytics will be connected
  // after the secure analytics table is created.
  try {
    const key = "amirofficial_last_visit";
    const now = Date.now();
    const previous = Number(localStorage.getItem(key) || 0);

    if (now - previous > 30 * 60 * 1000) {
      localStorage.setItem(key, String(now));
    }
  } catch (error) {
    console.info("Local visit tracking unavailable.");
  }
}

/* ---------- 23. COMMENTS ---------- */

async function loadComments(articleId, container) {
  const section = document.createElement("section");
  section.style.cssText =
    "margin-top:30px;padding-top:20px;border-top:1px solid #8b7135;";

  const heading = document.createElement("h3");
  heading.textContent = "نظرات کاربران";

  const form = document.createElement("form");

  const name = document.createElement("input");
  name.placeholder = "نام شما";
  name.required = true;

  const text = document.createElement("textarea");
  text.placeholder = "نظر خود را بنویسید...";
  text.required = true;
  text.maxLength = 1500;

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.textContent = "ارسال نظر";

  [name, text].forEach(input => {
    input.style.cssText =
      "display:block;width:100%;box-sizing:border-box;margin:10px 0;padding:12px;background:#222;color:white;border:1px solid #987b36;border-radius:8px;";
  });

  form.append(name, text, submit);

  const list = document.createElement("div");
  list.style.marginTop = "18px";

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const { error } = await db
      .from("comments")
      .insert({
        article_id: articleId,
        name: name.value.trim(),
        content: text.value.trim()
      });

    if (error) {
      notify("ارسال نظر فعلاً ممکن نیست. تنظیمات جدول نظرات را بررسی کن.");
      console.error(error.message);
      return;
    }

    notify("نظر ثبت شد و پس از تأیید نمایش داده می‌شود.");
    form.reset();
    loadComments(articleId, container);
  });

  const { data, error } = await db
    .from("comments")
    .select("id,name,content,created_at")
    .eq("article_id", articleId)
    .eq("approved", true)
    .order("created_at", { ascending: false });

  if (error) {
    const note = document.createElement("p");
    note.textContent = "بخش نظرات پس از راه‌اندازی دیتابیس فعال می‌شود.";
    list.appendChild(note);
  } else {
    (data || []).forEach(comment => {
      const item = document.createElement("div");
      item.style.cssText =
        "padding:12px;margin:8px 0;background:#1a1a1a;border-radius:8px;";

      const author = document.createElement("strong");
      author.textContent = comment.name;

      const content = document.createElement("p");
      content.textContent = comment.content;

      const date = document.createElement("small");
      date.textContent = formatDate(comment.created_at);

      item.append(author, content, date);
      list.appendChild(item);
    });
  }

  section.append(heading, form, list);
  container.appendChild(section);
}

/* ---------- 24. CONTACT FORM ---------- */

async function sendContactMessage(event) {
  event?.preventDefault();

  if (!db) return notify("اتصال برقرار نیست.");

  const name = $("contactName")?.value.trim();
  const email = $("contactEmail")?.value.trim();
  const message = $("contactMessage")?.value.trim();

  if (!name || !email || !message) {
    return notify("لطفاً تمام فیلدها را کامل کن.");
  }

  const { error } = await db
    .from("contact_messages")
    .insert({
      name,
      email,
      message
    });

  if (error) {
    console.error(error.message);
    return notify("ارسال پیام انجام نشد. تنظیمات فرم تماس را بررسی کن.");
  }

  $("contactName").value = "";
  $("contactEmail").value = "";
  $("contactMessage").value = "";

  notify("پیام شما با موفقیت ثبت شد.");
}

/* ---------- 25. GALLERY UPLOAD ---------- */

async function uploadGalleryImage(file) {
  if (!isAdmin || !currentUser) {
    throw new Error("فقط مدیر می‌تواند تصویر بارگذاری کند.");
  }

  if (!file || !file.type.startsWith("image/")) {
    throw new Error("فایل انتخاب‌شده تصویر نیست.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("حجم تصویر بیشتر از ۵ مگابایت است.");
  }

  const extension = file.name.split(".").pop().toLowerCase();
  const path =
    "gallery/" + currentUser.id + "/" + Date.now() + "." + extension;

  const { error } = await db.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, {
      contentType: file.type
    });

  if (error) throw error;

  const { data } = db.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}

/* ---------- 26. LOGOUT ---------- */

async function logoutAdmin() {
  if (db) {
    const { error } = await db.auth.signOut();

    if (error) {
      notify("خروج انجام نشد: " + error.message);
      return;
    }
  }

  currentUser = null;
  isAdmin = false;
  editingArticleId = null;

  if ($("adminEditor")) $("adminEditor").style.display = "none";
  if ($("adminLogin")) $("adminLogin").style.display = "block";
  if ($("adminPassword")) $("adminPassword").value = "";
  if ($("adminEmail")) $("adminEmail").value = "";
  if ($("adminMessage")) $("adminMessage").textContent = "";
  if ($("setupPassword")) $("setupPassword").style.display = "none";
  if ($("normalLogin")) $("normalLogin").style.display = "block";

  await loadArticles();
}

/* ---------- 27. EVENT LISTENERS ---------- */

document.addEventListener("DOMContentLoaded", () => {
  if ($("year")) {
    $("year").textContent = new Date().getFullYear();
  }

  prepareLoginForm();
  renderArticles();

  $("adminPassword")?.addEventListener("keydown", event => {
    if (event.key === "Enter") loginAdmin();
  });

  $("adminModal")?.addEventListener("click", event => {
    if (event.target.id === "adminModal") closeAdmin();
  });

  initializeSupabase();
});

/* ---------- 28. GLOBAL FUNCTIONS FOR HTML ---------- */

window.toggleMenu = toggleMenu;
window.goTo = goTo;
window.setLang = setLang;
window.moveArticles = moveArticles;
window.openAdmin = openAdmin;
window.closeAdmin = closeAdmin;
window.setupAdminPassword = setupAdminPassword;
window.loginAdmin = loginAdmin;
window.addArticle = addArticle;
window.logoutAdmin = logoutAdmin;

window.editArticle = editArticle;
window.cancelEdit = cancelEdit;
window.deleteArticle = deleteArticle;
window.sendContactMessage = sendContactMessage;
window.uploadGalleryImage = uploadGalleryImage;
window.sendPasswordRecovery = sendPasswordRecovery;
