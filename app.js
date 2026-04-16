// ================== RIFA JL 2026 ==================

let jogadores = [];
let selecoes = {};
let filtroAtual = 'todos';

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

// ================== CARREGAR JOGADORES (FIREBASE) ==================
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
      <img src="${j.linkDrive}" 
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
  jogadorAtual = j;

  document.getElementById('modal-title').textContent =
    `${j.jogador} - ${getNomeRifa(j.album)}`;

  document.getElementById('modal-img').src = j.linkDrive;

  document.getElementById('modal').style.display = 'flex';
}

function fecharModal() {
  document.getElementById('modal').style.display = 'none';
}

// ================== RESERVA ==================
function confirmarSelecao() {
  const nome = document.getElementById('nome').value.trim();
  const whatsapp = document.getElementById('whatsapp').value.trim();
  const email = document.getElementById('email').value.trim();

  if (!nome || !whatsapp || !email) {
    alert("Preencha todos os campos.");
    return;
  }

  const reserva = {
    jogadorId: jogadorAtual.id,
    jogador: jogadorAtual.jogador,
    album: jogadorAtual.album,
    nome, whatsapp, email,
    valor: 25,
    data: new Date().toISOString(),
    status: "reservado"
  };

  db.ref('reservas/' + jogadorAtual.id).set(reserva)
    .then(() => {
      alert("✅ Reservado com sucesso!");
    });
}

// ================== EVENTOS ==================
document.getElementById('confirm-btn').addEventListener('click', confirmarSelecao);
document.getElementById('cancel-btn').addEventListener('click', fecharModal);

// ================== INIT ==================
carregarJogadores();

document.getElementById('modal').addEventListener('click', (e) => {
  if (e.target.id === 'modal') fecharModal();
});