"use client";

/** Rasterise the unscaled 1123×794 certificate node (fonts and images awaited first). */
async function renderCertificate(node: HTMLElement, scale: number) {
  const { default: html2canvas } = await import("html2canvas-pro");

  if ("fonts" in document) await document.fonts.ready;
  await Promise.all(
    Array.from(node.querySelectorAll("img")).map((img) =>
      img.complete ? Promise.resolve() : new Promise<void>((r) => { img.onload = () => r(); img.onerror = () => r(); }),
    ),
  );

  return html2canvas(node, {
    scale,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
    width: 1123,
    height: 794,
    windowWidth: 1123,
    windowHeight: 794,
    x: 0,
    y: 0,
    scrollX: 0,
    scrollY: 0,
    onclone: (doc) => {
      const el = doc.getElementById(node.id);
      if (el) {
        el.style.left = "0";
        el.style.top = "0";
        el.style.position = "absolute";
      }
    },
  });
}

/** Rasterise at 3× and save as a single A4-landscape PDF. */
export async function downloadCertificatePdf(node: HTMLElement, fileName: string) {
  const [canvas, { jsPDF }] = await Promise.all([renderCertificate(node, 3), import("jspdf")]);
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
  pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, 297, 210, undefined, "FAST");
  pdf.setProperties({ title: fileName, author: "Nagar Panchayat Kedarnath", subject: "Carry Me Back – Certificate of Appreciation" });
  pdf.save(`${fileName}.pdf`);
}

/** PNG of the certificate for sharing (≈1685×1191 — sharp on phones, small enough for WhatsApp). */
export async function certificatePngFile(node: HTMLElement, fileName: string): Promise<File> {
  const canvas = await renderCertificate(node, 1.5);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  if (!blob) throw new Error("Could not create the image");
  return new File([blob], `${fileName}.png`, { type: "image/png" });
}

/**
 * Print exactly one A4-landscape page: rasterise the certificate (same renderer as the PDF), put that single image in a
 * hidden iframe whose document contains nothing else, and print the iframe. Independent of the page's own CSS, so it
 * can't come out blank or repeated whatever the browser, extensions or print settings.
 */
export async function printCertificate(node: HTMLElement, title: string) {
  const canvas = await renderCertificate(node, 3);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.95));
  if (!blob) throw new Error("Could not prepare the certificate for printing");
  const src = URL.createObjectURL(blob);

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.title = title;
  Object.assign(frame.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0", visibility: "hidden" });
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
  frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
    @page { size: A4 landscape; margin: 0; }
    html, body { margin: 0; padding: 0; background: #fff; }
    img { display: block; width: 297mm; height: 210mm; object-fit: contain; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  </style></head><body><img src="${src}" alt="${esc(title)}"></body></html>`;

  await new Promise<void>((resolve, reject) => {
    frame.onload = () => resolve();
    frame.onerror = () => reject(new Error("Print frame failed to load"));
    document.body.appendChild(frame);
  });
  const win = frame.contentWindow!;
  const img = win.document.querySelector("img")!;
  if (!img.complete) await new Promise((r) => { img.onload = img.onerror = r; });
  await img.decode?.().catch(() => {});

  const cleanup = () => { frame.remove(); URL.revokeObjectURL(src); };
  win.addEventListener("afterprint", () => setTimeout(cleanup, 500), { once: true });
  setTimeout(cleanup, 120_000); // safety net if afterprint never fires
  win.focus();
  win.print();
}
