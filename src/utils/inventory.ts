import { InventoryItem } from '../types';

export type InventoryStockStatus = 'Good' | 'Low Stock' | 'Out of Stock';

/**
 * Automatically computes the operational stock status based on current stock vs alert threshold
 * - If currentStock <= 0: "Out of Stock" (Depleted)
 * - If currentStock <= alertThreshold: "Low Stock" (Needs Restock)
 * - If currentStock > alertThreshold: "Good" (In Stock / Adequate)
 */
export function computeStockStatus(
  currentStock: number,
  alertThreshold: number = 0
): InventoryStockStatus {
  if (currentStock <= 0) return 'Out of Stock';
  if (currentStock <= alertThreshold) return 'Low Stock';
  return 'Good';
}

export interface AutomatedStockStatusInfo {
  status: InventoryStockStatus;
  label: string;
  badgeClass: string;
  bgLightClass: string;
  textClass: string;
  borderClass: string;
  isLow: boolean;
  isOut: boolean;
  percentage: number;
  description: string;
}

export function getAutomatedStockStatusInfo(
  currentStock: number,
  alertThreshold: number = 0
): AutomatedStockStatusInfo {
  const status = computeStockStatus(currentStock, alertThreshold);
  const isOut = status === 'Out of Stock';
  const isLow = status === 'Low Stock' || isOut;

  if (isOut) {
    return {
      status,
      label: 'Out of Stock',
      badgeClass: 'bg-rose-500/15 text-rose-500 border-rose-500/30',
      bgLightClass: 'bg-rose-500',
      textClass: 'text-rose-500',
      borderClass: 'border-rose-500/30',
      isLow: true,
      isOut: true,
      percentage: 0,
      description: 'Stock is completely depleted (0 units). Reorder required immediately.'
    };
  }

  if (status === 'Low Stock') {
    const pct = alertThreshold > 0 ? Math.min(100, Math.round((currentStock / alertThreshold) * 100)) : 50;
    return {
      status,
      label: 'Low Stock',
      badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
      bgLightClass: 'bg-amber-500',
      textClass: 'text-amber-600 dark:text-amber-400',
      borderClass: 'border-amber-500/30',
      isLow: true,
      isOut: false,
      percentage: pct,
      description: `Stock (${currentStock}) is at or below the minimum alert threshold (≤ ${alertThreshold}).`
    };
  }

  return {
    status,
    label: 'In Stock',
    badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    bgLightClass: 'bg-emerald-500',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    borderClass: 'border-emerald-500/30',
    isLow: false,
    isOut: false,
    percentage: 100,
    description: `Healthy stock (${currentStock}) safely exceeding alert threshold (${alertThreshold}).`
  };
}

export const deductInventoryStock = (
  inventory: InventoryItem[],
  itemId: string,
  quantity: number = 1
): { updatedInventory: InventoryItem[]; deductedItem?: InventoryItem } => {
  let deductedItem: InventoryItem | undefined;
  const today = new Date().toISOString().split('T')[0];

  const updatedInventory = inventory.map(item => {
    if (item.id === itemId) {
      const newStock = Math.max(0, item.currentStock - quantity);
      const computedStatus = computeStockStatus(newStock, item.maxStock);
      const updatedItem: InventoryItem = {
        ...item,
        currentStock: newStock,
        usedToday: (item.usedToday || 0) + quantity,
        lastUsed: today,
        status: computedStatus
      };
      deductedItem = updatedItem;
      return updatedItem;
    }
    return item;
  });

  return { updatedInventory, deductedItem };
};

