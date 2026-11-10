
"use strict";

/* =========================
   تنظیمات و منوی موبایل
========================= */

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

/* =========================
   تغییر زبان فارسی و انگلیسی
========================= */

function setLang(lang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "fa" ? "rtl" : "ltr";

  document.body.style.fontFamily =
    lang === "fa" ? "Tahoma,Arial,sans-serif" : "Arial,sans-serif";

  document.querySelectorAll("[data-fa]").forEach(element => {
    element.textContent = element.getAttribute("data-" + lang);
  });

  document.getElementById("faBtn").classList.toggle("active", lang === "fa");
  document.getElementById("enBtn").classList.toggle("active", lang === "en");
}

/* =========================
   مطالب پیش‌فرض سایت
========================= */

const defaultArticles = [
  {
    title: "نگاهی به تحولات روز جهان",
    category: "اخبار سیاسی",
    description: "مرور رویدادها و خبرهای مهم سیاسی در سطح جهان.",
    icon: "🌍"
  },
  {
    title: "فراتر از تیترها",
    category: "تحلیل سیاسی",
    description: "بررسی زمینه‌ها، تحلیل رویدادها و مقایسه دیدگاه‌ها.",
    icon: "♟"
  },
  {
    title: "یادداشت‌های امیر",
    category: "دیدگاه شخصی",
    description: "فضایی برای بیان نظر شخصی و گفت‌وگوی محترمانه.",
    icon: "✍"
  }
];

let articles = [];

try {
  const savedArticles = localStorage.getItem("amirofficial_articles");
  articles = savedArticles
    ? JSON.parse(savedArticles)
    : defaultArticles;
  
  if (!Array.isArray(articles)) {
    articles = defaultArticles;
  }
} catch (error) {
  articles = defaultArticles;
}

let articlePosition = 0;

/* =========================
   ذخیره و نمایش مطالب
========================= */

function saveArticles() {
  try {
    localStorage.setItem(
      "amirofficial_articles",
      JSON.stringify(articles)
    );
  } catch (error) {
    alert("ذخیره‌سازی در این مرورگر ممکن نیست.");
  }

  renderArticles();
  renderAdminList();
}

function renderArticles() {
  const track = document.getElementById("articleTrack");
  const dots = document.getElementById("articleDots");

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

    dot.className = "dot" +
      (i === articlePosition ? " active" : "");

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

  const amount = firstCard.getBoundingClientRect().width + 16;

  track.style.transform =
    `translateX(${articlePosition * amount}px)`;

  document.querySelectorAll(".dot").forEach((dot, index) => {
    dot.classList.toggle("active", index === articlePosition);
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

/* =========================
   پنل مدیریت
========================= */

function openAdmin() {
  document.getElementById("adminModal").classList.add("show");

  const savedPassword = localStorage.getItem(
    "amirofficial_admin_password"
  );

  document.getElementById("setupPassword").style.display =
    savedPassword ? "none" : "block";

  document.getElementById("normalLogin").style.display =
    savedPassword ? "block" : "none";

  document.getElementById("adminLogin").style.display = "block";
  document.getElementById("adminEditor").style.display = "none";

  document.getElementById("adminMessage").textContent = "";
  document.getElementById("firstPassword").value = "";
  document.getElementById("repeatPassword").value = "";
  document.getElementById("adminPassword").value = "";
}

function closeAdmin() {
  document.getElementById("adminModal").classList.remove("show");
}

/* =========================
   تعیین رمز در اولین ورود
========================= */

function setupAdminPassword() {
  const password1 = document.getElementById("firstPassword").value;
  const password2 = document.getElementById("repeatPassword").value;
  const message = document.getElementById("adminMessage");

  if (password1.length < 8) {
    message.textContent = "رمز باید حداقل ۸ کاراکتر داشته باشد.";
    return;
  }

  if (password1 !== password2) {
    message.textContent = "دو رمز واردشده یکسان نیستند.";
    return;
  }

  try {
    localStorage.setItem(
      "amirofficial_admin_password",
      password1
    );

    message.textContent = "رمز ثبت شد. حالا وارد پنل شو.";

    document.getElementById("setupPassword").style.display = "none";
    document.getElementById("normalLogin").style.display = "block";
    document.getElementById("adminPassword").value = "";
  } catch (error) {
    message.textContent =
      "مرورگر اجازه ذخیره رمز را نمی‌دهد.";
  }
}

/* =========================
   ورود به پنل
========================= */

function loginAdmin() {
  const password = document.getElementById("adminPassword").value;
  const savedPassword = localStorage.getItem(
    "amirofficial_admin_password"
  );

  const message = document.getElementById("adminMessage");

  if (!savedPassword) {
    message.textContent = "ابتدا رمز مدیریت را تعیین کن.";
    document.getElementById("setupPassword").style.display = "block";
    document.getElementById("normalLogin").style.display = "none";
    return;
  }

  if (password === savedPassword) {
    document.getElementById("adminLogin").style.display = "none";
    document.getElementById("adminEditor").style.display = "block";

    renderAdminList();
  } else {
    message.textContent = "رمز عبور اشتباه است.";
  }
}

/* =========================
   افزودن مطلب جدید
========================= */

function addArticle() {
  const title = document.getElementById("newTitle").value.trim();
  const category = document.getElementById("newCategory").value.trim();
  const description = document.getElementById("newDescription").value.trim();
  const icon = document.getElementById("newIcon").value.trim() || "✦";

  if (!title || !category || !description) {
    alert("لطفاً عنوان، دسته‌بندی و متن مطلب را وارد کن.");
    return;
  }

  articles.unshift({
    title,
    category,
    description,
    icon
  });

  articlePosition = 0;
  saveArticles();

  document.getElementById("newTitle").value = "";
  document.getElementById("newCategory").value = "";
  document.getElementById("newDescription").value = "";
  document.getElementById("newIcon").value = "✦";

  alert("مطلب در این مرورگر ذخیره شد.");
}

/* =========================
   نمایش و حذف مطالب در پنل
========================= */

function renderAdminList() {
  const list = document.getElementById("adminArticleList");

  list.innerHTML = "";

  articles.forEach((article, index) => {
    const row = document.createElement("div");
    row.className = "admin-item";

    const title = document.createElement("span");
    title.textContent = article.title;

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-btn";
    deleteButton.textContent = "حذف";

    deleteButton.addEventListener("click", () => {
      const confirmed = confirm("این مطلب حذف شود؟");

      if (confirmed) {
        articles.splice(index, 1);
        articlePosition = 0;
        saveArticles();
      }
    });

    row.append(title, deleteButton);
    list.appendChild(row);
  });
}

/* =========================
   خروج از پنل
========================= */

function logoutAdmin() {
  document.getElementById("adminEditor").style.display = "none";
  document.getElementById("adminLogin").style.display = "block";

  const savedPassword = localStorage.getItem(
    "amirofficial_admin_password"
  );

  document.getElementById("setupPassword").style.display =
    savedPassword ? "none" : "block";

  document.getElementById("normalLogin").style.display =
    savedPassword ? "block" : "none";

  document.getElementById("adminPassword").value = "";
  document.getElementById("adminMessage").textContent = "";
}

/* ورود با کلید Enter */
document.getElementById("adminPassword").addEventListener(
  "keydown",
  event => {
    if (event.key === "Enter") {
      loginAdmin();
    }
  }
);

/* بستن پنل با کلیک روی فضای بیرونی */
document.getElementById("adminModal").addEventListener(
  "click",
  event => {
    if (event.target.id === "adminModal") {
      closeAdmin();
    }
  }
);

/* سال جاری و شروع سایت */
document.getElementById("year").textContent =
  new Date().getFullYear();

renderArticles();
