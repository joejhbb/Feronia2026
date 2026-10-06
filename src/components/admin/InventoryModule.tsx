import React, { useState, useEffect } from 'react';
import {
  Package, Search, Plus, AlertTriangle,
  X, Edit3, RefreshCw, Trash2, Box, MapPin,
  ShieldAlert, LayoutGrid, List, Upload, Image as ImageIcon,
  Calendar, CheckCircle2, Clock, Sparkles, Pill, HeartPulse, ShieldCheck, Tag, ChevronDown, Zap, ArrowLeft
} from 'lucide-react';
import { InventoryItem } from '../../types';
import { computeStockStatus, getAutomatedStockStatusInfo } from '../../utils/inventory';

interface InventoryModuleProps {
  inventory: InventoryItem[];
  onUpdateInventory: (newList: InventoryItem[], changeMeta?: {
    action: 'updated' | 'restocked' | 'added' | 'deleted' | 'status_changed';
    item: InventoryItem;
    details: string;
  }) => void;
  isDarkMode: boolean;
  canDelete?: boolean;
  userRole?: 'admin' | 'keeper' | 'vet';
  onItemAction?: (
    action: 'updated' | 'restocked' | 'added' | 'deleted' | 'status_changed',
    item: InventoryItem,
    details: string
  ) => void;
  initialSearchTerm?: string;
  onBackToDashboard?: () => void;
  onBack?: () => void;
}

const STANDARD_UNITS = [
  { value: 'pcs', label: 'pcs (Pieces)' },
  { value: 'kg', label: 'kg (Kilograms)' },
  { value: 'g', label: 'g (Grams)' },
  { value: 'mg', label: 'mg (Milligrams)' },
  { value: 'ml', label: 'ml (Milliliters)' },
  { value: 'L', label: 'L (Liters)' },
  { value: 'tubs', label: 'tubs (Tubs / Containers)' },
  { value: 'bottles', label: 'bottles (Bottles)' },
  { value: 'packs', label: 'packs (Packs)' },
  { value: 'boxes', label: 'boxes (Boxes)' },
  { value: 'cans', label: 'cans (Cans)' },
  { value: 'bags', label: 'bags (Bags)' },
  { value: 'vials', label: 'vials (Vials)' },
  { value: 'tablets', label: 'tablets (Tablets / Pills)' },
  { value: 'tubes', label: 'tubes (Tubes)' },
  { value: 'doses', label: 'doses (Doses)' },
];

export default function InventoryModule({
  inventory,
  onUpdateInventory,
  isDarkMode,
  canDelete = true,
  userRole = 'admin',
  onItemAction,
  initialSearchTerm = '',
  onBackToDashboard,
  onBack
}: InventoryModuleProps) {
  const handleBack = onBack || onBackToDashboard;
  // View Mode: 'table' default or 'grid'
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStockStatus, setSelectedStockStatus] = useState<string>('All');
  const [selectedExpStatus, setSelectedExpStatus] = useState<string>('All');

  useEffect(() => {
    if (initialSearchTerm !== undefined && initialSearchTerm !== '') {
      setSearchTerm(initialSearchTerm);
    }
  }, [initialSearchTerm]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [restockItemTarget, setRestockItemTarget] = useState<InventoryItem | null>(null);
  const [editItemTarget, setEditItemTarget] = useState<InventoryItem | null>(null);
  const [deleteItemTarget, setDeleteItemTarget] = useState<InventoryItem | null>(null);

  // Add Item Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'Feeding' | 'Supplement' | 'Cleaning' | 'Medical' | 'Others'>('Feeding');
  const [unitSelect, setUnitSelect] = useState('pcs');
  const [customUnit, setCustomUnit] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [currentStock, setCurrentStock] = useState('20');
  const [maxStock, setMaxStock] = useState('5');
  const [hasExpiration, setHasExpiration] = useState(false);
  const [expirationDate, setExpirationDate] = useState('');
  const [image, setImage] = useState('');
  const [location, setLocation] = useState('');

  // Restock Form State
  const [addQty, setAddQty] = useState('');
  const [restockNote, setRestockNote] = useState('');

  // Edit Form State
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<'Feeding' | 'Supplement' | 'Cleaning' | 'Medical' | 'Others'>('Feeding');
  const [editUnitSelect, setEditUnitSelect] = useState('pcs');
  const [editCustomUnit, setEditCustomUnit] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editCurrentStock, setEditCurrentStock] = useState('');
  const [editMaxStock, setEditMaxStock] = useState('');
  const [editHasExpiration, setEditHasExpiration] = useState(false);
  const [editExpirationDate, setEditExpirationDate] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editLocation, setEditLocation] = useState('');

  // Helper function to handle image upload from PC
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>, setImgFn: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setImgFn(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper function to evaluate expiration date
  const evaluateExpiration = (expDate?: string) => {
    if (!expDate || expDate.trim() === '') {
      return { 
        type: 'none', 
        label: 'Non-perishable', 
        formattedDate: 'N/A', 
        daysLeft: 9999,
        isPerishable: false 
      };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expDate);
    exp.setHours(0, 0, 0, 0);

    if (isNaN(exp.getTime())) {
      return { 
        type: 'none', 
        label: expDate, 
        formattedDate: expDate, 
        daysLeft: 9999,
        isPerishable: false 
      };
    }

    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { 
        type: 'expired', 
        label: `Expired (${Math.abs(diffDays)}d ago)`, 
        formattedDate: expDate,
        daysLeft: diffDays,
        isPerishable: true
      };
    } else if (diffDays <= 45) {
      return { 
        type: 'expiring_soon', 
        label: `Expiring in ${diffDays}d`, 
        formattedDate: expDate,
        daysLeft: diffDays,
        isPerishable: true
      };
    } else {
      return { 
        type: 'valid', 
        label: `Valid (${diffDays}d left)`, 
        formattedDate: expDate,
        daysLeft: diffDays,
        isPerishable: true
      };
    }
  };

  // Filtered List
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.location && item.location.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;

    const isLow = item.currentStock <= item.maxStock;
    const matchesStock = selectedStockStatus === 'All' ||
                          (selectedStockStatus === 'Low Stock' && isLow) ||
                          (selectedStockStatus === 'Good' && !isLow);

    const expEval = evaluateExpiration(item.expirationDate);
    const matchesExp = selectedExpStatus === 'All' ||
                       (selectedExpStatus === 'Expired' && expEval.type === 'expired') ||
                       (selectedExpStatus === 'Expiring Soon' && expEval.type === 'expiring_soon') ||
                       (selectedExpStatus === 'Valid' && expEval.type === 'valid') ||
                       (selectedExpStatus === 'Non-perishable' && expEval.type === 'none');

    return matchesSearch && matchesCategory && matchesStock && matchesExp;
  });

  // KPI Calculations
  const totalItems = inventory.length;
  const lowStockCount = inventory.filter(i => i.currentStock <= i.maxStock).length;
  const expiringSoonCount = inventory.filter(i => evaluateExpiration(i.expirationDate).type === 'expiring_soon').length;
  const expiredCount = inventory.filter(i => evaluateExpiration(i.expirationDate).type === 'expired').length;

  // Quick preset helper for expiration date
  const setQuickExpiry = (months: number, setFn: (val: string) => void) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    setFn(d.toISOString().split('T')[0]);
  };

  // Handlers
  const handleCategoryChange = (newCat: 'Feeding' | 'Supplement' | 'Cleaning' | 'Medical' | 'Others') => {
    setCategory(newCat);
    // Medical & Supplement can have expiration date; Feeds, Cleaning, and Others default to non-perishable (no expiration)
    if (newCat === 'Medical' || newCat === 'Supplement') {
      setHasExpiration(true);
      if (!expirationDate) {
        setQuickExpiry(12, setExpirationDate);
      }
    } else {
      setHasExpiration(false);
      setExpirationDate('');
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const stockNum = parseInt(currentStock, 10) || 0;
    const maxNum = parseInt(maxStock, 10) || 0;
    const computedStatus = computeStockStatus(stockNum, maxNum);

    const finalExpirationDate = hasExpiration && expirationDate && expirationDate.trim() ? expirationDate.trim() : undefined;
    const finalUnit = (unitSelect === 'Other' ? customUnit.trim() : unitSelect) || 'pcs';

    const newItem: InventoryItem = {
      id: 'INV-' + Math.floor(1000 + Math.random() * 9000),
      name: name.trim(),
      category,
      unit: finalUnit,
      currentStock: stockNum,
      maxStock: maxNum,
      usedToday: 0,
      lastUsed: 'Just created',
      status: computedStatus,
      expirationDate: finalExpirationDate,
      image: image.trim() || undefined,
      location: location.trim() || undefined
    };

    const details = `Added new item "${newItem.name}" to ${newItem.category} (Stock: ${newItem.currentStock} ${newItem.unit}).`;
    onUpdateInventory([newItem, ...inventory], {
      action: 'added',
      item: newItem,
      details
    });
    onItemAction?.('added', newItem, details);

    // Reset Form
    setName('');
    setCategory('Feeding');
    setUnitSelect('pcs');
    setCustomUnit('');
    setUnit('pcs');
    setCurrentStock('20');
    setMaxStock('5');
    setHasExpiration(false);
    setExpirationDate('');
    setImage('');
    setLocation('');
    setIsAddModalOpen(false);
  };

  const handleRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockItemTarget) return;

    const addVal = parseInt(addQty, 10);
    if (isNaN(addVal) || addVal <= 0) return;

    let updatedTargetItem: InventoryItem | null = null;
    const updated = inventory.map(item => {
      if (item.id === restockItemTarget.id) {
        const newStock = item.currentStock + addVal;
        const newStatus = computeStockStatus(newStock, item.maxStock);
        const updatedItem: InventoryItem = {
          ...item,
          currentStock: newStock,
          status: newStatus,
          lastUsed: restockNote ? `Restocked (+${addVal} ${item.unit}): ${restockNote}` : `Restocked (+${addVal} ${item.unit})`
        };
        updatedTargetItem = updatedItem;
        return updatedItem;
      }
      return item;
    });

    if (updatedTargetItem) {
      const target = updatedTargetItem as InventoryItem;
      const details = restockNote
        ? `Restocked +${addVal} ${restockItemTarget.unit}. New Stock: ${target.currentStock} ${restockItemTarget.unit}. (Note: ${restockNote})`
        : `Restocked +${addVal} ${restockItemTarget.unit}. New Stock: ${target.currentStock} ${restockItemTarget.unit}.`;
      onUpdateInventory(updated, {
        action: 'restocked',
        item: target,
        details
      });
      onItemAction?.('restocked', target, details);
    } else {
      onUpdateInventory(updated);
    }

    setRestockItemTarget(null);
    setAddQty('');
    setRestockNote('');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItemTarget || !editName.trim()) return;

    const stockNum = parseInt(editCurrentStock, 10) || 0;
    const maxNum = parseInt(editMaxStock, 10) || 0;
    const computedStatus = computeStockStatus(stockNum, maxNum);
    const finalExpirationDate = editHasExpiration && editExpirationDate && editExpirationDate.trim() ? editExpirationDate.trim() : undefined;
    const finalUnit = (editUnitSelect === 'Other' ? editCustomUnit.trim() : editUnitSelect) || 'pcs';

    let updatedTargetItem: InventoryItem | null = null;
    const updated = inventory.map(item => {
      if (item.id === editItemTarget.id) {
        const updatedItem: InventoryItem = {
          ...item,
          name: editName.trim(),
          category: editCategory,
          unit: finalUnit,
          currentStock: stockNum,
          maxStock: maxNum,
          status: computedStatus,
          expirationDate: finalExpirationDate,
          image: editImage.trim() || undefined,
          location: editLocation.trim() || undefined
        };
        updatedTargetItem = updatedItem;
        return updatedItem;
      }
      return item;
    });

    if (updatedTargetItem) {
      const target = updatedTargetItem as InventoryItem;
      const details = `Details updated. Current Stock: ${stockNum} ${target.unit}, Automated Status: ${computedStatus}.`;
      onUpdateInventory(updated, {
        action: 'updated',
        item: target,
        details
      });
      onItemAction?.('updated', target, details);
    } else {
      onUpdateInventory(updated);
    }

    setEditItemTarget(null);
  };

  const handleConfirmDelete = () => {
    if (!canDelete || !deleteItemTarget) return;
    const target = deleteItemTarget;
    const details = `Item "${target.name}" was deleted from inventory.`;
    onUpdateInventory(inventory.filter(i => i.id !== target.id), {
      action: 'deleted',
      item: target,
      details
    });
    onItemAction?.('deleted', target, details);
    setDeleteItemTarget(null);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditItemTarget(item);
    setEditName(item.name);
    setEditCategory(item.category);
    
    const foundUnit = STANDARD_UNITS.find(u => u.value.toLowerCase() === item.unit.toLowerCase());
    if (foundUnit) {
      setEditUnitSelect(foundUnit.value);
      setEditCustomUnit('');
      setEditUnit(foundUnit.value);
    } else {
      setEditUnitSelect('Other');
      setEditCustomUnit(item.unit);
      setEditUnit(item.unit);
    }

    setEditCurrentStock(String(item.currentStock));
    setEditMaxStock(String(item.maxStock));
    const isPerishable = item.category === 'Medical' || item.category === 'Supplement';
    const hasExp = isPerishable && Boolean(item.expirationDate && item.expirationDate.trim() !== '' && item.expirationDate !== 'N/A');
    setEditHasExpiration(hasExp);
    setEditExpirationDate(hasExp ? item.expirationDate! : '');
    setEditImage(item.image || '');
    setEditLocation(item.location || '');
  };

  return (
    <div className="space-y-5">
      {/* Header Bar matching Animals / Dashboard Theme */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          {handleBack && (
            <button
              type="button"
              onClick={handleBack}
              className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                isDarkMode
                  ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 hover:text-white border-emerald-800/80'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300 shadow-2xs'
              }`}
              title="Go Back"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          )}
          <div className="w-10 h-10 rounded-xl bg-[#113C24] dark:bg-emerald-800 flex items-center justify-center text-white shrink-0 shadow-xs">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Inventory & Supplies</h1>
              {userRole === 'keeper' ? (
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-400 border border-teal-500/30">
                  Keeper Mode • View & Restock
                </span>
              ) : (
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Full Access
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              {userRole === 'keeper'
                ? 'Monitor stock levels, log supply usage, and restock supplies.'
                : 'Manage all sanctuary supplies, feeds, medications, and threshold alerts.'}
            </p>
          </div>
        </div>

        {userRole !== 'keeper' && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-2.5 bg-[#113C24] hover:bg-[#1B5234] text-white text-xs font-bold rounded-xl shadow-xs hover:shadow transition-all flex items-center space-x-2 cursor-pointer self-start sm:self-auto active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Supply Item</span>
          </button>
        )}
      </div>

      {/* Counts Grid matching Animals & Dashboard Theme Design */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Items */}
        <div className={`p-4 rounded-2xl border shadow-2xs flex items-center space-x-3.5 transition-colors ${
          isDarkMode ? 'bg-[#071F11] border-emerald-950/60 text-slate-200' : 'bg-white border-slate-100 text-slate-800'
        }`}>
          <div className="w-10 h-10 rounded-xl bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 dark:text-emerald-400/70 uppercase tracking-wider block">Total Items</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white mt-0.5 block">{totalItems}</span>
          </div>
        </div>

        {/* 2. Low Stock */}
        <button
          onClick={() => setSelectedStockStatus(selectedStockStatus === 'Low Stock' ? 'All' : 'Low Stock')}
          className={`p-4 rounded-2xl border shadow-2xs flex items-center space-x-3.5 transition-all text-left cursor-pointer active:scale-95 ${
            selectedStockStatus === 'Low Stock'
              ? 'border-rose-500/80 bg-rose-500/10'
              : isDarkMode ? 'bg-[#071F11] border-emerald-950/60 text-slate-200 hover:border-emerald-800/80' : 'bg-white border-slate-100 text-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-rose-100/80 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] font-black text-slate-400 dark:text-rose-400/70 uppercase tracking-wider block">Low Stock</span>
              {lowStockCount > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>}
            </div>
            <span className="text-2xl font-black text-slate-900 dark:text-white mt-0.5 block">{lowStockCount}</span>
          </div>
        </button>

        {/* 3. Expiring Soon */}
        <button
          onClick={() => setSelectedExpStatus(selectedExpStatus === 'Expiring Soon' ? 'All' : 'Expiring Soon')}
          className={`p-4 rounded-2xl border shadow-2xs flex items-center space-x-3.5 transition-all text-left cursor-pointer active:scale-95 ${
            selectedExpStatus === 'Expiring Soon'
              ? 'border-amber-500/80 bg-amber-500/10'
              : isDarkMode ? 'bg-[#071F11] border-emerald-950/60 text-slate-200 hover:border-emerald-800/80' : 'bg-white border-slate-100 text-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100/80 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] font-black text-slate-400 dark:text-amber-400/70 uppercase tracking-wider block">Expiring Soon</span>
              {expiringSoonCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-500"></span>}
            </div>
            <span className="text-2xl font-black text-slate-900 dark:text-white mt-0.5 block">{expiringSoonCount}</span>
          </div>
        </button>

        {/* 4. Expired */}
        <button
          onClick={() => setSelectedExpStatus(selectedExpStatus === 'Expired' ? 'All' : 'Expired')}
          className={`p-4 rounded-2xl border shadow-2xs flex items-center space-x-3.5 transition-all text-left cursor-pointer active:scale-95 ${
            selectedExpStatus === 'Expired'
              ? 'border-rose-500/80 bg-rose-500/10'
              : isDarkMode ? 'bg-[#071F11] border-emerald-950/60 text-slate-200 hover:border-emerald-800/80' : 'bg-white border-slate-100 text-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-rose-100/80 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] font-black text-slate-400 dark:text-rose-400/70 uppercase tracking-wider block">Expired</span>
              {expiredCount > 0 && <span className="w-2 h-2 rounded-full bg-rose-500"></span>}
            </div>
            <span className="text-2xl font-black text-slate-900 dark:text-white mt-0.5 block">{expiredCount}</span>
          </div>
        </button>
      </div>

      {/* Clean Toolbar */}
      <div className={`p-3 rounded-xl border space-y-2.5 ${
        isDarkMode ? 'bg-[#071F11] border-emerald-900/50' : 'bg-white border-slate-200/80'
      }`}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Category Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
            {['All', 'Feeding', 'Supplement', 'Cleaning', 'Medical', 'Others'].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-[#113C24] text-emerald-200 border border-emerald-800/60'
                    : isDarkMode
                    ? 'text-emerald-200/60 hover:text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search & View Controls */}
          <div className="flex items-center space-x-2 shrink-0">
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-8 pr-6 py-1 rounded-lg text-xs outline-none border transition-colors ${
                  isDarkMode
                    ? 'bg-[#04110A] text-white border-emerald-900/60 focus:border-emerald-500'
                    : 'bg-slate-50 text-slate-900 border-slate-200'
                }`}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className={`p-0.5 rounded-lg border flex items-center ${
              isDarkMode ? 'bg-[#04110A] border-emerald-900/60' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-[#113C24] text-slate-900 dark:text-emerald-200'
                    : 'text-slate-400'
                }`}
                title="Table View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-[#113C24] text-slate-900 dark:text-emerald-200'
                    : 'text-slate-400'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Inventory Display */}
      {filteredInventory.length === 0 ? (
        <div className={`p-8 rounded-2xl border text-center space-y-2.5 ${
          isDarkMode ? 'bg-[#071F11] border-emerald-900/50' : 'bg-white border-slate-200/80'
        }`}>
          <div className="w-12 h-12 rounded-2xl bg-emerald-950/40 border border-emerald-900/60 flex items-center justify-center text-emerald-400 mx-auto">
            <Package className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-emerald-200">No supply items found</p>
          <p className="text-xs text-slate-400 dark:text-emerald-200/50">Try adjusting your category, expiration, or search filters.</p>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW - Clear, Spacious, Big Images, Large Typography, Dedicated Expiration Column */
        <div className={`rounded-2xl border overflow-hidden shadow-xs ${
          isDarkMode ? 'bg-[#071F11] border-emerald-900/50 text-slate-200' : 'bg-white border-slate-200/80 text-slate-800'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className={`border-b font-semibold text-xs uppercase tracking-wider ${
                  isDarkMode ? 'border-emerald-900/50 bg-[#04110A] text-emerald-300/80' : 'border-slate-100 bg-slate-50/90 text-slate-600'
                }`}>
                  <th className="py-3 px-4 min-w-[240px]">Supply Item</th>
                  <th className="py-3 px-4 min-w-[130px]">Category</th>
                  <th className="py-3 px-4 min-w-[130px]">Stock Level</th>
                  <th className="py-3 px-4 min-w-[140px]">Location</th>
                  <th className="py-3 px-4 min-w-[190px]">Expiration Date</th>
                  <th className="py-3 px-4 text-right min-w-[130px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-emerald-950/50 text-sm">
                {filteredInventory.map(item => {
                  const isLow = item.currentStock <= item.maxStock;
                  const stockInfo = getAutomatedStockStatusInfo(item.currentStock, item.maxStock);
                  const expEval = evaluateExpiration(item.expirationDate);

                  // Category Color Schemes
                  const categoryStyles = {
                    Medical: isDarkMode 
                      ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' 
                      : 'bg-rose-50 text-rose-700 border-rose-200',
                    Supplement: isDarkMode 
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' 
                      : 'bg-amber-50 text-amber-700 border-amber-200',
                    Feeding: isDarkMode 
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    Cleaning: isDarkMode 
                      ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' 
                      : 'bg-cyan-50 text-cyan-700 border-cyan-200',
                    Others: isDarkMode 
                      ? 'bg-purple-500/15 text-purple-300 border-purple-500/30' 
                      : 'bg-purple-50 text-purple-700 border-purple-200',
                  }[item.category] || (isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200');

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-emerald-900/25 transition-colors group">
                      {/* Name & Big Photo */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3.5">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-emerald-800/80 shadow-xs shrink-0"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-emerald-950/40 border border-emerald-900/60 flex flex-col items-center justify-center text-emerald-400 shrink-0">
                              <Package className="w-6 h-6" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 dark:text-white block text-sm sm:text-base capitalize leading-snug">
                              {item.name}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                {item.id}
                              </span>
                              {item.supplier && (
                                <span className="text-xs text-slate-400 dark:text-emerald-200/40 hidden md:inline">
                                  {item.supplier}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${categoryStyles}`}>
                          {item.category === 'Medical' && <HeartPulse className="w-3.5 h-3.5" />}
                          {item.category === 'Supplement' && <Sparkles className="w-3.5 h-3.5" />}
                          {item.category === 'Feeding' && <Box className="w-3.5 h-3.5" />}
                          {item.category === 'Cleaning' && <ShieldCheck className="w-3.5 h-3.5" />}
                          {item.category === 'Others' && <Tag className="w-3.5 h-3.5" />}
                          <span>{item.category}</span>
                        </span>
                      </td>

                      {/* Stock Level */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5">
                          <div className="flex items-baseline space-x-1.5">
                            <span className={`text-base font-black ${
                              stockInfo.isOut 
                                ? 'text-rose-600 dark:text-rose-400' 
                                : stockInfo.isLow 
                                ? 'text-amber-600 dark:text-amber-400' 
                                : 'text-slate-900 dark:text-slate-100'
                            }`}>
                              {item.currentStock}
                            </span>
                            <span className="text-xs font-medium text-slate-500 dark:text-emerald-200/60">
                              {item.unit}
                            </span>
                          </div>

                          {/* Automated Status Badge (Calculated by stock level vs threshold) */}
                          <div className="flex items-center space-x-1.5">
                            <span
                              className={`inline-flex items-center space-x-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${stockInfo.badgeClass}`}
                              title={stockInfo.description}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${stockInfo.bgLightClass} ${stockInfo.isLow ? 'animate-pulse' : ''}`}></span>
                              <span>{stockInfo.label}</span>
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium" title={`Alert triggered when stock is at or below ${item.maxStock} ${item.unit}`}>
                              (≤{item.maxStock})
                            </span>
                          </div>

                          {/* Mini visual gauge bar */}
                          <div className="w-24 h-1 rounded-full bg-slate-100 dark:bg-emerald-950/60 overflow-hidden" title={`Current: ${item.currentStock} / Alert Threshold: ${item.maxStock}`}>
                            <div
                              className={`h-full transition-all duration-300 ${stockInfo.bgLightClass}`}
                              style={{ width: `${Math.min(100, Math.max(0, stockInfo.percentage))}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-emerald-400 shrink-0" />
                          <span className="truncate">{item.location || 'Not Specified'}</span>
                        </div>
                      </td>

                      {/* Expiration Date - Dedicated Column with clear status */}
                      <td className="py-3.5 px-4">
                        {expEval.isPerishable && item.expirationDate ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-200">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-emerald-400 shrink-0" />
                              <span>{item.expirationDate}</span>
                            </div>
                            {expEval.type === 'expired' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/15 text-rose-500 border border-rose-500/30">
                                <AlertTriangle className="w-3 h-3" /> {expEval.label}
                              </span>
                            )}
                            {expEval.type === 'expiring_soon' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                                <Clock className="w-3 h-3" /> {expEval.label}
                              </span>
                            )}
                            {expEval.type === 'valid' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" /> Valid
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-emerald-950/40 text-slate-500 dark:text-emerald-200/50 border border-slate-200 dark:border-emerald-900/40">
                            Non-perishable
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setRestockItemTarget(item)}
                            className="px-3 py-1.5 bg-[#113C24] hover:bg-[#1B5234] text-emerald-200 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center space-x-1.5 shadow-xs"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Restock</span>
                          </button>
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1.5 rounded-xl border border-slate-200 dark:border-emerald-900/60 text-slate-500 dark:text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                            title="Edit Item"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => setDeleteItemTarget(item)}
                              className="p-1.5 rounded-xl border border-slate-200 dark:border-emerald-900/60 text-slate-500 dark:text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Delete Item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID VIEW - Refined Cards with Large Images & Clear Expiration Badges */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInventory.map(item => {
            const isLow = item.currentStock <= item.maxStock;
            const stockInfo = getAutomatedStockStatusInfo(item.currentStock, item.maxStock);
            const expEval = evaluateExpiration(item.expirationDate);

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border flex flex-col justify-between space-y-4 shadow-xs transition-all hover:shadow-md ${
                  isDarkMode ? 'bg-[#071F11] border-emerald-900/50' : 'bg-white border-slate-200/80'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start space-x-3.5">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-emerald-800/80 shadow-xs shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-emerald-950/40 border border-emerald-900/60 flex items-center justify-center text-emerald-400 shrink-0">
                        <Package className="w-7 h-7" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {item.id}
                        </span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-emerald-950 text-slate-700 dark:text-emerald-300 border border-slate-200 dark:border-emerald-900/60">
                          {item.category}
                        </span>
                      </div>
                      <h4 className="font-bold text-base text-slate-900 dark:text-white capitalize leading-tight mt-1 truncate">
                        {item.name}
                      </h4>
                      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-emerald-200/60 mt-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{item.location || 'Location unassigned'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stock & Expiration Details */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-emerald-950/60">
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#04110A] border border-slate-100 dark:border-emerald-900/40">
                      <span className="text-[10px] font-medium text-slate-400 block uppercase">Stock Level</span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className={`text-base font-black ${isLow ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                          {item.currentStock}
                        </span>
                        <span className="text-xs text-slate-500">{item.unit}</span>
                      </div>
                      {isLow && <span className="text-[10px] text-rose-500 font-bold">⚠️ Low Stock</span>}
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#04110A] border border-slate-100 dark:border-emerald-900/40">
                      <span className="text-[10px] font-medium text-slate-400 block uppercase">Expiration</span>
                      {expEval.isPerishable && item.expirationDate ? (
                        <div className="mt-0.5">
                          <span className="text-xs font-mono font-bold text-slate-900 dark:text-white block truncate">
                            {item.expirationDate}
                          </span>
                          {expEval.type === 'expired' && <span className="text-[10px] text-rose-500 font-bold">Expired</span>}
                          {expEval.type === 'expiring_soon' && <span className="text-[10px] text-amber-500 font-bold">Exp: {expEval.daysLeft}d</span>}
                          {expEval.type === 'valid' && <span className="text-[10px] text-emerald-500 font-medium">Valid</span>}
                        </div>
                      ) : (
                        <div className="mt-1">
                          <span className="text-[11px] font-medium text-slate-400">Non-perishable</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Automated Stock Status (Replaces manual dropdown) */}
                  <div className="pt-2 flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <Zap className="w-3 h-3 text-amber-500" />
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Stock Level</span>
                    </div>
                    <span
                      className={`inline-flex items-center space-x-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${stockInfo.badgeClass}`}
                      title={stockInfo.description}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${stockInfo.bgLightClass} ${stockInfo.isLow ? 'animate-pulse' : ''}`}></span>
                      <span>{stockInfo.label}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
                    <span>Alert threshold:</span>
                    <span className="font-semibold text-slate-600 dark:text-slate-300">≤ {item.maxStock} {item.unit}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-emerald-900/40 flex items-center justify-between">
                  <button
                    onClick={() => setRestockItemTarget(item)}
                    className="px-3 py-1.5 bg-[#113C24] hover:bg-[#1B5234] text-emerald-200 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center space-x-1.5 shadow-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Restock</span>
                  </button>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-1.5 rounded-xl border border-slate-200 dark:border-emerald-900/60 text-slate-500 dark:text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                      title="Edit"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => setDeleteItemTarget(item)}
                        className="p-1.5 rounded-xl border border-slate-200 dark:border-emerald-900/60 text-slate-500 dark:text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: ADD ITEM */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className={`w-full max-w-lg rounded-2xl border overflow-hidden shadow-2xl transition-colors ${
            isDarkMode ? 'bg-[#071F11] border-emerald-900/60 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`p-4 border-b flex justify-between items-center ${
              isDarkMode ? 'bg-[#04110A] border-emerald-900/60' : 'bg-slate-50 border-slate-100'
            }`}>
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Add Supply Item</h3>
                  <p className="text-[11px] text-slate-400">Register medications, supplements, feeds, or cleaning supplies</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer rounded-lg hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Calcium + D3 Powder, Deworming Tablets, Mice (10-pack)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-sm font-medium outline-none transition-colors ${
                    isDarkMode ? 'bg-[#04110A] border-emerald-900/60 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 focus:border-emerald-600'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">Category</label>
                  <select
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value as any)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none cursor-pointer ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-900/60 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <option value="Feeding">Feeding (Prey, Insects, Feeds)</option>
                    <option value="Supplement">Supplement (Vitamins, Calcium, Minerals)</option>
                    <option value="Medical">Medical (Meds, Antibiotics, Dewormers)</option>
                    <option value="Cleaning">Cleaning (Disinfectants, Tools)</option>
                    <option value="Others">Others (General Supplies, Decor, Equipment)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">Unit of Measurement *</label>
                  <select
                    value={unitSelect}
                    onChange={(e) => {
                      const val = e.target.value;
                      setUnitSelect(val);
                      if (val !== 'Other') {
                        setUnit(val);
                      } else {
                        setUnit(customUnit.trim() || '');
                      }
                    }}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none cursor-pointer ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-900/60 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    {STANDARD_UNITS.map(u => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                    <option value="Other">Other (Specify custom unit...)</option>
                  </select>

                  {unitSelect === 'Other' && (
                    <div className="mt-2">
                      <input
                        type="text"
                        required
                        placeholder="Type custom unit (e.g. rolls, scoops, syringes)"
                        value={customUnit}
                        onChange={(e) => {
                          setCustomUnit(e.target.value);
                          setUnit(e.target.value);
                        }}
                        className={`w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none ${
                          isDarkMode ? 'bg-[#04110A] border-emerald-900/60 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 focus:border-emerald-600'
                        }`}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">Initial Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={currentStock}
                    onChange={(e) => setCurrentStock(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-900/60 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">Low Stock Alert Level</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={maxStock}
                    onChange={(e) => setMaxStock(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-900/60 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">Storage Location (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Deep Freezer 2 - Shelf A, Lab Cabinet 1, Holding Bin 4"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none ${
                    isDarkMode ? 'bg-[#04110A] border-emerald-900/60 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              {/* Expiration Date Section - Only for perishable categories (Medical & Supplement); Feeding and non-perishables do not track expiration */}
              {(category === 'Medical' || category === 'Supplement') && (
                <div className={`p-3 rounded-xl border space-y-2.5 ${
                  isDarkMode ? 'bg-[#04110A] border-emerald-900/60' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasExpiration}
                        onChange={(e) => setHasExpiration(e.target.checked)}
                        className="rounded accent-emerald-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="font-semibold text-xs text-slate-900 dark:text-slate-200">
                        Track Expiration Date <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                      </span>
                    </label>
                    <span className="text-[10px] text-slate-400">
                      (Vitamins, Meds)
                    </span>
                  </div>

                  {hasExpiration && (
                    <div className="pt-1 border-t border-slate-200/60 dark:border-emerald-900/40">
                      <input
                        type="date"
                        required={hasExpiration}
                        value={expirationDate}
                        onChange={(e) => setExpirationDate(e.target.value)}
                        className={`w-full px-3 py-1.5 rounded-lg border text-xs font-mono outline-none ${
                          isDarkMode ? 'bg-[#071F11] border-emerald-900/80 text-white' : 'bg-white border-slate-200'
                        }`}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Photo Attachment */}
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">Attach Item Image</label>
                {image ? (
                  <div className={`flex items-center justify-between p-2.5 rounded-xl border ${
                    isDarkMode ? 'bg-[#04110A] border-emerald-900/60' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center space-x-3 min-w-0">
                      <img src={image} alt="Preview" className="w-12 h-12 rounded-lg object-cover border border-emerald-800 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-emerald-400 truncate">Image Attached</p>
                        <p className="text-[10px] text-slate-400">Ready to save</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setImage('')}
                      className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer rounded-lg hover:bg-rose-500/10"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className={`flex flex-col items-center justify-center p-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                    isDarkMode
                      ? 'border-emerald-900/60 hover:border-emerald-500 bg-[#04110A]'
                      : 'border-slate-200 hover:border-emerald-500 bg-slate-50'
                  }`}>
                    <Upload className="w-5 h-5 text-emerald-400 mb-1" />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Click to upload photo from your PC</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, WEBP</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageFileChange(e, setImage)}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="pt-2 flex justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-emerald-900/60 text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#113C24] hover:bg-[#1B5234] text-white font-bold rounded-xl cursor-pointer shadow-md flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>Save Supply Item</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RESTOCK */}
      {restockItemTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className={`w-full max-w-sm rounded-2xl border overflow-hidden shadow-xl ${
            isDarkMode ? 'bg-[#071F11] border-emerald-900/60 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`p-3.5 border-b flex justify-between items-center ${
              isDarkMode ? 'bg-[#04110A] border-emerald-900/60' : 'bg-slate-50 border-slate-100'
            }`}>
              <h3 className="font-bold text-sm">Restock: {restockItemTarget.name}</h3>
              <button onClick={() => setRestockItemTarget(null)} className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRestockSubmit} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Add Quantity ({restockItemTarget.unit})</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={addQty}
                  onChange={(e) => setAddQty(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-lg border outline-none ${
                    isDarkMode ? 'bg-[#04110A] border-emerald-900/60 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="Batch # or supplier reference"
                  value={restockNote}
                  onChange={(e) => setRestockNote(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-lg border outline-none ${
                    isDarkMode ? 'bg-[#04110A] border-emerald-900/60 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setRestockItemTarget(null)}
                  className="px-3 py-1.5 rounded-lg border text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#113C24] hover:bg-[#1B5234] text-white font-medium rounded-lg cursor-pointer"
                >
                  Confirm Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT ITEM */}
      {editItemTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className={`w-full max-w-lg rounded-2xl border overflow-hidden shadow-2xl ${
            isDarkMode ? 'bg-[#071F11] border-emerald-900/60 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`p-4 border-b flex justify-between items-center ${
              isDarkMode ? 'bg-[#04110A] border-emerald-900/60' : 'bg-slate-50 border-slate-100'
            }`}>
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Edit3 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm">Edit Supply Item</h3>
              </div>
              <button onClick={() => setEditItemTarget(null)} className="p-1.5 text-slate-400 hover:text-slate-200 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">Item Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-sm font-medium outline-none ${
                    isDarkMode ? 'bg-[#04110A] border-emerald-900/60 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setEditCategory(val);
                      if (val !== 'Medical' && val !== 'Supplement') {
                        setEditHasExpiration(false);
                        setEditExpirationDate('');
                      }
                    }}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none cursor-pointer ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-900/60 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <option value="Feeding">Feeding</option>
                    <option value="Supplement">Supplement</option>
                    <option value="Medical">Medical</option>
                    <option value="Cleaning">Cleaning</option>
                    <option value="Others">Others</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">Unit of Measurement *</label>
                  <select
                    value={editUnitSelect}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditUnitSelect(val);
                      if (val !== 'Other') {
                        setEditUnit(val);
                      } else {
                        setEditUnit(editCustomUnit.trim() || '');
                      }
                    }}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none cursor-pointer ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-900/60 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    {STANDARD_UNITS.map(u => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                    <option value="Other">Other (Specify custom unit...)</option>
                  </select>

                  {editUnitSelect === 'Other' && (
                    <div className="mt-2">
                      <input
                        type="text"
                        required
                        placeholder="Type custom unit (e.g. rolls, scoops, syringes)"
                        value={editCustomUnit}
                        onChange={(e) => {
                          setEditCustomUnit(e.target.value);
                          setEditUnit(e.target.value);
                        }}
                        className={`w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none ${
                          isDarkMode ? 'bg-[#04110A] border-emerald-900/60 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 focus:border-emerald-600'
                        }`}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">Current Stock</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editCurrentStock}
                    onChange={(e) => setEditCurrentStock(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-900/60 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">Low Stock Alert Level</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editMaxStock}
                    onChange={(e) => setEditMaxStock(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none ${
                      isDarkMode ? 'bg-[#04110A] border-emerald-900/60 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">Location</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none ${
                    isDarkMode ? 'bg-[#04110A] border-emerald-900/60 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              {/* Expiration Date Section - Only for perishable categories (Medical & Supplement); Feeding and non-perishables do not track expiration */}
              {(editCategory === 'Medical' || editCategory === 'Supplement') && (
                <div className={`p-3 rounded-xl border space-y-2.5 ${
                  isDarkMode ? 'bg-[#04110A] border-emerald-900/60' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editHasExpiration}
                        onChange={(e) => setEditHasExpiration(e.target.checked)}
                        className="rounded accent-emerald-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="font-semibold text-xs text-slate-900 dark:text-slate-200">
                        Track Expiration Date <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                      </span>
                    </label>
                    <span className="text-[10px] text-slate-400">
                      (Vitamins, Meds)
                    </span>
                  </div>

                  {editHasExpiration && (
                    <div className="pt-1 border-t border-slate-200/60 dark:border-emerald-900/40">
                      <input
                        type="date"
                        required={editHasExpiration}
                        value={editExpirationDate}
                        onChange={(e) => setEditExpirationDate(e.target.value)}
                        className={`w-full px-3 py-1.5 rounded-lg border text-xs font-mono outline-none ${
                          isDarkMode ? 'bg-[#071F11] border-emerald-900/80 text-white' : 'bg-white border-slate-200'
                        }`}
                      />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">Attach Image from PC (Optional)</label>
                {editImage ? (
                  <div className={`flex items-center justify-between p-2.5 rounded-xl border ${
                    isDarkMode ? 'bg-[#04110A] border-emerald-900/60' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center space-x-3 min-w-0">
                      <img src={editImage} alt="Preview" className="w-12 h-12 rounded-lg object-cover border border-emerald-800 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-emerald-400 truncate">Image Attached</p>
                        <p className="text-[10px] text-slate-400">Ready to save</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditImage('')}
                      className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer rounded-lg hover:bg-rose-500/10"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className={`flex flex-col items-center justify-center p-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                    isDarkMode
                      ? 'border-emerald-900/60 hover:border-emerald-500 bg-[#04110A]'
                      : 'border-slate-200 hover:border-emerald-500 bg-slate-50'
                  }`}>
                    <Upload className="w-5 h-5 text-emerald-400 mb-1" />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Click to attach image from PC</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, WEBP</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageFileChange(e, setEditImage)}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="pt-2 flex justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setEditItemTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-emerald-900/60 text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#113C24] hover:bg-[#1B5234] text-white font-bold rounded-xl cursor-pointer shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: DELETE CONFIRMATION (Admin Only) */}
      {deleteItemTarget && canDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className={`w-full max-w-xs rounded-2xl border p-4 space-y-3 ${
            isDarkMode ? 'bg-[#071F11] border-emerald-900/60 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h3 className="font-bold text-sm">Delete Item?</h3>
            <p className="text-xs text-slate-400">
              Are you sure you want to remove <strong className="text-white">{deleteItemTarget.name}</strong> from inventory?
            </p>
            <p className="text-[11px] text-amber-500/90 font-medium">
              Corresponding feeding schedules, care routines, and restock tasks referencing this item will also be automatically removed.
            </p>
            <div className="flex justify-end space-x-2 pt-1">
              <button
                onClick={() => setDeleteItemTarget(null)}
                className="px-3 py-1.5 rounded-lg border text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded-lg cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
