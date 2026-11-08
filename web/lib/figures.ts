/** Nomor "Gambar N." untuk gambar berketerangan buatan editor qiran (bukan gambar lama dari Ghost). */
export function numberFigures(html: string): string {
  let n = 0;
  return html.replace(/(<figure class="qiran-fig">[\s\S]*?<figcaption>)/g, (m) => `${m}<span class="fig-num">Gambar ${++n}.</span> `);
}
