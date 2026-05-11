export const environment = {
  production: false,
  apiUrl: 'https://parkingsoft.davidortega.dev/public/api/v1',
  /**
   * Origen de la PWA para QR / enlaces (sin barra final). Ajusta el puerto si no usas `ng serve` (4200).
   */
  publicAppBaseUrl: 'https://parkingsoft-21f2a.web.app/',
  /** Textos del recibo / factura térmica 80mm (configura para tu negocio). */
  receiptBusinessName: 'Parqueadero',
  receiptNit: '',
  receiptAddress: '',
};
