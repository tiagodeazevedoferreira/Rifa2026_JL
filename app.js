// ================== RIFA JL 2026 - app.js (versão corrigida - 16/04/2026) ==================

let jogadores = [];
let selecoes = {};

// === LINK DA PLANILHA ===
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSMPaIQXBxkimPsUhKxEnUjjKUiifsLhhMX1gYlVJVFk5d6dgTESOJmwb-6qwMEG1morC-IbIOIopZF/pub?gid=0&single=true&output=csv";

console.log("🔄 Iniciando carregamento da planilha...");

fetch(CSV_URL, { mode: 'cors' })
  .then(res => {
    console.log("📡 Status da resposta:", res.status, res.statusText);
    if (!res.ok) throw new Error(`HTTP ${res.status} - Planilha não acessível publicamente`);
    return res.text();
  })
  .then(csv => {
    console.log("📄 CSV recebido com", csv.length, "caracteres");
    const lines = csv.trim().split('\n');
    console.log("📋 Linhas detectadas:", lines.length);

    if (lines.length < 2) {
      throw new Error("Planilha carregada, mas sem dados de jogadores.");
    }

    jogadores = lines.slice(1).map((line, index) => {
      const cols = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
      const [id, jogador, album, linkDrive] = cols;
      return {
        id: id || `j${index}`,
        jogador: jogador || "Jogador sem nome",
        album: album || "Álbum não informado",
        linkDrive: getDirectDriveLink(linkDrive)
      };
    });

    console.log(`✅ ${jogadores.length} jogadores carregados com sucesso!`);
    carregarReservas();
  })
  .catch(err => {
    console.error("❌ Erro ao carregar planilha:", err);
    const grid = document.getElementById('grid');
    grid.style.minHeight = "400px";
    grid.innerHTML = `
      <div style="background:#ffebee; color:#c62828; border:3px solid #ef5350; border-radius:16px; padding:40px 30px; margin:30px auto; max-width:900px; text-align:center; font-size:18px; line-height:1.7;">
        <h2>❌ Não foi possível carregar os jogadores</h2>
        <p>${err.message}</p>
        <p style="margin-top:20px; font-size:16px; color:#555;">
          Possíveis causas:<br>
          • A planilha não está totalmente pública<br>
          • Problema temporário do Google<br>
          • Cache do navegador
        </p>
        <button onclick="location.reload()" style="margin-top:25px; padding:12px 24px; font-size:16px; background:#1e3a8a; color:white; border:none; border-radius:8px; cursor:pointer;">
          🔄 Tentar carregar novamente
        </button>
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
    grid.innerHTML = '<p style="text-align:center; padding:50px;">Nenhum jogador encontrado na planilha.</p>';
    return;
  }

  jogadores.forEach(j => {
    const isReservado = !!selecoes[j.id];
    const card = document.createElement('div');
    card.className = `card ${isReservado ? 'reservado' : ''}`;
    card.innerHTML = `
      <img src="${j.linkDrive}" alt="${j.jogador}" onerror="this.src='https://via.placeholder.com/300x200?text=Sem+Foto'">
      <h3>${j.jogador}</h3>
      <p>${j.album}</p>
    `;
    if (!isReservado) card.addEventListener('click', () => abrirModal(j));
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
  const chavePix = "22095090845";   // Seu CPF já está aqui
  navigator.clipboard.writeText(chavePix).then(() => {
    alert("✅ Código PIX copiado com sucesso!\n\nValor: R$ 25,00\nEnvie o comprovante para o organizador.");
  });
});

function confirmarSelecao() {
  const nome = document.getElementById('nome').value.trim();
  const whatsapp = document.getElementById('whatsapp').value.trim();
  const email = document.getElementById('email').value.trim();

  if (!nome || whatsapp.length < 10 || !email) {
    alert("Preencha todos os campos corretamente.\nWhatsApp deve ter 11 dígitos.");
    return;
  }

  let jaEscolheu = Object.values(selecoes).some(r => r.whatsapp === whatsapp);
  if (jaEscolheu && !confirm("Este número já escolheu um jogador.\nDeseja escolher outro?")) return;

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
      document.getElementById('status-msg').innerHTML = `<span class="reservado-info">✅ Reservado com sucesso!</span>`;
      document.getElementById('pix-area').style.display = 'block';
      document.getElementById('valor-final').textContent = "25";
      selecoes[jogadorAtual.id] = reserva;
      renderCards();
    })
    .catch(err => alert("Erro ao reservar: " + err.message));
}

document.getElementById('modal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal')) fecharModal();
});