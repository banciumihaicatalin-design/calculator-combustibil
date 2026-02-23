function calculeaza() {
  const distanta = parseFloat(document.getElementById('distanta').value);
  const consum = parseFloat(document.getElementById('consum').value);
  const pret = parseFloat(document.getElementById('pret').value);
  const containerRezultat = document.getElementById('rezultat');

  containerRezultat.innerHTML = "";
  containerRezultat.className = "";

  if (isNaN(distanta) || isNaN(consum) || isNaN(pret) || distanta <= 0 || consum <= 0 || pret <= 0) {
    containerRezultat.innerHTML = "Te rog introdu valori numerice mai mari decât zero în toate câmpurile.";
    containerRezultat.className = "eroare";
    return;
  }

  const litriConsumati = (distanta / 100) * consum;
  const costTotal = litriConsumati * pret;

  containerRezultat.innerHTML = `
    <p>Combustibil necesar: ${litriConsumati.toFixed(2)} litri</p>
    <p>Cost total: ${costTotal.toFixed(2)} lei</p>
  `;
}
