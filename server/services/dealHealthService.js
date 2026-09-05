/**
 * DealFlow360 — Deal Health & Anomaly Detection Telemetry Service
 * Detects stalled quotations, rep discount anomalies against historical averages,
 * delivery slippage, and supports idempotent scans, escalations, rep nudging,
 * and append-only audit logging.
 */

const prisma = require('../prisma/prisma');
const { ApiError } = require('../utils/apiResponse');

class DealHealthService {
  /**
   * Scan for stalled deals (inactive for more than configurable days).
   * Idempotent: Does not duplicate active unresolved flags.
   */
  async scanForStalledDeals(config = {}) {
    const stalledDays = config.stalledDays !== undefined ? Number(config.stalledDays) : 7;
    const cutoffDate = new Date(Date.now() - stalledDays * 24 * 60 * 60 * 1000);

    const inactiveQuotes = await prisma.quotation.findMany({
      where: {
        status: { in: ['DRAFT', 'PENDING_APPROVAL', 'IN_REVIEW'] },
        updatedAt: { lte: cutoffDate },
      },
      include: {
        ownerRep: true,
        customer: true,
      },
    });

    let createdOrUpdated = 0;

    for (const quote of inactiveQuotes) {
      const daysInactive = Math.floor((Date.now() - new Date(quote.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
      const severity = daysInactive >= 14 ? 'HIGH' : 'MEDIUM';
      const details = `Quotation has been inactive in '${quote.status}' for ${daysInactive} days without progression.`;

      const existing = await prisma.dealHealthFlag.findFirst({
        where: {
          quotationId: quote.id,
          flagType: 'STALLED',
          isResolved: false,
        },
      });

      if (!existing) {
        await prisma.dealHealthFlag.create({
          data: {
            quotationId: quote.id,
            flagType: 'STALLED',
            details,
            severity,
            isResolved: false,
          },
        });
        createdOrUpdated++;
      } else {
        // Update details if days increased
        await prisma.dealHealthFlag.update({
          where: { id: existing.id },
          data: { details, severity },
        });
      }
    }

    return { stalledQuotesFound: inactiveQuotes.length, flagsCreatedOrUpdated: createdOrUpdated };
  }

  /**
   * Detect rep discount anomalies materially above their historical average on confirmed quotes.
   * Idempotent: Does not duplicate active unresolved flags.
   */
  async detectDiscountAnomalies(config = {}) {
    const thresholdDelta = config.thresholdDelta !== undefined ? Number(config.thresholdDelta) : 10.0;

    // 1. Calculate rep historical discount average on confirmed quotes
    const confirmedQuotes = await prisma.quotation.findMany({
      where: { status: { in: ['CONFIRMED', 'CONVERTED_TO_ORDER'] } },
      select: {
        ownerRepId: true,
        discountTotal: true,
        subtotal: true,
      },
    });

    const repAverages = {};
    for (const cq of confirmedQuotes) {
      const subtotal = Number(cq.subtotal) || 0;
      const discount = Number(cq.discountTotal) || 0;
      const pct = subtotal > 0 ? (discount / subtotal) * 100 : 0;

      if (!repAverages[cq.ownerRepId]) {
        repAverages[cq.ownerRepId] = { totalPct: 0, count: 0 };
      }
      repAverages[cq.ownerRepId].totalPct += pct;
      repAverages[cq.ownerRepId].count += 1;
    }

    // 2. Scan active pending/draft/submitted quotes for anomalies
    const activeQuotes = await prisma.quotation.findMany({
      where: {
        status: { in: ['DRAFT', 'PENDING_APPROVAL', 'IN_REVIEW', 'APPROVED'] },
      },
      include: {
        lines: true,
        ownerRep: true,
        customer: true,
      },
    });

    let createdOrUpdated = 0;

    for (const quote of activeQuotes) {
      const repStats = repAverages[quote.ownerRepId];
      // Default benchmark if rep has no confirmed quotes yet is 5.0%
      const historicalAvg = repStats && repStats.count > 0 ? repStats.totalPct / repStats.count : 5.0;

      const quoteSubtotal = Number(quote.subtotal) || 0;
      const quoteDiscount = Number(quote.discountTotal) || 0;
      const quoteDiscountPct = quoteSubtotal > 0 ? (quoteDiscount / quoteSubtotal) * 100 : 0;

      const maxLineDiscount = quote.lines.reduce((max, l) => Math.max(max, Number(l.discountPercent)), 0);

      // Flag if overall discount OR max line discount exceeds rep average by threshold
      if (quoteDiscountPct - historicalAvg >= thresholdDelta || maxLineDiscount - historicalAvg >= thresholdDelta * 1.5) {
        const details = `Representative applied an aggregate discount of ${quoteDiscountPct.toFixed(
          1
        )}% (max line: ${maxLineDiscount.toFixed(1)}%), materially above their historical average of ${historicalAvg.toFixed(
          1
        )}% (+${(quoteDiscountPct - historicalAvg).toFixed(1)}% delta).`;

        const existing = await prisma.dealHealthFlag.findFirst({
          where: {
            quotationId: quote.id,
            flagType: 'DISCOUNT_ANOMALY',
            isResolved: false,
          },
        });

        if (!existing) {
          await prisma.dealHealthFlag.create({
            data: {
              quotationId: quote.id,
              flagType: 'DISCOUNT_ANOMALY',
              details,
              severity: 'HIGH',
              isResolved: false,
            },
          });
          createdOrUpdated++;
        } else {
          await prisma.dealHealthFlag.update({
            where: { id: existing.id },
            data: { details },
          });
        }
      }
    }

    return { flagsCreatedOrUpdated: createdOrUpdated };
  }

  /**
   * Detect delivery slippage (expected fulfillment date passed or quote confirmed > slippageDays ago without shipment).
   * Idempotent: Does not duplicate active unresolved flags.
   */
  async detectDeliverySlippage(config = {}) {
    const slippageDays = config.slippageDays !== undefined ? Number(config.slippageDays) : 5;
    const cutoffDate = new Date(Date.now() - slippageDays * 24 * 60 * 60 * 1000);

    const confirmedQuotes = await prisma.quotation.findMany({
      where: {
        status: { in: ['CONFIRMED', 'APPROVED'] },
        updatedAt: { lte: cutoffDate },
      },
      include: {
        fulfillmentSplits: true,
        customer: true,
        ownerRep: true,
      },
    });

    let createdOrUpdated = 0;

    for (const quote of confirmedQuotes) {
      const hasPendingSplits = quote.fulfillmentSplits.length === 0;
      const hasBackorders = quote.fulfillmentSplits.some((s) => s.backorderQuantity > 0);
      const isUnshipped = quote.fulfillmentSplits.every((s) => s.status !== 'SHIPPED');

      if (hasPendingSplits || hasBackorders || isUnshipped) {
        const daysAgo = Math.floor((Date.now() - new Date(quote.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
        const details = hasBackorders
          ? `Order has ${quote.fulfillmentSplits.reduce(
              (sum, s) => sum + s.backorderQuantity,
              0
            )} unallocated backordered units pending arrival (${daysAgo} days since confirmation).`
          : `Order was confirmed ${daysAgo} days ago without completion of warehouse dispatch/shipment.`;

        const existing = await prisma.dealHealthFlag.findFirst({
          where: {
            quotationId: quote.id,
            flagType: 'DELIVERY_SLIPPAGE',
            isResolved: false,
          },
        });

        if (!existing) {
          await prisma.dealHealthFlag.create({
            data: {
              quotationId: quote.id,
              flagType: 'DELIVERY_SLIPPAGE',
              details,
              severity: 'HIGH',
              isResolved: false,
            },
          });
          createdOrUpdated++;
        } else {
          await prisma.dealHealthFlag.update({
            where: { id: existing.id },
            data: { details },
          });
        }
      }
    }

    return { flagsCreatedOrUpdated: createdOrUpdated };
  }

  /**
   * Run all scans together (on-demand or via background cron).
   */
  async runAllScans(config = {}) {
    const [stalled, discount, slippage] = await Promise.all([
      this.scanForStalledDeals(config),
      this.detectDiscountAnomalies(config),
      this.detectDeliverySlippage(config),
    ]);

    const activeCount = await prisma.dealHealthFlag.count({
      where: { isResolved: false },
    });

    return {
      scannedAt: new Date(),
      stalled,
      discount,
      slippage,
      totalActiveFlags: activeCount,
    };
  }

  /**
   * Escalate an active deal health flag.
   * Creates audit event now, with documented integration point for notifications.
   */
  async escalateFlag(flagId, actorId) {
    const flag = await prisma.dealHealthFlag.findUnique({
      where: { id: flagId },
      include: {
        quotation: {
          include: { ownerRep: true, customer: true },
        },
      },
    });

    if (!flag) {
      throw new ApiError('Deal health flag not found.', 404, 'FLAG_NOT_FOUND');
    }

    const updatedFlag = await prisma.dealHealthFlag.update({
      where: { id: flag.id },
      data: {
        severity: 'HIGH',
      },
    });

    // Write audit event
    await prisma.auditLog.create({
      data: {
        actorId,
        action: 'DEAL_HEALTH_ESCALATED',
        quotationId: flag.quotationId,
        targetId: flag.id,
        targetType: 'DealHealthFlag',
        reasonNote: `Deal health flag '${flag.flagType}' on quote ${flag.quotation?.quoteNumber} was escalated to HIGH priority.`,
        meta: {
          flagType: flag.flagType,
          quotationId: flag.quotationId,
          quoteNumber: flag.quotation?.quoteNumber,
        },
      },
    });

    // -------------------------------------------------------------------------
    // EXTENSION POINT: Integrated Notification Hub
    // e.g. await notificationService.sendSlackAlert({ channel: '#sales-leadership', message: `Deal ${flag.quotation?.quoteNumber} escalated!` });
    // e.g. await emailService.sendEscalationNotice({ to: 'leadership@dealflow360.internal', flag });
    // -------------------------------------------------------------------------

    return updatedFlag;
  }

  /**
   * Nudge sales representative regarding an active flag.
   * Creates audit event now, with documented integration point for email/Slack.
   */
  async nudgeRep(flagId, actorId) {
    const flag = await prisma.dealHealthFlag.findUnique({
      where: { id: flagId },
      include: {
        quotation: {
          include: { ownerRep: true, customer: true },
        },
      },
    });

    if (!flag) {
      throw new ApiError('Deal health flag not found.', 404, 'FLAG_NOT_FOUND');
    }

    const rep = flag.quotation?.ownerRep;

    // Write audit event
    await prisma.auditLog.create({
      data: {
        actorId,
        action: 'DEAL_HEALTH_REP_NUDGED',
        quotationId: flag.quotationId,
        targetId: flag.id,
        targetType: 'DealHealthFlag',
        reasonNote: `Nudged owner rep ${rep?.name || 'Rep'} (${rep?.email || 'N/A'}) regarding ${flag.flagType} on quote ${flag.quotation?.quoteNumber}.`,
        meta: {
          flagType: flag.flagType,
          repId: rep?.id,
          repName: rep?.name,
          repEmail: rep?.email,
          quoteNumber: flag.quotation?.quoteNumber,
        },
      },
    });

    // -------------------------------------------------------------------------
    // EXTENSION POINT: Direct Representative Nudge Delivery
    // e.g. await emailService.sendNudge({ to: rep.email, subject: `Action Required: Deal ${flag.quotation?.quoteNumber}` });
    // e.g. await notificationService.sendDirectSlackMessage(rep.slackId, `Deal ${flag.quotation?.quoteNumber} needs attention.`);
    // -------------------------------------------------------------------------

    return {
      success: true,
      message: `Nudge dispatched to ${rep?.name || 'representative'}.`,
      rep: {
        name: rep?.name,
        email: rep?.email,
      },
    };
  }

  /**
   * Get Deal Health Dashboard data for Screen #14:
   * 3 Telemetry Cards: Stalled Deals, Discount Anomalies, Delivery Slippage
   * Table: Deal, Issue, Flagged, Severity, and Action
   */
  async getDashboardData() {
    // Run an on-demand scan refresh first so telemetry is always live
    await this.runAllScans();

    const [stalledCount, discountCount, slippageCount, flags] = await Promise.all([
      prisma.dealHealthFlag.count({ where: { flagType: 'STALLED', isResolved: false } }),
      prisma.dealHealthFlag.count({ where: { flagType: 'DISCOUNT_ANOMALY', isResolved: false } }),
      prisma.dealHealthFlag.count({ where: { flagType: 'DELIVERY_SLIPPAGE', isResolved: false } }),
      prisma.dealHealthFlag.findMany({
        where: { isResolved: false },
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        include: {
          quotation: {
            include: {
              customer: true,
              ownerRep: true,
            },
          },
        },
      }),
    ]);

    const table = flags.map((f) => ({
      id: f.id,
      quotationId: f.quotationId,
      deal: f.quotation?.quoteNumber || 'Q-N/A',
      customer: f.quotation?.customer?.name || 'Customer',
      issue: f.flagType,
      details: f.details,
      flagged: f.createdAt,
      severity: f.severity,
      ownerRep: {
        id: f.quotation?.ownerRep?.id,
        name: f.quotation?.ownerRep?.name || 'Rep',
        email: f.quotation?.ownerRep?.email,
      },
      status: f.quotation?.status,
    }));

    return {
      cards: {
        stalledDeals: stalledCount,
        discountAnomalies: discountCount,
        deliverySlippage: slippageCount,
      },
      table,
    };
  }
}

module.exports = new DealHealthService();
