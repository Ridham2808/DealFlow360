const prisma = require('../prisma/prisma');

/**
 * AuditService — fire-and-forget structured audit logging.
 * All writes are non-blocking (no await at call site).
 */
class AuditService {
  /**
   * Log a sensitive action.
   * @param {object} opts
   * @param {string}  opts.actorId      - User who performed the action
   * @param {string}  opts.action       - e.g. CREATED_USER, DEACTIVATED_USER, CHANGED_ROLE
   * @param {string}  [opts.targetId]   - ID of affected record
   * @param {string}  [opts.targetType] - e.g. 'User', 'Customer', 'Invitation'
   * @param {string}  [opts.quotationId]
   * @param {string}  [opts.reasonNote]
   * @param {string}  [opts.beforeStatus]
   * @param {string}  [opts.afterStatus]
   * @param {object}  [opts.meta]       - extra JSON context
   */
  log({ actorId, action, targetId, targetType, quotationId, reasonNote, beforeStatus, afterStatus, meta }) {
    // Fire and forget — do not block the HTTP response
    prisma.auditLog.create({
      data: {
        actorId,
        action,
        targetId:     targetId     || null,
        targetType:   targetType   || null,
        quotationId:  quotationId  || null,
        reasonNote:   reasonNote   || null,
        beforeStatus: beforeStatus || null,
        afterStatus:  afterStatus  || null,
        meta:         meta         || null,
      },
    }).catch((err) => {
      // Audit failures must never crash the main flow
      console.error('[AuditService] Failed to write audit log:', err.message);
    });
  }
}

module.exports = new AuditService();
