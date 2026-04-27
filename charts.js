let chartStatus = null;

function atualizarDashboard(lista) {
  const pagos = lista.filter(r => r.status === "pago");
  const pendentes = lista.filter(r => r.status === "pendente");

  const total = pagos.reduce((acc, r) => acc + (r.valor || 0), 0);

  document.getElementById("metric-total").textContent = total;
  document.getElementById("metric-pagos").textContent = pagos.length;
  document.getElementById("metric-pendentes").textContent = pendentes.length;
  document.getElementById("metric-qtd").textContent = lista.length;

  renderGrafico(pagos.length, pendentes.length);
}

function renderGrafico(pagos, pendentes) {
  const ctx = document.getElementById('grafico-status');

  if (chartStatus) {
    chartStatus.destroy();
  }

  chartStatus = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Pagos', 'Pendentes'],
      datasets: [{
        data: [pagos, pendentes]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      }
    }
  });
}