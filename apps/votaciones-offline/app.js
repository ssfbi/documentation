const MASTER_ADMIN_KEY = "ADMIN-2026";
const CONFIG_KEY = "votaciones_app_config_v2";
const VOTES_KEY = "votaciones_escolares_offline";

const defaultConfig = {
  appName: "Votaciones Escolares Offline",
  logoUrl: "",
  primaryColor: "#0d3b66",
  currentSede: "Sede Principal",
  sedes: ["Sede Principal"],
  cargos: [
    {
      id: "personero",
      name: "Personero",
      enabled: true,
      candidates: [
        { name: "Lista 1", image: "assets/avatar-ana.svg" },
        { name: "Lista 2", image: "assets/avatar-luis.svg" },
        { name: "Voto en blanco", image: "assets/voto-blanco.svg" },
      ],
    },
  ],
};

document.addEventListener("DOMContentLoaded", () => {
  if (location.pathname.endsWith("votante.html")) initVotante();
  if (location.pathname.endsWith("admin.html")) initAdmin();
});

function initVotante() {
  const config = getConfig();
  applyBrand(config);

  const sedeSelect = document.getElementById("sede");
  const cargosContainer = document.getElementById("dynamic-cargos");
  const voteForm = document.getElementById("vote-form");
  const message = document.getElementById("vote-message");

  config.sedes.forEach((sede) => {
    const opt = document.createElement("option");
    opt.value = sede;
    opt.textContent = sede;
    sedeSelect.append(opt);
  });
  sedeSelect.value = config.currentSede;

  config.cargos.filter((c) => c.enabled).forEach((cargo) => {
    const fs = document.createElement("fieldset");
    fs.innerHTML = `<legend>${cargo.name}</legend><div class="candidate-grid" id="cargo-${cargo.id}"></div>`;
    cargosContainer.append(fs);

    const holder = fs.querySelector("div");
    cargo.candidates.forEach((candidate, index) => {
      const label = document.createElement("label");
      label.className = "candidate-card";
      label.innerHTML = `
        <input type="radio" name="${cargo.id}" value="${escapeHtml(candidate.name)}" ${index === 0 ? "" : ""} required />
        <img src="${escapeHtml(candidate.image || "assets/voto-blanco.svg")}" alt="${escapeHtml(candidate.name)}" />
        <span>${escapeHtml(candidate.name)}</span>
      `;
      holder.append(label);
    });
  });

  voteForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const vote = {
      timestamp: new Date().toISOString(),
      sede: sedeSelect.value,
      mesa: document.getElementById("mesa").value.trim(),
      selections: {},
    };

    config.cargos.filter((c) => c.enabled).forEach((cargo) => {
      vote.selections[cargo.id] = voteForm[cargo.id].value;
    });

    const votes = getVotes();
    votes.push(vote);
    localStorage.setItem(VOTES_KEY, JSON.stringify(votes));

    voteForm.reset();
    sedeSelect.value = config.currentSede;
    message.textContent = "✅ Voto registrado";
  });
}

function initAdmin() {
  const enterBtn = document.getElementById("admin-enter-btn");
  const message = document.getElementById("admin-message");
  const loginWrap = document.getElementById("admin-login-wrap");
  const panel = document.getElementById("admin-panel-wrap");

  enterBtn.addEventListener("click", () => {
    if (document.getElementById("master-key").value !== MASTER_ADMIN_KEY) {
      message.textContent = "Clave fija incorrecta";
      return;
    }
    loginWrap.classList.add("hidden");
    panel.classList.remove("hidden");
    renderAdmin();
  });
}

function renderAdmin() {
  const config = getConfig();

  document.getElementById("cfg-app-name").value = config.appName;
  document.getElementById("cfg-logo").value = config.logoUrl;
  document.getElementById("cfg-color").value = config.primaryColor;

  const currentSede = document.getElementById("cfg-current-sede");
  const filterSede = document.getElementById("filter-sede");
  currentSede.innerHTML = "";
  filterSede.innerHTML = '<option value="TODAS">Todas las sedes</option>';
  config.sedes.forEach((sede) => {
    currentSede.append(new Option(sede, sede));
    filterSede.append(new Option(sede, sede));
  });
  currentSede.value = config.currentSede;

  renderSedes(config);
  renderCargos(config);
  renderStats(config, filterSede.value);

  document.getElementById("save-brand-btn").onclick = () => {
    const next = getConfig();
    next.appName = document.getElementById("cfg-app-name").value.trim() || next.appName;
    next.logoUrl = document.getElementById("cfg-logo").value.trim();
    next.primaryColor = document.getElementById("cfg-color").value;
    next.currentSede = document.getElementById("cfg-current-sede").value;
    saveConfig(next);
    alert("Configuración guardada");
  };

  document.getElementById("add-sede-btn").onclick = () => {
    const name = document.getElementById("new-sede").value.trim();
    if (!name) return;
    const next = getConfig();
    if (!next.sedes.includes(name)) next.sedes.push(name);
    saveConfig(next);
    renderAdmin();
  };

  document.getElementById("add-cargo-btn").onclick = () => {
    const name = document.getElementById("new-cargo").value.trim();
    if (!name) return;
    const next = getConfig();
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (next.cargos.some((c) => c.id === id)) return;
    next.cargos.push({
      id,
      name,
      enabled: true,
      candidates: [{ name: "Voto en blanco", image: "assets/voto-blanco.svg" }],
    });
    saveConfig(next);
    renderAdmin();
  };

  filterSede.onchange = () => renderStats(getConfig(), filterSede.value);
  document.getElementById("pdf-btn").onclick = () => generatePdfReport(getConfig(), filterSede.value);
}

function renderSedes(config) {
  const ul = document.getElementById("sede-list");
  ul.innerHTML = "";
  config.sedes.forEach((sede) => {
    const li = document.createElement("li");
    li.textContent = sede;
    ul.append(li);
  });
}

function renderCargos(config) {
  const wrap = document.getElementById("cargo-admin-list");
  wrap.innerHTML = "";

  config.cargos.forEach((cargo) => {
    const div = document.createElement("div");
    div.className = "card mini";
    const candidates = cargo.candidates.map((c, i) => `<li>${escapeHtml(c.name)} <button data-cargo="${cargo.id}" data-remove="${i}" type="button">Quitar</button></li>`).join("");
    div.innerHTML = `
      <h4>${escapeHtml(cargo.name)}</h4>
      <label><input type="checkbox" data-enable="${cargo.id}" ${cargo.enabled ? "checked" : ""}/> Activo en votación</label>
      <ul>${candidates}</ul>
      <div class="admin-tools inline">
        <input id="cand-name-${cargo.id}" placeholder="Nombre candidato" />
        <input id="cand-img-${cargo.id}" placeholder="URL imagen" />
        <button type="button" data-addcand="${cargo.id}">Añadir candidato</button>
      </div>
    `;
    wrap.append(div);
  });

  wrap.querySelectorAll("[data-enable]").forEach((el) => {
    el.onchange = () => {
      const next = getConfig();
      const c = next.cargos.find((x) => x.id === el.dataset.enable);
      c.enabled = el.checked;
      saveConfig(next);
    };
  });

  wrap.querySelectorAll("[data-addcand]").forEach((el) => {
    el.onclick = () => {
      const id = el.dataset.addcand;
      const name = document.getElementById(`cand-name-${id}`).value.trim();
      const image = document.getElementById(`cand-img-${id}`).value.trim() || "assets/voto-blanco.svg";
      if (!name) return;
      const next = getConfig();
      next.cargos.find((x) => x.id === id).candidates.push({ name, image });
      saveConfig(next);
      renderAdmin();
    };
  });

  wrap.querySelectorAll("[data-remove]").forEach((el) => {
    el.onclick = () => {
      const next = getConfig();
      const cargo = next.cargos.find((x) => x.id === el.dataset.cargo);
      cargo.candidates.splice(Number(el.dataset.remove), 1);
      saveConfig(next);
      renderAdmin();
    };
  });
}

function renderStats(config, sede) {
  const votes = getVotes().filter((v) => (sede === "TODAS" ? true : v.sede === sede));
  const stats = document.getElementById("stats");
  stats.innerHTML = `<p><strong>Total votos:</strong> ${votes.length}</p>`;

  config.cargos.forEach((cargo) => {
    if (!cargo.enabled) return;
    const map = {};
    votes.forEach((v) => {
      const val = v.selections?.[cargo.id];
      if (!val) return;
      map[val] = (map[val] || 0) + 1;
    });
    const rows = Object.entries(map).sort((a, b) => b[1] - a[1]).map(([k, c]) => `<li>${escapeHtml(k)}: ${c}</li>`).join("") || "<li>Sin votos</li>";
    const card = document.createElement("div");
    card.className = "stat-card";
    card.innerHTML = `<strong>${escapeHtml(cargo.name)}</strong><ul>${rows}</ul>`;
    stats.append(card);
  });
}

function generatePdfReport(config, sede) {
  const votes = getVotes().filter((v) => (sede === "TODAS" ? true : v.sede === sede));
  const body = config.cargos
    .filter((c) => c.enabled)
    .map((cargo) => {
      const map = {};
      votes.forEach((v) => {
        const val = v.selections?.[cargo.id];
        if (val) map[val] = (map[val] || 0) + 1;
      });
      const rows = Object.entries(map).map(([k, c]) => `<tr><td>${escapeHtml(k)}</td><td>${c}</td></tr>`).join("") || "<tr><td>Sin votos</td><td>0</td></tr>";
      return `<h3>${escapeHtml(cargo.name)}</h3><table><tr><th>Candidato</th><th>Votos</th></tr>${rows}</table>`;
    })
    .join("");

  const w = window.open("", "_blank");
  w.document.write(`<html><body><h1>Acta - ${escapeHtml(config.appName)}</h1><p>Sede: ${escapeHtml(sede)}</p><p>Total: ${votes.length}</p>${body}<p>Firma: __________________</p></body></html>`);
  w.document.close();
  w.print();
}

function applyBrand(config) {
  document.getElementById("brand-name").textContent = config.appName;
  document.getElementById("brand-sede").textContent = `Sede configurada: ${config.currentSede}`;
  document.documentElement.style.setProperty("--brand", config.primaryColor);
  const logo = document.getElementById("brand-logo");
  if (config.logoUrl) {
    logo.src = config.logoUrl;
    logo.classList.remove("hidden");
  }
}

function getConfig() {
  const raw = JSON.parse(localStorage.getItem(CONFIG_KEY) || "null");
  if (!raw) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(defaultConfig));
    return JSON.parse(JSON.stringify(defaultConfig));
  }
  return raw;
}

function saveConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

function getVotes() {
  return JSON.parse(localStorage.getItem(VOTES_KEY) || "[]");
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
