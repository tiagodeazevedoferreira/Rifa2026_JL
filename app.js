// ================== RIFA JL 2026 ==================

let jogadores = [];
let selecoes = {};
let filtroAtual = 'todos';
let usuarioLogado = null;

// ================== NOMES DAS RIFAS ==================
const NOMES_RIFAS = {
  "1994": "Seleção 1994",
  "2002": "Seleção 2002",
  "2006": "Copa 2006",
  "premier": "Premier League",
};

function getNomeRifa(album) {
  return NOMES_RIFAS[album] || album;
}

// ================== LOGIN ==================

function validarWhatsapp(numero) {
  return /^\d{11}$/.test(numero);
}

function loginOuCriar() {
  const whatsapp = document.getElementById('login-whatsapp').value.trim();
  const senha = document.getElementById('login-senha').value;
  const senha2 = document.getElementById('login-senha2').value;
  const msg = document.getElementById('login-msg');

  if (!validarWhatsapp(whatsapp)) {
    msg.textContent = "WhatsApp inválido. Use DDD + número (11 dígitos).";
    return;
  }

  if (senha.length < 6) {
    msg.textContent = "Senha deve ter no mínimo 6 caracteres.";
    return;
  }

  if (senha !== senha2) {
    msg.textContent = "Senhas não coincidem.";
    return;
  }

  const ref = db.ref('usuarios/' + whatsapp);

  ref.once('value').then(snapshot => {
    const user = snapshot.val();

    if (user) {
      // LOGIN
      if (user.senha !== senha) {
        msg.textContent = "Senha incorreta.";
        return;
      }
    } else {
      // CADASTRO
      ref.set({ whatsapp, senha });
    }

    usuarioLogado = whatsapp;

    document.getElementById('login-area').style.display = 'none';

    console.log("✅ Usuário logado:", usuarioLogado);
  });
}

function esqueciSenha() {
  const whatsapp = document.getElementById('login-whatsapp').value.trim();
  const msg = document.getElementById('login-msg');

  if (!validarWhatsapp(whatsapp)) {
    msg.textContent = "Informe um WhatsApp válido.";
    return;
  }

  db.ref('usuarios/' + whatsapp).once('value')
    .then(snapshot => {
      if (!snapshot.exists()) {
        msg.textContent = "Usuário não encontrado.";
      } else {
        msg.textContent = "Procure o organizador para redefinir a senha.";
      }
    });
}

// ================== CARREGAR JOGADORES ==================

function carregarJogadores() {
  console.log("🔄 Carregando jogadores do Firebase...");

  db.ref('jogadores').once('value')
    .then(snapshot => {
      const data = snapshot.val() || {};

      jogadores = Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      }));

      console.log(`✅ ${jogadores.length} jogadores carregados`);

      carregarReservas();
    })
    .catch(err => {
      console.error("❌ Erro ao carregar jogadores:", err);
      mostrarErro(err.message);
    });
}

// ================== ERRO UI ==================

function mostrarErro(msg) {
  const grid = document.getElementById('grid');

  grid.innerHTML = `
    <div style="text-align:center; padding:40px;">
      <h2>❌ Erro ao carregar jogadores</h2>
      <p>${msg}</p>
      <button onclick="location.reload()">Tentar novamente</button>
    </div>
  `;
}

// ================== RESERVAS ==================

function carregarReservas() {
  db.ref('reservas').on('value', snapshot => {
    selecoes = snapshot.val() || {};
    renderFiltros();
    renderCards();
  });
}

// ================== FILTROS ==================

function renderFiltros() {
  const container = document.getElementById('filtros');

  const albumsUnicos = ['todos', ...new Set(jogadores.map(j => j.album))];

  container.innerHTML = albumsUnicos.map(album => {
    const label = album === 'todos' ? '🏆 Todos' : getNomeRifa(album);
    const ativo = filtroAtual === album ? 'ativo' : '';

    return `<button class="filtro-btn ${ativo}" onclick="setFiltro('${album}')">${label}</button>`;
  }).join('');
}

function setFiltro(album) {
  filtroAtual = album;
  renderFiltros();
  renderCards();
}

// ================== CARDS ==================

function renderCards() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';

  const lista = filtroAtual === 'todos'
    ? jogadores
    : jogadores.filter(j => j.album === filtroAtual);

  lista.forEach(j => {
    const isReservado = !!selecoes[j.id];

    const card = document.createElement('div');
    card.className = `card ${isReservado ? 'reservado' : ''}`;

    card.innerHTML = `
      <img src="${j.linkDrive || j.link_drive}"
           onerror="this.src='https://via.placeholder.com/300x200?text=Sem+Foto'">
      <h3>${j.jogador}</h3>
      <p>${getNomeRifa(j.album)}</p>
    `;

    if (!isReservado) {
      card.addEventListener('click', () => abrirModal(j));
    }

    grid.appendChild(card);
  });
}

// ================== MODAL ==================

let jogadorAtual = null;

function abrirModal(j) {
  if (!usuarioLogado) {
    alert("Faça login antes de reservar.");
    return;
  }

  jogadorAtual = j;

  document.getElementById('modal-title').textContent =
    `${j.jogador} - ${getNomeRifa(j.album)}`;

  document.getElementById('modal-img').src = j.linkDrive || j.link_drive;

  document.getElementById('modal').style.display = 'flex';
}

function fecharModal() {
  document.getElementById('modal').style.display = 'none';
}

// ================== CÁLCULO PIX ==================

function calcularTotalUsuario() {
  return Object.values(selecoes)
    .filter(r => r.whatsapp === usuarioLogado)
    .length * 25;
}

// ================== RESERVA ==================

function confirmarSelecao() {
  if (!usuarioLogado) {
    alert("Faça login antes de reservar.");
    return;
  }

  const nome = document.getElementById('nome').value.trim();
  const email = document.getElementById('email').value.trim();

  if (!nome || !email) {
    alert("Preencha todos os campos.");
    return;
  }

  const reserva = {
    jogadorId: jogadorAtual.id,
    jogador: jogadorAtual.jogador,
    album: jogadorAtual.album,
    nome,
    email,
    whatsapp: usuarioLogado,
    valor: 25,
    data: new Date().toISOString(),
    status: "reservado"
  };

  db.ref('reservas/' + jogadorAtual.id).set(reserva)
    .then(() => {
      const total = calcularTotalUsuario();

      document.getElementById('valor-pix').textContent = total;
      document.getElementById('valor-final').textContent = total;

      document.getElementById('pix-area').style.display = 'block';

      alert("✅ Reservado com sucesso!");
    });
}

// ================== EVENTOS ==================

document.getElementById('confirm-btn').addEventListener('click', confirmarSelecao);
document.getElementById('cancel-btn').addEventListener('click', fecharModal);

document.getElementById('btn-login').addEventListener('click', loginOuCriar);
document.getElementById('btn-esqueci').addEventListener('click', esqueciSenha);

// ================== INIT ==================

carregarJogadores();

document.getElementById('modal').addEventListener('click', (e) => {
  if (e.target.id === 'modal') fecharModal();
});