console.log("app.js loaded");

// ================== GLOBAL ==================
let currentUser = null;
let map = null;
let marker = null;
let selectedLat = null;
let selectedLng = null;

// ================== SUPABASE ==================
const supabaseUrl = "https://urgwhbnpsbttadoafgcj.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyZ3doYm5wc2J0dGFkb2FmZ2NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NzI5MzIsImV4cCI6MjA4NjI0ODkzMn0.a-Nn8AIPYbLWcJ0SyOjqmy17uAJfdDkxuOCrKn3diB4";
const db = window.supabase.createClient(supabaseUrl, supabaseKey);

// ================== LOGIN ==================
function login() {
  const username = document.getElementById("username").value.trim();
  const role = document.getElementById("role").value;

  if (!username) {
    alert("Введите имя");
    return;
  }

  currentUser = { username, role };

  document.getElementById("loginPanel").style.display = "none";
  document.getElementById("mainInterface").style.display = "flex";
  document.getElementById("welcome").innerText =
    `Привет, ${username} (${role})`;

  initMap();
  loadLots();
}

// ================== CREATE LOT ==================
async function createLot() {
  const title = document.getElementById("title").value.trim();
  const price = Number(document.getElementById("price").value);
  const amount = Number(document.getElementById("amount").value);
  const unit = document.getElementById("unit").value;
  const fileInput = document.getElementById("lotImage");
  const file = fileInput.files[0];

  if (!title || price <= 0 || amount <= 0) {
    alert("Заполните поля корректно");
    return;
  }

  let imageUrl = null;

  // ===== UPLOAD IMAGE =====
  if (file) {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;

    const { data, error } = await db.storage
      .from("lot-images")
      .upload(fileName, file);

    if (error) {
      console.error(error);
      alert("Ошибка загрузки фото");
      return;
    }

    imageUrl = `${supabaseUrl}/storage/v1/object/public/lot-images/${fileName}`;
  }

  const type = currentUser.role === "buyer" ? "buy" : "sell";

  await db.from("lots").insert([{
    title,
    price,
    amount,
    unit,
    type,
    seller: currentUser.username,
    buyer: null,
    lat: selectedLat,
    lng: selectedLng,
    image_url: imageUrl
  }]);

  document.getElementById("title").value = "";
  document.getElementById("price").value = "";
  document.getElementById("amount").value = "";
  fileInput.value = "";

  loadLots();
}


// ================== LOAD LOTS ==================
async function loadLots() {
  const lotsDiv = document.getElementById("lots");
  lotsDiv.innerHTML = "";

  const { data: lots, error } = await db
    .from("lots")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  lots.forEach(lot => {
    const div = document.createElement("div");
    div.className = `lot ${lot.type === "sell" ? "seller" : "buyer"}`;

    let action = "";
    if (!lot.buyer) {
      if (currentUser.role === "buyer" && lot.type === "sell") {
        action = `<button onclick="deal('${lot.id}')">Купить</button>`;
      }
      if (currentUser.role === "seller" && lot.type === "buy") {
        action = `<button onclick="deal('${lot.id}')">Продать</button>`;
      }
    }

    let routeBtn = (lot.lat && lot.lng)
      ? `<button onclick="openRoute(${lot.lat}, ${lot.lng})">Маршрут</button>`
      : "";

    div.innerHTML = `
  <b>${lot.title}</b><br>
  ${lot.type === "sell" ? "Продаю" : "Скупаем"}<br>
  Цена: ${lot.price} тг / ${lot.unit}<br>
  Количество: ${lot.amount} ${lot.unit}<br>
  Создал: ${lot.seller}<br>
  ${lot.image_url ? `<img src="${lot.image_url}" style="height:150px;object-fit:cover;border-radius:8px;margin-top:8px;">` : ""}
  ${lot.buyer ? "Сделка с: " + lot.buyer : action}
  ${routeBtn}
`;


    lotsDiv.appendChild(div);
  });
}

// ================== DEAL ==================
async function deal(id) {
  await db
    .from("lots")
    .update({ buyer: currentUser.username })
    .eq("id", id);

  loadLots();
}

// ================== MAP ==================
function initMap() {
  if (map) return;

  map = L.map("map").setView([51.1694, 71.4491], 12);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(map);

  map.on("click", e => {
    selectedLat = e.latlng.lat;
    selectedLng = e.latlng.lng;

    if (marker) map.removeLayer(marker);
    marker = L.marker(e.latlng).addTo(map);
  });

  // Кнопки открытия карты
document.getElementById("openMapBtn").onclick = () => {
  document.getElementById("mapWrapper").style.display = "block";
  document.body.classList.add("map-open");
  setTimeout(() => map.invalidateSize(), 200);
};

document.getElementById("closeMapBtn").onclick = () => {
  document.getElementById("mapWrapper").style.display = "none";
  document.body.classList.remove("map-open");
};

}

// ================== ROUTE ==================
function openRoute(lat, lng) {
  window.open(
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    "_blank"
  );
}
