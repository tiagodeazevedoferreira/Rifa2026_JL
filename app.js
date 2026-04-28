document.addEventListener("DOMContentLoaded", () => {

  let jogadores = [];
  let selecoes = {};
  let carrinho = [];
  let clickCount = 0;

  // ===== ELEMENTOS =====
  const grid = document.getElementById("grid");
  const carrinhoLista = document.getElementById("carrinho-lista");
  const carrinhoTotal = document.getElementById("carrinho-total");

  const finalizarBtn = document.getElementById("finalizar-btn");
  const limparBtn = document.getElementById("limpar-btn");

  const pixArea = document.getElementById("pix-area");
  const valorFinal = document.getElementById("valor-final");
  const pixCode = document.getElementById("pix-code");
  const copiarPixBtn = document.getElementById("copiar-pix");

  const qrContainer = document.getElementById("qrcode");
  const btnWhatsapp = document.getElementById("btn-whatsapp");

  const titulo = document.getElementById("titulo");

  // ===== ADMIN =====
  const adminList = document.getElementById("admin-list");
  const adminTotal = document.getElementById("admin-total");

  const adminNome = document.getElementById("admin-nome");
  const adminWhatsapp = document.getElementById("admin-whatsapp");
  const adminJogador = document.getElementById("admin-jogador");
  const adminStatus = document.getElementById("admin-status");
  const adminAddBtn = document.getElementById("admin-add");

  // ===== TOAST =====
  function mostrarToast(msg) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = msg;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 100);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  // ===== EMBARALHAR =====
  function embaralhar(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // ===== ADMIN OCULTO =====
  titulo.addEventListener("click", async () => {
    clickCount++;
    if (clickCount === 5) {
      clickCount = 0;

      const senha = prompt("Senha admin:");
      if (!senha) return;

      const hash = await hashSenha(senha);

      if (hash === "386ed9b61061d44650ee314ad33b2539ab8d352abde61395b77a040a73d5b5fb") {
        document.getElementById("admin-area").style.display = "block";
      } else {
        alert("Senha incorreta");
      }
    }
  });

  // ===== CARREGAR JOGADORES =====
  db.ref('jogadores').once('value').then(snap => {
    const data = snap.val() || {};
    jogadores = Object.keys(data).map(k => ({ id: k, ...data[k] }));

    embaralhar(jogadores);
    renderCards();
  });

  // ===== LISTENER ÚNICO =====
  db.ref('reservas').on('value', snap => {
    const data = snap.val() || {};
    selecoes = data;

    renderCards();
    renderAdmin(data);
  });

  // ===== CARDS =====
  function renderCards() {
    grid.innerHTML = "";

    jogadores.forEach(j => {
      const reservado = !!selecoes[j.id];

      const card = document.createElement("div");
      card.className = `card ${reservado ? 'reservado' : ''}`;

      card.innerHTML = `
        <img src="${j.linkDrive || ''}" onerror="this.src='https://via.placeholder.com/300x200?text=Sem+Foto'">
        <h3>${j.jogador}</h3>
      `;

      if (!reservado) {
        card.addEventListener("click", () => adicionarAoCarrinho(j));
      }

      grid.appendChild(card);
    });
  }

  // ===== CARRINHO =====
function adicionarAoCarrinho(j) {
  if (carrinho.find(x => x.id === j.id)) return;

  carrinho.push(j);
  atualizarCarrinho();

  mostrarToast(`✔ ${j.jogador} adicionado`);

  // 🔥 GOOGLE ANALYTICS
  gtag('event', 'add_to_cart', {
    item_name: j.jogador
  });
}

  function atualizarCarrinho() {
    carrinhoLista.innerHTML = carrinho.map(j => `<li>${j.jogador}</li>`).join('');
    carrinhoTotal.textContent = (carrinho.length * 25).toFixed(2);
  }

  function limparCarrinho() {
    carrinho = [];
    atualizarCarrinho();
  }

  // ===== PIX =====
  function gerarPix(valor) {
    const chavePix = "01cb06f7-6288-47a3-85c9-95fd4f3dc964";
    const nome = "TIAGO DE AZEVEDO";
    const cidade = "SAOPAULO";
    const txid = "RIFA25";

    const valorFormatado = Number(valor).toFixed(2);

    function format(id, value) {
      return id + String(value.length).padStart(2, '0') + value;
    }

    function crc16(payload) {
      let polinomio = 0x1021;
      let resultado = 0xFFFF;

      for (let i = 0; i < payload.length; i++) {
        resultado ^= payload.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
          if (resultado & 0x8000) resultado = (resultado << 1) ^ polinomio;
          else resultado <<= 1;
          resultado &= 0xFFFF;
        }
      }

      return resultado.toString(16).toUpperCase().padStart(4, '0');
    }

    const gui = format("00", "BR.GOV.BCB.PIX");
    const chave = format("01", chavePix);
    const merchantAccount = format("26", gui + chave);

    const payload =
      format("00", "01") +
      merchantAccount +
      format("52", "0000") +
      format("53", "986") +
      format("54", valorFormatado) +
      format("58", "BR") +
      format("59", nome) +
      format("60", cidade) +
      format("62", format("05", txid)) +
      "6304";

    return payload + crc16(payload);
  }

  copiarPixBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(pixCode.value);
    mostrarToast("PIX copiado!");
  });

  // ===== ADMIN RENDER =====
  function renderAdmin(data) {
    adminList.innerHTML = "";
    let total = 0;

    Object.entries(data).forEach(([id, r]) => {
      total += Number(r.valor || 0);

      const div = document.createElement("div");
      div.className = "admin-item";

      div.innerHTML = `
        <strong>${r.jogador}</strong><br>
        Nome: ${r.nome}<br>
        WhatsApp: ${r.whatsapp}<br>
        Status: <b>${r.status}</b><br>
        Valor: R$ ${r.valor}
        <br><br>
        ${r.status !== "pago" ? `<button data-action="confirmar" data-id="${id}">Confirmar</button>` : ""}
        <button data-action="remover" data-id="${id}">Remover</button>
      `;

      adminList.appendChild(div);
    });

    adminTotal.textContent = total.toFixed(2);
  }

  // ===== EVENT DELEGATION (ADMIN) =====
  adminList.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const id = btn.dataset.id;
    const action = btn.dataset.action;

    if (action === "confirmar") {
      db.ref('reservas/' + id + '/status').set("pago");
      mostrarToast("Pagamento confirmado");
    }

    if (action === "remover") {
      if (confirm("Remover reserva?")) {
        db.ref('reservas/' + id).remove();
        mostrarToast("Reserva removida");
      }
    }
  });

  // ===== INSERÇÃO MANUAL =====
  adminAddBtn.addEventListener("click", () => {
    const nome = adminNome.value.trim();
    const whatsapp = adminWhatsapp.value.trim();
    const jogador = adminJogador.value.trim();
    const status = adminStatus.value;

    if (!nome || !jogador) {
      alert("Preencha nome e jogador");
      return;
    }

    db.ref('reservas').push().set({
      jogador,
      nome,
      whatsapp,
      valor: 25,
      status,
      data: new Date().toISOString()
    });

    adminNome.value = "";
    adminWhatsapp.value = "";
    adminJogador.value = "";
  });

  // ===== FINALIZAR =====
  function finalizarCompra() {
    if (!carrinho.length) return alert("Carrinho vazio");

    const nome = document.getElementById("checkout-nome").value.trim();
    const whatsapp = document.getElementById("checkout-whatsapp").value.trim();

    if (!nome) return alert("Informe seu nome");

const total = carrinho.length * 25;
const codigoPix = gerarPix(total);

// 🔥 GOOGLE ANALYTICS
gtag('event', 'finalizar_compra', {
  value: total,
  currency: 'BRL'
});
    valorFinal.textContent = total.toFixed(2);
    pixCode.value = codigoPix;
    pixArea.style.display = "block";

    qrContainer.innerHTML = "";
    new QRCode(qrContainer, { text: codigoPix, width: 200, height: 200 });

    const lista = carrinho.map(j => j.jogador).join(", ");

    const mensagem = `Olá! Fiz uma reserva na rifa ⚽

Nome: ${nome}
WhatsApp: ${whatsapp}

Jogadores: ${lista}
Total: R$ ${total.toFixed(2)}

PIX:
${codigoPix}

Envio o comprovante em seguida.`;

    const numero = "5511984982090";
    btnWhatsapp.href = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
    btnWhatsapp.style.display = "block";

// 🔥 GOOGLE ANALYTICS
btnWhatsapp.onclick = () => {
  gtag('event', 'clique_whatsapp');
};
	

    carrinho.forEach(j => {
      db.ref('reservas/' + j.id).transaction(current => {
        if (current === null) {
          return {
            jogador: j.jogador,
            nome,
            whatsapp,
            valor: 25,
            status: "pendente",
            data: new Date().toISOString()
          };
        }
      });
    });

    carrinho = [];
    atualizarCarrinho();
  }

  finalizarBtn.addEventListener("click", finalizarCompra);
  limparBtn.addEventListener("click", limparCarrinho);

});