const {
  ConfigError,
  calculateLineRisk,
  calculateBlendedRisk,
  determineRequiredApprovalChain,
  round2,
} = require('../services/riskScoreService');

describe('Discount Risk Engine — Pure Risk Score Service', () => {
  // Baseline configuration for tests
  const mockDiscountRules = {
    discountTiers: [
      { customerTier: 'BRONZE', maxDiscountPercent: 5.0, isActive: true },
      { customerTier: 'SILVER', maxDiscountPercent: 10.0, isActive: true },
      { customerTier: 'GOLD', maxDiscountPercent: 15.0, isActive: true },
    ],
    categoryCeilings: [
      { category: 'Hardware', maxDiscountPercent: 15.0, isActive: true },
      { category: 'Services', maxDiscountPercent: 10.0, isActive: true },
      { category: 'Subscriptions', maxDiscountPercent: 20.0, isActive: true },
    ],
  };

  const mockApprovalRules = [
    { id: 'rule-auto', minimumOverage: 0.0, maximumOverage: 0.0, requiredRole: 'SALES_REP', orderIndex: 1, isActive: true },
    { id: 'rule-manager', minimumOverage: 0.01, maximumOverage: 10.0, requiredRole: 'SALES_MANAGER', orderIndex: 2, isActive: true },
    { id: 'rule-finance', minimumOverage: 10.01, maximumOverage: 100.0, requiredRole: 'FINANCE', orderIndex: 3, isActive: true },
  ];

  describe('Section 2.B Mandatory Worked Examples', () => {
    test('1. Gold customer, Laptop Pro 14 Hardware discounted 12%, effective limit 15%: no line violation', () => {
      const line = {
        id: 'line-1',
        productName: 'Laptop Pro 14',
        category: 'Hardware',
        discountPercent: 12.0,
        unitPrice: 1999.0,
        unitCost: 1200.0,
        quantity: 1,
      };

      const result = calculateLineRisk(line, 'GOLD', mockDiscountRules);

      expect(result.customerTierLimit).toBe(15.0);
      expect(result.categoryLimit).toBe(15.0);
      expect(result.effectiveLimit).toBe(15.0);
      expect(result.discountGiven).toBe(12.0);
      expect(result.overBy).toBe(0);
      expect(result.isFlagged).toBe(false);
    });

    test('2. Gold customer, Onsite Setup Service discounted 18%, category limit 10%: 8 points over and quote flagged', () => {
      const line = {
        id: 'line-2',
        productName: 'Onsite Setup Service',
        category: 'Services',
        discountPercent: 18.0,
        unitPrice: 500.0,
        unitCost: 200.0,
        quantity: 1,
      };

      const result = calculateLineRisk(line, 'GOLD', mockDiscountRules);

      // Gold customer tier limit is 15%, but Services category ceiling is 10%. Stricter (10%) applies.
      expect(result.customerTierLimit).toBe(15.0);
      expect(result.categoryLimit).toBe(10.0);
      expect(result.effectiveLimit).toBe(10.0);
      expect(result.discountGiven).toBe(18.0);
      expect(result.overBy).toBe(8.0);
      expect(result.isFlagged).toBe(true);
      expect(result.reason).toContain('exceeds product category ceiling (10%) by 8 percentage points');

      // Check blended evaluation flags the quotation
      const blended = calculateBlendedRisk([line], 'GOLD', mockDiscountRules);
      expect(blended.anyLineOverLimit).toBe(true);
      expect(blended.worstLineOverage).toBe(8.0);
      expect(blended.flaggedLines).toHaveLength(1);
      expect(blended.flaggedLines[0].lineId).toBe('line-2');
    });

    test('3. Several lines each over by 2‒3 points: blended risk must not incorrectly return no approval', () => {
      const lines = [
        {
          id: 'l1',
          productName: 'Laptop Pro 14',
          category: 'Hardware',
          discountPercent: 17.5, // 2.5 points over 15% limit
          unitPrice: 2000.0,
          unitCost: 1200.0,
          quantity: 2,
        },
        {
          id: 'l2',
          productName: 'Docking Station',
          category: 'Hardware',
          discountPercent: 17.0, // 2.0 points over 15% limit
          unitPrice: 300.0,
          unitCost: 150.0,
          quantity: 3,
        },
        {
          id: 'l3',
          productName: 'Setup Service',
          category: 'Services',
          discountPercent: 13.0, // 3.0 points over 10% limit
          unitPrice: 500.0,
          unitCost: 200.0,
          quantity: 1,
        },
      ];

      const blended = calculateBlendedRisk(lines, 'GOLD', mockDiscountRules);

      // Must detect all flagged lines and accumulate risk
      expect(blended.anyLineOverLimit).toBe(true);
      expect(blended.flaggedLines).toHaveLength(3);
      expect(blended.score).toBeGreaterThan(15);
      expect(blended.riskLevel).not.toBe('NONE');

      // Approval chain must NOT be empty
      const chain = determineRequiredApprovalChain(blended, mockApprovalRules);
      expect(chain.length).toBeGreaterThan(0);
      expect(chain[0].requiredRole).toBe('SALES_MANAGER');
    });

    test('4. No overage anywhere: risk level NONE and empty approval chain', () => {
      const lines = [
        {
          id: 'clean-1',
          productName: 'Laptop Pro 14',
          category: 'Hardware',
          discountPercent: 10.0, // limit is 15%
          unitPrice: 2000.0,
          unitCost: 1000.0,
          quantity: 1,
        },
        {
          id: 'clean-2',
          productName: 'Setup Service',
          category: 'Services',
          discountPercent: 5.0, // limit is 10%
          unitPrice: 400.0,
          unitCost: 150.0,
          quantity: 1,
        },
      ];

      const blended = calculateBlendedRisk(lines, 'GOLD', mockDiscountRules);

      expect(blended.anyLineOverLimit).toBe(false);
      expect(blended.worstLineOverage).toBe(0);
      expect(blended.weightedOverage).toBe(0);
      expect(blended.score).toBe(0);
      expect(blended.riskLevel).toBe('NONE');
      expect(blended.flaggedLines).toHaveLength(0);

      const chain = determineRequiredApprovalChain(blended, mockApprovalRules);
      expect(chain).toEqual([]);
    });

    test('5. Medium overage: Sales Manager only', () => {
      const lines = [
        {
          id: 'med-1',
          productName: 'Laptop Pro 14',
          category: 'Hardware',
          discountPercent: 20.0, // 5% over 15% limit
          unitPrice: 2000.0,
          unitCost: 1000.0,
          quantity: 1,
        },
      ];

      const blended = calculateBlendedRisk(lines, 'GOLD', mockDiscountRules);
      expect(blended.worstLineOverage).toBe(5.0);
      expect(blended.riskLevel).toBe('MEDIUM');

      const chain = determineRequiredApprovalChain(blended, mockApprovalRules);
      expect(chain).toHaveLength(1);
      expect(chain[0].stepOrder).toBe(1);
      expect(chain[0].requiredRole).toBe('SALES_MANAGER');
    });

    test('6. High overage: Sales Manager then Finance (sequential chain)', () => {
      const lines = [
        {
          id: 'high-1',
          productName: 'Laptop Pro 14',
          category: 'Hardware',
          discountPercent: 30.0, // 15% over 15% limit (> 10% overage threshold)
          unitPrice: 3000.0,
          unitCost: 1000.0,
          quantity: 1,
        },
      ];

      const blended = calculateBlendedRisk(lines, 'GOLD', mockDiscountRules);
      expect(blended.worstLineOverage).toBe(15.0);
      expect(blended.riskLevel).toBe('HIGH');

      const chain = determineRequiredApprovalChain(blended, mockApprovalRules);
      // Must include Sales Manager at step 1, then Finance at step 2
      expect(chain).toHaveLength(2);
      expect(chain[0].stepOrder).toBe(1);
      expect(chain[0].requiredRole).toBe('SALES_MANAGER');
      expect(chain[1].stepOrder).toBe(2);
      expect(chain[1].requiredRole).toBe('FINANCE');
    });

    test('7. Category ceiling stricter than customer tier', () => {
      // Gold customer tier is 15%, but Services category is 10%
      const line = {
        id: 'strict-cat',
        productName: 'Setup Service',
        category: 'Services',
        discountPercent: 12.0,
        unitPrice: 1000.0,
        unitCost: 400.0,
        quantity: 1,
      };

      const result = calculateLineRisk(line, 'GOLD', mockDiscountRules);
      expect(result.effectiveLimit).toBe(10.0); // min(15, 10) = 10
      expect(result.overBy).toBe(2.0);
      expect(result.isFlagged).toBe(true);
    });

    test('8. Customer tier stricter than category ceiling', () => {
      // Bronze customer tier is 5%, Hardware category is 15%
      const line = {
        id: 'strict-tier',
        productName: 'Laptop Pro 14',
        category: 'Hardware',
        discountPercent: 8.0,
        unitPrice: 1000.0,
        unitCost: 400.0,
        quantity: 1,
      };

      const result = calculateLineRisk(line, 'BRONZE', mockDiscountRules);
      expect(result.effectiveLimit).toBe(5.0); // min(5, 15) = 5
      expect(result.overBy).toBe(3.0);
      expect(result.isFlagged).toBe(true);
      expect(result.reason).toContain('customer tier ceiling (5%)');
    });

    test('9. Missing rule: return a controlled configuration error rather than silently allowing the discount', () => {
      const line = {
        id: 'missing-rule-line',
        productName: 'Unknown Widget',
        category: 'NonExistentCategory',
        discountPercent: 10.0,
        unitPrice: 100.0,
        unitCost: 50.0,
      };

      expect(() => {
        calculateLineRisk(line, 'GOLD', mockDiscountRules);
      }).toThrow(ConfigError);

      expect(() => {
        calculateLineRisk(line, 'UNKNOWN_TIER', mockDiscountRules);
      }).toThrow(/Missing discount tier ceiling rule/);
    });

    test('10. Decimal and rounding behavior is deterministic', () => {
      expect(round2(0.1 + 0.2)).toBe(0.3);
      expect(round2(15.555)).toBe(15.56);
      expect(round2(10.004)).toBe(10.0);

      const line = {
        id: 'dec-1',
        productName: 'Precision Item',
        category: 'Hardware',
        discountPercent: 15.333,
        unitPrice: 100.33,
        unitCost: 50.11,
        quantity: 3,
      };

      const result = calculateLineRisk(line, 'GOLD', mockDiscountRules);
      expect(result.discountGiven).toBe(15.33);
      expect(result.overBy).toBe(0.33);
      expect(result.lineSubtotal).toBe(300.99); // 3 * 100.33 = 300.99
    });
  });
});
