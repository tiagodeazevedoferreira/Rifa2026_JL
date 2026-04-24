let jogadores = [];
let selecoes = {};
let carrinho = [];
let usuarioLogado = null;

// ================= LOGIN =================

function validarWhatsapp(numero) {
  return /^\d{11}$/.test(numero);
}

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
  });
}

// ================= RESET SENHA =================

async function resetSenha() {
  const whatsapp = document.getElementById('login-whatsapp').value.trim();
  const novaSenha = prompt("Digite a nova senha (mín 6 caracteres):");

  if (!validarWhatsapp(whatsapp)) {
    return alert("WhatsApp inválido");
  }

  if (!novaSenha || novaSenha.length < 6) {
    return alert("Senha inválida");
  }

  const senhaHash = await hashSenha(novaSenha);

  const ref = db.ref('usuarios/' + whatsapp);

  ref.once('value').then(snapshot => {
    if (!snapshot.exists()) {
      alert("Usuário não encontrado");
      return;
    }

    ref.update({ senha: senhaHash });
    alert("Senha atualizada com sucesso!");
  });
}

// ================= UI =================

function atualizarUsuarioUI() {
  document.getElementById('user-info').textContent =
    `Logado como: ${usuarioLogado.nome}`;
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
    const reservado = !!selecoes[j.id];

    const card = document.createElement('div');
    card.className = `card ${reservado ? 'reservado' : ''}`;

    card.innerHTML = `
      <img src="${j.linkDrive || j.link_drive}">
      <h3>${j.jogador}</h3>
    `;

    if (!reservado) {
      card.onclick = () => adicionarAoCarrinho(j);
    }

    grid.appendChild(card);
  });
}

// ================= CARRINHO =================

function adicionarAoCarrinho(j) {
  if (!usuarioLogado) return alert("Faça login");

  if (carrinho.find(x => x.id === j.id)) {
    return alert("Já está no carrinho");
  }

  carrinho.push(j);
  atualizarCarrinho();
}

function atualizarCarrinho() {
  const lista = document.getElementById('carrinho-lista');

  lista.innerHTML = carrinho.map(j => `<li>${j.jogador}</li>`).join('');

  document.getElementById('carrinho-total').textContent = carrinho.length * 25;
}

// ================= FINALIZAR =================

function finalizarCompra() {
  if (carrinho.length === 0) return alert("Carrinho vazio");

  const total = carrinho.length * 25;

  const pix = gerarPix(
    total,
    "RIFA JL",
    "SAO PAULO",
    "SUA-CHAVE-PIX"
  );

  document.getElementById('valor-final').textContent = total;
  document.getElementById('pix-code').value = pix;
  document.getElementById('pix-area').style.display = 'block';

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
      status: "reservado",
      data: new Date().toISOString()
    });
  });

  carrinho = [];
  atualizarCarrinho();
}

// ================= EVENTOS =================

document.getElementById('btn-login').addEventListener('click', loginOuCriar);
document.getElementById('btn-reset').addEventListener('click', resetSenha);
document.getElementById('finalizar-btn').addEventListener('click', finalizarCompra);

document.getElementById('copiar-pix-btn').addEventListener('click', () => {
  navigator.clipboard.writeText(document.getElementById('pix-code').value);
  alert("PIX copiado!");
});

// ================= INIT =================

carregarJogadores();