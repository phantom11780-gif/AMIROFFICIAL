
const products = [
  {
    id: 1,
    name: "ماوس گیمینگ حرفه‌ای",
    price: 1850000,
    category: "ماوس",
    image: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=700"
  },
  {
    id: 2,
    name: "کیبورد مکانیکال RGB",
    price: 3200000,
    category: "کیبورد",
    image: "https://images.unsplash.com/photo-1595225476474-87563907a212?w=700"
  },
  {
    id: 3,
    name: "هدست گیمینگ",
    price: 2450000,
    category: "هدست",
    image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=700"
  },
  {
    id: 4,
    name: "دسته بازی",
    price: 1900000,
    category: "کنترلر",
    image: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=700"
  },
  {
    id: 5,
    name: "مانیتور گیمینگ",
    price: 12500000,
    category: "مانیتور",
    image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=700"
  },
  {
    id: 6,
    name: "میکروفون گیمینگ",
    price: 1750000,
    category: "میکروفون",
    image: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=700"
  }
];

let cart = [];

function formatPrice(price) {
  return price.toLocaleString("fa-IR") + " تومان";
}

function displayProducts() {
  const container = document.getElementById("product-list");

  container.innerHTML = products.map(product => `
    <article class="product-card">
      <div class="product-image">
        <img
          src="${product.image}"
          alt="${product.name}"
          loading="lazy"
          onerror="this.style.display='none';this.parentElement.textContent='🎮'"
        >
      </div>

      <span class="product-category">${product.category}</span>
      <h3>${product.name}</h3>

      <div class="price">${formatPrice(product.price)}</div>

      <button class="add-btn" onclick="addToCart(${product.id})">
        افزودن به سبد خرید +
      </button>
    </article>
  `).join("");
}

function addToCart(id) {
  const product = products.find(item => item.id === id);
  const existing = cart.find(item => item.id === id);

  if (existing) {
    existing.quantity++;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  updateCart();
  alert("محصول با موفقیت به سبد خرید اضافه شد.");
}

function updateCart() {
  const count = cart.reduce(
    (sum, item) => sum + item.quantity, 0
  );

  document.getElementById("cart-count").textContent =
    count.toLocaleString("fa-IR");
}

function showCart() {
  if (cart.length === 0) {
    alert("سبد خرید شما خالی است.");
    return;
  }

  let message = "🛒 سبد خرید NOVA GAMING\n\n";
  let total = 0;

  cart.forEach(item => {
    const subtotal = item.price * item.quantity;
    total += subtotal;

    message += `${item.name}\n`;
    message += `تعداد: ${item.quantity}\n`;
    message += `قیمت: ${formatPrice(subtotal)}\n\n`;
  });

  message += "------------------\n";
  message += `مبلغ کل: ${formatPrice(total)}`;

  alert(message);
}

displayProducts();
