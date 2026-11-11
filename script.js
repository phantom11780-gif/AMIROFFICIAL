
"use strict";

/* =====================================
   تنظیمات اتصال به Supabase
===================================== */

const SUPABASE_URL = "https://tfbanllbaopeqyexlfxm.supabase.co";

// کلید عمومی anon یا publishable را از Supabase بردار و اینجا قرار بده.
// هرگز service_role key را در اینجاا قرار نده.
const SUPABASE_ANON_KEY = "sb_publishable_huzTGcD3rQtxOXJFGK-90Q__TBHiLzE";

let db = null;
let currentUser = null;
let isAdmin = false;
let articles = [];
let categories = [];
let articlePosition = 0;
let editingArticleId = null;

/* =====================================
   شروع و اتصال
===================================== */

async function initializeSupabase() {
  if (!window.supabase) {
    alert("کتابخانه Supabase بارگذاری نشده است. فایل index.html را بررسی کن.");
    return;
  }

  if (
    !SUPABASE_ANON_KEY ||
    SUPABASE_ANON_KEY === "کلید_عمومی_اینجا"
  ) {
    console.error("کلید عمومی Supabase وارد نشده است.");
    return;
  }

  db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

  const { data, error } = await db.auth.getSession();

  if (error) {
    console.error("خطا در دریافت نشست:", error.message);
  } else if (data.session) {
    await checkAdmin(data.session.user);
  }

  await loadArticles();

  db.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      currentUser = null;
      isAdmin = false;
      loadArticles();
    }
  });
}

/* =====================================
   منوی موبایل
===================================== */

function toggleMenu() {
  document.getElementById("navlinks").classList.toggle("open");
}

function goTo(id) {
  const section = document.getElementById(id);

  if (section) {
    section.scrollIntoView({ behavior: "smooth" });
  }

  document.getElementById("navlinks").classList.remove("open");
}

/* =====================================
   تغییر زبان فارسی و انگلیسی
===================================== */

function setLang(lang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "fa" ? "rtl" : "ltr";

  document.body.style.fontFamily =
    lang === "fa"
      ? "Tahoma,Arial,sans-serif"
      : "Arial,sans-serif";

  document.querySelectorAll("[data-fa]").forEach(element => {
    element.textContent = element.getAttribute("data-" + lang);
  });

  document.getElementById("faBtn").classList.toggle(
    "active",
    lang === "fa"
  );

  document.getElementById("enBtn").classList.toggle(
    "active",
    lang === "en"
  );
}

/* =====================================
   دریافت مطالب از دیتابیس
===================================== */

async function loadArticles() {
  if (!db) return;

  const { data: categoryData, error: categoryError } =
    await db
      .from("categories")
      .select("id,name,slug")
      .order("name");

  if (categoryError) {
    console.error("خطا در دریافت دسته‌بندی‌ها:", categoryError.message);
    categories = [];
  } else {
    categories = categoryData || [];
  }

  const { data, error } = await db
    .from("articles")
    .select("*")
    .order("published_at", { ascending: false });

  if (error) {
    console.error("خطا در دریافت مطالب:", error.message);
    return;
  }

  articles = (data || []).map(article => {
    const category = categories.find(
      item => item.id === article.category_id
    );

    return {
      ...article,
      category: category ? category.name : "",
      description: article.excerpt || article.content || "",
      icon: "✦"
    };
  });

  articlePosition = 0;
  renderArticles();

  if (isAdmin) {
    renderAdminList();
  }
}

/* =====================================
   نمایش مطالب در سایت
===================================== */

function renderArticles() {
  const track = document.getElementById("articleTrack");
  const dots = document.getElementById("articleDots");

  if (!track || !dots) return;

  track.innerHTML = "";
  dots.innerHTML = "";

  articles.forEach(article => {
    const card = document.createElement("article");
    card.className = "article";

    const icon = document.createElement("div");
    icon.className = "article-icon";
    icon.textContent = article.icon || "✦";

    const category = document.createElement("div");
    category.className = "article-tag";
    category.textContent = article.category || "";

    const title = document.createElement("h3");
    title.textContent = article.title || "";

    const description = document.createElement("p");
    description.textContent = article.description || "";

    const label = document.createElement("small");
    label.textContent = "AMIROFFICIAL";

    card.append(icon, category, title, description, label);
    track.appendChild(card);
  });

  const visible = getVisibleArticles();
  const maxPosition = Math.max(0, articles.length - visible);

  articlePosition = Math.min(articlePosition, maxPosition);

  for (let i = 0; i <= maxPosition; i++) {
    const dot = document.createElement("button");

    dot.className =
      "dot" + (i === articlePosition ? " active" : "");

    dot.setAttribute("aria-label", "صفحه " + (i + 1));

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
  const track = document.getElementById("articleTrack");
  const firstCard = track.querySelector(".article");

  if (!firstCard) return;

  const visible = getVisibleArticles();
  const maxPosition = Math.max(0, articles.length - visible);

  articlePosition = Math.max(
    0,
    Math.min(articlePosition, maxPosition)
  );

  const amount =
    firstCard.getBoundingClientRect().width + 16;

  track.style.transform =
    `translateX(${articlePosition * amount}px)`;

  document.querySelectorAll(".dot").forEach((dot, index) => {
    dot.classList.toggle(
      "active",
      index === articlePosition
    );
  });
}

function moveArticles(direction) {
  const maxPosition = Math.max(
    0,
    articles.length - getVisibleArticles()
  );

  articlePosition += direction;

  if (articlePosition > maxPosition) {
    articlePosition = 0;
  }

  if (articlePosition < 0) {
    articlePosition = maxPosition;
  }

  updateArticleSlider();
}

window.addEventListener("resize", renderArticles);

/* =====================================
   بررسی دسترسی مدیر
===================================== */

async function checkAdmin(user) {
  if (!db || !user) return false;

  const { data, error } = await db
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("خطا در بررسی نقش مدیر:", error.message);
    currentUser = null;
    isAdmin = false;
    return false;
  }

  if (!data || data.role !== "admin") {
    currentUser = null;
    isAdmin = false;
    return false;
  }

  currentUser = user;
  isAdmin = true;

  return true;
}

/* =====================================
   آماده‌سازی ورود با ایمیل
===================================== */

function prepareLoginForm() {
  const normalLogin = document.getElementById("normalLogin");

  if (!normalLogin) return;

  const passwordInput = document.getElementById("adminPassword");

  if (!document.getElementById("adminEmail")) {
    const emailInput = document.createElement("input");

    emailInput.id = "adminEmail";
    emailInput.type = "email";
    emailInput.placeholder = "ایمیل حساب مدیر";
    emailInput.autocomplete = "username";
    emailInput.required = true;
    emailInput.style.width = "100%";
    emailInput.style.boxSizing = "border-box";
    emailInput.style.marginBottom = "10px";

    normalLogin.insertBefore(emailInput, passwordInput);
  }
}

/* =====================================
   پنل مدیریت
===================================== */

async function openAdmin() {
  document.getElementById("adminModal").classList.add("show");

  document.getElementById("setupPassword").style.display = "none";
  document.getElementById("normalLogin").style.display = "block";
  document.getElementById("adminLogin").style.display = "block";
  document.getElementById("adminEditor").style.display = "none";

  document.getElementById("adminMessage").textContent = "";

  prepareLoginForm();

  const { data } = await db.auth.getSession();

  if (data && data.session) {
    const allowed = await checkAdmin(data.session.user);

    if (allowed) {
      showAdminEditor();
    }
  }
}

function closeAdmin() {
  document.getElementById("adminModal").classList.remove("show");
}

function showAdminEditor() {
  document.getElementById("adminLogin").style.display = "none";
  document.getElementById("adminEditor").style.display = "block";

  renderAdminList();
}

/* =====================================
   ورود مدیر با Supabase Auth
===================================== */

async function loginAdmin() {
  if (!db) {
    document.getElementById("adminMessage").textContent =
      "اتصال به Supabase برقرار نشده است.";
    return;
  }

  const email = document.getElementById("adminEmail")?.value.trim();
  const password = document.getElementById("adminPassword").value;
  const message = document.getElementById("adminMessage");

  if (!email || !password) {
    message.textContent = "ایمیل و رمز عبور را وارد کن.";
    return;
  }

  message.textContent = "در حال ورود...";

  const { data, error } = await db.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    message.textContent = "ورود ناموفق بود. ایمیل و رمز را بررسی کن.";
    console.error(error.message);
    return;
  }

  const allowed = await checkAdmin(data.user);

  if (!allowed) {
    await db.auth.signOut();
    message.textContent = "این حساب دسترسی مدیریت ندارد.";
    return;
  }

  message.textContent = "";
  showAdminEditor();
  await loadArticles();
}

/* این تابع دیگر برای تعیین رمز محلی استفاده نمی‌شود. */
function setupAdminPassword() {
  document.getElementById("adminMessage").textContent =
    "برای ورود باید از ایمیل و رمز حساب Supabase استفاده کنی.";
}

/* =====================================
   ساخت slug برای دسته‌بندی و مطلب
===================================== */

function makeSlug(value) {
  const slug = value
    .trim()
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "article";
}

/* =====================================
   پیدا کردن یا ساخت دسته‌بندی
===================================== */

async function getOrCreateCategory(name) {
  const normalizedName = name.trim();

  const existing = categories.find(
    item => item.name.trim() === normalizedName
  );

  if (existing) {
    return existing.id;
  }

  const slug = makeSlug(normalizedName);

  const { data: existingBySlug, error: searchError } = await db
    .from("categories")
    .select("id,name,slug")
    .eq("slug", slug)
    .maybeSingle();

  if (searchError) {
    throw searchError;
  }

  if (existingBySlug) {
    if (existingBySlug.name === normalizedName) {
      return existingBySlug.id;
    }

    throw new Error("این شناسه دسته‌بندی قبلاً استفاده شده است.");
  }

  const { data, error } = await db
    .from("categories")
    .insert({
      name: normalizedName,
      slug
    })
    .select("id,name,slug")
    .single();

  if (error) {
    throw error;
  }

  categories.push(data);

  return data.id;
}

/* =====================================
   افزودن یا ویرایش مطلب
===================================== */

async function addArticle() {
  if (!isAdmin || !currentUser) {
    alert("ابتدا با حساب مدیر وارد شو.");
    return;
  }

  const title = document.getElementById("newTitle").value.trim();
  const category = document.getElementById("newCategory").value.trim();
  const description =
    document.getElementById("newDescription").value.trim();

  if (!title || !category || !description) {
    alert("لطفاً عنوان، دسته‌بندی و متن مطلب را وارد کن.");
    return;
  }

  const submitButton = document.querySelector(
    '#adminEditor button[onclick="addArticle()"]'
  );

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "در حال ذخیره...";
  }

  try {
    const categoryId = await getOrCreateCategory(category);

    const articleData = {
      title,
      slug: makeSlug(title) + "-" + Date.now(),
      excerpt: description,
      content: description,
      category_id: categoryId,
      status: "published",
      published_at: new Date().toISOString(),
      author_id: currentUser.id,
      updated_at: new Date().toISOString()
    };

    let result;

    if (editingArticleId !== null) {
      const { data, error } = await db
        .from("articles")
        .update({
          title: articleData.title,
          excerpt: articleData.excerpt,
          content: articleData.content,
          category_id: articleData.category_id,
          updated_at: articleData.updated_at
        })
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

    if (result.error) {
      throw result.error;
    }

    editingArticleId = null;

    document.getElementById("newTitle").value = "";
    document.getElementById("newCategory").value = "";
    document.getElementById("newDescription").value = "";

    const iconInput = document.getElementById("newIcon");
    if (iconInput) iconInput.value = "✦";

    if (submitButton) {
      submitButton.textContent = "افزودن مطلب";
    }

    const cancelButton = document.getElementById("cancelEditButton");
    if (cancelButton) cancelButton.style.display = "none";

    articlePosition = 0;
    await loadArticles();

    alert(
      result.data
        ? "مطلب با موفقیت در Supabase ذخیره شد."
        : "عملیات انجام شد."
    );

  } catch (error) {
    console.error("خطا در ذخیره مطلب:", error.message);
    alert("ذخیره مطلب انجام نشد: " + error.message);
  } finally {
    if (submitButton) {
      submitButton.disabled = false;

      if (editingArticleId === null) {
        submitButton.textContent = "افزودن مطلب";
      }
    }
  }
}

/* =====================================
   ویرایش مطلب
===================================== */

function editArticle(id) {
  if (!isAdmin) return;

  const article = articles.find(
    item => String(item.id) === String(id)
  );

  if (!article) return;

  editingArticleId = article.id;

  document.getElementById("newTitle").value =
    article.title || "";

  document.getElementById("newCategory").value =
    article.category || "";

  document.getElementById("newDescription").value =
    article.description || "";

  const submitButton = document.querySelector(
    '#adminEditor button[onclick="addArticle()"]'
  );

  if (submitButton) {
    submitButton.textContent = "ذخیره تغییرات";
  }

  let cancelButton = document.getElementById("cancelEditButton");

  if (!cancelButton && submitButton) {
    cancelButton = document.createElement("button");
    cancelButton.id = "cancelEditButton";
    cancelButton.type = "button";
    cancelButton.textContent = "لغو ویرایش";
    cancelButton.onclick = cancelEdit;

    submitButton.insertAdjacentElement("afterend", cancelButton);
  }

  if (cancelButton) {
    cancelButton.style.display = "inline-block";
  }

  document.getElementById("newTitle").scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}

function cancelEdit() {
  editingArticleId = null;

  document.getElementById("newTitle").value = "";
  document.getElementById("newCategory").value = "";
  document.getElementById("newDescription").value = "";

  const submitButton = document.querySelector(
    '#adminEditor button[onclick="addArticle()"]'
  );

  if (submitButton) {
    submitButton.textContent = "افزودن مطلب";
  }

  const cancelButton = document.getElementById("cancelEditButton");

  if (cancelButton) {
    cancelButton.style.display = "none";
  }
}

/* =====================================
   نمایش فهرست مطالب در پنل
===================================== */

function renderAdminList() {
  const list = document.getElementById("adminArticleList");

  if (!list) return;

  list.innerHTML = "";

  articles.forEach(article => {
    const row = document.createElement("div");
    row.className = "admin-item";

    const title = document.createElement("span");
    title.textContent = article.title || "بدون عنوان";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "ویرایش";

    editButton.addEventListener("click", () => {
      editArticle(article.id);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-btn";
    deleteButton.textContent = "حذف";

    deleteButton.addEventListener("click", async () => {
      const confirmed = confirm("این مطلب حذف شود؟");

      if (!confirmed) return;

      const { error } = await db
        .from("articles")
        .delete()
        .eq("id", article.id);

      if (error) {
        alert("حذف مطلب انجام نشد: " + error.message);
        console.error(error.message);
        return;
      }

      if (String(editingArticleId) === String(article.id)) {
        cancelEdit();
      }

      articlePosition = 0;
      await loadArticles();

      alert("مطلب حذف شد.");
    });

    row.append(title, editButton, deleteButton);
    list.appendChild(row);
  });
}

/* =====================================
   خروج از پنل
===================================== */

async function logoutAdmin() {
  if (db) {
    const { error } = await db.auth.signOut();

    if (error) {
      alert("خروج انجام نشد: " + error.message);
      return;
    }
  }

  currentUser = null;
  isAdmin = false;
  editingArticleId = null;

  document.getElementById("adminEditor").style.display = "none";
  document.getElementById("adminLogin").style.display = "block";

  document.getElementById("adminPassword").value = "";

  const emailInput = document.getElementById("adminEmail");
  if (emailInput) emailInput.value = "";

  document.getElementById("adminMessage").textContent = "";

  document.getElementById("setupPassword").style.display = "none";
  document.getElementById("normalLogin").style.display = "block";

  await loadArticles();
}

/* =====================================
   رویدادهای صفحه
===================================== */

document.getElementById("adminPassword").addEventListener(
  "keydown",
  event => {
    if (event.key === "Enter") {
      loginAdmin();
    }
  }
);

document.getElementById("adminModal").addEventListener(
  "click",
  event => {
    if (event.target.id === "adminModal") {
      closeAdmin();
    }
  }
);

/* =====================================
   شروع سایت
===================================== */

document.getElementById("year").textContent =
  new Date().getFullYear();

prepareLoginForm();
renderArticles();
initializeSupabase();
