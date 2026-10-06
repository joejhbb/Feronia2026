import React, { useState, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  ChevronDown, 
  ArrowUpDown, 
  Mail, 
  Phone, 
  Building2, 
  Eye, 
  UserCheck, 
  MoreVertical, 
  Database, 
  Settings, 
  PawPrint, 
  Stethoscope, 
  ShieldCheck, 
  Key, 
  RefreshCw, 
  Trash2, 
  X, 
  Check, 
  Lock, 
  CheckCircle2, 
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { StaffMember, Animal, Enclosure } from '../../types';

interface StaffManagementViewProps {
  staffMembers: StaffMember[];
  animals: Animal[];
  enclosures: Enclosure[];
  isDarkMode: boolean;
  onAddStaff: () => void;
  onOpenReassign: (member: StaffMember) => void;
  onOpenCredentials: (member: StaffMember) => void;
  onResetPassword: (id: string) => void;
  onDeleteStaff: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onOpenDatabase?: () => void;
  onRestoreDefaultRoster?: () => void;
  onSendEmailInvitation?: (member: StaffMember) => void;
  onBackToDashboard?: () => void;
  onBack?: () => void;
}

export const StaffManagementView: React.FC<StaffManagementViewProps> = ({
  staffMembers,
  animals,
  enclosures,
  isDarkMode,
  onAddStaff,
  onOpenReassign,
  onOpenCredentials,
  onResetPassword,
  onDeleteStaff,
  onToggleStatus,
  onOpenDatabase,
  onRestoreDefaultRoster,
  onSendEmailInvitation,
  onBackToDashboard,
  onBack
}) => {
  const handleBack = onBack || onBackToDashboard;
  // Filtering & Sorting State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | 'keeper' | 'vet' | 'admin'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'id-asc' | 'role'>('name-asc');

  // Selected checkbox IDs
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);

  // Active dropdown menu for "..." more options
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Selected Staff for Detailed Modal
  const [detailStaff, setDetailStaff] = useState<StaffMember | null>(null);

  // Helper to determine background color for staff initials avatar
  const getAvatarColor = (id: string, name: string) => {
    const colors = [
      'bg-emerald-600 text-white',
      'bg-sky-600 text-white',
      'bg-purple-600 text-white',
      'bg-teal-600 text-white',
      'bg-pink-600 text-white',
      'bg-amber-600 text-white',
      'bg-indigo-600 text-white'
    ];
    let hash = 0;
    const str = `${id}-${name}`;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Helper to resolve assigned facilities for a staff member
  const resolveAssignedFacilities = (member: StaffMember): string[] => {
    // Veterinarians oversee clinical care facility-wide and cannot be assigned to animals or enclosures
    if (member.role === 'vet') {
      return ['Veterinary Clinic & Hospital (Facility-wide)'];
    }
    if (member.assignedFacilities && member.assignedFacilities.length > 0) {
      return member.assignedFacilities;
    }
    // Compute from keeper's assigned animals and their enclosures
    const assignedAnimalIds = member.assignedAnimalIds && member.assignedAnimalIds.length > 0
      ? member.assignedAnimalIds
      : animals
          .filter(a => a.assignedKeeperId === member.id || (a.assignedKeeperName && a.assignedKeeperName.toLowerCase() === member.name.toLowerCase()))
          .map(a => a.id);

    if (assignedAnimalIds.length > 0) {
      const assignedEnclosureIds = new Set(
        animals
          .filter(a => assignedAnimalIds.includes(a.id) && a.enclosureId)
          .map(a => a.enclosureId)
      );
      const facilityNames = new Set<string>();
      enclosures
        .filter(enc => assignedEnclosureIds.has(enc.id))
        .forEach(enc => {
          if (enc.facility) facilityNames.add(enc.facility);
          else if (enc.name) facilityNames.add(enc.name);
        });

      if (facilityNames.size > 0) {
        return Array.from(facilityNames);
      }
    }

    // Role-based defaults
    if (member.role === 'admin') return ['Main Facility', 'All Sectors'];
    return ['Main Facility'];
  };

  // Filter and sort staff members
  const filteredStaff = useMemo(() => {
    return staffMembers.filter(member => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q || 
        member.name.toLowerCase().includes(q) || 
        member.email.toLowerCase().includes(q) || 
        member.id.toLowerCase().includes(q) ||
        (member.phone && member.phone.toLowerCase().includes(q));

      const matchRole = roleFilter === 'All' || member.role === roleFilter;

      const memberStatus = member.status || 'Active';
      const matchStatus = statusFilter === 'All' || memberStatus === statusFilter;

      return matchQuery && matchRole && matchStatus;
    }).sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
      if (sortBy === 'id-asc') return a.id.localeCompare(b.id);
      if (sortBy === 'role') return a.role.localeCompare(b.role);
      return 0;
    });
  }, [staffMembers, searchQuery, roleFilter, statusFilter, sortBy]);

  // Overall counts
  const totalStaff = staffMembers.length;
  const activeCount = staffMembers.filter(s => (s.status || 'Active') === 'Active').length;
  const inactiveCount = staffMembers.filter(s => s.status === 'Inactive').length;

  // Toggle selection
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedStaffIds(filteredStaff.map(s => s.id));
    } else {
      setSelectedStaffIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedStaffIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & STATS SUMMARY */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Left: Title & Subtitle */}
        <div className="flex items-center space-x-3.5">
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
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-950/40 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Staff Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Manage facility accounts, roles, and access.
            </p>
          </div>
        </div>

        {/* Right: Stats Widget + Add Staff Button */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {/* Total Staff / Active / Inactive Pill Card */}
          <div className="bg-white dark:bg-[#04140b] border border-slate-200 dark:border-emerald-900/40 rounded-2xl px-5 py-2.5 flex items-center space-x-6 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Staff</p>
                <p className="text-xl font-black text-slate-900 dark:text-white leading-none mt-0.5">
                  {totalStaff}
                </p>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-200 dark:bg-emerald-950/80" />

            <div className="flex flex-col space-y-1 text-xs">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-xs shadow-emerald-400/50" />
                <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">Active</span>
                <span className="font-bold text-slate-900 dark:text-white ml-2 text-[11px]">{activeCount}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-600" />
                <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">Inactive</span>
                <span className="font-bold text-slate-900 dark:text-white ml-2 text-[11px]">{inactiveCount}</span>
              </div>
            </div>
          </div>

          {/* Add Staff Member Button */}
          <button
            onClick={onAddStaff}
            className="px-5 py-3 bg-[#059669] hover:bg-[#047857] active:scale-95 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-emerald-950/30 transition-all flex items-center space-x-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Staff Member</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN TABLE / DIRECTORY CONTAINER */}
      <div className="rounded-3xl border border-slate-200 dark:border-emerald-950/80 bg-white dark:bg-[#05170d]/90 backdrop-blur-md shadow-sm overflow-hidden p-5 sm:p-6 transition-colors">
        
        {/* Filter & Search Toolbar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 mb-6">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search staff member..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#030e07]/80 border border-slate-200 dark:border-emerald-950/90 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 transition-colors"
            />
          </div>

          {/* Filters & Sorting */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Role Filter */}
            <div className="relative">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                aria-label="Filter by role"
                className="appearance-none pl-9 pr-8 py-2.5 rounded-xl bg-slate-50 dark:bg-[#030e07]/80 border border-slate-200 dark:border-emerald-950/90 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500/60 cursor-pointer"
              >
                <option value="All">All Roles</option>
                <option value="keeper">Keeper</option>
                <option value="vet">Veterinarian</option>
                <option value="admin">Administrator</option>
              </select>
              <Users className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                aria-label="Filter by status"
                className="appearance-none pl-9 pr-8 py-2.5 rounded-xl bg-slate-50 dark:bg-[#030e07]/80 border border-slate-200 dark:border-emerald-950/90 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500/60 cursor-pointer"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sort staff members"
                className="appearance-none pl-9 pr-8 py-2.5 rounded-xl bg-slate-50 dark:bg-[#030e07]/80 border border-slate-200 dark:border-emerald-950/90 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500/60 cursor-pointer"
              >
                <option value="name-asc">Sort by: Name (A-Z)</option>
                <option value="name-desc">Sort by: Name (Z-A)</option>
                <option value="id-asc">Sort by: ID</option>
                <option value="role">Sort by: Role</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Staff Table */}
        {filteredStaff.length === 0 ? (
          <div className="p-12 text-center space-y-4 rounded-2xl border border-dashed border-slate-200 dark:border-emerald-950">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <Users className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-bold text-slate-800 dark:text-slate-100">
                {staffMembers.length === 0 ? 'No staff members registered yet' : 'No staff members found'}
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {staffMembers.length === 0
                  ? 'Your staff roster is clean and empty. Get started by adding your first Wildlife Keeper, Veterinarian, or Administrator.'
                  : 'Try adjusting your search query or filters.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onAddStaff}
              className="mt-2 inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add First Staff Member</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5 sm:-mx-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-emerald-950/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <th className="py-3.5 pl-6 pr-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedStaffIds.length === filteredStaff.length && filteredStaff.length > 0}
                      onChange={handleSelectAll}
                      aria-label="Select all staff members"
                      className="rounded border-slate-300 dark:border-emerald-900 bg-slate-100 dark:bg-emerald-950 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-4">Staff Member</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Contact Information</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 pr-6 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-emerald-950/40 text-xs">
                {filteredStaff.map((member) => {
                  const facilities = resolveAssignedFacilities(member);
                  const isSelected = selectedStaffIds.includes(member.id);
                  const status = member.status || 'Active';
                  const isMenuOpen = activeMenuId === member.id;

                  return (
                    <tr
                      key={member.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-emerald-950/20 transition-colors ${
                        isSelected ? 'bg-emerald-500/5' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-4 pl-6 pr-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(member.id)}
                          aria-label={`Select ${member.name}`}
                          className="rounded border-slate-300 dark:border-emerald-900 bg-slate-100 dark:bg-emerald-950 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      {/* Staff Member */}
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${getAvatarColor(
                              member.id,
                              member.name
                            )}`}
                          >
                            {member.initials || member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                              {member.name}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono">
                              {member.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Role & Assigned Facilities */}
                      <td className="py-4 px-4">
                        <div className="space-y-1.5">
                          {/* Role Badge */}
                          {member.role === 'keeper' ? (
                            <span className="px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-950/70 border border-emerald-500/25 dark:border-emerald-700/50 text-emerald-600 dark:text-emerald-300 text-xs font-semibold inline-flex items-center space-x-1.5">
                              <PawPrint className="w-3.5 h-3.5" />
                              <span>Keeper</span>
                            </span>
                          ) : member.role === 'vet' ? (
                            <span className="px-3 py-1 rounded-full bg-sky-500/10 dark:bg-sky-950/70 border border-sky-500/25 dark:border-sky-700/50 text-sky-600 dark:text-sky-300 text-xs font-semibold inline-flex items-center space-x-1.5">
                              <Stethoscope className="w-3.5 h-3.5" />
                              <span>Veterinarian</span>
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full bg-purple-500/10 dark:bg-purple-950/70 border border-purple-500/25 dark:border-purple-700/50 text-purple-600 dark:text-purple-300 text-xs font-semibold inline-flex items-center space-x-1.5">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Administrator</span>
                            </span>
                          )}

                          {/* Assigned Facilities */}
                          <div className="pt-0.5">
                            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                              {member.role === 'vet' ? 'Assignment Scope' : 'Assigned Facilities'}
                            </p>
                            <div className="space-y-0.5 mt-0.5">
                              {member.role === 'vet' ? (
                                <p className="text-sky-600 dark:text-sky-400/90 flex items-center space-x-1.5 text-[11px] font-medium">
                                  <Stethoscope className="w-3 h-3 text-sky-500 shrink-0" />
                                  <span>Clinical Care • Unassigned to Animals / Habitats</span>
                                </p>
                              ) : (
                                <>
                                  {facilities.slice(0, 2).map((fac, idx) => (
                                    <p
                                      key={idx}
                                      className="text-slate-600 dark:text-slate-300 flex items-center space-x-1.5 text-[11px]"
                                    >
                                      <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span className="truncate">{fac}</span>
                                    </p>
                                  ))}
                                  {facilities.length > 2 && (
                                    <p className="text-[10px] text-slate-400 italic">
                                      +{facilities.length - 2} more facility
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact Information */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-300">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[190px]">{member.email}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-300">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{member.phone || 'No phone set'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {status === 'Active' ? (
                          <span className="px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-950/60 border border-emerald-500/20 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400 text-xs font-semibold inline-flex items-center space-x-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-xs shadow-emerald-400/50" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-rose-500/10 dark:bg-rose-950/60 border border-rose-500/20 dark:border-rose-800/40 text-rose-600 dark:text-rose-400 text-xs font-semibold inline-flex items-center space-x-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            <span>Inactive</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 pr-6 pl-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* View Details */}
                          <button
                            type="button"
                            onClick={() => setDetailStaff(member)}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-emerald-900/60 bg-white dark:bg-[#04140b] hover:bg-slate-100 dark:hover:bg-emerald-950/80 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-400" />
                            <span>View Details</span>
                          </button>

                          {/* Assign (Keepers only) / Veterinarians restricted */}
                          {member.role === 'keeper' ? (
                            <button
                              type="button"
                              onClick={() => onOpenReassign(member)}
                              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-emerald-900/60 bg-white dark:bg-[#04140b] hover:bg-slate-100 dark:hover:bg-emerald-950/80 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                            >
                              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                              <span>Assign</span>
                            </button>
                          ) : member.role === 'vet' ? (
                            <span
                              title="Veterinarians oversee medical care facility-wide and cannot be assigned to specific animals or enclosures."
                              className="px-2.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-100/70 dark:bg-[#04140b] text-slate-400 dark:text-slate-500 text-xs font-semibold flex items-center space-x-1.5 cursor-not-allowed select-none"
                            >
                              <Lock className="w-3.5 h-3.5 text-slate-400" />
                              <span>Unassignable</span>
                            </span>
                          ) : null}

                          {/* More Options Dropdown */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setActiveMenuId(isMenuOpen ? null : member.id)}
                              className="p-1.5 rounded-xl border border-slate-200 dark:border-emerald-900/60 hover:bg-slate-100 dark:hover:bg-emerald-950/80 text-slate-400 cursor-pointer"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {isMenuOpen && (
                              <div
                                className="absolute right-0 top-full mt-1.5 w-48 rounded-2xl bg-white dark:bg-[#071F11] border border-slate-200 dark:border-emerald-950 shadow-2xl p-1.5 z-30 text-left"
                                onMouseLeave={() => setActiveMenuId(null)}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    onOpenCredentials(member);
                                  }}
                                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-emerald-950/60 flex items-center space-x-2 cursor-pointer"
                                >
                                  <Key className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>View Credentials</span>
                                </button>
                                {onSendEmailInvitation && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      onSendEmailInvitation(member);
                                    }}
                                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 flex items-center space-x-2 cursor-pointer"
                                  >
                                    <Mail className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>Send Credentials Email</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    onResetPassword(member.id);
                                  }}
                                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-emerald-950/60 flex items-center space-x-2 cursor-pointer"
                                >
                                  <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
                                  <span>Reset Temp Password</span>
                                </button>
                                {member.role !== 'admin' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        onToggleStatus(member.id);
                                      }}
                                      className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-emerald-950/60 flex items-center space-x-2 cursor-pointer"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5 text-sky-500" />
                                      <span>Set as {status === 'Active' ? 'Inactive' : 'Active'}</span>
                                    </button>
                                    <div className="h-px bg-slate-100 dark:bg-emerald-950/60 my-1" />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        onDeleteStaff(member.id);
                                      }}
                                      className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex items-center space-x-2 cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                      <span>Delete Account</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. STAFF DETAILS MODAL (When clicking "View Details") */}
      {detailStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#071F11] border border-slate-200 dark:border-emerald-950 shadow-2xl p-6 text-slate-800 dark:text-slate-200 space-y-5 animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-emerald-950/70">
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm ${getAvatarColor(detailStaff.id, detailStaff.name)}`}>
                  {detailStaff.initials || detailStaff.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">{detailStaff.name}</h3>
                  <p className="text-xs text-slate-400 font-mono">{detailStaff.id}</p>
                </div>
              </div>
              <button
                onClick={() => setDetailStaff(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-emerald-950 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Content */}
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-emerald-950/30 border border-slate-100 dark:border-emerald-900/30">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Role</p>
                  <p className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5 capitalize">
                    {detailStaff.role === 'vet' ? 'Veterinarian' : detailStaff.role === 'admin' ? 'Administrator' : 'Keeper'}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-emerald-950/30 border border-slate-100 dark:border-emerald-900/30">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Status</p>
                  <p className="font-bold text-emerald-500 text-sm mt-0.5">
                    {detailStaff.status || 'Active'}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-emerald-950/30 border border-slate-100 dark:border-emerald-900/30 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 flex items-center space-x-1.5"><Mail className="w-3.5 h-3.5" /> <span>Email:</span></span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{detailStaff.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 flex items-center space-x-1.5"><Phone className="w-3.5 h-3.5" /> <span>Phone:</span></span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{detailStaff.phone || 'Not provided'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Duty Load:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{detailStaff.dutyLoad || 'General Facility Duties'}</span>
                </div>
              </div>

              {/* Assigned Facilities / Role Policy */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-emerald-950/30 border border-slate-100 dark:border-emerald-900/30">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1.5">
                  {detailStaff.role === 'vet' ? 'Assignment Policy & Scope' : 'Assigned Facilities'}
                </p>
                {detailStaff.role === 'vet' ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2 text-sky-600 dark:text-sky-300 font-semibold text-xs">
                      <Stethoscope className="w-4 h-4 text-sky-500 shrink-0" />
                      <span>Veterinary Clinic & Hospital (Facility-wide)</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 bg-sky-500/10 border border-sky-500/20 p-2.5 rounded-xl leading-relaxed">
                      <strong>Role Policy:</strong> As a Veterinarian, this staff member provides medical examinations, treatments, and clinical supervision across all sanctuary animals. They <strong>cannot be assigned to specific animals or enclosures</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {resolveAssignedFacilities(detailStaff).map((fac, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px] flex items-center space-x-1"
                      >
                        <Building2 className="w-3 h-3 text-emerald-500" />
                        <span>{fac}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Security info */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-emerald-950/30 border border-slate-100 dark:border-emerald-900/30 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-emerald-500" />
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">Security Access</p>
                    <p className="text-[10px] text-slate-400">
                      {detailStaff.mustChangePassword ? 'Temporary password active (Change required)' : 'Active permanent password set'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const staff = detailStaff;
                    setDetailStaff(null);
                    onOpenCredentials(staff);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs cursor-pointer"
                >
                  Credentials
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100 dark:border-emerald-950/70">
              {detailStaff.role === 'keeper' && (
                <button
                  type="button"
                  onClick={() => {
                    const staff = detailStaff;
                    setDetailStaff(null);
                    onOpenReassign(staff);
                  }}
                  className="px-4 py-2 bg-slate-100 dark:bg-emerald-950 hover:bg-slate-200 dark:hover:bg-emerald-900/60 text-slate-800 dark:text-slate-200 rounded-xl font-bold text-xs cursor-pointer flex items-center space-x-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Reassign / Allocate</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setDetailStaff(null)}
                className="px-4 py-2 bg-[#059669] hover:bg-[#047857] text-white rounded-xl font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
