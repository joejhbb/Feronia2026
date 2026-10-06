import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Database, Check, Copy, AlertCircle, RefreshCw, Server,
  ExternalLink, ArrowUpRight, ArrowDownLeft, ShieldCheck,
  CheckCircle2, X, Sparkles, FileCode, Sliders, Zap, KeyRound,
  Terminal, Shield, CheckCircle, DatabaseZap
} from 'lucide-react';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  testSupabaseConnection,
  generateSupabaseSqlSchema,
  supabaseUpsert,
  supabaseFetch,
  runLiveSupabaseCrudTest,
  seedSampleDataToSupabase
} from '../../lib/supabaseClient';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Optional app datasets for pushing to Supabase
  appData?: {
    animals?: any[];
    enclosures?: any[];
    tasks?: any[];
    medicalRecords?: any[];
    appointments?: any[];
    breedingRecords?: any[];
    breedingAssessments?: any[];
    inventory?: any[];
    staffMembers?: any[];
    transfers?: any[];
  };
  onDataSynced?: (pulledData: any) => void;
}

export default function SupabaseConfigModal({
  isOpen,
  onClose,
  appData,
  onDataSynced
}: SupabaseConfigModalProps) {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [dbPassword, setDbPassword] = useState('');
  const [connectionUri, setConnectionUri] = useState('');
  const [autoSync, setAutoSync] = useState(true);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  const [isLiveTesting, setIsLiveTesting] = useState(false);
  const [liveTestResult, setLiveTestResult] = useState<{
    success: boolean;
    message: string;
    tableStatuses: { table: string; exists: boolean; rowCount?: number; error?: string }[];
    writeTestPassed: boolean;
  } | null>(null);

  const [isAutoCreating, setIsAutoCreating] = useState(false);
  const [autoCreateResult, setAutoCreateResult] = useState<{ success: boolean; message: string } | null>(null);

  const [isSeeding, setIsSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{
    success: boolean;
    message: string;
    summary?: Record<string, number>;
    errors?: string[];
  } | null>(null);

  const [isPushing, setIsPushing] = useState(false);
  const [pushStatus, setPushStatus] = useState<string | null>(null);

  const [isPulling, setIsPulling] = useState(false);
  const [pullStatus, setPullStatus] = useState<string | null>(null);

  const [copiedSchema, setCopiedSchema] = useState(false);
  const [activeTab, setActiveTab] = useState<'sync' | 'connection' | 'schema' | 'autocreate'>('sync');

  // Helper to extract project ref from Supabase URL
  const projectRef = React.useMemo(() => {
    if (!url) return '';
    const match = url.match(/https?:\/\/([a-z0-9-]+)\.supabase\.co/i);
    return match ? match[1] : '';
  }, [url]);

  // Load saved configuration when modal opens
  useEffect(() => {
    if (isOpen) {
      const config = getSupabaseConfig();
      setUrl(config.url);
      setAnonKey(config.anonKey);
      setAutoSync(config.autoSync);
      setRealtimeEnabled(config.realtimeEnabled);
      setTestResult(null);
      setAutoCreateResult(null);
      setSeedResult(null);
      setPushStatus(null);
      setPullStatus(null);

      if (config.url && config.anonKey) {
        handleTest(config.url, config.anonKey);
      }
    }
  }, [isOpen]);

  const handleSave = () => {
    saveSupabaseConfig({
      url,
      anonKey,
      autoSync,
      realtimeEnabled
    });
  };

  const handleTest = async (testUrl = url, testKey = anonKey) => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testSupabaseConnection(testUrl, testKey);
      setTestResult(result);
      if (result.success) {
        saveSupabaseConfig({
          url: testUrl,
          anonKey: testKey,
          autoSync,
          realtimeEnabled
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Connection test failed'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleLiveTest = async () => {
    setIsLiveTesting(true);
    setLiveTestResult(null);
    try {
      const result = await runLiveSupabaseCrudTest();
      setLiveTestResult(result);
    } catch (err: any) {
      setLiveTestResult({
        success: false,
        message: err.message || 'Live CRUD test execution failed',
        tableStatuses: [],
        writeTestPassed: false
      });
    } finally {
      setIsLiveTesting(false);
    }
  };

  // Automated table creation via backend PostgreSQL connection
  const handleAutoCreateTables = async () => {
    if (!connectionUri && (!dbPassword || !url)) {
      setAutoCreateResult({
        success: false,
        message: 'Please provide your Supabase Database Connection URI or Database Password.'
      });
      return;
    }

    setIsAutoCreating(true);
    setAutoCreateResult(null);

    try {
      const res = await fetch('/api/supabase/auto-create-tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionString: connectionUri.trim() || undefined,
          dbPassword: dbPassword.trim() || undefined,
          projectUrl: url.trim() || undefined,
          sql: generateSupabaseSqlSchema()
        })
      });

      const data = await res.json();
      if (data.success) {
        setAutoCreateResult({
          success: true,
          message: data.message || 'All tables, columns, RLS policies, and Realtime publications updated successfully!'
        });
        if (url && anonKey) {
          handleTest(url, anonKey);
        }
      } else {
        setAutoCreateResult({
          success: false,
          message: data.error || 'Failed to auto-create tables. Please use the SQL Script tab to run directly in Supabase SQL Editor.'
        });
      }
    } catch (err: any) {
      setAutoCreateResult({
        success: false,
        message: `Execution failed: ${err.message || 'Network error'}`
      });
    } finally {
      setIsAutoCreating(false);
    }
  };

  const handleCopySchema = () => {
    const sql = generateSupabaseSqlSchema();
    navigator.clipboard.writeText(sql);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 3000);
  };

  // 1-Click Seed Sample Records to Supabase
  const handleSeedData = async () => {
    handleSave();
    setIsSeeding(true);
    setSeedResult(null);

    try {
      const result = await seedSampleDataToSupabase();
      setSeedResult(result);
      if (result.success) {
        // Also pull data so the app displays them immediately
        handlePullData();
      }
    } catch (err: any) {
      setSeedResult({
        success: false,
        message: err.message || 'Error occurred while seeding sample records',
        errors: [err.message]
      });
    } finally {
      setIsSeeding(false);
    }
  };

  // Push local data to Supabase tables
  const handlePushData = async () => {
    if (!appData) return;
    handleSave();
    setIsPushing(true);
    setPushStatus('Syncing local data to Supabase database...');

    try {
      let count = 0;
      const errors: string[] = [];

      let staffList = appData.staffMembers;
      if (!staffList || staffList.length === 0) {
        try {
          const stored = localStorage.getItem('feronia_staff_members');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) staffList = parsed;
          }
        } catch {}
      }

      const datasets: { table: string; items?: any[] }[] = [
        { table: 'animals', items: appData.animals },
        { table: 'enclosures', items: appData.enclosures },
        { table: 'tasks', items: appData.tasks },
        { table: 'inventory', items: appData.inventory },
        { table: 'medical_records', items: appData.medicalRecords },
        { table: 'appointments', items: appData.appointments },
        { table: 'breeding_records', items: appData.breedingRecords },
        { table: 'breeding_assessments', items: appData.breedingAssessments },
        { table: 'staff_members', items: staffList },
        { table: 'transfers', items: appData.transfers }
      ];

      for (const { table, items } of datasets) {
        if (items && items.length > 0) {
          for (const item of items) {
            const res = await supabaseUpsert(table, item);
            if (res.success) {
              count++;
            } else if (res.error) {
              errors.push(`${table}: ${res.error}`);
            }
          }
        }
      }

      if (count === 0 && errors.length > 0) {
        setPushStatus(`❌ Push failed: ${errors[0]}. Please run the updated SQL Schema in Supabase.`);
      } else if (errors.length > 0) {
        setPushStatus(`⚠️ Pushed ${count} records, but ${errors.length} failed: ${errors[0]}`);
      } else {
        setPushStatus(`✅ Successfully pushed ${count} records across all collections to Supabase!`);
      }
    } catch (err: any) {
      setPushStatus(`❌ Push error: ${err.message || 'Unknown error occurred'}`);
    } finally {
      setIsPushing(false);
    }
  };

  // Pull data from Supabase
  const handlePullData = async () => {
    setIsPulling(true);
    setPullStatus('Fetching records from Supabase tables...');

    try {
      const [
        animals,
        enclosures,
        tasks,
        inventory,
        medicalRecords,
        appointments,
        breedingRecords,
        breedingAssessments,
        staffMembers,
        transfers
      ] = await Promise.all([
        supabaseFetch('animals'),
        supabaseFetch('enclosures'),
        supabaseFetch('tasks'),
        supabaseFetch('inventory'),
        supabaseFetch('medical_records'),
        supabaseFetch('appointments'),
        supabaseFetch('breeding_records'),
        supabaseFetch('breeding_assessments'),
        supabaseFetch('staff_members'),
        supabaseFetch('transfers')
      ]);

      const totalCount =
        animals.length + enclosures.length + tasks.length + inventory.length +
        medicalRecords.length + appointments.length + breedingRecords.length +
        breedingAssessments.length + staffMembers.length + transfers.length;

      if (onDataSynced) {
        onDataSynced({
          animals,
          enclosures,
          tasks,
          inventory,
          medicalRecords,
          appointments,
          breedingRecords,
          breedingAssessments,
          staffMembers,
          transfers
        });
      }

      setPullStatus(`✅ Retrieved ${totalCount} records from Supabase (${animals.length} animals, ${enclosures.length} enclosures, ${tasks.length} tasks, ${inventory.length} inventory).`);
    } catch (err: any) {
      setPullStatus(`❌ Pull failed: ${err.message || 'Error connecting to database'}`);
    } finally {
      setIsPulling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-emerald-950/95 border border-emerald-500/30 rounded-2xl w-full max-w-2xl shadow-2xl shadow-emerald-950/60 overflow-hidden text-emerald-100 flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-500/20 bg-emerald-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-900/40">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-wide">Supabase Database Integration</h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  PostgreSQL
                </span>
              </div>
              <p className="text-xs text-emerald-300/80">Persistent cloud database for Feronia Wildlife Facility</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-400 hover:text-white hover:bg-emerald-800/40 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-emerald-500/20 bg-emerald-950/60 px-6 pt-2 gap-2 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('sync')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'sync'
                ? 'border-emerald-400 text-emerald-200 font-bold'
                : 'border-transparent text-emerald-400/70 hover:text-emerald-200'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            Populate & Sync Records
          </button>
          <button
            onClick={() => setActiveTab('connection')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'connection'
                ? 'border-emerald-400 text-emerald-200 font-bold'
                : 'border-transparent text-emerald-400/70 hover:text-emerald-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Credentials & Live Check
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'schema'
                ? 'border-emerald-400 text-emerald-200 font-bold'
                : 'border-transparent text-emerald-400/70 hover:text-emerald-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-amber-400" />
            SQL Schema & Migration
          </button>
          <button
            onClick={() => setActiveTab('autocreate')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'autocreate'
                ? 'border-emerald-400 text-emerald-200 font-bold'
                : 'border-transparent text-emerald-400/70 hover:text-emerald-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Auto-Run DDL
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar text-sm">
          {/* TAB 1: DATA PUSH, POPULATE & PULL */}
          {activeTab === 'sync' && (
            <div className="space-y-4">
              {/* Seed Sample Wildlife Data Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-900/60 to-teal-900/60 border border-emerald-500/40 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-100 font-bold text-sm">
                    <DatabaseZap className="w-5 h-5 text-emerald-400" />
                    <span>Populate Supabase with Sample Wildlife Records</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                    1-Click Seed
                  </span>
                </div>
                <p className="text-xs text-emerald-200/90 leading-relaxed">
                  If your tables in Supabase are newly created, they are currently empty. Click below to automatically insert the complete roster of <strong>animals</strong>, <strong>enclosures</strong>, <strong>tasks</strong>, <strong>inventory</strong>, <strong>medical records</strong>, <strong>breeding pairs</strong>, and <strong>staff accounts</strong> directly into Supabase.
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleSeedData}
                    disabled={isSeeding || !url || !anonKey}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-emerald-950 font-bold text-xs shadow-lg shadow-emerald-950/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSeeding ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Writing Records to Supabase PostgreSQL...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Seed Sample Records to Supabase Now
                      </>
                    )}
                  </button>
                </div>

                {seedResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3 rounded-lg border text-xs ${
                      seedResult.success
                        ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                        : 'bg-rose-950/80 border-rose-500/40 text-rose-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold">
                      {seedResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span>{seedResult.message}</span>
                    </div>
                    {seedResult.summary && (
                      <div className="grid grid-cols-3 gap-1.5 mt-2 pt-2 border-t border-emerald-500/20 text-[11px] font-mono">
                        {Object.entries(seedResult.summary).map(([k, v]) => (
                          <div key={k} className="p-1.5 rounded bg-emerald-900/30 flex justify-between">
                            <span className="text-emerald-300/70">{k}:</span>
                            <span className="font-bold text-emerald-200">{v}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {seedResult.errors && seedResult.errors.length > 0 && (
                      <div className="mt-2 text-[11px] text-rose-300 space-y-0.5">
                        <p className="font-semibold">Notice:</p>
                        <p>{seedResult.errors[0]}</p>
                        <p className="text-emerald-300/80 mt-1">
                          Tip: If columns are missing, click the <strong>SQL Schema & Migration</strong> tab, copy the script, and run it in Supabase SQL Editor.
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Push Local App State */}
              <div className="p-3.5 rounded-xl bg-emerald-900/20 border border-emerald-500/20 space-y-2">
                <h4 className="font-semibold text-emerald-100 text-xs flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  Push Current Active Records to Supabase
                </h4>
                <p className="text-[11px] text-emerald-400/80">
                  Sync all modified local animals ({appData?.animals?.length ?? 0}), enclosures ({appData?.enclosures?.length ?? 0}), tasks ({appData?.tasks?.length ?? 0}), and inventory ({appData?.inventory?.length ?? 0}) to Supabase tables.
                </p>
                <button
                  type="button"
                  onClick={handlePushData}
                  disabled={isPushing || !url || !anonKey}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isPushing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Pushing to Supabase...
                    </>
                  ) : (
                    <>
                      <Server className="w-3.5 h-3.5" />
                      Push Local Data to Supabase
                    </>
                  )}
                </button>
                {pushStatus && (
                  <p className="text-xs font-mono p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-200">
                    {pushStatus}
                  </p>
                )}
              </div>

              {/* Pull from Supabase */}
              <div className="p-3.5 rounded-xl bg-emerald-900/20 border border-emerald-500/20 space-y-2">
                <h4 className="font-semibold text-emerald-100 text-xs flex items-center gap-2">
                  <ArrowDownLeft className="w-4 h-4 text-teal-400" />
                  Pull Records from Supabase Database
                </h4>
                <p className="text-[11px] text-emerald-400/80">
                  Fetch latest records directly from your Supabase cloud tables and display them in the app.
                </p>
                <button
                  type="button"
                  onClick={handlePullData}
                  disabled={isPulling || !url || !anonKey}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs shadow transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isPulling ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Pulling from Supabase...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      Pull Records from Supabase
                    </>
                  )}
                </button>
                {pullStatus && (
                  <p className="text-xs font-mono p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-200">
                    {pullStatus}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CREDENTIALS & LIVE CHECK */}
          {activeTab === 'connection' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-emerald-200 mb-1.5">
                  Supabase Project URL <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://your-project-id.supabase.co"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-emerald-900/30 border border-emerald-500/30 text-emerald-100 placeholder-emerald-600 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all font-mono text-xs"
                />
                <p className="text-[11px] text-emerald-400/70 mt-1">
                  Supabase Dashboard → <strong>Project Settings → API → Project URL</strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-200 mb-1.5">
                  Supabase Anon Key or Service Role Key <span className="text-rose-400">*</span>
                </label>
                <input
                  type="password"
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-emerald-900/30 border border-emerald-500/30 text-emerald-100 placeholder-emerald-600 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all font-mono text-xs"
                />
                <p className="text-[11px] text-emerald-400/70 mt-1">
                  Supabase Dashboard → <strong>Project Settings → API → Project API keys (anon public)</strong>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-3 p-3 rounded-xl bg-emerald-900/20 border border-emerald-500/20 cursor-pointer hover:bg-emerald-900/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={autoSync}
                    onChange={(e) => setAutoSync(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 bg-emerald-950 border-emerald-500/40"
                  />
                  <div>
                    <span className="text-xs font-semibold text-emerald-100 block">Automatic Sync</span>
                    <span className="text-[10px] text-emerald-400/70">Sync changes to Supabase</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl bg-emerald-900/20 border border-emerald-500/20 cursor-pointer hover:bg-emerald-900/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={realtimeEnabled}
                    onChange={(e) => setRealtimeEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 bg-emerald-950 border-emerald-500/40"
                  />
                  <div>
                    <span className="text-xs font-semibold text-emerald-100 block">Supabase Realtime</span>
                    <span className="text-[10px] text-emerald-400/70">Listen to live change events</span>
                  </div>
                </label>
              </div>

              <div className="pt-2">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleTest()}
                    disabled={isTesting || !url || !anonKey}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold text-xs shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isTesting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Testing Connection...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Test & Save Connection
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleLiveTest}
                    disabled={isLiveTesting || !url || !anonKey}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isLiveTesting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Testing Tables...
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5" />
                        Run 11-Table Diagnostic Check
                      </>
                    )}
                  </button>
                </div>

                {testResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-3 p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                      testResult.success
                        ? 'bg-emerald-900/40 border-emerald-500/40 text-emerald-200'
                        : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold">{testResult.message}</p>
                    </div>
                  </motion.div>
                )}

                {liveTestResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/30 space-y-2.5 text-xs"
                  >
                    <div className="flex items-center gap-2 font-bold">
                      {liveTestResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                      )}
                      <span className={liveTestResult.success ? 'text-emerald-200' : 'text-amber-200'}>
                        {liveTestResult.message}
                      </span>
                    </div>

                    {liveTestResult.tableStatuses.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                        {liveTestResult.tableStatuses.map((t) => (
                          <div
                            key={t.table}
                            className={`p-2 rounded-lg border text-[11px] flex items-center justify-between ${
                              t.exists
                                ? 'bg-emerald-900/30 border-emerald-500/30 text-emerald-200'
                                : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                            }`}
                          >
                            <span className="font-mono truncate">{t.table}</span>
                            <span className="font-bold shrink-0 ml-1">
                              {t.exists ? `✓ (${t.rowCount ?? 0} rows)` : '✕ missing'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SQL SCHEMA & MIGRATION */}
          {activeTab === 'schema' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-amber-300">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Why did records not appear initially?
                </p>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  PostgreSQL requires all column names (like <code className="text-amber-100">morph</code>, <code className="text-amber-100">sex</code>, <code className="text-amber-100">weight</code>, <code className="text-amber-100">record_type</code>) to exist on the table.
                  This updated script uses <strong>ALTER TABLE ... ADD COLUMN IF NOT EXISTS</strong> so running it will safely upgrade your existing Supabase tables in 2 seconds without deleting any data!
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-emerald-100 text-xs">Updated PostgreSQL DDL & Migration Script</h4>
                  <p className="text-[11px] text-emerald-400/80">
                    Copy and run in Supabase SQL Editor to make all tables 100% ready.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopySchema}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow transition-all cursor-pointer"
                >
                  {copiedSchema ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Copied SQL!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy SQL Script
                    </>
                  )}
                </button>
              </div>

              <div className="relative">
                <pre className="p-3.5 rounded-xl bg-emerald-950/90 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] max-h-60 overflow-y-auto custom-scrollbar">
                  {generateSupabaseSqlSchema()}
                </pre>
              </div>

              <div className="flex items-center gap-2">
                {projectRef && (
                  <a
                    href={`https://supabase.com/dashboard/project/${projectRef}/sql/new`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-900/40 hover:bg-emerald-800/40 border border-emerald-500/30 text-emerald-300 font-semibold text-xs transition-all"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Open Supabase SQL Editor</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: AUTO-CREATE DDL */}
          {activeTab === 'autocreate' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-900/40 to-teal-900/40 border border-emerald-500/30 space-y-2">
                <div className="flex items-center gap-2 text-emerald-200 font-bold text-sm">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Automatic Table Initialization via Direct Postgres Connection</span>
                </div>
                <p className="text-xs text-emerald-300/80 leading-relaxed">
                  Provide your Supabase database password to run the schema directly from the server.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-emerald-200 mb-1.5 flex items-center justify-between">
                    <span>Supabase Database Password</span>
                    <span className="text-[10px] text-emerald-400/70 font-normal">Set during Supabase project creation</span>
                  </label>
                  <input
                    type="password"
                    value={dbPassword}
                    onChange={(e) => setDbPassword(e.target.value)}
                    placeholder="Enter your Supabase database password"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-emerald-900/30 border border-emerald-500/30 text-emerald-100 placeholder-emerald-600 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all text-xs"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs text-emerald-400/60 font-semibold my-1">
                  <span className="flex-1 h-px bg-emerald-500/20" />
                  <span>OR DIRECT CONNECTION URI</span>
                  <span className="flex-1 h-px bg-emerald-500/20" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-emerald-200 mb-1.5">
                    <span>PostgreSQL Connection URI (Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={connectionUri}
                    onChange={(e) => setConnectionUri(e.target.value)}
                    placeholder="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-emerald-900/30 border border-emerald-500/30 text-emerald-100 placeholder-emerald-600 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all font-mono text-xs"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleAutoCreateTables}
                    disabled={isAutoCreating || (!connectionUri && !dbPassword)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-emerald-950 font-bold text-xs shadow-lg shadow-emerald-900/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isAutoCreating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Creating / Upgrading Tables...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 fill-emerald-950" />
                        Execute Schema & Upgrade Tables
                      </>
                    )}
                  </button>
                </div>

                {autoCreateResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                      autoCreateResult.success
                        ? 'bg-emerald-900/40 border-emerald-500/40 text-emerald-200'
                        : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                    }`}
                  >
                    {autoCreateResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold">{autoCreateResult.message}</p>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-emerald-500/20 bg-emerald-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-emerald-400/70">
            <div className={`w-2 h-2 rounded-full ${url && anonKey ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span>{url && anonKey ? 'Supabase Connected' : 'Credentials Needed'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-emerald-900/40 hover:bg-emerald-900/60 text-emerald-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                handleSave();
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              Save & Apply
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
