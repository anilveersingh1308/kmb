"use client";

/** Rasterise the unscaled certificate node at 3× and save as a single A4-landscape PDF. */
export async function downloadCertificatePdf(node: HTMLElement, fileName: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);

  if ("fonts" in document) await document.fonts.ready;
  await Promise.all(
    Array.from(node.querySelectorAll("img")).map((img) =>
      img.complete ? Promise.resolve() : new Promise<void>((r) => { img.onload = () => r(); img.onerror = () => r(); }),
    ),
  );

  const canvas = await html2canvas(node, {
    scale: 3,
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

  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
  pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, 297, 210, undefined, "FAST");
  pdf.setProperties({ title: fileName, author: "Nagar Panchayat Kedarnath", subject: "Carry Me Back – Certificate of Appreciation" });
  pdf.save(`${fileName}.pdf`);
}
