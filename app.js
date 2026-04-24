document.addEventListener("DOMContentLoaded", () => {

  // ================= ELEMENTOS =================
  const loginNome = document.getElementById("login-nome");
  const loginWhatsapp = document.getElementById("login-whatsapp");
  const loginSenha = document.getElementById("login-senha");
  const loginMsg = document.getElementById("login-msg");
  const loginArea = document.getElementById("login-area");

  const btnLogin = document.getElementById("btn-login");
  const btnReset = document.getElementById("btn-reset");

  const userInfo = document.getElementById("user-info");

  const grid = document.getElementById("grid");

  const carrinhoLista = document.getElementById("carrinho-lista");
  const carrinhoTotal = document.getElementById("carrinho-total");

  const finalizarBtn = document.getElementById("finalizar-btn");
  const limparBtn = document.getElementById("limpar-btn");

  const pixArea = document.getElementById("pix-area");
  const valorFinal = document.getElementById("valor-final");
  const pixCode = document.getElementById("pix-code");
  const copiarPixBtn = document.getElementById("copiar-pix-btn");

  // ================= ESTADO =================
  let jogadores = [];
  let selecoes = {};
  let carrinho = [];
  let usuarioLogado = null;

  // ================= UTIL =================
  function validarWhatsapp(numero) {
    return /^\d{11}$/.test(numero);
  }

  // ================= LOGIN =================
  async function loginOuCriar() {
    const nome = loginNome.value.trim();
    const whatsapp = loginWhatsapp.value.trim();
    const senha = loginSenha.value;

    if (!nome) return loginMsg.textContent = "Informe seu nome";
    if (!validarWhatsapp(whatsapp)) return loginMsg.textContent = "WhatsApp inválido";
    if (senha.length < 6) return loginMsg.textContent = "Senha curta";

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

      loginArea.style.display = "none";
      userInfo.textContent = "Logado como: " + nome;

      carregarJogadores();
    });
  }

  // ================= RESET SENHA =================
  async function resetSenha() {
    const whatsapp = loginWhatsapp.value.trim();

    if (!validarWhatsapp(whatsapp)) {
      return alert("Informe um WhatsApp válido");
    }

    const nova = prompt("Digite a nova senha:");

    if (!nova || nova.length < 6) {
      return alert("Senha inválida");
    }

    const hash = await hashSenha(nova);

    db.ref('usuarios/' + whatsapp).once('value').then(snap => {
      if (!snap.exists()) {
        alert("Usuário não encontrado");
        return;
      }

      db.ref('usuarios/' + whatsapp).update({ senha: hash });
      alert("Senha atualizada");
    });
  }

  // ================= DADOS =================
  function carregarJogadores() {
    db.ref('jogadores').once('value').then(snap => {
      const data = snap.val() || {};

      jogadores = Object.keys(data).map(k => ({
        id: k,
        ...data[k]
      }));

      carregarReservas();
    });
  }

  function carregarReservas() {
    db.ref('reservas').on('value', snap => {
      selecoes = snap.val() || {};
      renderCards();
    });
  }

  // ================= CARDS =================
  function renderCards() {
    grid.innerHTML = '';

    jogadores.forEach(j => {
      const reservado = !!selecoes[j.id];
      const noCarrinho = carrinho.find(c => c.id === j.id);

      const card = document.createElement('div');
      card.className = `card ${reservado ? 'reservado' : ''} ${noCarrinho ? 'selecionado' : ''}`;

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

  // ================= CARRINHO =================
  function adicionar(j) {
    if (!usuarioLogado) return alert("Faça login");

    if (carrinho.find(x => x.id === j.id)) return;

    carrinho.push(j);
    atualizarCarrinho();
    renderCards();
  }

  function atualizarCarrinho() {
    carrinhoLista.innerHTML = carrinho.map(j => `<li>${j.jogador}</li>`).join('');
    carrinhoTotal.textContent = carrinho.length * 25;
  }

  function limparCarrinho() {
    carrinho = [];
    atualizarCarrinho();
    renderCards();
  }

  // ================= PIX =================
  function finalizar() {
    if (!carrinho.length) return alert("Carrinho vazio");

    const total = carrinho.length * 25;

    const pix = gerarPix(total);

    valorFinal.textContent = total;
    pixCode.value = pix;

    pixArea.style.display = 'block';
    pixArea.scrollIntoView({ behavior: 'smooth' });

    navigator.clipboard.writeText(pix);

    salvar();
  }

  function salvar() {
    carrinho.forEach(j => {
      db.ref('reservas/' + j.id).set({
        jogador: j.jogador,
        nome: usuarioLogado.nome,
        whatsapp: usuarioLogado.whatsapp,
        valor: 25,
        status: "pendente"
      });
    });
  }

  // ================= EVENTOS =================
  btnLogin.addEventListener("click", loginOuCriar);
  btnReset.addEventListener("click", resetSenha);
  finalizarBtn.addEventListener("click", finalizar);
  limparBtn.addEventListener("click", limparCarrinho);

  copiarPixBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(pixCode.value);
    alert("PIX copiado");
  });

});