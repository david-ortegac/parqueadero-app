export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000/api/v1',
  /**
   * Origen de la PWA para QR / enlaces (sin barra final). Ajusta el puerto si no usas `ng serve` (4200).
   */
  publicAppBaseUrl: 'https://parkingsoft.davidortega.dev/public',
  /** Textos del recibo / factura térmica 80mm (configura para tu negocio). */
  receiptBusinessName: 'Parqueadero',
  receiptNit: '',
  receiptAddress: '',
};
