const MASTER_ADMIN_KEY = "ADMIN-2026";
const REGISTRADOR_KEY = "REGISTRADOR2026";
const DANGER_DELETE_KEY = "ELIMINARDATOS2026";

const CONFIG_KEY = "votaciones_app_config_v3";
const VOTES_KEY = "votaciones_escolares_offline";

const defaultConfig = {
  appName: "Votaciones Escolares Offline",
  logoUrl: "",
  primaryColor: "#0d3b66",
  sedes: [
    { name: "Sede Central", jornadas: ["A.M", "P.M"] },
  ],
  mesaCounter: { "Sede Central|A.M": 1, "Sede Central|P.M": 1 },
  cargos: [
    {
      id: "personero",
      name: "Personero",
      enabled: true,
      order: 1,
      candidates: [
        { name: "Lista 1", image: "assets/avatar-ana.svg" },
        { name: "Lista 2", image: "assets/avatar-luis.svg" },
        { name: "Voto en blanco", image: "assets/voto-blanco.svg" },
      ],
    },
    {
      id: "contralor",
      name: "Contralor",
      enabled: true,
      order: 2,
      candidates: [
        { name: "Lista 1", image: "assets/avatar-sara.svg" },
        { name: "Lista 2", image: "assets/avatar-miguel.svg" },
        { name: "Voto en blanco", image: "assets/voto-blanco.svg" },
      ],
    },
    {
      id: "canciller",
      name: "Canciller",
      enabled: true,
      order: 3,
      candidates: [
        { name: "Lista 1", image: "assets/avatar-camila.svg" },
        { name: "Lista 2", image: "assets/avatar-david.svg" },
        { name: "Voto en blanco", image: "assets/voto-blanco.svg" },
      ],
    },
  ],
};

document.addEventListener("DOMContentLoaded", () => {
  const config = getConfig();
  applyBrand(config);

  if (location.pathname.endsWith("votante.html")) initVotante();
  if (location.pathname.endsWith("admin.html")) initAdmin();
  if (location.pathname.endsWith("registrador.html")) initRegistrador();
});

function initVotante() {
  const config = getConfig();
  const sedeSelect = document.getElementById("sede");
  const jornadaSelect = document.getElementById("jornada");
  const mesaInput = document.getElementById("mesa");
  const cargosContainer = document.getElementById("dynamic-cargos");
  const voteForm = document.getElementById("vote-form");
  const message = document.getElementById("vote-message");

  config.sedes.forEach((sede) => sedeSelect.append(new Option(sede.name, sede.name)));

  const refreshJornadas = () => {
    const selected = config.sedes.find((s) => s.name === sedeSelect.value) || config.sedes[0];
    jornadaSelect.innerHTML = "";
    selected.jornadas.forEach((j) => jornadaSelect.append(new Option(j, j)));
    refreshMesaPreview();
  };

  const refreshMesaPreview = () => {
    const nextMesa = getNextMesa(config, sedeSelect.value, jornadaSelect.value);
    mesaInput.value = `Mesa ${nextMesa}`;
  };

  sedeSelect.addEventListener("change", refreshJornadas);
  jornadaSelect.addEventListener("change", refreshMesaPreview);

  renderCargosVotante(config, cargosContainer);
  refreshJornadas();

  voteForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const currentConfig = getConfig();

    const mesaNumber = getNextMesa(currentConfig, sedeSelect.value, jornadaSelect.value);
    const vote = {
      timestamp: new Date().toISOString(),
      sede: sedeSelect.value,
      jornada: jornadaSelect.value,
      mesa: mesaNumber,
      selections: {},
    };

    getOrderedEnabledCargos(currentConfig).forEach((cargo) => {
      vote.selections[cargo.id] = voteForm[cargo.id].value;
    });

    const votes = getVotes();
    votes.push(vote);
    localStorage.setItem(VOTES_KEY, JSON.stringify(votes));

    incrementMesa(currentConfig, sedeSelect.value, jornadaSelect.value);
    saveConfig(currentConfig);

    voteForm.reset();
    refreshJornadas();
    renderCargosVotante(currentConfig, cargosContainer);
    message.textContent = `✅ Voto registrado en Mesa ${mesaNumber}`;
  });
}

function renderCargosVotante(config, container) {
  container.innerHTML = "";
  getOrderedEnabledCargos(config).forEach((cargo) => {
    const fs = document.createElement("fieldset");
    fs.innerHTML = `<legend>${escapeHtml(cargo.name)}</legend><div class="candidate-grid" id="cargo-${cargo.id}"></div>`;
    container.append(fs);
    const holder = fs.querySelector("div");

    enforceBlankLast(cargo);

    cargo.candidates.forEach((candidate) => {
      const label = document.createElement("label");
      label.className = "candidate-card";
      label.innerHTML = `
        <input type="radio" name="${cargo.id}" value="${escapeHtml(candidate.name)}" required />
        <img src="${escapeHtml(candidate.image)}" alt="${escapeHtml(candidate.name)}" />
        <span>${escapeHtml(candidate.name)}</span>
      `;
      holder.append(label);
    });
  });
}

function initAdmin() {
  const enterBtn = document.getElementById("admin-enter-btn");
  const message = document.getElementById("admin-message");

  enterBtn.addEventListener("click", () => {
    if (document.getElementById("master-key").value !== MASTER_ADMIN_KEY) {
      message.textContent = "Clave fija incorrecta";
      return;
    }
    document.getElementById("admin-login-wrap").classList.add("hidden");
    document.getElementById("admin-panel-wrap").classList.remove("hidden");
    renderAdmin();
  });
}

function renderAdmin() {
  const config = getConfig();
  document.getElementById("cfg-app-name").value = config.appName;
  document.getElementById("cfg-logo").value = config.logoUrl;
  document.getElementById("cfg-color").value = config.primaryColor;

  bindSedeSelectors(config);
  renderSedeList(config);
  renderCargoAdmin(config);

  document.getElementById("save-brand-btn").onclick = () => {
    const next = getConfig();
    next.appName = document.getElementById("cfg-app-name").value.trim() || next.appName;
    next.logoUrl = document.getElementById("cfg-logo").value.trim();
    next.primaryColor = document.getElementById("cfg-color").value;
    saveConfig(next);
    applyBrand(next);
    alert("Marca guardada");
  };

  document.getElementById("add-sede-btn").onclick = () => {
    const sedeName = document.getElementById("new-sede").value.trim();
    const jornada = document.getElementById("new-jornada").value.trim();
    if (!sedeName || !jornada) return;

    const next = getConfig();
    let sede = next.sedes.find((s) => s.name === sedeName);
    if (!sede) {
      sede = { name: sedeName, jornadas: [] };
      next.sedes.push(sede);
    }
    if (!sede.jornadas.includes(jornada)) sede.jornadas.push(jornada);
    initMesaCounter(next, sedeName, jornada);
    saveConfig(next);
    renderAdmin();
  };

  document.getElementById("set-mesa-btn").onclick = () => {
    const sede = document.getElementById("mesa-sede").value;
    const jornada = document.getElementById("mesa-jornada").value;
    const start = Number(document.getElementById("mesa-start").value || 1);
    const next = getConfig();
    next.mesaCounter[`${sede}|${jornada}`] = Math.max(1, start);
    saveConfig(next);
    alert("Número inicial de mesa configurado");
  };

  document.getElementById("add-cargo-btn").onclick = () => {
    const name = document.getElementById("new-cargo").value.trim();
    if (!name) return;
    const next = getConfig();
    const id = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
    if (next.cargos.some((c) => c.id === id)) return;
    next.cargos.push({
      id,
      name,
      enabled: true,
      order: next.cargos.length + 1,
      candidates: [{ name: "Voto en blanco", image: "assets/voto-blanco.svg" }],
    });
    saveConfig(next);
    renderAdmin();
  };

  document.getElementById("wipe-votes-btn").onclick = () => {
    if (!dangerAllowed()) return;
    localStorage.setItem(VOTES_KEY, "[]");
    document.getElementById("danger-message").textContent = "✅ Votos eliminados";
  };

  document.getElementById("wipe-candidates-btn").onclick = () => {
    if (!dangerAllowed()) return;
    const next = getConfig();
    next.cargos = next.cargos.map((cargo) => ({
      ...cargo,
      candidates: [{ name: "Voto en blanco", image: "assets/voto-blanco.svg" }],
    }));
    saveConfig(next);
    renderAdmin();
    document.getElementById("danger-message").textContent = "✅ Candidatos eliminados";
  };
}

function bindSedeSelectors(config) {
  const sedeSel = document.getElementById("mesa-sede");
  const jornadaSel = document.getElementById("mesa-jornada");
  sedeSel.innerHTML = "";
  jornadaSel.innerHTML = "";

  config.sedes.forEach((s) => sedeSel.append(new Option(s.name, s.name)));

  const refreshJ = () => {
    const sede = config.sedes.find((s) => s.name === sedeSel.value) || config.sedes[0];
    jornadaSel.innerHTML = "";
    sede.jornadas.forEach((j) => jornadaSel.append(new Option(j, j)));
  };

  sedeSel.onchange = refreshJ;
  refreshJ();
}

function renderSedeList(config) {
  const wrap = document.getElementById("sede-list");
  wrap.innerHTML = "";
  config.sedes.forEach((sede) => {
    const p = document.createElement("p");
    p.innerHTML = `<strong>${escapeHtml(sede.name)}</strong> - Jornadas: ${escapeHtml(sede.jornadas.join(", "))}`;
    wrap.append(p);
  });
}

function renderCargoAdmin(config) {
  const wrap = document.getElementById("cargo-admin-list");
  wrap.innerHTML = "";

  getOrderedCargos(config).forEach((cargo) => {
    enforceBlankLast(cargo);

    const block = document.createElement("div");
    block.className = "card mini";
    block.innerHTML = `
      <h4>${escapeHtml(cargo.name)}</h4>
      <label><input type="checkbox" data-enable="${cargo.id}" ${cargo.enabled ? "checked" : ""}/> Activo</label>
      <label>Orden visual
        <input type="number" min="1" value="${cargo.order}" data-order="${cargo.id}" />
      </label>
      <ul>
        ${cargo.candidates.map((c, i) => `<li>${escapeHtml(c.name)} <button type="button" data-remove-cand="${cargo.id}|${i}">Quitar</button></li>`).join("")}
      </ul>
      <div class="admin-tools inline-3">
        <input id="cand-name-${cargo.id}" placeholder="Nombre candidato" />
        <input id="cand-img-${cargo.id}" placeholder="Ruta imagen (assets/foto.png)" />
        <button type="button" data-add-cand="${cargo.id}">Añadir candidato</button>
      </div>
    `;
    wrap.append(block);
  });

  wrap.querySelectorAll("[data-enable]").forEach((el) => {
    el.onchange = () => {
      const next = getConfig();
      const cargo = next.cargos.find((c) => c.id === el.dataset.enable);
      cargo.enabled = el.checked;
      saveConfig(next);
    };
  });

  wrap.querySelectorAll("[data-order]").forEach((el) => {
    el.onchange = () => {
      const next = getConfig();
      const cargo = next.cargos.find((c) => c.id === el.dataset.order);
      cargo.order = Math.max(1, Number(el.value || cargo.order));
      saveConfig(next);
      renderAdmin();
    };
  });

  wrap.querySelectorAll("[data-add-cand]").forEach((el) => {
    el.onclick = () => {
      const id = el.dataset.addCand;
      const name = document.getElementById(`cand-name-${id}`).value.trim();
      const image = document.getElementById(`cand-img-${id}`).value.trim() || "assets/voto-blanco.svg";
      if (!name || name.toLowerCase() === "voto en blanco") return;

      const next = getConfig();
      const cargo = next.cargos.find((c) => c.id === id);
      cargo.candidates.push({ name, image });
      enforceBlankLast(cargo);
      saveConfig(next);
      renderAdmin();
    };
  });

  wrap.querySelectorAll("[data-remove-cand]").forEach((el) => {
    el.onclick = () => {
      const [cargoId, idxRaw] = el.dataset.removeCand.split("|");
      const idx = Number(idxRaw);
      const next = getConfig();
      const cargo = next.cargos.find((c) => c.id === cargoId);
      if (cargo.candidates[idx]?.name.toLowerCase() === "voto en blanco") return;
      cargo.candidates.splice(idx, 1);
      enforceBlankLast(cargo);
      saveConfig(next);
      renderAdmin();
    };
  });
}

function initRegistrador() {
  const enterBtn = document.getElementById("registrador-enter-btn");
  const message = document.getElementById("registrador-message");

  enterBtn.addEventListener("click", () => {
    if (document.getElementById("registrador-key").value !== REGISTRADOR_KEY) {
      message.textContent = "Clave registrador incorrecta";
      return;
    }
    document.getElementById("registrador-login-wrap").classList.add("hidden");
    document.getElementById("registrador-panel-wrap").classList.remove("hidden");
    renderRegistrador();
  });
}

function renderRegistrador() {
  const config = getConfig();
  const filter = document.getElementById("reg-filter-sede");
  filter.innerHTML = '<option value="TODAS">Todas las sedes</option>';
  config.sedes.forEach((s) => filter.append(new Option(s.name, s.name)));

  const refresh = () => renderRegistradorStats(config, filter.value);
  filter.onchange = refresh;
  refresh();

  document.getElementById("reg-pdf-btn").onclick = () => generateActaPdf(config, filter.value);
  document.getElementById("cert-btn").onclick = () => generateCertificate(config, filter.value);
}

function renderRegistradorStats(config, sedeFilter) {
  const stats = document.getElementById("reg-stats");
  const votes = getVotesFiltered(sedeFilter);
  const zero = votes.length === 0;
  stats.innerHTML = `<p><strong>Total votos:</strong> ${votes.length}</p>${zero ? "<p class='danger-text'>⚠️ Los votos están en 0</p>" : ""}`;

  const globalWinners = calculateWinners(config, getVotesFiltered("TODAS"));
  const sedeWinners = calculateWinners(config, votes);

  const winnerCard = document.createElement("div");
  winnerCard.className = "winner-card";
  winnerCard.innerHTML = `
    <h3>Ganadores en grande</h3>
    ${Object.entries(sedeWinners).map(([cargo, name]) => `<p><strong>${escapeHtml(cargo)} (sede):</strong> ${escapeHtml(name || "Sin ganador")}</p>`).join("")}
    <hr/>
    ${Object.entries(globalWinners).map(([cargo, name]) => `<p><strong>${escapeHtml(cargo)} (todas sedes):</strong> ${escapeHtml(name || "Sin ganador")}</p>`).join("")}
  `;
  stats.append(winnerCard);

  const byMesa = groupVotesByMesa(votes);
  const mesaCard = document.createElement("div");
  mesaCard.className = "stat-card";
  mesaCard.innerHTML = `<strong>Estadística por mesa/sede/jornada</strong><ul>${Object.entries(byMesa).map(([k, c]) => `<li>${escapeHtml(k)}: ${c} votos</li>`).join("") || "<li>Sin datos</li>"}</ul>`;
  stats.append(mesaCard);
}

function generateActaPdf(config, sedeFilter) {
  const votes = getVotesFiltered(sedeFilter);
  const winnersSede = calculateWinners(config, votes);
  const winnersGlobal = calculateWinners(config, getVotesFiltered("TODAS"));
  const byMesa = groupVotesByMesa(votes);

  const cargoTables = getOrderedEnabledCargos(config)
    .map((cargo) => {
      const counts = {};
      votes.forEach((v) => {
        const pick = v.selections[cargo.id];
        if (pick) counts[pick] = (counts[pick] || 0) + 1;
      });
      const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([name, c]) => `<tr><td>${escapeHtml(name)}</td><td>${c}</td></tr>`).join("") || "<tr><td>Sin votos</td><td>0</td></tr>";
      return `<h3>${escapeHtml(cargo.name)}</h3><table><tr><th>Candidato</th><th>Votos</th></tr>${rows}</table><div class='winner-big'>GANADOR ${escapeHtml(cargo.name)}: ${escapeHtml(winnersSede[cargo.name] || "Sin ganador")}</div>`;
    })
    .join("");

  const logo = config.logoUrl ? `<img src='${escapeHtml(config.logoUrl)}' style='width:90px;height:90px;object-fit:contain'/>` : "";

  const win = window.open("", "_blank");
  win.document.write(`
    <html><head><title>Acta ${escapeHtml(sedeFilter)}</title>
    <style>
      body{font-family:Arial;padding:20px;color:#111} table{width:100%;border-collapse:collapse;margin:8px 0 16px} th,td{border:1px solid #222;padding:6px}
      .head{display:flex;gap:16px;align-items:center}.winner-big{font-size:24px;font-weight:800;border:2px solid #111;padding:8px;margin:8px 0}
    </style></head>
    <body>
      <div class='head'>${logo}<div><h1>${escapeHtml(config.appName)}</h1><p>Sede del acta: ${escapeHtml(sedeFilter)}</p><p>Total votos: ${votes.length}</p><p>Fecha: ${new Date().toLocaleString()}</p></div></div>
      ${cargoTables}
      <h3>Resumen por mesa/jornada</h3>
      <ul>${Object.entries(byMesa).map(([k, c]) => `<li>${escapeHtml(k)}: ${c} votos</li>`).join("") || "<li>Sin datos</li>"}</ul>
      <h3>Ganador en todas las sedes</h3>
      <ul>${Object.entries(winnersGlobal).map(([cargo, winner]) => `<li><strong>${escapeHtml(cargo)}:</strong> ${escapeHtml(winner || "Sin ganador")}</li>`).join("")}</ul>
      <p>Firma Registrador: __________________________</p>
    </body></html>
  `);
  win.document.close();
  win.print();
}

function generateCertificate(config, sedeFilter) {
  const votes = getVotesFiltered(sedeFilter);
  const text = votes.length === 0
    ? "CERTIFICADO: No se registraron votos (votos en 0)."
    : `CERTIFICADO: Se registraron ${votes.length} votos válidos en ${sedeFilter}.`;

  const logo = config.logoUrl ? `<img src='${escapeHtml(config.logoUrl)}' style='width:80px;height:80px;object-fit:contain'/>` : "";
  const win = window.open("", "_blank");
  win.document.write(`<html><body style='font-family:Arial;padding:24px'><div>${logo}</div><h1>${escapeHtml(config.appName)}</h1><h2>Certificado de votación</h2><p>${escapeHtml(text)}</p><p>Fecha: ${new Date().toLocaleString()}</p><p>Firma Registrador: ______________________</p></body></html>`);
  win.document.close();
  win.print();
}

function getVotesFiltered(sedeFilter) {
  const votes = getVotes();
  if (sedeFilter === "TODAS") return votes;
  return votes.filter((v) => v.sede === sedeFilter);
}

function groupVotesByMesa(votes) {
  const map = {};
  votes.forEach((v) => {
    const key = `Mesa ${v.mesa} - ${v.sede} - Jornada ${v.jornada}`;
    map[key] = (map[key] || 0) + 1;
  });
  return map;
}

function calculateWinners(config, votes) {
  const winners = {};
  getOrderedEnabledCargos(config).forEach((cargo) => {
    const tally = {};
    votes.forEach((v) => {
      const pick = v.selections[cargo.id];
      if (!pick) return;
      tally[pick] = (tally[pick] || 0) + 1;
    });
    const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    winners[cargo.name] = sorted[0]?.[0] || null;
  });
  return winners;
}

function getOrderedCargos(config) {
  return [...config.cargos].sort((a, b) => a.order - b.order);
}

function getOrderedEnabledCargos(config) {
  const ordered = getOrderedCargos(config).filter((c) => c.enabled);
  const expected = ["personero", "contralor", "canciller"];
  const front = [];
  expected.forEach((id) => {
    const found = ordered.find((c) => c.id === id);
    if (found) front.push(found);
  });
  const rest = ordered.filter((c) => !expected.includes(c.id));
  return [...front, ...rest];
}

function getNextMesa(config, sede, jornada) {
  const key = `${sede}|${jornada}`;
  initMesaCounter(config, sede, jornada);
  return config.mesaCounter[key];
}

function incrementMesa(config, sede, jornada) {
  const key = `${sede}|${jornada}`;
  initMesaCounter(config, sede, jornada);
  config.mesaCounter[key] += 1;
}

function initMesaCounter(config, sede, jornada) {
  const key = `${sede}|${jornada}`;
  if (!config.mesaCounter[key]) config.mesaCounter[key] = 1;
}

function enforceBlankLast(cargo) {
  const blank = cargo.candidates.find((c) => c.name.toLowerCase() === "voto en blanco");
  const others = cargo.candidates.filter((c) => c.name.toLowerCase() !== "voto en blanco");
  cargo.candidates = [...others, blank || { name: "Voto en blanco", image: "assets/voto-blanco.svg" }];
}

function dangerAllowed() {
  const ok = document.getElementById("danger-key").value === DANGER_DELETE_KEY;
  if (!ok) document.getElementById("danger-message").textContent = "❌ Clave de eliminación incorrecta";
  return ok;
}

function applyBrand(config) {
  const name = document.getElementById("brand-name");
  const sede = document.getElementById("brand-sede");
  const logo = document.getElementById("brand-logo");

  if (name) name.textContent = config.appName;
  if (sede) sede.textContent = "Sistema electoral escolar";
  document.documentElement.style.setProperty("--brand", config.primaryColor);
  if (logo && config.logoUrl) {
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
  if (!raw.mesaCounter) raw.mesaCounter = {};
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
