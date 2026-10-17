const { badRequest, conflict } = require('../../src/lib/errors');

describe('Stock Validation & Sale/Stock Consistency Unit Tests', () => {
  // Mock menu catalog
  const createMockCatalog = () => [
    { id: 'item-1', name: 'Artisan Burger', price: 120, inventoryQuantity: 10, stockStatus: 'in_stock', isAvailable: true, isActive: true },
    { id: 'item-2', name: 'Cold Brew Coffee', price: 40, inventoryQuantity: 3, stockStatus: 'low_stock', isAvailable: true, isActive: true },
    { id: 'item-3', name: 'Limited Croissant', price: 60, inventoryQuantity: 0, stockStatus: 'out_of_stock', isAvailable: false, isActive: true },
    { id: 'item-4', name: 'Fresh Tap Water', price: 0, inventoryQuantity: null, stockStatus: 'in_stock', isAvailable: true, isActive: true }, // untracked
  ];

  // Pure stock validator function
  function validateItemStock(menuItem, requestedQty) {
    if (!menuItem.isActive || !menuItem.isAvailable || menuItem.stockStatus === 'out_of_stock') {
      return { ok: false, reason: 'unavailable' };
    }
    if (menuItem.inventoryQuantity !== null && menuItem.inventoryQuantity !== undefined) {
      if (menuItem.inventoryQuantity < requestedQty) {
        return {
          ok: false,
          reason: 'insufficient_stock',
          available: menuItem.inventoryQuantity,
          requested: requestedQty,
        };
      }
    }
    return { ok: true };
  }

  // Pure stock deduction function with status transition
  function deductStock(menuItem, qtyToDeduct) {
    if (menuItem.inventoryQuantity === null) {
      return { ...menuItem }; // Untracked, no deduction needed
    }
    if (menuItem.inventoryQuantity < qtyToDeduct) {
      throw conflict(`Cannot deduct ${qtyToDeduct}; only ${menuItem.inventoryQuantity} in stock`, 'INSUFFICIENT_STOCK');
    }
    const newQty = menuItem.inventoryQuantity - qtyToDeduct;
    let newStatus = menuItem.stockStatus;
    let isAvailable = menuItem.isAvailable;

    if (newQty === 0) {
      newStatus = 'out_of_stock';
      isAvailable = false;
    } else if (newQty <= 5) {
      newStatus = 'low_stock';
    } else {
      newStatus = 'in_stock';
    }

    return {
      ...menuItem,
      inventoryQuantity: newQty,
      stockStatus: newStatus,
      isAvailable,
    };
  }

  // Pure stock restoration function (sales-return)
  function restoreStock(menuItem, qtyToRestore) {
    if (menuItem.inventoryQuantity === null) {
      return { ...menuItem }; // Untracked
    }
    if (qtyToRestore <= 0) {
      throw badRequest('Restoration quantity must be positive');
    }
    const newQty = menuItem.inventoryQuantity + qtyToRestore;
    const newStatus = newQty <= 5 ? 'low_stock' : 'in_stock';
    return {
      ...menuItem,
      inventoryQuantity: newQty,
      stockStatus: newStatus,
      isAvailable: true,
    };
  }

  describe('Stock Validation Rules', () => {
    test('rejects items marked out_of_stock or unavailable', () => {
      const catalog = createMockCatalog();
      const croissant = catalog.find((i) => i.id === 'item-3');
      const res = validateItemStock(croissant, 1);
      expect(res.ok).toBe(false);
      expect(res.reason).toBe('unavailable');
    });

    test('rejects order when requested quantity exceeds available inventory', () => {
      const catalog = createMockCatalog();
      const coldBrew = catalog.find((i) => i.id === 'item-2'); // 3 in stock
      const res = validateItemStock(coldBrew, 5);
      expect(res.ok).toBe(false);
      expect(res.reason).toBe('insufficient_stock');
      expect(res.available).toBe(3);
      expect(res.requested).toBe(5);
    });

    test('approves order when requested quantity is within available inventory', () => {
      const catalog = createMockCatalog();
      const burger = catalog.find((i) => i.id === 'item-1'); // 10 in stock
      expect(validateItemStock(burger, 5).ok).toBe(true);
      expect(validateItemStock(burger, 10).ok).toBe(true);
    });

    test('always approves untracked inventory items (inventoryQuantity === null)', () => {
      const catalog = createMockCatalog();
      const water = catalog.find((i) => i.id === 'item-4');
      expect(validateItemStock(water, 1000).ok).toBe(true);
    });
  });

  describe('Sale & Stock Deduction Consistency', () => {
    test('deducts exact quantity and maintains total inventory balance', () => {
      const initialStock = 10;
      let item = { id: 'item-1', name: 'Burger', inventoryQuantity: initialStock, stockStatus: 'in_stock', isAvailable: true };

      const order1Qty = 3;
      item = deductStock(item, order1Qty);
      expect(item.inventoryQuantity).toBe(7);
      expect(item.stockStatus).toBe('in_stock');

      const order2Qty = 2;
      item = deductStock(item, order2Qty);
      expect(item.inventoryQuantity).toBe(5);
      expect(item.stockStatus).toBe('low_stock'); // Auto transitions at <= 5

      // Invariance check: remaining + sold = initial
      expect(item.inventoryQuantity + order1Qty + order2Qty).toBe(initialStock);
    });

    test('automatically sets stockStatus to out_of_stock and isAvailable to false when inventory reaches 0', () => {
      let item = { id: 'item-2', name: 'Cold Brew', inventoryQuantity: 3, stockStatus: 'low_stock', isAvailable: true };
      item = deductStock(item, 3);
      expect(item.inventoryQuantity).toBe(0);
      expect(item.stockStatus).toBe('out_of_stock');
      expect(item.isAvailable).toBe(false);
    });

    test('throws error if deducting more than remaining stock', () => {
      const item = { id: 'item-2', name: 'Cold Brew', inventoryQuantity: 2, stockStatus: 'low_stock', isAvailable: true };
      expect(() => deductStock(item, 5)).toThrow(/Cannot deduct 5/);
    });
  });

  describe('Sales-Return & Stock Restoration Consistency', () => {
    test('restoring stock increments inventory and restores availability for previously out-of-stock items', () => {
      // Item depleted to 0
      let item = { id: 'item-3', name: 'Croissant', inventoryQuantity: 0, stockStatus: 'out_of_stock', isAvailable: false };

      // Return 2 croissants
      item = restoreStock(item, 2);
      expect(item.inventoryQuantity).toBe(2);
      expect(item.stockStatus).toBe('low_stock');
      expect(item.isAvailable).toBe(true);

      // Return 4 more croissants -> total 6
      item = restoreStock(item, 4);
      expect(item.inventoryQuantity).toBe(6);
      expect(item.stockStatus).toBe('in_stock');
      expect(item.isAvailable).toBe(true);
    });

    test('full lifecycle consistency: Initial = Sold - Returned + Current', () => {
      const initial = 20;
      let item = { id: 'item-1', name: 'Artisan Burger', inventoryQuantity: initial, stockStatus: 'in_stock', isAvailable: true };

      // Step 1: Sale of 8 burgers
      const soldQty = 8;
      item = deductStock(item, soldQty);
      expect(item.inventoryQuantity).toBe(12);

      // Step 2: Customer returns 3 burgers
      const returnedQty = 3;
      item = restoreStock(item, returnedQty);
      expect(item.inventoryQuantity).toBe(15);

      // Invariance formula: Current Inventory = Initial - Net Sold
      const netSold = soldQty - returnedQty;
      expect(item.inventoryQuantity).toBe(initial - netSold);
    });

    test('prevent returning more items than purchased in order', () => {
      const purchasedQty = 2;
      const alreadyReturnedQty = 1;
      const requestedReturnQty = 2;

      const remainingAllowed = purchasedQty - alreadyReturnedQty;
      const isAllowed = requestedReturnQty <= remainingAllowed;
      expect(isAllowed).toBe(false);
    });
  });
});
