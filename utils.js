// 🔐 HASH SENHA
async function hashSenha(senha) {
  const encoder = new TextEncoder();
  const data = encoder.encode(senha);

  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 💸 GERAR PIX (CONFIGURADO COM SEUS DADOS)
function gerarPix(valor) {

  const chavePix = "01cb06f7-6288-47a3-85c9-95fd4f3dc964";
  const nome = "TIAGO DE AZEVEDO FERREIRA"; // sem acento
  const cidade = "SAO PAULO"; // sem acento

  function format(id, value) {
    const size = value.length.toString().padStart(2, '0');
    return id + size + value;
  }

  const valorFormatado = valor.toFixed(2);

  const payload =
    format("00", "01") +
    format("26",
      format("00", "br.gov.bcb.pix") +
      format("01", chavePix)
    ) +
    format("52", "0000") +
    format("53", "986") +
    format("54", valorFormatado) +
    format("58", "BR") +
    format("59", nome.substring(0, 25)) +
    format("60", cidade.substring(0, 15)) +
    format("62", format("05", "***"));

  const crc = crc16(payload + "6304");

  return payload + "6304" + crc;
}

// 🔢 CRC16
function crc16(payload) {
  let polinomio = 0x1021;
  let resultado = 0xFFFF;

  for (let i = 0; i < payload.length; i++) {
    resultado ^= payload.charCodeAt(i) << 8;

    for (let j = 0; j < 8; j++) {
      if ((resultado <<= 1) & 0x10000) {
        resultado ^= polinomio;
      }
    }
  }

  return (resultado & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}