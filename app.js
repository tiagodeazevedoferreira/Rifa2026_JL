document.addEventListener("DOMContentLoaded", () => {

  // ================= ELEMENTOS =================
  const loginNome = document.getElementById("login-nome");
  const loginWhatsapp = document.getElementById("login-whatsapp");
  const loginSenha = document.getElementById("login-senha");
  const loginMsg = document.getElementById("login-msg");
  const loginArea = document.getElementById("login-area");
  const lembrarLogin = document.getElementById("lembrar-login");

  const btnLogin = document.getElementById("btn-login");
  const logoutBtn = document.getElementById("logout-btn");
  const userInfo = document.getElementById("user-info");

  const grid = document.getElementById("grid");
  const listaMinhas = document.getElementById("lista-minhas");

  const carrinhoLista = document.getElementById("carrinho-lista");
  const carrinhoTotal = document.getElementById("carrinho-total");
  const finalizarBtn = document.getElementById("finalizar-btn");
  const limparBtn = document.getElementById("limpar-btn");

  const pixArea = document.getElementById("pix-area");
  const valorFinal = document.getElementById("valor-final");
  const pixCode = document.getElementById("pix-code");
  const copiarPixBtn = document.getElementById("copiar-pix");

  // ADMIN
  const adminArea = document.getElementById("admin-area");
  const adminList = document.getElementById("admin-list");

  const btnDashboard = document.getElementById("btn-dashboard");
  const btnManual = document.getElementById("btn-manual");
  const dashboardContent = document.getElementById("dashboard-content");
  const manualContent = document.getElementById("manual-content");

  const manualJogadorSelect = document.getElementById("manual-jogador");
  const manualNome = document.getElementById("manual-nome");
  const manualWhatsapp = document.getElementById("manual-whatsapp");
  const manualValor = document.getElementById("manual-valor");
  const manualStatus = document.getElementById("manual-status");
  const manualData = document.getElementById("manual-data");
  const manualDataPagamento = document.getElementById("manual-data-pagamento");
  const divDataPagamento = document.getElementById("div-data-pagamento");
  const btnSalvarManual = document.getElementById("btn-salvar-manual");
  const manualMsg = document.getElementById("manual-msg");

  // ================= ESTADO =================
  let jogadores = [];
  let selecoes = {};
  let carrinho = [];
  let usuarioLogado = null;
  let reservasListener = null;

  // ================= NOMES DAS RIFAS (CORRIGIDO) =================
  const NOMES_RIFAS = {
    "1994": "Seleção 1994",
    "2002": "Seleção 2002",
    "2006": "Copa 2006",
    "premier": "Premier League",
  };

  function getNomeRifa(album) {
    return NOMES_RIFAS[album] || album || "Sem álbum";
  }

  // ================= UTIL =================
  function validarWhatsapp(numero) {
    return /^\d{11}$/.test(numero);
  }

  function embaralharJogadores() {
    for (let i = jogadores.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [jogadores[i], jogadores[j]] = [jogadores[j], jogadores[i]];
    }
  }

  // ================= PIX =================
  function gerarPix(valor) {
    const chavePix = "01cb06f7-6288-47a3-85c9-95fd4f3dc964";
    const nome = "TIAGO DE AZEVEDO";
    const cidade = "SAOPAULO";
    const txid = "RIFA25";

    const valorFormatado = Number(valor).toFixed(2);

    function format(id, value) {
      return id + String(value.length).padStart(2, '0') + value;
    }

    function crc16(payload) {
      let polinomio = 0x1021;
      let resultado = 0xFFFF;
      for (let i = 0; i < payload.length; i++) {
        resultado ^= payload.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
          if (resultado & 0x8000) resultado = (resultado << 1) ^ polinomio;
          else resultado <<= 1;
          resultado &= 0xFFFF;
        }
      }
      return resultado.toString(16).toUpperCase().padStart(4, '0');
    }

    const gui = format("00", "BR.GOV.BCB.PIX");
    const chave = format("01", chavePix);
    const merchantAccount = format("26", gui + chave);

    const payload = format("00", "01") + merchantAccount + format("52", "0000") +
      format("53", "986") + format("54", valorFormatado) + format("58", "BR") +
      format("59", nome) + format("60", cidade) + format("62", format("05", txid)) + "6304";

    return payload + crc16(payload);
  }

  // ================= SESSÃO =================
  function salvarSessao(usuario) {
    if (lembrarLogin && lembrarLogin.checked) {
      localStorage.setItem("usuarioLogado", JSON.stringify(usuario));
    } else {
      localStorage.removeItem("usuarioLogado");
    }
  }

  function recuperarSessao() {
    const data = localStorage.getItem("usuarioLogado");
    if (data) {
      try {
        usuarioLogado = JSON.parse(data);
        console.log("✅ Sessão recuperada:", usuarioLogado.nome);
        aplicarLogin();
        return true;
      } catch (e) {
        console.error("Erro ao recuperar sessão", e);
        localStorage.removeItem("usuarioLogado");
      }
    }
    return false;
  }

  function logout() {
    localStorage.removeItem("usuarioLogado");
    location.reload();
  }

  // ================= ADMIN =================
  function verificarAdmin() {
    if (!usuarioLogado) return;
    db.ref('admins/' + usuarioLogado.whatsapp).once('value', snap => {
      const isAdmin = snap.exists();
      adminArea.style.display = isAdmin ? "block" : "none";
      if (isAdmin) carregarAdmin();
    });
  }

  function carregarAdmin() {
    if (reservasListener) reservasListener.off();

    reservasListener = db.ref('reservas').on('value', snap => {
      const data = snap.val() || {};
      const lista = Object.keys(data).map(id => ({ id, ...data[id] }));
      atualizarDashboard(lista);
      renderAdmin(lista);
    });
  }

  function atualizarDashboard(lista) {
    const pagos = lista.filter(r => r.status === "pago");
    const pendentes = lista.filter(r => r.status === "pendente");
    const total = pagos.reduce((acc, r) => acc + Number(r.valor || 0), 0);

    document.getElementById("metric-total").textContent = total.toFixed(2);
    document.getElementById("metric-pagos").textContent = pagos.length;
    document.getElementById("metric-pendentes").textContent = pendentes.length;
    document.getElementById("metric-qtd").textContent = lista.length;
  }

  function renderAdmin(lista) {
    adminList.innerHTML = lista.map(r => `
      <div class="admin-item">
        <strong>${r.jogador || 'Sem nome'}</strong> - ${r.nome}<br>
        ${r.whatsapp} | R$ ${r.valor}<br>
        Status: <b>${r.status}</b><br>
        ${r.status !== "pago" ? `<button class="btn-pagar" data-id="${r.id}">✅ Confirmar pagamento</button>` : ''}
        <button class="btn-remover" data-id="${r.id}">🗑 Remover</button>
      </div>
    `).join('');
  }

  // ================= LOGIN =================
  async function loginOuCriar() {
    const nome = loginNome.value.trim();
    const whatsapp = loginWhatsapp.value.trim();
    const senha = loginSenha.value;

    if (!nome) return loginMsg.textContent = "Informe seu nome";
    if (!validarWhatsapp(whatsapp)) return loginMsg.textContent = "WhatsApp inválido (11 dígitos)";

    const senhaHash = await hashSenha(senha);
    const ref = db.ref('usuarios/' + whatsapp);

    ref.once('value').then(snap => {
      const user = snap.val();
      if (user && user.senha !== senhaHash) {
        loginMsg.textContent = "Senha incorreta";
        return;
      }
      if (!user) {
        ref.set({ nome, whatsapp, senha: senhaHash });
      }
      usuarioLogado = { nome, whatsapp };
      salvarSessao(usuarioLogado);
      aplicarLogin();
    }).catch(err => {
      loginMsg.textContent = "Erro ao fazer login";
      console.error(err);
    });
  }

  function aplicarLogin() {
    loginArea.style.display = "none";
    if (userInfo) userInfo.textContent = `Logado como: ${usuarioLogado.nome}`;
    if (logoutBtn) logoutBtn.style.display = "inline-block";

    verificarAdmin();
    carregarJogadores();
    carregarMinhasReservas();
  }

  function carregarMinhasReservas() {
    db.ref('reservas')
      .orderByChild('whatsapp')
      .equalTo(usuarioLogado.whatsapp)
      .on('value', snap => {
        const lista = Object.values(snap.val() || {});
        listaMinhas.innerHTML = lista.length
          ? lista.map(r => `<li>${r.jogador} - <b>${r.status}</b></li>`).join('')
          : "<li>Nenhuma reserva</li>";
      });
  }

  function carregarJogadores() {
    db.ref('jogadores').once('value').then(snap => {
      const data = snap.val() || {};
      jogadores = Object.keys(data).map(k => ({ id: k, ...data[k] }));
      embaralharJogadores();
      carregarReservas();
    });
  }

  function carregarReservas() {
    db.ref('reservas').on('value', snap => {
      selecoes = snap.val() || {};
      renderCards();
    });
  }

  // ================= CARDS (CORRIGIDO) =================
  function renderCards() {
    grid.innerHTML = '';

    jogadores.forEach(j => {
      const reservado = !!selecoes[j.id];

      const card = document.createElement('div');
      card.className = `card ${reservado ? 'reservado' : ''}`;

      card.innerHTML = `
        <img src="${j.linkDrive || j.link_drive || ''}" 
             onerror="this.src='https://via.placeholder.com/300x200?text=Sem+Foto'">
        <h3>${j.jogador}</h3>
        <p class="album-name">${getNomeRifa(j.album)}</p>
      `;

      if (!reservado) {
        card.onclick = () => adicionarAoCarrinho(j);
      }

      grid.appendChild(card);
    });
  }

  function adicionarAoCarrinho(j) {
    if (carrinho.find(x => x.id === j.id)) return;
    carrinho.push(j);
    atualizarCarrinho();
  }

  function atualizarCarrinho() {
    carrinhoLista.innerHTML = carrinho.map(j => `<li>${j.jogador}</li>`).join('');
    carrinhoTotal.textContent = (carrinho.length * 25).toFixed(2);
  }

  function limparCarrinho() {
    carrinho = [];
    atualizarCarrinho();
  }

  function finalizarCompra() {
    if (!carrinho.length) return alert("Carrinho vazio");

    const total = carrinho.length * 25;
    valorFinal.textContent = total.toFixed(2);
    pixCode.value = gerarPix(total);
    pixArea.style.display = "block";

    carrinho.forEach(j => {
      db.ref('reservas/' + j.id).transaction(current => {
        if (current === null) {
          return {
            jogador: j.jogador,
            nome: usuarioLogado.nome,
            whatsapp: usuarioLogado.whatsapp,
            valor: 25,
            status: "pendente",
            data: new Date().toISOString()
          };
        }
      });
    });

    carrinho = [];
    atualizarCarrinho();
  }

  // ================= INSERÇÃO MANUAL =================
  function carregarJogadoresNoSelect() {
    db.ref('jogadores').once('value').then(snap => {
      const data = snap.val() || {};
      manualJogadorSelect.innerHTML = '<option value="">Selecione o jogador...</option>';
      Object.keys(data).forEach(id => {
        const j = data[id];
        const option = document.createElement("option");
        option.value = id;
        option.textContent = `${j.jogador} (${getNomeRifa(j.album)})`;
        manualJogadorSelect.appendChild(option);
      });
    });
  }

  btnDashboard.addEventListener("click", () => {
    btnDashboard.classList.add("ativo");
    btnManual.classList.remove("ativo");
    dashboardContent.style.display = "block";
    manualContent.style.display = "none";
  });

  btnManual.addEventListener("click", () => {
    btnDashboard.classList.remove("ativo");
    btnManual.classList.add("ativo");
    dashboardContent.style.display = "none";
    manualContent.style.display = "block";
    carregarJogadoresNoSelect();
  });

  manualStatus.addEventListener("change", () => {
    divDataPagamento.style.display = manualStatus.value === "pago" ? "block" : "none";
  });

  btnSalvarManual.addEventListener("click", () => {
    const jogadorId = manualJogadorSelect.value;
    const nome = manualNome.value.trim();
    const whatsapp = manualWhatsapp.value.trim();
    const valor = parseFloat(manualValor.value) || 25;
    const status = manualStatus.value;
    let data = manualData.value ? new Date(manualData.value).toISOString() : new Date().toISOString();
    let dataPagamento = null;

    if (status === "pago" && manualDataPagamento.value) {
      dataPagamento = new Date(manualDataPagamento.value).toISOString();
    }

    if (!jogadorId || !nome || !whatsapp) {
      manualMsg.textContent = "❌ Preencha todos os campos obrigatórios";
      manualMsg.style.color = "red";
      return;
    }
    if (!validarWhatsapp(whatsapp)) {
      manualMsg.textContent = "❌ WhatsApp deve ter exatamente 11 dígitos";
      manualMsg.style.color = "red";
      return;
    }

    const reserva = {
      jogador: manualJogadorSelect.options[manualJogadorSelect.selectedIndex].textContent.split(" (")[0],
      nome,
      whatsapp,
      valor,
      status,
      data,
      ...(dataPagamento && { dataPagamento })
    };

    db.ref('reservas/' + jogadorId).set(reserva)
      .then(() => {
        manualMsg.textContent = "✅ Reserva salva com sucesso!";
        manualMsg.style.color = "green";

        manualNome.value = "";
        manualWhatsapp.value = "";
        manualStatus.value = "pendente";
        divDataPagamento.style.display = "none";
        manualDataPagamento.value = "";
      })
      .catch(err => {
        manualMsg.textContent = "❌ Erro ao salvar";
        manualMsg.style.color = "red";
        console.error(err);
      });
  });

  // ================= ADMIN BUTTONS =================
  adminList.addEventListener("click", (e) => {
    const id = e.target.dataset.id;
    if (!id) return;

    if (e.target.classList.contains("btn-pagar")) {
      db.ref('reservas/' + id).update({
        status: "pago",
        dataPagamento: new Date().toISOString()
      }).then(() => alert("Pagamento confirmado!"));
    }

    if (e.target.classList.contains("btn-remover")) {
      if (confirm("Tem certeza que deseja remover esta reserva?")) {
        db.ref('reservas/' + id).remove().then(() => alert("Reserva removida!"));
      }
    }
  });

  // ================= EVENTOS GERAIS =================
  btnLogin.addEventListener("click", loginOuCriar);
  logoutBtn.addEventListener("click", logout);
  finalizarBtn.addEventListener("click", finalizarCompra);
  limparBtn.addEventListener("click", limparCarrinho);

  copiarPixBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(pixCode.value);
      alert("✅ Código PIX copiado!");
    } catch {
      pixCode.select();
      document.execCommand("copy");
      alert("✅ Código PIX copiado!");
    }
  });

  // ================= INIT =================
  const sessaoRecuperada = recuperarSessao();
  if (!sessaoRecuperada) {
    loginArea.style.display = "flex";
  }

});