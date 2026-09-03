"use client";

import { useState } from "react";
import {
  ClipboardList,
  Search,
  RefreshCw,
  Package,
  Calendar,
} from "lucide-react";
import { API_BASE } from "@/lib/api";

export default function PharmacyHistoryPage() {
  const [patientSearch, setPatientSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const handleSearch = async (q: string) => {
    setPatientSearch(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`${API_BASE}/patients/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const selectPatient = async (patient: any) => {
    setSelectedPatient(patient);
    setPatientSearch(patient.full_name);
    setSearchResults([]);
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_BASE}/pharmacy/patient/${patient.id}/dispensing-history`);
      const data = await res.json();
      setHistory(data.history || []);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div className="max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="border-b border-[#E2E8F0] dark:border-[#1F2937] pb-6">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#64748B] dark:text-gray-400 font-bold">
          03 // AUDIT LOG
        </span>
        <h1 className="font-display text-3xl font-black text-[#0F172A] dark:text-white mt-1">
          Dispensing History
        </h1>
        <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">
          Complete dispensing audit trail per patient. Search by name or phone.
        </p>
      </div>

      {/* Patient Search */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl p-5 shadow-xs space-y-3">
        <label className="text-[10px] font-mono uppercase text-[#64748B] font-bold">Search Patient</label>
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={patientSearch}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full bg-[#F8F7F4] dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl pl-9 pr-4 py-2.5 text-xs text-[#0F172A] dark:text-white"
          />
        </div>

        {searching && <p className="text-xs text-[#64748B]">Searching...</p>}

        {searchResults.length > 0 && (
          <div className="space-y-1 max-h-[180px] overflow-y-auto">
            {searchResults.map((p) => (
              <button
                key={p.id}
                onClick={() => selectPatient(p)}
                className="w-full text-left p-3 rounded-xl border border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8F7F4]/50 dark:bg-[#1F2937]/30 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <span className="font-bold text-[#0F172A] dark:text-white">{p.full_name}</span>
                <span className="text-[#64748B] ml-2">{p.phone}</span>
              </button>
            ))}
          </div>
        )}

        {selectedPatient && (
          <div className="flex items-center gap-2 p-2 bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-xl text-xs">
            <Package className="w-3.5 h-3.5 text-purple-600" />
            <span className="font-bold text-purple-800 dark:text-purple-200">
              Showing history for: {selectedPatient.full_name}
            </span>
          </div>
        )}
      </div>

      {/* History Table */}
      {loadingHistory ? (
        <div className="p-12 text-center text-[#64748B] bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl animate-pulse">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
          <p className="text-xs">Loading dispensing history...</p>
        </div>
      ) : !selectedPatient ? (
        <div className="p-12 text-center text-[#64748B] bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl">
          <ClipboardList className="w-8 h-8 mx-auto mb-2 text-purple-400" />
          <p className="font-bold text-sm text-[#0F172A] dark:text-white">Select a Patient</p>
          <p className="text-xs mt-1">Search for a patient above to view their dispensing history.</p>
        </div>
      ) : history.length === 0 ? (
        <div className="p-12 text-center text-[#64748B] bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl">
          <Package className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="font-bold text-sm text-[#0F172A] dark:text-white">No Dispensing Records</p>
          <p className="text-xs mt-1">No dispensing history found for this patient.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl shadow-xs overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-[#F8F7F4] dark:bg-[#0D1117] border-b border-[#E2E8F0] dark:border-[#1F2937] text-[10px] font-mono uppercase text-[#64748B] font-bold">
            <div className="col-span-3">Date</div>
            <div className="col-span-4">Medication</div>
            <div className="col-span-2 text-right">Qty</div>
            <div className="col-span-3 text-right">Type</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-[#E2E8F0] dark:divide-[#1F2937]">
            {history.map((h: any) => (
              <div key={h.id} className="grid grid-cols-12 gap-4 px-6 py-3.5 items-center text-xs">
                <div className="col-span-3 flex items-center gap-1.5 text-[#64748B] font-mono">
                  <Calendar className="w-3 h-3" />
                  {h.dispensed_at
                    ? new Date(h.dispensed_at).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—"}
                </div>
                <div className="col-span-4">
                  <span className="font-bold text-[#0F172A] dark:text-white">{h.medication_name || "—"}</span>
                </div>
                <div className="col-span-2 text-right font-mono font-bold text-[#0F172A] dark:text-white">
                  {h.quantity_dispensed}
                </div>
                <div className="col-span-3 text-right">
                  {h.partial ? (
                    <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                      PARTIAL
                    </span>
                  ) : h.refill_request_id ? (
                    <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                      REFILL
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      FULL DISPENSE
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
