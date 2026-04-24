document.addEventListener("DOMContentLoaded", () => {

  // ================= ESTADO =================
  let jogadores = [];
  let selecoes = {};
  let carrinho = [];
  let minhasReservas = [];
  let usuarioLogado = null;

  let filtroAdmin = "todos";
  let reservasAdminCache = {};

  const ADMIN_WHATS = "11999999999"; // 🔥 ALTERAR

  // ================= UTIL =================

  function validarWhatsapp(numero) {
    return /^\d{11}$/.test(numero);
  }

  // ================= LOGIN =================

  async function loginOuCriar() {
    const nome = document.getElementById('login-nome').value.trim();
    const whatsapp = document.getElementById('login-whatsapp').value.trim();
    const senha = document.getElementById('login-senha').value;
    const msg = document.getElementById('login-msg');

    if (!nome) return msg.textContent = "Informe seu nome";
    if (!validarWhatsapp(whatsapp)) return msg.textContent = "WhatsApp inválido";
    if (senha.length < 6) return msg.textContent = "Senha muito curta";

    const senhaHash = await hashSenha(senha);
    const ref = db.ref('usuarios/' + whatsapp);

    ref.once('value').then(snapshot => {
      const user = snapshot.val();

      if (user) {
        if (user.senha !== senhaHash) {
          msg.textContent = "Senha incorreta";
          return;
        }
      } else {
        ref.set({ nome, whatsapp, senha: senhaHash });
      }

      usuarioLogado = { nome, whatsapp };

      document.getElementById('login-area').style.display = 'none';
      atualizarUsuarioUI();
      verificarAdmin();
      carregarReservas();
    });
  }

  async function resetSenha() {
    const whatsapp = document.getElementById('login-whatsapp').value.trim();
    const novaSenha = prompt("Digite nova senha:");

    if (!validarWhatsapp(whatsapp)) return alert("WhatsApp inválido");
    if (!novaSenha || novaSenha.length < 6) return alert("Senha inválida");

    const senhaHash = await hashSenha(novaSenha);

    db.ref('usuarios/' + whatsapp).once('value').then(snap => {
      if (!snap.exists()) return alert("Usuário não encontrado");

      db.ref('usuarios/' + whatsapp).update({ senha: senhaHash });
      alert("Senha atualizada!");
    });
  }

  function atualizarUsuarioUI() {
    document.getElementById('user-info').textContent =
      `Logado como: ${usuarioLogado.nome}`;
  }

  // ================= ADMIN =================

  function verificarAdmin() {
    if (usuarioLogado.whatsapp === ADMIN_WHATS) {
      document.getElementById('admin-area').style.display = 'block';
      carregarAdmin();
    }
  }

  function carregarAdmin() {
    db.ref('reservas').on('value', snap => {
      reservasAdminCache = snap.val() || {};
      renderAdmin();
    });
  }

  function filtrarAdmin(tipo) {
    filtroAdmin = tipo;
    renderAdmin();
  }

  function renderAdmin() {
    const listaDiv = document.getElementById('admin-list');
    const resumoDiv = document.getElementById('admin-resumo');

    if (!listaDiv) return;

    let reservas = Object.entries(reservasAdminCache);

    if (filtroAdmin !== "todos") {
      reservas = reservas.filter(([_, r]) => r.status === filtroAdmin);
    }

    const total = Object.values(reservasAdminCache).length;
    const pagos = Object.values(reservasAdminCache).filter(r => r.status === 'pago').length;
    const pendentes = Object.values(reservasAdminCache).filter(r => r.status === 'pendente').length;
    const valorTotal = pagos * 25;

    if (resumoDiv) {
      resumoDiv.innerHTML = `
        <p><b>Total:</b> ${total}</p>
        <p><b>Pagos:</b> ${pagos}</p>
        <p><b>Pendentes:</b> ${pendentes}</p>
        <p><b>Valor arrecadado:</b> R$ ${valorTotal},00</p>
      `;
    }

    listaDiv.innerHTML = reservas.map(([id, r]) => {

      const whatsappLink = `https://wa.me/55${r.whatsapp}?text=Oi,%20sobre%20a%20rifa%20do%20jogador%20${encodeURIComponent(r.jogador)}`;

      return `
        <div style="border:1px solid #ccc; padding:10px; margin:5px;">
          <b>${r.jogador}</b><br>
          👤 ${r.nome}<br>
          📱 ${r.whatsapp}<br>
          💰 R$ ${r.valor}<br>
          📌 ${r.status}<br>

          ${r.status === 'pendente' ? `
            <button onclick="confirmarPagamento('${id}')">Confirmar</button>
            <button onclick="cancelarReserva('${id}')">Cancelar</button>
          ` : ''}

          <a href="${whatsappLink}" target="_blank">
            <button>WhatsApp</button>
          </a>
        </div>
      `;
    }).join('');
  }

  // 🔥 tornar global para HTML onclick
  window.confirmarPagamento = function(id) {
    db.ref('reservas/' + id).update({ status: "pago" });
    db.ref('locks/' + id).remove();
  };

  window.cancelarReserva = function(id) {
    db.ref('reservas/' + id).remove();
    db.ref('locks/' + id).remove();
  };

  window.filtrarAdmin = filtrarAdmin;

  // ================= LOCK =================

  function travarJogador(jogador) {
    const agora = Date.now();
    const expiraEm = agora + (10 * 60 * 1000);

    const ref = db.ref('locks/' + jogador.id);

    return ref.once('value').then(snapshot => {
      const lock = snapshot.val();

      if (lock && lock.expiraEm > agora) {
        alert("Jogador temporariamente indisponível");
        return false;
      }

      return ref.set({
        usuario: usuarioLogado.whatsapp,
        expiraEm
      }).then(() => true);
    });
  }

  function liberarLocks() {
    carrinho.forEach(j => {
      db.ref('locks/' + j.id).remove();
    });
  }

  // ================= JOGADORES =================

  function carregarJogadores() {
    db.ref('jogadores').once('value').then(snapshot => {
      const data = snapshot.val() || {};

      jogadores = Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      }));

      carregarReservas();
    });
  }

  function carregarReservas() {
    db.ref('reservas').on('value', snapshot => {
      selecoes = snapshot.val() || {};

      if (usuarioLogado) {
        minhasReservas = Object.values(selecoes)
          .filter(r => r.whatsapp === usuarioLogado.whatsapp);
      }

      renderCards();
      renderMinhasCompras();
    });
  }

  // ================= CARDS =================

  function renderCards() {
    const grid = document.getElementById('grid');
    if (!grid) return;

    grid.innerHTML = '';

    jogadores.forEach(j => {
      const reservado = !!selecoes[j.id];
      const noCarrinho = carrinho.find(c => c.id === j.id);

      const card = document.createElement('div');

      card.innerHTML = `
        <div style="
          border:1px solid #ccc;
          margin:5px;
          padding:10px;
          background:${reservado ? '#ddd' : noCarrinho ? '#c8f7c5' : '#fff'};
        ">
          <img src="${j.linkDrive || j.link_drive}" width="100%">
          <h3>${j.jogador}</h3>
        </div>
      `;

      if (!reservado) {
        card.onclick = () => adicionarAoCarrinho(j);
      }

      grid.appendChild(card);
    });
  }

  // ================= CARRINHO =================

  async function adicionarAoCarrinho(j) {
    if (!usuarioLogado) return alert("Faça login");

    const ok = await travarJogador(j);
    if (!ok) return;

    carrinho.push(j);

    atualizarCarrinho();
    renderCards();
  }

  function atualizarCarrinho() {
    const lista = document.getElementById('carrinho-lista');
    if (!lista) return;

    lista.innerHTML = carrinho.map(j => `<li>${j.jogador}</li>`).join('');

    document.getElementById('carrinho-total').textContent = carrinho.length * 25;
  }

  function limparCarrinho() {
    liberarLocks();

    carrinho = [];
    atualizarCarrinho();
    renderCards();
  }

  // ================= COMPRAS =================

  function renderMinhasCompras() {
    const div = document.getElementById('minhas-compras');
    if (!div) return;

    if (!usuarioLogado || minhasReservas.length === 0) {
      div.innerHTML = '';
      return;
    }

    div.innerHTML = `
      <h3>Seus jogadores:</h3>
      <ul>
        ${minhasReservas.map(r => `<li>${r.jogador} (${r.status})</li>`).join('')}
      </ul>
    `;
  }

  // ================= PIX =================

  function finalizarCompra() {
    if (carrinho.length === 0) return alert("Carrinho vazio");

    const total = carrinho.length * 25;

    const pix = gerarPix(total);

    document.getElementById('valor-final').textContent = total;
    document.getElementById('pix-code').value = pix;

    document.getElementById('pix-area').style.display = 'block';
    document.getElementById('pix-area').scrollIntoView({ behavior: 'smooth' });

    navigator.clipboard.writeText(pix);

    salvarReservas();
  }

  function salvarReservas() {
    carrinho.forEach(j => {
      db.ref('reservas/' + j.id).set({
        jogador: j.jogador,
        whatsapp: usuarioLogado.whatsapp,
        nome: usuarioLogado.nome,
        valor: 25,
        status: "pendente",
        data: new Date().toISOString()
      });
    });
  }

  // ================= EVENTOS =================

  document.getElementById('btn-login')?.addEventListener('click', loginOuCriar);
  document.getElementById('btn-reset')?.addEventListener('click', resetSenha);
  document.getElementById('finalizar-btn')?.addEventListener('click', finalizarCompra);
  document.getElementById('limpar-btn')?.addEventListener('click', limparCarrinho);

  document.getElementById('copiar-pix-btn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(document.getElementById('pix-code').value);
    alert("PIX copiado!");
  });

  // ================= INIT =================

  carregarJogadores();

});