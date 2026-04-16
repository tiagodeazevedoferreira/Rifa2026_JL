// ================== RIFA JL 2026 - app.js (versão com debug) ==================

let jogadores = [];
let selecoes = {};

// Link da planilha publicado na web (use exatamente este)
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSMPaIQXBxkimPsUhKxEnUjjKUiifsLhhMX1gYlVJVFk5d6dgTESOJmwb-6qwMEG1morC-IbIOIopZF/pub?gid=0&single=true&output=csv";

console.log("Tentando carregar planilha de:", CSV_URL);

fetch(CSV_URL)
  .then(res => {
    console.log("Status da resposta:", res.status, res.statusText);
    if (!res.ok) {
      throw new Error(`Erro HTTP ${res.status} - Planilha não acessível`);
    }
    return res.text();
  })
  .then(csv => {
    console.log("CSV carregado com", csv.length, "caracteres");
    const lines = csv.trim().split('\n');
    console.log("Número de linhas:", lines.length);

    if (lines.length < 2) {
      throw new Error("Planilha carregada, mas está vazia (sem jogadores).");
    }

    jogadores = lines.slice(1).map((line, index) => {
      const cols = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
      const [id, jogador, album, linkDrive] = cols;
      return {
        id: id || `j${index}`,
        jogador: jogador || "Sem nome",
        album: album || "Sem álbum",
        linkDrive: getDirectDriveLink(linkDrive)
      };
    });

    console.log(`✅ Sucesso! ${jogadores.length} jogadores carregados.`);
    carregarReservas();
  })
  .catch(err => {
    console.error("Erro completo ao carregar planilha:", err);
    const grid = document.getElementById('grid');
    grid.innerHTML = `
      <div style="color: #d32f2f; background: #ffebee; border: 2px solid #ef5350; border-radius: 12px; padding: 40px 20px; margin: 20px auto; max-width: 800px; text-align: center; font-size: 18px; line-height: 1.6;">
        <strong>❌ Não foi possível carregar os jogadores</strong><br><br>
        ${err.message}<br><br>
        <small style="color:#555;">
          Dica: Certifique-se de que a aba "Jogadores" está publicada como CSV e que o compartilhamento está como "Qualquer pessoa com o link pode ver".
        </small>
      </div>`;
  });

function carregarReservas() {
  db.ref('reservas').on('value', snapshot => {
    selecoes = snapshot.val() || {};
    renderCards();
  });
}

function renderCards() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';

  if (jogadores.length === 0) {
    grid.innerHTML = '<p style="text-align:center; grid-column:1/-1;">Nenhum jogador encontrado.</p>';
    return;
  }

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

// Botões do modal
document.getElementById('confirm-btn').addEventListener('click', confirmarSelecao);
document.getElementById('cancel-btn').addEventListener('click', fecharModal);

document.getElementById('copiar-pix-btn').addEventListener('click', () => {
  const chavePix = "22095090845";   // ← TROQUE pelo seu CPF (apenas números)
  navigator.clipboard.writeText(chavePix).then(() => {
    alert("✅ Código PIX copiado!\n\nValor: R$ 25,00\nEnvie o comprovante para o organizador.");
  });
});

function confirmarSelecao() {
  const nome = document.getElementById('nome').value.trim();
  const whatsapp = document.getElementById('whatsapp').value.trim();
  const email = document.getElementById('email').value.trim();

  if (!nome || whatsapp.length < 10 || !email) {
    alert("Preencha todos os campos corretamente.\nWhatsApp com 11 dígitos.");
    return;
  }

  let jaEscolheu = Object.values(selecoes).some(r => r.whatsapp === whatsapp);
  if (jaEscolheu && !confirm("Este WhatsApp já escolheu um jogador.\nQuer escolher outro?")) {
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
    .catch(err => alert("Erro ao reservar: " + err.message));
}

// Fechar modal clicando fora
document.getElementById('modal').addEventListener('click', function(e) {
  if (e.target === this) fecharModal();
});