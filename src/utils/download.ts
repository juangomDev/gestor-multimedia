/**
 * Dispara la descarga en el navegador de un `Blob` previamente obtenido mediante petición autenticada.
 *
 * @param blob Contenido binario descargado desde `monolith-backend`.
 * @param filename Nombre sugerido del archivo al guardar.
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
