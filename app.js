let jogadores = [];
let selecoes = {};
let carrinho = [];
let usuarioLogado = null;
let filtroAtual = 'todos';

// ================= LOGIN =================

function validarWhatsapp(numero) {
  return /^\d{11}$/.test(numero);
}

async function loginOuCriar() {
  const whatsapp = document.getElementById('login-whatsapp').value.trim();
  const senha = document.getElementById('login-senha').value;
  const senha2 = document.getElementById('login-senha2').value;
  const msg = document.getElementById('login-msg');

  if (!validarWhatsapp(whatsapp)) {
    msg.textContent = "WhatsApp inválido.";
    return;
  }

  if (senha.length < 6) {
    msg.textContent = "Senha muito curta.";
    return;
  }

  if (senha !== senha2) {
    msg.textContent = "Senhas não coincidem.";
    return;
  }

  const senhaHash = await hashSenha(senha);
  const ref = db.ref('usuarios/' + whatsapp);

  ref.once('value').then(snapshot => {
    const user = snapshot.val();

    if (user) {
      if (user.senha !== senhaHash) {
        msg.textContent = "Senha incorreta.";
        return;
      }
    } else {
      ref.set({ whatsapp, senha: senhaHash });
    }

    usuarioLogado = whatsapp;
    document.getElementById('login-area').style.display = 'none';
    atualizarUsuarioUI();
  });
}

// ================= UI USUÁRIO =================

function atualizarUsuarioUI() {
  document.getElementById('user-info').textContent =
    `Logado como: ${usuarioLogado}`;
}

// ================= JOGADORES =================

function carregarJogadores() {
  db.ref('jogadores').once('value')
    .then(snapshot => {
      const data = snapshot.val() || {};

      jogadores = Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      }));

      carregarReservas();
    });
}

// ================= RESERVAS =================

function carregarReservas() {
  db.ref('reservas').on('value', snapshot => {
    selecoes = snapshot.val() || {};
    renderCards();
  });
}

// ================= CARDS =================

function renderCards() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';

  jogadores.forEach(j => {
    const isReservado = !!selecoes[j.id];

    const card = document.createElement('div');
    card.className = `card ${isReservado ? 'reservado' : ''}`;

    card.innerHTML = `
      <img src="${j.linkDrive || j.link_drive}">
      <h3>${j.jogador}</h3>
    `;

    if (!isReservado) {
      card.onclick = () => adicionarAoCarrinho(j);
    }

    grid.appendChild(card);
  });
}

// ================= CARRINHO =================

function adicionarAoCarrinho(j) {
  if (!usuarioLogado) return alert("Faça login");

  if (carrinho.find(i => i.id === j.id)) {
    return alert("Já no carrinho");
  }

  carrinho.push(j);
  atualizarCarrinhoUI();
}

function atualizarCarrinhoUI() {
  const lista = document.getElementById('carrinho-lista');

  lista.innerHTML = carrinho.map(j => `<li>${j.jogador}</li>`).join('');

  document.getElementById('carrinho-total').textContent =
    carrinho.length * 25;
}

// ================= FINALIZAR =================

function finalizarCompra() {
  if (carrinho.length === 0) {
    alert("Carrinho vazio");
    return;
  }

  const total = carrinho.length * 25;

  const pix = gerarPix(
    total,
    "RIFA JL",
    "SAO PAULO",
    "SEU-PIX-AQUI"
  );

  document.getElementById('valor-final').textContent = total;
  document.getElementById('pix-code').value = pix;
  document.getElementById('pix-area').style.display = 'block';

  navigator.clipboard.writeText(pix);

  salvarReservas();
}

// ================= SALVAR =================

function salvarReservas() {
  carrinho.forEach(j => {
    const reserva = {
      jogadorId: j.id,
      jogador: j.jogador,
      album: j.album,
      whatsapp: usuarioLogado,
      valor: 25,
      status: "reservado",
      data: new Date().toISOString()
    };

    db.ref('reservas/' + j.id).set(reserva);
  });

  carrinho = [];
  atualizarCarrinhoUI();
}

// ================= EVENTOS =================

document.getElementById('btn-login').addEventListener('click', loginOuCriar);
document.getElementById('finalizar-btn').addEventListener('click', finalizarCompra);

document.getElementById('copiar-pix-btn').addEventListener('click', () => {
  const pix = document.getElementById('pix-code').value;
  navigator.clipboard.writeText(pix);
  alert("PIX copiado!");
});

// ================= INIT =================

carregarJogadores();