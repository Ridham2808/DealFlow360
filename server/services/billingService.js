/**
 * DealFlow360 — Transactional Hybrid Billing Service
 * Implements strict separation of one-time and recurring billing,
 * invoice creation, recurring billing schedules, cycle calculation,
 * mid-cycle proration, cancellation credits, payment recording, and audit trails.
 */

const prisma = require('../prisma/prisma');
const { ApiError } = require('../utils/apiResponse');

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function addYears(date, years) {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

function getCycleDays(cycle) {
  switch (cycle) {
    case 'YEARLY':
      return 365;
    case 'QUARTERLY':
      return 90;
    case 'MONTHLY':
    default:
      return 30;
  }
}

class BillingService {
  /**
   * Confirms a quotation and generates separate one-time invoice and recurring billing schedules.
   * Runs atomically inside a PostgreSQL transaction.
   *
   * @param {string} quotationId
   * @param {string} actorId
   * @returns {Promise<Object>}
   */
  async generateBilling(quotationId, actorId) {
    return prisma.$transaction(async (tx) => {
      const quote = await tx.quotation.findFirst({
        where: { OR: [{ id: quotationId }, { quoteNumber: quotationId }] },
        include: {
          customer: true,
          lines: {
            include: {
              product: true,
              subscriptionPlan: true,
            },
          },
          invoices: true,
        },
      });

      if (!quote) {
        throw new ApiError('Quotation not found.', 404, 'QUOTATION_NOT_FOUND');
      }

      // If quote is not yet CONFIRMED, transition to CONFIRMED
      const previousStatus = quote.status;
      if (quote.status !== 'CONFIRMED') {
        await tx.quotation.update({
          where: { id: quote.id },
          data: {
            status: 'CONFIRMED',
            version: { increment: 1 },
          },
        });
      }

      const oneTimeLines = quote.lines.filter((l) => !l.isRecurring);
      const recurringLines = quote.lines.filter((l) => l.isRecurring);

      let createdInvoice = null;
      const createdSchedules = [];

      // 1. Generate ONE_TIME invoice for one-time lines (Do not combine with recurring)
      if (oneTimeLines.length > 0) {
        const subtotal = oneTimeLines.reduce((sum, l) => sum + Number(l.lineSubtotal), 0);
        const taxTotal = oneTimeLines.reduce(
          (sum, l) => sum + Number(l.lineSubtotal) * (Number(l.taxPercent) / 100),
          0
        );
        const totalAmount = Number((subtotal + taxTotal).toFixed(2));

        // Generate clean unique invoice number
        const existingCount = await tx.invoice.count({ where: { quotationId: quote.id } });
        const invoiceNumber = `INV-${quote.quoteNumber}-${String(existingCount + 1).padStart(2, '0')}`;
        const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30-day term

        createdInvoice = await tx.invoice.create({
          data: {
            quotationId: quote.id,
            invoiceNumber,
            type: 'ONE_TIME',
            amount: totalAmount,
            status: 'ISSUED',
            dueDate,
          },
        });
      }

      // 2. Create one recurring BillingSchedule per recurring line
      for (const line of recurringLines) {
        const cycle = line.subscriptionPlan?.billingCycle || 'MONTHLY';
        const now = new Date();
        let nextBillDate = now;

        if (cycle === 'YEARLY') {
          nextBillDate = addYears(now, 1);
        } else if (cycle === 'QUARTERLY') {
          nextBillDate = addMonths(now, 3);
        } else {
          nextBillDate = addMonths(now, 1);
        }

        // Avoid duplicate schedule for same quotation line
        const existingSchedule = await tx.billingSchedule.findFirst({
          where: { quotationLineId: line.id },
        });

        if (!existingSchedule) {
          const schedule = await tx.billingSchedule.create({
            data: {
              subscriptionPlanId: line.subscriptionPlanId,
              quotationLineId: line.id,
              amount: Number(line.lineSubtotal),
              nextBillDate,
              status: 'ACTIVE',
            },
            include: {
              subscriptionPlan: true,
              quotationLine: {
                include: { product: true },
              },
            },
          });
          createdSchedules.push(schedule);
        } else {
          createdSchedules.push(existingSchedule);
        }
      }

      // 3. Append AuditLog
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'HYBRID_BILLING_GENERATED',
          quotationId: quote.id,
          targetId: quote.id,
          targetType: 'Quotation',
          beforeStatus: previousStatus,
          afterStatus: 'CONFIRMED',
          reasonNote: `Generated hybrid billing: ${
            createdInvoice ? `ONE_TIME invoice #${createdInvoice.invoiceNumber} ($${createdInvoice.amount})` : 'No one-time lines'
          } and ${createdSchedules.length} recurring schedules.`,
          meta: {
            invoiceId: createdInvoice?.id,
            invoiceNumber: createdInvoice?.invoiceNumber,
            invoiceAmount: createdInvoice?.amount,
            recurringSchedulesCount: createdSchedules.length,
          },
        },
      });

      return {
        quotationId: quote.id,
        invoice: createdInvoice,
        billingSchedules: createdSchedules,
        oneTimeLinesCount: oneTimeLines.length,
        recurringLinesCount: recurringLines.length,
      };
    });
  }

  /**
   * Record payment for an invoice.
   * Changes status from ISSUED to PAID and records paidAt.
   */
  async recordPayment(invoiceId, { amount, paymentMethod = 'CREDIT_CARD', reference = '' }, actorId) {
    return prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: { OR: [{ id: invoiceId }, { invoiceNumber: invoiceId }] },
        include: {
          quotation: {
            include: { customer: true },
          },
        },
      });

      if (!invoice) {
        throw new ApiError('Invoice not found.', 404, 'INVOICE_NOT_FOUND');
      }

      if (invoice.status === 'PAID') {
        throw new ApiError('Invoice is already fully paid.', 400, 'INVOICE_ALREADY_PAID');
      }

      if (invoice.status === 'VOID') {
        throw new ApiError('Cannot record payment for a VOID invoice.', 400, 'INVOICE_VOID');
      }

      const paymentAmount = amount !== undefined ? Number(amount) : Number(invoice.amount);
      const isFullPayment = paymentAmount >= Number(invoice.amount);
      const newStatus = isFullPayment ? 'PAID' : 'PARTIALLY_PAID';

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: newStatus,
          paidAt: isFullPayment ? new Date() : null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'INVOICE_PAYMENT_RECORDED',
          quotationId: invoice.quotationId,
          targetId: invoice.id,
          targetType: 'Invoice',
          beforeStatus: invoice.status,
          afterStatus: newStatus,
          reasonNote: `Recorded ${paymentMethod} payment of $${paymentAmount.toFixed(2)} for invoice #${invoice.invoiceNumber}. Ref: ${reference || 'N/A'}.`,
          meta: {
            paymentAmount,
            paymentMethod,
            reference,
            invoiceNumber: invoice.invoiceNumber,
          },
        },
      });

      return updatedInvoice;
    });
  }

  /**
   * Modify a subscription schedule mid-cycle with exact proration calculation.
   */
  async modifySubscription(scheduleId, updates, actorId) {
    return prisma.$transaction(async (tx) => {
      const schedule = await tx.billingSchedule.findUnique({
        where: { id: scheduleId },
        include: {
          subscriptionPlan: true,
          quotationLine: {
            include: { product: true, quotation: true },
          },
        },
      });

      if (!schedule) {
        throw new ApiError('Subscription schedule not found.', 404, 'SCHEDULE_NOT_FOUND');
      }

      const cycle = schedule.subscriptionPlan?.billingCycle || 'MONTHLY';
      const totalCycleDays = getCycleDays(cycle);
      const now = new Date();
      const msRemaining = Math.max(0, new Date(schedule.nextBillDate).getTime() - now.getTime());
      const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
      const prorationFactor = Math.min(1, Math.max(0, daysRemaining / totalCycleDays));

      let priceAdjustment = 0;
      let newAmount = Number(schedule.amount);

      if (updates.newAmount !== undefined) {
        newAmount = Number(updates.newAmount);
        priceAdjustment = Number(((newAmount - Number(schedule.amount)) * prorationFactor).toFixed(2));
      }

      const updatedSchedule = await tx.billingSchedule.update({
        where: { id: schedule.id },
        data: {
          amount: newAmount,
          subscriptionPlanId: updates.subscriptionPlanId || schedule.subscriptionPlanId,
          status: updates.status || schedule.status,
        },
        include: {
          subscriptionPlan: true,
          quotationLine: {
            include: { product: true },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'SUBSCRIPTION_MODIFIED',
          quotationId: schedule.quotationLine?.quotationId,
          targetId: schedule.id,
          targetType: 'BillingSchedule',
          beforeStatus: schedule.status,
          afterStatus: updatedSchedule.status,
          reasonNote: `Modified subscription. New amount: $${newAmount}. Prorated delta for ${daysRemaining} days remaining: $${priceAdjustment}.`,
          meta: {
            oldAmount: Number(schedule.amount),
            newAmount,
            daysRemaining,
            prorationFactor,
            priceAdjustment,
          },
        },
      });

      return {
        schedule: updatedSchedule,
        proration: {
          totalCycleDays,
          daysRemaining,
          prorationFactor: Number(prorationFactor.toFixed(4)),
          priceAdjustment,
        },
      };
    });
  }

  /**
   * Cancel a subscription with calculated credit / refund.
   */
  async cancelSubscription(scheduleId, { reason = 'Customer request', immediate = true }, actorId) {
    return prisma.$transaction(async (tx) => {
      const schedule = await tx.billingSchedule.findUnique({
        where: { id: scheduleId },
        include: {
          subscriptionPlan: true,
          quotationLine: {
            include: { product: true, quotation: true },
          },
        },
      });

      if (!schedule) {
        throw new ApiError('Subscription schedule not found.', 404, 'SCHEDULE_NOT_FOUND');
      }

      if (schedule.status === 'CANCELLED') {
        throw new ApiError('Subscription is already cancelled.', 400, 'ALREADY_CANCELLED');
      }

      const cycle = schedule.subscriptionPlan?.billingCycle || 'MONTHLY';
      const totalCycleDays = getCycleDays(cycle);
      const now = new Date();
      const msRemaining = Math.max(0, new Date(schedule.nextBillDate).getTime() - now.getTime());
      const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
      const dailyRate = Number(schedule.amount) / totalCycleDays;
      const creditRefundAmount = Number((dailyRate * daysRemaining).toFixed(2));

      const updatedSchedule = await tx.billingSchedule.update({
        where: { id: schedule.id },
        data: {
          status: 'CANCELLED',
        },
        include: {
          subscriptionPlan: true,
          quotationLine: {
            include: { product: true },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'SUBSCRIPTION_CANCELLED',
          quotationId: schedule.quotationLine?.quotationId,
          targetId: schedule.id,
          targetType: 'BillingSchedule',
          beforeStatus: schedule.status,
          afterStatus: 'CANCELLED',
          reasonNote: `Subscription cancelled. Reason: ${reason}. Credit/Refund: $${creditRefundAmount} (${daysRemaining} unserved days).`,
          meta: {
            reason,
            daysRemaining,
            creditRefundAmount,
            immediate,
          },
        },
      });

      return {
        schedule: updatedSchedule,
        cancellationCredit: {
          refundAmount: creditRefundAmount,
          daysRemaining,
          totalCycleDays,
          reason,
        },
      };
    });
  }

  /**
   * List subscriptions with Active, Paused, Cancelled status counts.
   */
  async listSubscriptions({ status, customerId, page = 1, limit = 50 }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(1000, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (status) {
      where.status = status;
    }
    if (customerId) {
      where.quotationLine = {
        quotation: { customerId },
      };
    }

    const [activeCount, pausedCount, cancelledCount, total, schedules] = await Promise.all([
      prisma.billingSchedule.count({ where: { status: 'ACTIVE' } }),
      prisma.billingSchedule.count({ where: { status: 'PAUSED' } }),
      prisma.billingSchedule.count({ where: { status: 'CANCELLED' } }),
      prisma.billingSchedule.count({ where }),
      prisma.billingSchedule.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { nextBillDate: 'asc' },
        include: {
          subscriptionPlan: true,
          quotationLine: {
            include: {
              product: true,
              quotation: {
                include: { customer: true },
              },
            },
          },
        },
      }),
    ]);

    const items = schedules.map((s) => ({
      id: s.id,
      customer: s.quotationLine?.quotation?.customer?.name || 'Customer',
      customerId: s.quotationLine?.quotation?.customerId,
      quoteNumber: s.quotationLine?.quotation?.quoteNumber,
      quotationId: s.quotationLine?.quotationId,
      plan: s.subscriptionPlan?.name || s.quotationLine?.product?.name || 'Subscription',
      cycle: s.subscriptionPlan?.billingCycle || 'MONTHLY',
      nextBill: s.nextBillDate,
      amount: Number(s.amount),
      status: s.status,
    }));

    return {
      statusCounts: {
        active: activeCount,
        paused: pausedCount,
        cancelled: cancelledCount,
      },
      items,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  /**
   * Get subscription billing detail with separate One-Time and Recurring breakdown.
   */
  async getSubscriptionDetail(id) {
    const schedule = await prisma.billingSchedule.findUnique({
      where: { id },
      include: {
        subscriptionPlan: true,
        quotationLine: {
          include: {
            product: true,
            quotation: {
              include: {
                customer: true,
                lines: {
                  include: { product: true, subscriptionPlan: true },
                },
                invoices: true,
              },
            },
          },
        },
      },
    });

    if (!schedule) {
      throw new ApiError('Subscription schedule not found.', 404, 'SCHEDULE_NOT_FOUND');
    }

    const quote = schedule.quotationLine?.quotation;
    const cycle = schedule.subscriptionPlan?.billingCycle || 'MONTHLY';
    const totalDays = getCycleDays(cycle);
    const msRemaining = Math.max(0, new Date(schedule.nextBillDate).getTime() - Date.now());
    const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
    const prorationCredit = Number(((Number(schedule.amount) / totalDays) * daysRemaining).toFixed(2));

    const oneTimeLines = (quote?.lines || [])
      .filter((l) => !l.isRecurring)
      .map((l) => ({
        id: l.id,
        product: l.productNameSnapshot || l.product?.name,
        category: l.categorySnapshot || l.product?.category,
        quantity: l.quantity,
        unitPrice: Number(l.unitPrice),
        discountPercent: Number(l.discountPercent),
        subtotal: Number(l.lineSubtotal),
      }));

    const recurringLines = (quote?.lines || [])
      .filter((l) => l.isRecurring)
      .map((l) => ({
        id: l.id,
        product: l.productNameSnapshot || l.product?.name,
        plan: l.subscriptionPlan?.name || 'Recurring Plan',
        cycle: l.subscriptionPlan?.billingCycle || 'MONTHLY',
        quantity: l.quantity,
        currentAmount: Number(l.lineSubtotal),
        nextBillDate: schedule.nextBillDate,
        status: schedule.status,
      }));

    return {
      schedule: {
        id: schedule.id,
        status: schedule.status,
        amount: Number(schedule.amount),
        nextBillDate: schedule.nextBillDate,
        cycle,
        planName: schedule.subscriptionPlan?.name || 'Standard Plan',
        prorationResult: {
          daysRemaining,
          totalDays,
          calculatedRefundCredit: prorationCredit,
        },
      },
      customer: quote?.customer,
      quotation: {
        id: quote?.id,
        quoteNumber: quote?.quoteNumber,
        status: quote?.status,
        grandTotal: Number(quote?.grandTotal || 0),
      },
      oneTimeLines,
      recurringLines,
      invoices: quote?.invoices || [],
    };
  }

  /**
   * List invoices with Unpaid and Paid status pills.
   */
  async listInvoices({ status, customerId, page = 1, limit = 50 }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(1000, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (status) {
      if (status === 'UNPAID') {
        where.status = { in: ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] };
      } else if (status === 'PAID') {
        where.status = 'PAID';
      } else {
        where.status = status;
      }
    }

    if (customerId) {
      where.quotation = { customerId };
    }

    const [unpaidCount, paidCount, total, invoices] = await Promise.all([
      prisma.invoice.count({
        where: { status: { in: ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] } },
      }),
      prisma.invoice.count({ where: { status: 'PAID' } }),
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { dueDate: 'asc' },
        include: {
          quotation: {
            include: { customer: true },
          },
        },
      }),
    ]);

    const items = invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customer: inv.quotation?.customer?.name || 'Customer',
      customerId: inv.quotation?.customerId,
      quoteNumber: inv.quotation?.quoteNumber,
      quotationId: inv.quotationId,
      amount: Number(inv.amount),
      status: inv.status,
      type: inv.type,
      dueDate: inv.dueDate,
      paidAt: inv.paidAt,
    }));

    return {
      statusCounts: {
        unpaid: unpaidCount,
        paid: paidCount,
      },
      items,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  /**
   * Get invoice detail for Screen #13:
   * Stepper: Order Confirmed -> Shipped -> Invoiced -> Paid
   */
  async getInvoiceDetail(id) {
    const invoice = await prisma.invoice.findFirst({
      where: { OR: [{ id }, { invoiceNumber: id }] },
      include: {
        quotation: {
          include: {
            customer: true,
            lines: {
              include: { product: true },
            },
            fulfillmentSplits: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new ApiError('Invoice not found.', 404, 'INVOICE_NOT_FOUND');
    }

    const quote = invoice.quotation;
    const hasShipped = quote.fulfillmentSplits?.some((s) => s.status === 'SHIPPED' || s.status === 'ACCEPTED');
    const isPaid = invoice.status === 'PAID';

    const stepper = [
      {
        node: 'CONFIRMED',
        label: 'Order Confirmed',
        status: ['CONFIRMED', 'CONVERTED_TO_ORDER'].includes(quote.status) ? 'COMPLETED' : 'PENDING',
      },
      {
        node: 'SHIPPED',
        label: 'Shipped',
        status: hasShipped ? 'COMPLETED' : 'PENDING',
      },
      {
        node: 'INVOICED',
        label: 'Invoiced',
        status: 'COMPLETED',
        date: invoice.dueDate,
      },
      {
        node: 'PAID',
        label: 'Paid',
        status: isPaid ? 'COMPLETED' : 'PENDING',
        date: invoice.paidAt,
      },
    ];

    const paymentHistory = isPaid
      ? [
          {
            id: `pay-${invoice.id.substring(0, 8)}`,
            amount: Number(invoice.amount),
            date: invoice.paidAt,
            method: 'ACH / Corporate Card',
            status: 'SUCCESS',
          },
        ]
      : [];

    return {
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        type: invoice.type,
        amount: Number(invoice.amount),
        status: invoice.status,
        dueDate: invoice.dueDate,
        paidAt: invoice.paidAt,
      },
      customer: quote.customer,
      quotation: {
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        grandTotal: Number(quote.grandTotal),
      },
      lines: quote.lines.map((l) => ({
        id: l.id,
        product: l.productNameSnapshot || l.product?.name,
        quantity: l.quantity,
        unitPrice: Number(l.unitPrice),
        discountPercent: Number(l.discountPercent),
        total: Number(l.lineSubtotal),
      })),
      stepper,
      paymentHistory,
      amountDue: isPaid ? 0 : Number(invoice.amount),
    };
  }

  /**
   * Generate downloadable invoice document format.
   */
  async generateInvoiceDownload(id) {
    const detail = await this.getInvoiceDetail(id);
    const { invoice, customer, quotation, lines } = detail;

    const documentText = `===============================================================
                       DEALFLOW360 INVOICE
===============================================================
Invoice Number: ${invoice.invoiceNumber}
Invoice Type:   ${invoice.type}
Issue Date:     ${new Date(invoice.dueDate).toLocaleDateString()}
Status:         ${invoice.status}
Due Date:       ${new Date(invoice.dueDate).toLocaleDateString()}
Paid Date:      ${invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString() : 'UNPAID'}

CUSTOMER DETAILS:
Name:           ${customer?.name || 'N/A'}
Tier:           ${customer?.tier || 'BRONZE'}
Email:          ${customer?.email || 'N/A'}
Reference Quote:${quotation?.quoteNumber}

LINE ITEMS:
---------------------------------------------------------------
${lines
  .map(
    (l) =>
      `${l.product.padEnd(30)} Qty: ${String(l.quantity).padEnd(4)} Rate: $${l.unitPrice.toFixed(
        2
      )}  Subtotal: $${l.total.toFixed(2)}`
  )
  .join('\n')}
---------------------------------------------------------------
TOTAL INVOICE AMOUNT DUE: $${invoice.amount.toFixed(2)}
===============================================================
Thank you for your business. Remit payment to DealFlow360 Corp.
`;

    return {
      invoiceNumber: invoice.invoiceNumber,
      documentText,
      contentType: 'text/plain',
    };
  }
}

module.exports = new BillingService();
