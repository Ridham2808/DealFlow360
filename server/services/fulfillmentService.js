/**
 * DealFlow360 — Transactional Fulfillment & Warehouse Optimization Service
 * Implements optimal multi-warehouse stock allocation, no-negative-stock transactional guarantees,
 * backorder tracking, manual override reconciliation, and append-only audit logging.
 */

const prisma = require('../prisma/prisma');
const { ApiError } = require('../utils/apiResponse');

class FulfillmentService {
  /**
   * Calculate recommended warehouse split for a quotation.
   * Optimizes by minimizing distinct warehouses touched and factoring shippingCostWeight.
   * Prefers a single warehouse that can satisfy the line in full.
   *
   * @param {string} quotationId
   * @returns {Promise<Object>} Recommended split and cost analysis
   */
  async calculateWarehouseSplit(quotationId) {
    const quote = await prisma.quotation.findFirst({
      where: {
        OR: [{ id: quotationId }, { quoteNumber: quotationId }],
      },
      include: {
        customer: true,
        lines: {
          include: {
            product: {
              include: {
                stockLevels: {
                  include: {
                    warehouse: true,
                  },
                },
              },
            },
          },
        },
        fulfillmentSplits: {
          include: {
            warehouse: true,
            product: true,
          },
        },
      },
    });

    if (!quote) {
      throw new ApiError('Quotation not found.', 404, 'QUOTATION_NOT_FOUND');
    }

    const allWarehouses = await prisma.warehouse.findMany({
      where: { isActive: true },
      orderBy: { shippingCostWeight: 'asc' },
    });

    // We allocate physical / hardware / one-time products with stock tracking
    const physicalLines = quote.lines.filter((line) => !line.isRecurring);

    const recommendedSplits = [];
    const warehouseTouchedSet = new Set();
    let totalEstimatedCost = 0;
    let totalBackorderQuantity = 0;

    for (const line of physicalLines) {
      const neededQty = line.quantity;
      const productId = line.productId;
      const productName = line.productNameSnapshot || line.product?.name || 'Product';

      // Find stock levels for this product across all active warehouses
      const warehouseStock = allWarehouses.map((wh) => {
        const sl = line.product?.stockLevels?.find((s) => s.warehouseId === wh.id);
        const onHand = sl ? sl.quantityOnHand : 0;
        const reserved = sl ? sl.reserved : 0;
        const available = Math.max(0, onHand - reserved);
        const weight = Number(wh.shippingCostWeight) || 1.0;
        return {
          warehouseId: wh.id,
          warehouseName: wh.name,
          location: wh.location,
          shippingCostWeight: weight,
          quantityOnHand: onHand,
          reserved,
          available,
        };
      });

      // Filter to warehouses that have at least some available stock
      const candidateWarehouses = warehouseStock.filter((w) => w.available > 0);

      // Strategy 1: Prefer a single warehouse that can satisfy the entire line
      const completeFulfillers = candidateWarehouses.filter((w) => w.available >= neededQty);

      if (completeFulfillers.length > 0) {
        // Sort by shipping cost weight (lowest first)
        completeFulfillers.sort((a, b) => a.shippingCostWeight - b.shippingCostWeight);
        const bestWh = completeFulfillers[0];

        // Cost model: base shipment fee ($25 * weight) + per unit fee ($1.50 * qty)
        const estimatedCost = Number((25.0 * bestWh.shippingCostWeight + 1.5 * neededQty).toFixed(2));
        totalEstimatedCost += estimatedCost;
        warehouseTouchedSet.add(bestWh.warehouseId);

        recommendedSplits.push({
          lineId: line.id,
          productId,
          productName,
          sku: line.product?.sku || '',
          warehouseId: bestWh.warehouseId,
          warehouseName: bestWh.warehouseName,
          location: bestWh.location,
          quantityRequested: neededQty,
          quantityFulfilled: neededQty,
          backorderQuantity: 0,
          estimatedShipments: 1,
          estimatedCost,
          shippingCostWeight: bestWh.shippingCostWeight,
          availableInWarehouse: bestWh.available,
        });
      } else {
        // Strategy 2: Multi-warehouse split or backorder
        // Sort candidate warehouses by shipping cost weight asc, then available desc
        candidateWarehouses.sort((a, b) => {
          if (a.shippingCostWeight !== b.shippingCostWeight) {
            return a.shippingCostWeight - b.shippingCostWeight;
          }
          return b.available - a.available;
        });

        let remainingNeeded = neededQty;

        for (const wh of candidateWarehouses) {
          if (remainingNeeded <= 0) break;
          const allocQty = Math.min(wh.available, remainingNeeded);
          if (allocQty > 0) {
            const estimatedCost = Number((25.0 * wh.shippingCostWeight + 1.5 * allocQty).toFixed(2));
            totalEstimatedCost += estimatedCost;
            warehouseTouchedSet.add(wh.warehouseId);
            remainingNeeded -= allocQty;

            recommendedSplits.push({
              lineId: line.id,
              productId,
              productName,
              sku: line.product?.sku || '',
              warehouseId: wh.warehouseId,
              warehouseName: wh.warehouseName,
              location: wh.location,
              quantityRequested: neededQty,
              quantityFulfilled: allocQty,
              backorderQuantity: 0,
              estimatedShipments: 1,
              estimatedCost,
              shippingCostWeight: wh.shippingCostWeight,
              availableInWarehouse: wh.available,
            });
          }
        }

        // If stock is insufficient everywhere, mark the remainder as backorder
        if (remainingNeeded > 0) {
          totalBackorderQuantity += remainingNeeded;
          // Assign backorder record to primary/default warehouse
          const primaryWh = allWarehouses[0] || { id: 'default', name: 'Primary Depot', location: 'HQ', shippingCostWeight: 1.0 };
          recommendedSplits.push({
            lineId: line.id,
            productId,
            productName,
            sku: line.product?.sku || '',
            warehouseId: primaryWh.id,
            warehouseName: primaryWh.name,
            location: primaryWh.location,
            quantityRequested: neededQty,
            quantityFulfilled: 0,
            backorderQuantity: remainingNeeded,
            estimatedShipments: 0,
            estimatedCost: 0,
            shippingCostWeight: Number(primaryWh.shippingCostWeight) || 1.0,
            availableInWarehouse: 0,
            isBackorderOnly: true,
          });
        }
      }
    }

    return {
      quotation: {
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        status: quote.status,
        customerName: quote.customer?.name,
      },
      recommendedSplits,
      summary: {
        totalItems: physicalLines.reduce((acc, l) => acc + l.quantity, 0),
        distinctWarehousesTouched: warehouseTouchedSet.size,
        totalShipments: recommendedSplits.filter((s) => s.quantityFulfilled > 0).length,
        totalEstimatedCost: Number(totalEstimatedCost.toFixed(2)),
        totalBackorderQuantity,
        hasBackorder: totalBackorderQuantity > 0,
      },
      currentSplits: quote.fulfillmentSplits,
    };
  }

  /**
   * Validate manual override allocations before committing.
   *
   * @param {string} quotationId
   * @param {Array} allocations [{ warehouseId, productId, quantityFulfilled, backorderQuantity }]
   */
  async validateManualOverride(quotationId, allocations) {
    if (!Array.isArray(allocations) || allocations.length === 0) {
      return { valid: false, errors: ['Allocations array is required and cannot be empty.'] };
    }

    const quote = await prisma.quotation.findFirst({
      where: { OR: [{ id: quotationId }, { quoteNumber: quotationId }] },
      include: {
        lines: {
          include: { product: true },
        },
      },
    });

    if (!quote) {
      return { valid: false, errors: ['Quotation not found.'] };
    }

    const errors = [];
    const productAllocMap = {};

    for (const alloc of allocations) {
      const { warehouseId, productId, quantityFulfilled = 0, backorderQuantity = 0 } = alloc;

      if (quantityFulfilled < 0 || backorderQuantity < 0) {
        errors.push(`Quantities must be non-negative for product ${productId}.`);
        continue;
      }

      // Check warehouse stock
      const stock = await prisma.stockLevel.findUnique({
        where: {
          warehouseId_productId: { warehouseId, productId },
        },
      });

      const onHand = stock ? stock.quantityOnHand : 0;
      const reserved = stock ? stock.reserved : 0;
      const available = Math.max(0, onHand - reserved);

      if (quantityFulfilled > available) {
        errors.push(
          `Cannot allocate ${quantityFulfilled} units at warehouse ${warehouseId}. Only ${available} available (On Hand: ${onHand}, Reserved: ${reserved}).`
        );
      }

      if (!productAllocMap[productId]) {
        productAllocMap[productId] = 0;
      }
      productAllocMap[productId] += quantityFulfilled + backorderQuantity;
    }

    // Verify each physical quote line quantity matches total allocated + backordered
    for (const line of quote.lines.filter((l) => !l.isRecurring)) {
      const allocatedTotal = productAllocMap[line.productId] || 0;
      if (allocatedTotal !== line.quantity) {
        errors.push(
          `Product ${line.productNameSnapshot || line.product?.name}: allocated total (${allocatedTotal}) does not match line quantity (${line.quantity}).`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Accept the suggested warehouse split inside a strict transaction.
   * Atomically re-checks available stock and reserves inventory.
   *
   * @param {string} quotationId
   * @param {string} actorId
   * @returns {Promise<Object>}
   */
  async acceptSuggestedSplit(quotationId, actorId) {
    return prisma.$transaction(async (tx) => {
      const quote = await tx.quotation.findFirst({
        where: { OR: [{ id: quotationId }, { quoteNumber: quotationId }] },
        include: {
          customer: true,
          lines: {
            include: {
              product: {
                include: {
                  stockLevels: {
                    include: { warehouse: true },
                  },
                },
              },
            },
          },
          fulfillmentSplits: true,
        },
      });

      if (!quote) {
        throw new ApiError('Quotation not found.', 404, 'QUOTATION_NOT_FOUND');
      }

      // Allowed statuses: APPROVED or CONFIRMED
      const allowedStatuses = ['APPROVED', 'CONFIRMED'];
      if (!allowedStatuses.includes(quote.status)) {
        throw new ApiError(
          `Cannot fulfill quotation in status '${quote.status}'. Must be APPROVED or CONFIRMED.`,
          400,
          'INVALID_STATUS_FOR_FULFILLMENT'
        );
      }

      // 1. Calculate suggested split fresh
      const splitResult = await this.calculateWarehouseSplit(quote.id);
      const suggested = splitResult.recommendedSplits;

      // 2. Re-check stock atomically & reserve inside transaction
      for (const item of suggested) {
        if (item.quantityFulfilled > 0) {
          const stock = await tx.stockLevel.findUnique({
            where: {
              warehouseId_productId: {
                warehouseId: item.warehouseId,
                productId: item.productId,
              },
            },
          });

          if (!stock) {
            throw new ApiError(
              `Stock level record missing for product '${item.productName}' in warehouse '${item.warehouseName}'.`,
              400,
              'STOCK_RECORD_NOT_FOUND'
            );
          }

          const available = stock.quantityOnHand - stock.reserved;
          if (available < item.quantityFulfilled) {
            throw new ApiError(
              `Concurrency conflict: stock changed. Warehouse '${item.warehouseName}' only has ${available} available for '${item.productName}', but ${item.quantityFulfilled} needed.`,
              409,
              'INSUFFICIENT_STOCK_CONCURRENCY'
            );
          }

          // Atomically increment reserved stock
          await tx.stockLevel.update({
            where: { id: stock.id },
            data: {
              reserved: { increment: item.quantityFulfilled },
            },
          });
        }
      }

      // 3. Clear any existing fulfillment splits for this quote
      await tx.fulfillmentSplit.deleteMany({
        where: { quotationId: quote.id },
      });

      // 4. Create new FulfillmentSplit records
      const createdSplits = [];
      for (const item of suggested) {
        const split = await tx.fulfillmentSplit.create({
          data: {
            quotationId: quote.id,
            warehouseId: item.warehouseId,
            productId: item.productId,
            quantityFulfilled: item.quantityFulfilled,
            backorderQuantity: item.backorderQuantity,
            estimatedCost: item.estimatedCost,
            status: 'ACCEPTED',
          },
          include: {
            warehouse: true,
            product: true,
          },
        });
        createdSplits.push(split);
      }

      // 5. Append AuditLog
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'FULFILLMENT_SPLIT_ACCEPTED',
          quotationId: quote.id,
          targetId: quote.id,
          targetType: 'Quotation',
          beforeStatus: quote.status,
          afterStatus: quote.status,
          reasonNote: `Accepted suggested warehouse split with ${createdSplits.length} allocations. Estimated shipping cost: $${splitResult.summary.totalEstimatedCost}.`,
          meta: {
            splits: createdSplits.map((s) => ({
              id: s.id,
              warehouse: s.warehouse?.name,
              product: s.product?.name,
              fulfilled: s.quantityFulfilled,
              backorder: s.backorderQuantity,
            })),
          },
        },
      });

      return {
        quotationId: quote.id,
        splits: createdSplits,
        summary: splitResult.summary,
      };
    });
  }

  /**
   * Apply validated manual override inside a transaction.
   * Reconciles existing reservations and writes AuditLog.
   */
  async applyManualOverride(quotationId, allocations, actorId) {
    const validation = await this.validateManualOverride(quotationId, allocations);
    if (!validation.valid) {
      throw new ApiError(
        `Manual override validation failed: ${validation.errors.join(' ')}`,
        400,
        'VALIDATION_FAILED'
      );
    }

    return prisma.$transaction(async (tx) => {
      const quote = await tx.quotation.findFirst({
        where: { OR: [{ id: quotationId }, { quoteNumber: quotationId }] },
        include: {
          fulfillmentSplits: true,
        },
      });

      if (!quote) {
        throw new ApiError('Quotation not found.', 404, 'QUOTATION_NOT_FOUND');
      }

      // 1. Reconcile previous reservations if any
      for (const prev of quote.fulfillmentSplits) {
        if (prev.quantityFulfilled > 0) {
          await tx.stockLevel.update({
            where: {
              warehouseId_productId: {
                warehouseId: prev.warehouseId,
                productId: prev.productId,
              },
            },
            data: {
              reserved: { decrement: prev.quantityFulfilled },
            },
          });
        }
      }

      // 2. Atomically reserve new quantities
      const createdSplits = [];
      for (const alloc of allocations) {
        const { warehouseId, productId, quantityFulfilled, backorderQuantity = 0, estimatedCost = 0 } = alloc;

        if (quantityFulfilled > 0) {
          const stock = await tx.stockLevel.findUnique({
            where: { warehouseId_productId: { warehouseId, productId } },
          });

          const available = stock.quantityOnHand - stock.reserved;
          if (available < quantityFulfilled) {
            throw new ApiError(
              `Insufficient stock during manual reservation for product ${productId} at warehouse ${warehouseId}.`,
              409,
              'INSUFFICIENT_STOCK'
            );
          }

          await tx.stockLevel.update({
            where: { id: stock.id },
            data: {
              reserved: { increment: quantityFulfilled },
            },
          });
        }

        const split = await tx.fulfillmentSplit.create({
          data: {
            quotationId: quote.id,
            warehouseId,
            productId,
            quantityFulfilled,
            backorderQuantity,
            estimatedCost: Number(estimatedCost) || 0,
            status: 'OVERRIDDEN',
          },
          include: {
            warehouse: true,
            product: true,
          },
        });
        createdSplits.push(split);
      }

      // 3. Delete previous splits
      if (quote.fulfillmentSplits.length > 0) {
        await tx.fulfillmentSplit.deleteMany({
          where: {
            id: { in: quote.fulfillmentSplits.map((s) => s.id) },
          },
        });
      }

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'FULFILLMENT_MANUAL_OVERRIDE',
          quotationId: quote.id,
          targetId: quote.id,
          targetType: 'Quotation',
          beforeStatus: quote.status,
          afterStatus: quote.status,
          reasonNote: `Manual override applied with ${allocations.length} custom allocations.`,
          meta: { allocations },
        },
      });

      return {
        quotationId: quote.id,
        splits: createdSplits,
      };
    });
  }

  /**
   * Consolidate backorders when new stock arrives.
   * Reruns allocation on backordered items and updates reservations atomically.
   */
  async consolidateBackorder(quotationId, actorId) {
    return prisma.$transaction(async (tx) => {
      const quote = await tx.quotation.findFirst({
        where: { OR: [{ id: quotationId }, { quoteNumber: quotationId }] },
        include: {
          fulfillmentSplits: {
            include: {
              warehouse: true,
              product: true,
            },
          },
        },
      });

      if (!quote) {
        throw new ApiError('Quotation not found.', 404, 'QUOTATION_NOT_FOUND');
      }

      const backorderSplits = quote.fulfillmentSplits.filter((s) => s.backorderQuantity > 0);
      if (backorderSplits.length === 0) {
        return {
          quotationId: quote.id,
          consolidated: false,
          message: 'No remaining backorders found on this quotation.',
          splits: quote.fulfillmentSplits,
        };
      }

      let consolidatedCount = 0;

      for (const split of backorderSplits) {
        // Check current available stock in the assigned warehouse (or across active warehouses)
        const stock = await tx.stockLevel.findUnique({
          where: {
            warehouseId_productId: {
              warehouseId: split.warehouseId,
              productId: split.productId,
            },
          },
        });

        if (stock) {
          const available = stock.quantityOnHand - stock.reserved;
          if (available > 0) {
            const qtyToFulfill = Math.min(available, split.backorderQuantity);
            const remainingBackorder = split.backorderQuantity - qtyToFulfill;

            // Reserve newly available inventory
            await tx.stockLevel.update({
              where: { id: stock.id },
              data: {
                reserved: { increment: qtyToFulfill },
              },
            });

            // Update split record
            await tx.fulfillmentSplit.update({
              where: { id: split.id },
              data: {
                quantityFulfilled: split.quantityFulfilled + qtyToFulfill,
                backorderQuantity: remainingBackorder,
                status: remainingBackorder === 0 ? 'ACCEPTED' : 'PARTIALLY_FULFILLED',
              },
            });

            consolidatedCount += qtyToFulfill;
          }
        }
      }

      // Re-fetch splits
      const updatedSplits = await tx.fulfillmentSplit.findMany({
        where: { quotationId: quote.id },
        include: { warehouse: true, product: true },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'FULFILLMENT_BACKORDER_CONSOLIDATED',
          quotationId: quote.id,
          targetId: quote.id,
          targetType: 'Quotation',
          beforeStatus: quote.status,
          afterStatus: quote.status,
          reasonNote: `Backorder consolidation completed: ${consolidatedCount} units allocated from new inventory.`,
          meta: { consolidatedCount },
        },
      });

      return {
        quotationId: quote.id,
        consolidated: consolidatedCount > 0,
        unitsConsolidated: consolidatedCount,
        splits: updatedSplits,
      };
    });
  }

  /**
   * List fulfillment operational overview:
   * 1. Stock Table (Warehouse, Product, In Stock, Reserved, Available)
   * 2. Orders Awaiting Fulfillment (Order, Customer, Status, Warehouse)
   */
  async getFulfillmentOverview() {
    const [stockLevels, awaitingQuotes] = await Promise.all([
      prisma.stockLevel.findMany({
        include: {
          warehouse: true,
          product: true,
        },
        orderBy: [{ warehouse: { name: 'asc' } }, { product: { name: 'asc' } }],
      }),
      prisma.quotation.findMany({
        where: {
          status: { in: ['APPROVED', 'CONFIRMED'] },
        },
        include: {
          customer: true,
          fulfillmentSplits: {
            include: { warehouse: true },
          },
          lines: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const stockTable = stockLevels.map((s) => ({
      id: s.id,
      warehouseId: s.warehouseId,
      warehouse: s.warehouse?.name || 'Unknown Depot',
      location: s.warehouse?.location || '-',
      productId: s.productId,
      product: s.product?.name || 'Item',
      sku: s.product?.sku || '-',
      category: s.product?.category || 'Hardware',
      inStock: s.quantityOnHand,
      reserved: s.reserved,
      available: Math.max(0, s.quantityOnHand - s.reserved),
      threshold: s.replenishmentThreshold,
    }));

    const ordersAwaiting = awaitingQuotes.map((q) => {
      const warehouses = [...new Set(q.fulfillmentSplits.map((s) => s.warehouse?.name).filter(Boolean))];
      const hasBackorder = q.fulfillmentSplits.some((s) => s.backorderQuantity > 0);
      const isFulfilled = q.fulfillmentSplits.length > 0 && !hasBackorder;

      return {
        id: q.id,
        order: q.quoteNumber,
        customer: q.customer?.name || 'Customer',
        customerTier: q.customer?.tier,
        status: q.status,
        fulfillmentStatus: q.fulfillmentSplits.length === 0 ? 'NEEDS_ALLOCATION' : hasBackorder ? 'BACKORDERED' : 'ALLOCATED',
        warehouse: warehouses.length > 0 ? warehouses.join(', ') : 'Recommended Depot',
        totalLines: q.lines.length,
        grandTotal: Number(q.grandTotal),
        updatedAt: q.updatedAt,
      };
    });

    return {
      stockTable,
      ordersAwaiting,
    };
  }
}

module.exports = new FulfillmentService();
