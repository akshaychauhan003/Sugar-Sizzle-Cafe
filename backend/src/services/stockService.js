const Stock = require('../models/Stock');
const MenuItem = require('../models/MenuItem');
const auditService = require('./auditService');

/**
 * Deduct stock ingredients required for an order when moved to 'preparing'.
 * Also handles MenuItem direct inventoryQuantity deduction.
 */
async function deductRecipeStockForOrder(order, user) {
  if (!order || !order.items || !order.items.length) return;

  const affectedStockIds = new Set();
  const affectedMenuItemIds = new Set();

  for (const line of order.items) {
    const menuItemId = line.menuItem;
    affectedMenuItemIds.add(String(menuItemId));

    const menuItem = await MenuItem.findById(menuItemId);
    if (!menuItem) continue;

    // Deduct direct inventoryQuantity if tracked
    if (typeof menuItem.inventoryQuantity === 'number') {
      const newQty = Math.max(0, menuItem.inventoryQuantity - line.quantity);
      menuItem.inventoryQuantity = newQty;
      if (newQty === 0) {
        menuItem.stockStatus = 'out_of_stock';
        menuItem.isAvailable = false;
      } else if (newQty <= 5) {
        menuItem.stockStatus = 'low_stock';
      }
      await menuItem.save();
    }

    // Deduct recipe ingredients from StockItems
    if (Array.isArray(menuItem.recipeItems) && menuItem.recipeItems.length > 0) {
      for (const recipeItem of menuItem.recipeItems) {
        if (!recipeItem.stockItem) continue;
        const totalReq = (recipeItem.quantityRequired || 1) * line.quantity;
        const stock = await Stock.findById(recipeItem.stockItem);
        if (stock) {
          affectedStockIds.add(String(stock._id));
          const updatedQty = Math.max(0, (stock.quantity || 0) - totalReq);
          stock.quantity = Math.round(updatedQty * 100) / 100;

          if (stock.quantity <= 0) {
            stock.status = 'out_of_stock';
          } else if (stock.quantity <= (stock.minimumQuantity || 5)) {
            stock.status = 'low_stock';
          } else {
            stock.status = 'in_stock';
          }
          await stock.save();
        }
      }
    }
  }

  // Recalculate dish availability for all menu items linked to affected stocks
  await recalculateDishAvailability();

  await auditService.log(
    user,
    'stock.deduct_order',
    'Order',
    order._id,
    `Recipe ingredients deducted for order ${order.orderNumber}`,
    { orderId: order._id, orderNumber: order.orderNumber }
  );
}

/**
 * Restore stock ingredients if an order is cancelled or returned.
 */
async function restoreRecipeStockForOrder(order, user, reason = 'Order cancelled') {
  if (!order || !order.items || !order.items.length) return;

  for (const line of order.items) {
    const menuItem = await MenuItem.findById(line.menuItem);
    if (!menuItem) continue;

    // Restore direct inventoryQuantity if tracked
    if (typeof menuItem.inventoryQuantity === 'number') {
      menuItem.inventoryQuantity += line.quantity;
      if (menuItem.inventoryQuantity > 0 && menuItem.stockStatus === 'out_of_stock') {
        menuItem.stockStatus = menuItem.inventoryQuantity <= 5 ? 'low_stock' : 'in_stock';
        menuItem.isAvailable = true;
      }
      await menuItem.save();
    }

    // Restore recipe stock
    if (Array.isArray(menuItem.recipeItems) && menuItem.recipeItems.length > 0) {
      for (const recipeItem of menuItem.recipeItems) {
        if (!recipeItem.stockItem) continue;
        const totalReq = (recipeItem.quantityRequired || 1) * line.quantity;
        const stock = await Stock.findById(recipeItem.stockItem);
        if (stock) {
          stock.quantity = Math.round(((stock.quantity || 0) + totalReq) * 100) / 100;
          if (stock.quantity > (stock.minimumQuantity || 5) && stock.status !== 'expired') {
            stock.status = 'in_stock';
          } else if (stock.quantity > 0 && stock.status !== 'expired') {
            stock.status = 'low_stock';
          }
          await stock.save();
        }
      }
    }
  }

  await recalculateDishAvailability();

  await auditService.log(
    user,
    'stock.restore_order',
    'Order',
    order._id,
    `Stock restored for ${order.orderNumber}: ${reason}`,
    { orderId: order._id, orderNumber: order.orderNumber, reason }
  );
}

/**
 * Automatically calculate dish availability based on recipe stock levels.
 * If any ingredient required for a dish has insufficient quantity or is expired,
 * mark the dish as out_of_stock and unavailable.
 */
async function recalculateDishAvailability(specificMenuItemId = null) {
  const query = specificMenuItemId ? { _id: specificMenuItemId } : { isActive: true };
  const menuItems = await MenuItem.find(query);
  const now = new Date();

  for (const item of menuItems) {
    if (!item.recipeItems || item.recipeItems.length === 0) {
      // If no recipeItems, relies on inventoryQuantity or manual setting
      if (typeof item.inventoryQuantity === 'number') {
        if (item.inventoryQuantity <= 0) {
          item.stockStatus = 'out_of_stock';
          item.isAvailable = false;
          await item.save();
        }
      }
      continue;
    }

    let isAvailable = true;
    let isLowStock = false;

    for (const recipeItem of item.recipeItems) {
      if (!recipeItem.stockItem) continue;
      const stock = await Stock.findById(recipeItem.stockItem);

      if (!stock) {
        isAvailable = false;
        break;
      }

      // Check if stock is expired or depleted
      const isExpired = stock.expiryDate && new Date(stock.expiryDate) < now;
      if (stock.quantity < (recipeItem.quantityRequired || 1) || isExpired || stock.status === 'out_of_stock' || stock.status === 'expired') {
        isAvailable = false;
        break;
      }

      if (stock.quantity <= (stock.minimumQuantity || 5) || stock.status === 'low_stock') {
        isLowStock = true;
      }
    }

    item.isAvailable = isAvailable;
    item.stockStatus = !isAvailable ? 'out_of_stock' : isLowStock ? 'low_stock' : 'in_stock';
    await item.save();
  }
}

/**
 * Record stock wastage or spoilage.
 */
async function recordStockWastage({ stockId, quantity, reason, user }) {
  const stock = await Stock.findById(stockId);
  if (!stock) throw new Error('Stock item not found');

  const wasteQty = Number(quantity);
  if (!wasteQty || wasteQty <= 0) throw new Error('Wastage quantity must be greater than zero');

  stock.quantity = Math.max(0, (stock.quantity || 0) - wasteQty);
  stock.wastedQuantity = (stock.wastedQuantity || 0) + wasteQty;
  stock.wasteReason = reason ? reason.trim() : 'Spoiled / Expired';

  if (stock.quantity <= 0) {
    stock.status = 'wasted';
  } else if (stock.quantity <= (stock.minimumQuantity || 5)) {
    stock.status = 'low_stock';
  }

  await stock.save();
  await recalculateDishAvailability();

  await auditService.log(
    user,
    'stock.wastage',
    'Stock',
    stock._id,
    `Wasted ${wasteQty} ${stock.unit} of ${stock.itemName} (${reason})`,
    { stockId: stock._id, itemName: stock.itemName, wasteQty, reason }
  );

  return stock;
}

/**
 * Get expiring and low-stock alerts for Admin / Chef.
 */
async function getStockAlerts(days = 3) {
  const now = new Date();
  const alertDate = new Date();
  alertDate.setDate(alertDate.getDate() + days);

  const [expired, expiringSoon, lowStock] = await Promise.all([
    Stock.find({ expiryDate: { $lt: now } }).sort({ expiryDate: 1 }).lean(),
    Stock.find({ expiryDate: { $gte: now, $lte: alertDate } }).sort({ expiryDate: 1 }).lean(),
    Stock.find({
      $or: [
        { status: 'low_stock' },
        { $expr: { $lte: ['$quantity', '$minimumQuantity'] } },
      ],
    }).sort({ quantity: 1 }).lean(),
  ]);

  return {
    expired,
    expiringSoon,
    lowStock,
    summary: {
      expiredCount: expired.length,
      expiringSoonCount: expiringSoon.length,
      lowStockCount: lowStock.length,
    },
  };
}

module.exports = {
  deductRecipeStockForOrder,
  restoreRecipeStockForOrder,
  recalculateDishAvailability,
  recordStockWastage,
  getStockAlerts,
};
