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
  const adminArea = document.getElementById("admin-area");

  const grid = document.getElementById("grid");
  const listaMinhas = document.getElementById("lista-minhas");

  const carrinhoLista = document.getElementById("carrinho-lista");
  const carrinhoTotal = document.getElementById("carrinho-total");

  const finalizarBtn = document.getElementById("finalizar-btn");
  const limparBtn = document.getElementById("limpar-btn");

  const pixArea = document.getElementById("pix-area");
  const valorFinal = document.getElementById("valor-final");
  const pixCode = document.getElementById("pix-code");

  const metricTotal = document.getElementById("metric-total");
  const metricPagos = document.getElementById("metric-pagos");
  const metricPendentes = document.getElementById("metric-pendentes");
  const metricQtd = document.getElementById("metric-qtd");

  const adminList = document.getElementById("admin-list");

  // ================= ESTADO =================
  let jogadores = [];
  let selecoes = {};
  let carrinho = [];
  let usuarioLogado = null;

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
// ================= PIX =================
function gerarPix(valor) {
  const chavePix = "01cb06f7-6288-47a3-85c9-95fd4f3dc964";
  const nome = "TIAGO DE AZEVEDO";
  const cidade = "SAOPAULO";        // sem espaço (mais seguro)
  const txid = "RIFA25";

  const valorFormatado = Number(valor).toFixed(2);

  function format(id, value) {
    return id + String(value.length).padStart(2, '0') + value;
  }

  // CRC16 CORRETO PARA PIX (padrão BC)
  function crc16(payload) {
    let polinomio = 0x1021;
    let resultado = 0xFFFF;

    for (let i = 0; i < payload.length; i++) {
      resultado ^= payload.charCodeAt(i) << 8;

      for (let j = 0; j < 8; j++) {
        if (resultado & 0x8000) {
          resultado = (resultado << 1) ^ polinomio;
        } else {
          resultado <<= 1;
        }
        resultado &= 0xFFFF;
      }
    }
    return resultado.toString(16).toUpperCase().padStart(4, '0');
  }

  // Monta o payload EMV
  const gui = format("00", "BR.GOV.BCB.PIX");
  const chave = format("01", chavePix);
  const merchantAccount = format("26", gui + chave);

  const payload =
    format("00", "01") +
    merchantAccount +
    format("52", "0000") +
    format("53", "986") +
    format("54", valorFormatado) +
    format("58", "BR") +
    format("59", nome) +
    format("60", cidade) +
    format("62", format("05", txid)) +
    "6304";

  const crc = crc16(payload);
  return payload + crc;
}
  // ================= SESSÃO =================
  function salvarSessao(usuario) {
    if (lembrarLogin.checked) {
      localStorage.setItem("usuarioLogado", JSON.stringify(usuario));
    }
  }

  function recuperarSessao() {
    const data = localStorage.getItem("usuarioLogado");
    if (data) {
      usuarioLogado = JSON.parse(data);
      aplicarLogin();
    }
  }

  function logout() {
    localStorage.removeItem("usuarioLogado");
    location.reload();
  }

  // ================= ADMIN =================
  function verificarAdmin() {
    db.ref('admins/' + usuarioLogado.whatsapp)
      .on('value', snap => {
        adminArea.style.display = snap.exists() ? "block" : "none";
        if (snap.exists()) carregarAdmin();
      });
  }

  function carregarAdmin() {
    db.ref('reservas').on('value', snap => {
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

    metricTotal.textContent = total.toFixed(2);
    metricPagos.textContent = pagos.length;
    metricPendentes.textContent = pendentes.length;
    metricQtd.textContent = lista.length;
  }

  function renderAdmin(lista) {
    adminList.innerHTML = lista.map(r => `
      <div class="admin-item">
        <strong>${r.jogador}</strong> - ${r.nome}<br>
        ${r.whatsapp} | R$${r.valor}<br>
        Status: <b>${r.status}</b>
        ${r.status !== "pago" ? `<button class="btn-pagar" data-id="${r.id}">Confirmar pagamento</button>` : ''}
        <button class="btn-remover" data-id="${r.id}">Remover</button>
      </div>
    `).join('');
  }

  adminList.addEventListener("click", (e) => {
    const id = e.target.dataset.id;
    if (!id) return;

    if (e.target.classList.contains("btn-pagar")) {
      db.ref('reservas/' + id).update({
        status: "pago",
        dataPagamento: new Date().toISOString()
      });
    }

    if (e.target.classList.contains("btn-remover")) {
      if (confirm("Remover reserva?")) {
        db.ref('reservas/' + id).remove();
      }
    }
  });

  // ================= LOGIN =================
  async function loginOuCriar() {
    const nome = loginNome.value.trim();
    const whatsapp = loginWhatsapp.value.trim();
    const senha = loginSenha.value;

    if (!nome) return loginMsg.textContent = "Informe seu nome";
    if (!validarWhatsapp(whatsapp)) return loginMsg.textContent = "WhatsApp inválido";

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
    });
  }

  function aplicarLogin() {
    loginArea.style.display = "none";
    userInfo.textContent = "Logado como: " + usuarioLogado.nome;
    logoutBtn.style.display = "inline-block";

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

  function renderCards() {
    grid.innerHTML = '';

    jogadores.forEach(j => {
      const reservado = selecoes[j.id];

      const card = document.createElement('div');
      card.className = `card ${reservado ? 'reservado' : ''}`;

      card.innerHTML = `
        <img src="${j.linkDrive || j.link_drive}">
        <h3>${j.jogador}</h3>
      `;

      if (!reservado) {
        card.onclick = () => adicionar(j);
      }

      grid.appendChild(card);
    });
  }

  function adicionar(j) {
    if (carrinho.find(x => x.id === j.id)) return;
    carrinho.push(j);
    atualizarCarrinho();
  }

  function atualizarCarrinho() {
    carrinhoLista.innerHTML = carrinho.map(j => `<li>${j.jogador}</li>`).join('');
    carrinhoTotal.textContent = carrinho.length * 25;
  }

  function limparCarrinho() {
    carrinho = [];
    atualizarCarrinho();
  }

  function finalizar() {
    if (!carrinho.length) return alert("Carrinho vazio");

    const total = carrinho.length * 25;

    valorFinal.textContent = total;
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
        return;
      });
    });

    carrinho = [];
    atualizarCarrinho();
  }

  btnLogin.addEventListener("click", loginOuCriar);
  logoutBtn.addEventListener("click", logout);
  finalizarBtn.addEventListener("click", finalizar);
  limparBtn.addEventListener("click", limparCarrinho);

  document.getElementById("copiar-pix").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(pixCode.value);
      alert("PIX copiado!");
    } catch {
      pixCode.select();
      document.execCommand("copy");
      alert("PIX copiado!");
    }
  });

  recuperarSessao();
});