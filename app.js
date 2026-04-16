// ================== RIFA JL 2026 - app.js ==================

let jogadores = [];
let selecoes = {};

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSMPaIQXBxkimPsUhKxEnUjjKUiifsLhhMX1gYlVJVFk5d6dgTESOJmwb-6qwMEG1morC-IbIOIopZF/pub?gid=0&single=true&output=csv";

fetch(CSV_URL)
  .then(res => {
    if (!res.ok) {
      throw new Error(`Erro ${res.status} - Não foi possível acessar a planilha`);
    }
    return res.text();
  })
  .then(csv => {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) {
      throw new Error("A planilha foi carregada, mas não contém dados de jogadores.");
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

    console.log(`✅ Sucesso! ${jogadores.length} jogadores carregados da planilha.`);
    carregarReservas();
  })
  .catch(err => {
    console.error("Erro ao carregar CSV:", err);
    document.getElementById('grid').innerHTML = `
      <div style="color: #d32f2f; text-align: center; grid-column: 1 / -1; padding: 60px 20px; font-size: 18px; line-height: 1.6;">
        ❌ Não foi possível carregar os jogadores.<br><br>
        ${err.message}<br><br>
        Verifique se a planilha está publicada corretamente em "Arquivo → Publicar na web".
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
  const chavePix = "22095090845";   // ← TROQUE PELO SEU CPF (apenas números, sem pontos ou traços)
  navigator.clipboard.writeText(chavePix).then(() => {
    alert("✅ Código PIX copiado com sucesso!\n\nValor: R$ 25,00\n\nEnvie o comprovante para o organizador.");
  }).catch(() => {
    alert("Não foi possível copiar automaticamente. Sua chave PIX é: " + chavePix);
  });
});

function confirmarSelecao() {
  const nome = document.getElementById('nome').value.trim();
  const whatsapp = document.getElementById('whatsapp').value.trim();
  const email = document.getElementById('email').value.trim();

  if (!nome || whatsapp.length < 10 || !email) {
    alert("Por favor, preencha todos os campos corretamente.\nWhatsApp deve ter 11 dígitos (ex: 11925255252)");
    return;
  }

  // Verifica se o WhatsApp já escolheu alguém
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
      alert("Erro ao reservar o jogador: " + err.message);
      console.error(err);
    });
}

document.getElementById('modal').addEventListener('click', function(e) {
  if (e.target === this) fecharModal();
});