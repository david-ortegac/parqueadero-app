/**
 * Política de Tratamiento de Datos Personales
 * Conforme a la Ley Estatutaria 1581 de 2012 y el Decreto Reglamentario 1377 de 2013 (República de Colombia).
 */

export interface PolicySection {
  title: string;
  content: string[];
}

export const DATA_PROCESSING_POLICY = {
  title: 'Política de Tratamiento y Protección de Datos Personales',
  lastUpdated: 'Octubre 2026',
  legalBasis: 'Ley Estatutaria 1581 de 2012 · Decreto 1377 de 2013 (Colombia)',
  summary:
    'Parqueadero App garantiza la confidencialidad, seguridad y el debido tratamiento de la información personal recolectada a través de sus canales digitales y presenciales.',
  sections: [
    {
      title: '1. Responsable del Tratamiento',
      content: [
        'Parqueadero App y la administración del establecimiento comercial actúan como responsables del tratamiento de los datos personales suministrados por los usuarios, clientes propietarios de vehículos, operadores y visitantes.',
        'Canales de contacto y atención: soporte directivo del parqueadero y canales habilitados en la plataforma.',
      ],
    },
    {
      title: '2. Datos Personales Recolectados',
      content: [
        'Datos de identificación y contacto: nombres y apellidos completos, documento de identidad (cédula de ciudadanía o extranjería), dirección de correo electrónico y número de teléfono.',
        'Datos vehiculares y operativos: placa de vehículos, tipo de vehículo (carro o motocicleta), marca, color, cilindraje, fecha y hora de ingreso, tiempo de permanencia, registros de salida y soportes de pago de tarifas.',
      ],
    },
    {
      title: '3. Finalidades del Tratamiento',
      content: [
        'Gestionar el control operativo, custodia y registro de vehículos en patio.',
        'Calcular, liquidar y cobrar las tarifas correspondientes a la modalidad de parqueo (minuto, hora, día, semana o mes).',
        'Generar e imprimir tickets de ingreso y recibos de cobro con trazabilidad reglamentaria.',
        'Vincular los vehículos a las cuentas de los usuarios propietarios para consulta en tiempo real de ocupación y cobros acumulados.',
        'Garantizar la seguridad de las instalaciones y prevención de pérdidas o suplantaciones.',
      ],
    },
    {
      title: '4. Tratamiento Especial de Menores de Edad (Edad Mínima 14 Años)',
      content: [
        'De conformidad con el Código de la Infancia y la Adolescencia (Ley 1098 de 2006) y la Ley 1581 de 2012, el uso de esta aplicación está restringido exclusivamente a personas que tengan al menos catorce (14) años de edad cumplidos.',
        'Los adolescentes mayores de 14 años pueden otorgar válidamente su consentimiento para el registro y gestión de sus datos personales en servicios ordinarios de su vida diaria que no comprometan información sensible ni atenten contra sus derechos fundamentales.',
        'Los menores de 14 años no tienen autorización para registrarse ni crear cuentas en esta plataforma. Al registrarse, el usuario declara bajo la gravedad de juramento cumplir con este requisito de edad mínima.',
      ],
    },
    {
      title: '5. Derechos del Titular (Habeas Data)',
      content: [
        'Conocer, actualizar y rectificar sus datos personales frente a datos parciales, inexactos, incompletos o fraccionados.',
        'Solicitar prueba de la autorización otorgada.',
        'Ser informado previa solicitud respecto del uso que se le ha dado a sus datos personales.',
        'Revocar la autorización y/o solicitar la supresión definitiva de su cuenta y datos personales en cualquier momento mediante la opción "Eliminar cuenta" habilitada en su perfil.',
      ],
    },
    {
      title: '6. Supresión y Eliminación de Cuentas',
      content: [
        'Todo usuario tiene el derecho pleno e irrestricto de solicitar la eliminación de su cuenta en cualquier momento. Al ejecutar la opción de eliminación en la sección de Cuenta, se retirarán de inmediato sus credenciales de acceso y perfil de usuario de nuestras bases de datos.',
      ],
    },
  ],
};
