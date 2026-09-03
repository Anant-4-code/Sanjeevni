"use client";

import { useState, useEffect } from "react";
import {
  Package,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  TrendingDown,
  Edit3,
  X,
} from "lucide-react";
import { API_BASE } from "@/lib/api";

const STATUS_CONFIG: Record<string, { label: string; icon: string; cls: string }> = {
  healthy: { label: "Healthy", icon: "🟢", cls: "text-emerald-700 dark:text-emerald-400" },
  reorder_soon: { label: "Reorder Soon", icon: "🟡", cls: "text-amber-700 dark:text-amber-400" },
  low_stock: { label: "Low Stock", icon: "🔴", cls: "text-rose-700 dark:text-rose-400" },
};

export default function PharmacyInventoryPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [forecasts, setForecasts] = useState<any[]>([]);

  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStock, setEditStock] = useState("");
  const [editThreshold, setEditThreshold] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/pharmacy/inventory`).then((r) => r.json()),
      fetch(`${API_BASE}/pharmacy/inventory/forecast`).then((r) => r.json()),
    ])
      .then(([invData, forecastData]) => {
        setInventory(invData.inventory || []);
        setForecasts(forecastData.alerts || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredInventory = inventory.filter((item: any) => {
    if (!searchQ.trim()) return true;
    return item.medication_name?.toLowerCase().includes(searchQ.toLowerCase());
  });

  const getStatus = (item: any) => {
    if (item.status) return item.status;
    if (item.quantity_on_hand <= (item.reorder_threshold || 50) / 2) return "low_stock";
    if (item.quantity_on_hand <= (item.reorder_threshold || 50)) return "reorder_soon";
    return "healthy";
  };

  const handleSaveEdit = async (medId: string) => {
    try {
      await fetch(`${API_BASE}/pharmacy/inventory/${medId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity_on_hand: editStock ? parseInt(editStock) : undefined,
          reorder_threshold: editThreshold ? parseInt(editThreshold) : undefined,
        }),
      });
      // Update local state
      setInventory((prev) =>
        prev.map((item) =>
          item.medication_id === medId
            ? {
                ...item,
                quantity_on_hand: editStock ? parseInt(editStock) : item.quantity_on_hand,
                reorder_threshold: editThreshold ? parseInt(editThreshold) : item.reorder_threshold,
              }
            : item
        )
      );
      setEditingId(null);
    } catch (err) {
      console.error("Edit error:", err);
    }
  };

  return (
    <div className="max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E2E8F0] dark:border-[#1F2937] pb-6">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#64748B] dark:text-gray-400 font-bold">
            02 // INVENTORY MANAGEMENT
          </span>
          <h1 className="font-display text-3xl font-black text-[#0F172A] dark:text-white mt-1">
            Inventory Dashboard
          </h1>
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search medicines..."
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl pl-9 pr-4 py-2 text-xs text-[#0F172A] dark:text-white w-64"
          />
        </div>
      </div>

      {/* AI Reorder Suggestions */}
      {forecasts.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50/60 to-amber-50/60 dark:from-purple-950/20 dark:to-amber-950/20 border border-purple-200/80 dark:border-purple-800/50 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-6 h-6 rounded-md bg-purple-600 text-white flex items-center justify-center font-bold text-[10px]">AI</div>
            <h3 className="font-bold text-sm text-[#0F172A] dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Reorder Suggestions</span>
            </h3>
          </div>
          <div className="space-y-2">
            {forecasts.map((f) => (
              <div key={f.medication_id} className="flex items-center justify-between p-3 bg-white dark:bg-[#111827] border border-purple-200 dark:border-purple-800 rounded-xl text-xs">
                <div>
                  <span className="font-bold text-[#0F172A] dark:text-white">{f.name}</span>
                  <span className="text-[#64748B] ml-2">— ~{f.days_until_stockout} days left at current rate</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-purple-700 dark:text-purple-300 font-bold">
                    Reorder: {f.suggested_reorder_qty} units
                  </span>
                  <button className="px-3 py-1 bg-purple-600 text-white rounded-lg text-[11px] font-bold hover:bg-purple-700 transition-colors">
                    Create PO
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inventory Table */}
      {loading ? (
        <div className="p-12 text-center text-[#64748B] bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl animate-pulse">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
          <p className="text-xs">Loading inventory...</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl shadow-xs overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-[#F8F7F4] dark:bg-[#0D1117] border-b border-[#E2E8F0] dark:border-[#1F2937] text-[10px] font-mono uppercase text-[#64748B] font-bold">
            <div className="col-span-4">Medicine</div>
            <div className="col-span-2 text-right">Stock</div>
            <div className="col-span-2 text-right">Reorder At</div>
            <div className="col-span-2 text-right">Daily Avg</div>
            <div className="col-span-2 text-right">Status</div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-[#E2E8F0] dark:divide-[#1F2937]">
            {filteredInventory.map((item: any) => {
              const status = getStatus(item);
              const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.healthy;
              const isEditing = editingId === item.medication_id;

              return (
                <div key={item.medication_id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center text-xs group">
                  <div className="col-span-4">
                    <span className="font-bold text-[#0F172A] dark:text-white">{item.medication_name}</span>
                  </div>
                  <div className="col-span-2 text-right">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editStock}
                        onChange={(e) => setEditStock(e.target.value)}
                        className="w-20 bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-lg px-2 py-1 text-xs text-right"
                      />
                    ) : (
                      <span className="font-mono font-bold text-[#0F172A] dark:text-white">{item.quantity_on_hand}</span>
                    )}
                  </div>
                  <div className="col-span-2 text-right">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editThreshold}
                        onChange={(e) => setEditThreshold(e.target.value)}
                        className="w-20 bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-lg px-2 py-1 text-xs text-right"
                      />
                    ) : (
                      <span className="font-mono text-[#64748B]">{item.reorder_threshold || 50}</span>
                    )}
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="font-mono text-[#64748B]">{item.daily_avg || "—"}</span>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <span className={`font-bold text-[11px] flex items-center gap-1 ${cfg.cls}`}>
                      <span>{cfg.icon}</span>
                      <span>{cfg.label}</span>
                    </span>
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleSaveEdit(item.medication_id)}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 text-[#64748B] hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(item.medication_id);
                          setEditStock(String(item.quantity_on_hand));
                          setEditThreshold(String(item.reorder_threshold || 50));
                        }}
                        className="p-1 text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredInventory.length === 0 && (
              <div className="p-8 text-center text-xs text-[#64748B]">
                No medicines found matching &ldquo;{searchQ}&rdquo;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
