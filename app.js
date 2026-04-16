let jogadores = [];
let selecoes = {};

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSMPaIQXBxkimPsUhKxEnUjjKUiifsLhhMX1gYlVJVFk5d6dgTESOJmwb-6qwMEG1morC-IbIOIopZF/pub?output=csv";

fetch(CSV_URL)
  .then(res => res.text())
  .then(csv => {
    const lines = csv.trim().split('\n');
    jogadores = lines.slice(1).map(line => {
      const cols = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
      const [id, jogador, album, linkDrive] = cols;
      return {
        id,
        jogador,
        album,
        linkDrive: getDirectDriveLink(linkDrive)
      };
    });
    carregarReservas();
  })
  .catch(err => console.error("Erro ao carregar planilha:", err));

function carregarReservas() {
  db.ref('reservas').on('value', snapshot => {
    selecoes = snapshot.val() || {};
    renderCards();
  });
}

function renderCards() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';

  jogadores.forEach(j => {
    const isReservado = !!selecoes[j.id];
    const card = document.createElement('div');
    card.className = `card ${isReservado ? 'reservado' : ''}`;
    card.innerHTML = `
      <img src="${j.linkDrive}" alt="${j.jogador}" onerror="this.src='https://via.placeholder.com/180x200?text=Sem+Foto'">
      <h3>${j.jogador}</h3>
      <p>${j.album}</p>
    `;
    if (!isReservado) {
      card.addEventListener('click', () => abrirModal(j));
    }
    grid.appendChild(card);
  });
}

let jogadorAtual = null;

function abrirModal(j) {
  jogadorAtual = j;
  document.getElementById('modal-title').textContent = `${j.jogador} - ${j.album}`;
  document.getElementById('modal-img').src = j.linkDrive;
  document.getElementById('nome').value = '';
  document.getElementById('whatsapp').value = '';
  document.getElementById('email').value = '';
  document.getElementById('status-msg').innerHTML = '';
  document.getElementById('pix-area').style.display = 'none';
  document.getElementById('modal').style.display = 'flex';
}

function fecharModal() {
  document.getElementById('modal').style.display = 'none';
}

document.getElementById('confirm-btn').addEventListener('click', confirmarSelecao);
document.getElementById('cancel-btn').addEventListener('click', fecharModal);

document.getElementById('copiar-pix-btn').addEventListener('click', () => {
  const chavePix = "SUA_CHAVE_PIX_AQUI";   // ← Troque pela sua chave PIX real
  navigator.clipboard.writeText(chavePix).then(() => {
    alert("Código PIX copiado com sucesso!\n\nValor: R$ 25,00\nEnvie o comprovante para o organizador.");
  });
});

function confirmarSelecao() {
  const nome = document.getElementById('nome').value.trim();
  const whatsapp = document.getElementById('whatsapp').value.trim();
  const email = document.getElementById('email').value.trim();

  if (!nome || whatsapp.length < 10 || !email) {
    alert("Preencha todos os campos corretamente.\nWhatsApp deve ter 11 dígitos (ex: 11925255252)");
    return;
  }

  let jaEscolheu = Object.values(selecoes).some(r => r.whatsapp === whatsapp);
  if (jaEscolheu && !confirm("Este número de WhatsApp já selecionou um jogador.\nDeseja escolher outro mesmo assim?")) {
    return;
  }

  const reserva = {
    jogadorId: jogadorAtual.id,
    jogador: jogadorAtual.jogador,
    album: jogadorAtual.album,
    nome: nome,
    whatsapp: whatsapp,
    email: email,
    valor: 25,
    data: new Date().toISOString(),
    status: "reservado"
  };

  db.ref('reservas/' + jogadorAtual.id).set(reserva)
    .then(() => {
      document.getElementById('status-msg').innerHTML = `<span class="reservado-info">✅ Reservado com sucesso!</span>`;
      document.getElementById('pix-area').style.display = 'block';
      document.getElementById('valor-final').textContent = "25";
      selecoes[jogadorAtual.id] = reserva;
      renderCards();
    })
    .catch(err => {
      alert("Erro ao reservar: " + err.message);
      console.error(err);
    });
}

document.getElementById('modal').addEventListener('click', function(e) {
  if (e.target === this) fecharModal();
});