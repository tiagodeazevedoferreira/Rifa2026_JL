let filtroAdmin = "todos";
let reservasAdminCache = {};

// ================= ADMIN =================

function verificarAdmin() {
  if (usuarioLogado.whatsapp === ADMIN_WHATS) {
    document.getElementById('admin-area').style.display = 'block';
    carregarAdmin();
  }
}

// ================= CARREGAR =================

function carregarAdmin() {
  db.ref('reservas').on('value', snap => {
    reservasAdminCache = snap.val() || {};
    renderAdmin();
  });
}

// ================= FILTRO =================

function filtrarAdmin(tipo) {
  filtroAdmin = tipo;
  renderAdmin();
}

// ================= RENDER =================

function renderAdmin() {
  const listaDiv = document.getElementById('admin-list');
  const resumoDiv = document.getElementById('admin-resumo');

  let reservas = Object.entries(reservasAdminCache);

  if (filtroAdmin !== "todos") {
    reservas = reservas.filter(([_, r]) => r.status === filtroAdmin);
  }

  // 📊 RESUMO
  const total = Object.values(reservasAdminCache).length;
  const pagos = Object.values(reservasAdminCache).filter(r => r.status === 'pago').length;
  const pendentes = Object.values(reservasAdminCache).filter(r => r.status === 'pendente').length;
  const valorTotal = pagos * 25;

  resumoDiv.innerHTML = `
    <p><b>Total:</b> ${total}</p>
    <p><b>Pagos:</b> ${pagos}</p>
    <p><b>Pendentes:</b> ${pendentes}</p>
    <p><b>Valor arrecadado:</b> R$ ${valorTotal},00</p>
  `;

  // 📋 LISTA
  listaDiv.innerHTML = reservas.map(([id, r]) => {

    const whatsappLink = `https://wa.me/55${r.whatsapp}?text=Oi,%20sobre%20a%20rifa%20do%20jogador%20${encodeURIComponent(r.jogador)}`;

    return `
      <div style="
        border:1px solid #ccc;
        padding:10px;
        margin:5px;
        border-radius:8px;
        background:${r.status === 'pago' ? '#e6ffed' : '#fff'};
      ">
        <b>${r.jogador}</b><br>
        👤 ${r.nome}<br>
        📱 ${r.whatsapp}<br>
        💰 R$ ${r.valor}<br>
        📌 Status: <b>${r.status}</b><br>

        <div style="margin-top:8px;">
          ${r.status === 'pendente' ? `
            <button onclick="confirmarPagamento('${id}')">✅ Confirmar</button>
            <button onclick="cancelarReserva('${id}')">❌ Cancelar</button>
          ` : ''}

          <a href="${whatsappLink}" target="_blank">
            <button>💬 WhatsApp</button>
          </a>
        </div>
      </div>
    `;
  }).join('');
}

// ================= AÇÕES =================

function confirmarPagamento(id) {
  db.ref('reservas/' + id).update({
    status: "pago"
  });

  db.ref('locks/' + id).remove();
}

function cancelarReserva(id) {
  db.ref('reservas/' + id).remove();
  db.ref('locks/' + id).remove();
}