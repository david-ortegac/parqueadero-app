import { environment } from '../../environments/environment';
import { labelBillingMode, labelVehicleClassShort } from '../constants/parking-billing.catalog';
import { ParkingSession } from '../services/parking-api.service';

export interface SaleReceiptData {
  businessName: string;
  nit?: string;
  address?: string;
  ticketNo: string;
  plate: string;
  vehicleClassLabel: string;
  billingModeLabel: string;
  depositorDocument?: string;
  enteredAtIso: string;
  exitedAtIso: string;
  amountPaid: string;
  currency: string;
}

export function formatCop(amountStr: string): string {
  const n = Number.parseFloat(amountStr);
  if (Number.isNaN(n)) {
    return amountStr;
  }
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatReceiptDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/** Ticket al registrar ingreso (80mm, mismo flujo de impresión). */
export interface EntryTicketData {
  businessName: string;
  nit?: string;
  address?: string;
  ticketNo: string;
  plate: string;
  vehicleClassLabel: string;
  billingModeLabel: string;
  depositorDocument?: string;
  enteredAtIso: string;
  /** Texto ya formateado: referencia de cobro o mensaje “al salir”. */
  amountLine: string;
  periodEndsAtIso?: string | null;
  /** Línea opcional: días de cobertura del período prepago. */
  subscriptionCoverageLine?: string | null;
}

export function buildEntryTicketFromSession(session: ParkingSession): EntryTicketData {
  const v = session.vehicle;
  const due = Number.parseFloat(session.amount_due);
  const hasPeriod = Boolean(session.period_ends_at);
  let amountLine: string;
  if (hasPeriod && !Number.isNaN(due) && due > 0) {
    amountLine = `Período pagado: ${formatCop(session.amount_due)}`;
  } else if (!Number.isNaN(due) && due > 0) {
    amountLine = `Referencia: ${formatCop(session.amount_due)}`;
  } else {
    amountLine = 'Cobro al salir según tarifa vigente';
  }

  let subscriptionCoverageLine: string | undefined;
  if (session.subscription_period_days != null) {
    subscriptionCoverageLine = `Cobertura: ${session.subscription_period_days} días`;
  }

  return {
    businessName: environment.receiptBusinessName || 'Parqueadero',
    nit: environment.receiptNit?.trim() || undefined,
    address: environment.receiptAddress?.trim() || undefined,
    ticketNo: String(session.id),
    plate: (v?.plate ?? '—').toUpperCase(),
    vehicleClassLabel: labelVehicleClassShort(v?.vehicle_class ?? ''),
    billingModeLabel: labelBillingMode(session.billing_mode),
    depositorDocument: v?.depositor_document?.trim() || undefined,
    enteredAtIso: session.entered_at,
    amountLine,
    periodEndsAtIso: session.period_ends_at ?? null,
    subscriptionCoverageLine: subscriptionCoverageLine ?? null,
  };
}

/** Unión para abrir el mismo modal de ticket (ingreso o cobro). */
export type TicketSheetPayload =
  | { mode: 'sale'; data: SaleReceiptData }
  | { mode: 'entry'; data: EntryTicketData };

export function buildSaleReceiptFromSession(session: ParkingSession): SaleReceiptData {
  const v = session.vehicle;
  const exited = session.exited_at ?? session.entered_at;
  return {
    businessName: environment.receiptBusinessName || 'Parqueadero',
    nit: environment.receiptNit?.trim() || undefined,
    address: environment.receiptAddress?.trim() || undefined,
    ticketNo: String(session.id),
    plate: (v?.plate ?? '—').toUpperCase(),
    vehicleClassLabel: labelVehicleClassShort(v?.vehicle_class ?? ''),
    billingModeLabel: labelBillingMode(session.billing_mode),
    depositorDocument: v?.depositor_document?.trim() || undefined,
    enteredAtIso: session.entered_at,
    exitedAtIso: exited,
    amountPaid: session.amount_paid ?? session.amount_due,
    currency: 'COP',
  };
}
