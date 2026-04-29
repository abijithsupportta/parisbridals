/**
 * StaffForm Component
 *
 * Two-column layout form for creating/editing staff members.
 * Matches ProductForm layout patterns: left column for main fields,
 * right column for role/branch/status, sticky action bar.
 *
 * Features:
 * - Indian phone number validation with live formatting
 * - Password min/max limits (6–72) with strength indicator
 * - Inline field-level error messages
 * - useCallback for handlers to avoid unnecessary re-renders
 *
 * @component
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Eye, EyeOff, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/stores";
import { useCreateStaff, useUpdateStaff, useSimpleBranches as useBranches } from "@/hooks";
import type { StaffWithBranch, StaffRole } from "@/domain/types/branch";

interface StaffFormProps {
  staff?: StaffWithBranch;
}

const roleOptions: { value: StaffRole; label: string; description: string }[] = [
  { value: "admin", label: "Admin", description: "Full access to all features" },
  { value: "manager", label: "Manager", description: "Can manage products, orders & staff" },
  { value: "staff", label: "Staff", description: "View-only access + order operations" },
];

const roleColors: Record<StaffRole, string> = {
  super_admin: "bg-purple-100 text-purple-700 border-purple-200",
  admin: "bg-red-100 text-red-700 border-red-200",
  manager: "bg-amber-100 text-amber-700 border-amber-200",
  staff: "bg-blue-100 text-blue-700 border-blue-200",
};

// ── Validation helpers ───────────────────────────────────────────────
const INDIAN_PHONE_REGEX = /^(?:\+91[\s-]?)?(?:0)?[6-9]\d{9}$/;
const PASSWORD_MIN = 6;
const PASSWORD_MAX = 72;

function validatePhone(phone: string): string | null {
  if (!phone) return null; // phone is optional
  if (!INDIAN_PHONE_REGEX.test(phone.replace(/\s/g, ''))) {
    return "Enter a valid Indian phone number (e.g. +91 9876543210)";
  }
  return null;
}

function getPasswordStrength(password: string): { level: number; label: string; color: string } {
  if (!password) return { level: 0, label: "", color: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { level: 1, label: "Weak", color: "bg-red-500" };
  if (score <= 2) return { level: 2, label: "Fair", color: "bg-amber-500" };
  if (score <= 3) return { level: 3, label: "Good", color: "bg-blue-500" };
  return { level: 4, label: "Strong", color: "bg-emerald-500" };
}

export default function StaffForm({ staff }: StaffFormProps) {
  const router = useRouter();
  const isEdit = !!staff;
  const { showError } = useAppStore();
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const { branches, isLoading: isBranchesLoading } = useBranches();

  const activeBranches = useMemo(
    () => branches.filter((b: any) => b.is_active !== false),
    [branches]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState({
    name: staff?.name || "",
    email: staff?.email || "",
    phone: staff?.phone || "",
    password: "",
    role: (staff?.role || "staff") as StaffRole,
    branch_id: staff?.branch_id || "",
    is_active: staff?.is_active ?? true,
  });

  // Set default branch when branches load (create mode only)
  useEffect(() => {
    if (!isEdit && !formData.branch_id && activeBranches.length > 0) {
      setFormData((prev) => ({ ...prev, branch_id: activeBranches[0].id }));
    }
  }, [activeBranches, isEdit, formData.branch_id]);

  // ── Field change handler ─────────────────────────────────────────
  const updateField = useCallback(
    (field: string, value: string | boolean) => {
      setFormData((prev) => ({ ...prev, [field]: value }));

      // Clear field error when user starts typing
      if (fieldErrors[field]) {
        setFieldErrors((prev) => ({ ...prev, [field]: null }));
      }
    },
    [fieldErrors]
  );

  // ── Blur handler for live field validation ──────────────────────
  const handleBlur = useCallback(
    (field: string) => {
      setTouched((prev) => ({ ...prev, [field]: true }));

      if (field === "phone") {
        setFieldErrors((prev) => ({ ...prev, phone: validatePhone(formData.phone) }));
      }
      if (field === "password" && !isEdit) {
        let err: string | null = null;
        if (formData.password.length > 0 && formData.password.length < PASSWORD_MIN) {
          err = `Password must be at least ${PASSWORD_MIN} characters`;
        } else if (formData.password.length > PASSWORD_MAX) {
          err = `Password must not exceed ${PASSWORD_MAX} characters`;
        }
        setFieldErrors((prev) => ({ ...prev, password: err }));
      }
      if (field === "name" && !formData.name.trim()) {
        setFieldErrors((prev) => ({ ...prev, name: "Name is required" }));
      }
      if (field === "email") {
        if (!formData.email.trim()) {
          setFieldErrors((prev) => ({ ...prev, email: "Email is required" }));
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          setFieldErrors((prev) => ({ ...prev, email: "Enter a valid email address" }));
        } else {
          setFieldErrors((prev) => ({ ...prev, email: null }));
        }
      }
    },
    [formData, isEdit]
  );

  // Password strength (memoized)
  const passwordStrength = useMemo(
    () => getPasswordStrength(formData.password),
    [formData.password]
  );

  // ── Submit handler ───────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    setLoading(true);
    setError("");

    // Full validation pass
    const errors: Record<string, string | null> = {};
    if (!formData.name.trim()) errors.name = "Name is required";
    if (!formData.email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      errors.email = "Enter a valid email address";
    if (!isEdit) {
      if (formData.password.length < PASSWORD_MIN)
        errors.password = `Password must be at least ${PASSWORD_MIN} characters`;
      else if (formData.password.length > PASSWORD_MAX)
        errors.password = `Password must not exceed ${PASSWORD_MAX} characters`;
    }
    if (formData.phone) {
      const phoneErr = validatePhone(formData.phone);
      if (phoneErr) errors.phone = phoneErr;
    }
    if (!formData.branch_id) errors.branch_id = "Branch is required";

    const hasErrors = Object.values(errors).some(Boolean);
    if (hasErrors) {
      setFieldErrors(errors);
      // Mark all as touched so errors show
      setTouched({ name: true, email: true, password: true, phone: true, branch_id: true });
      const firstError = Object.values(errors).find(Boolean);
      if (firstError) showError(firstError);
      setLoading(false);
      return;
    }

    try {
      if (isEdit && staff) {
        await updateStaff.mutateAsync({
          id: staff.id,
          data: {
            name: formData.name,
            email: formData.email,
            phone: formData.phone || undefined,
            role: formData.role,
            branch_id: formData.branch_id,
            is_active: formData.is_active,
          },
        });
      } else {
        await createStaff.mutateAsync({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone || undefined,
          role: formData.role,
          branch_id: formData.branch_id,
        });
      }

      router.push("/dashboard/staff");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  }, [formData, isEdit, staff, createStaff, updateStaff, router, showError]);

  const isFormReady = !isBranchesLoading;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push("/dashboard/staff")}
          className="w-9 h-9 border-slate-200 text-slate-500 hover:text-slate-900 bg-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {isEdit ? "Edit Staff Member" : "Add Staff Member"}
          </h1>
          <p className="text-sm text-slate-500">
            {isEdit
              ? "Update staff details and role assignment"
              : "Create a new staff account with login credentials"}
          </p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* ═══ Two-column layout ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT COLUMN (2/3) ────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Personal Information
            </h3>

            {/* Name field */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Full Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                onBlur={() => handleBlur("name")}
                required
                placeholder="e.g., John Doe"
                className={`h-11 border-slate-200 focus:border-slate-900 text-base ${
                  touched.name && fieldErrors.name ? "border-red-300 focus:border-red-500" : ""
                }`}
                autoFocus
              />
              {touched.name && fieldErrors.name && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fieldErrors.name}
                </p>
              )}
            </div>

            {/* Email field */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Email Address <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
                onBlur={() => handleBlur("email")}
                required
                placeholder="staff@parisbridals.com"
                className={`h-11 border-slate-200 focus:border-slate-900 text-base ${
                  touched.email && fieldErrors.email ? "border-red-300 focus:border-red-500" : ""
                }`}
              />
              {touched.email && fieldErrors.email ? (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fieldErrors.email}
                </p>
              ) : (
                <p className="text-xs text-slate-400">
                  This will be their login email
                </p>
              )}
            </div>

            {/* Phone field */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Phone Number
              </label>
              <Input
                value={formData.phone}
                onChange={(e) => {
                  // Allow only digits, +, spaces, and hyphens
                  const cleaned = e.target.value.replace(/[^\d+\s-]/g, '');
                  // Count actual digits only (exclude +, spaces, hyphens)
                  const digitCount = cleaned.replace(/\D/g, '').length;
                  // Max 12 digits total: country code (91) + 10-digit mobile
                  if (digitCount > 12) return;
                  updateField("phone", cleaned);
                }}
                onBlur={() => handleBlur("phone")}
                placeholder="+91 9876543210"
                maxLength={14}
                className={`h-11 border-slate-200 focus:border-slate-900 text-base ${
                  touched.phone && fieldErrors.phone ? "border-red-300 focus:border-red-500" : ""
                }`}
              />
              {touched.phone && fieldErrors.phone ? (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fieldErrors.phone}
                </p>
              ) : formData.phone && !fieldErrors.phone && touched.phone ? (
                <p className="text-xs text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Valid phone number
                </p>
              ) : (
                <p className="text-xs text-slate-400">
                  Indian mobile number (e.g. +91 9876543210)
                </p>
              )}
            </div>
          </div>

          {/* Login Credentials (create only) */}
          {!isEdit && (
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  Login Credentials
                </h3>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => {
                      // Enforce max length at input level
                      if (e.target.value.length <= PASSWORD_MAX) {
                        updateField("password", e.target.value);
                      }
                    }}
                    onBlur={() => handleBlur("password")}
                    placeholder={`${PASSWORD_MIN}–${PASSWORD_MAX} characters`}
                    required
                    minLength={PASSWORD_MIN}
                    maxLength={PASSWORD_MAX}
                    className={`h-11 border-slate-200 focus:border-slate-900 text-base pr-10 ${
                      touched.password && fieldErrors.password ? "border-red-300 focus:border-red-500" : ""
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Password strength indicator */}
                {formData.password.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            i <= passwordStrength.level
                              ? passwordStrength.color
                              : "bg-slate-200"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className={`text-xs font-medium ${
                        passwordStrength.level <= 1 ? "text-red-600" :
                        passwordStrength.level <= 2 ? "text-amber-600" :
                        passwordStrength.level <= 3 ? "text-blue-600" :
                        "text-emerald-600"
                      }`}>
                        {passwordStrength.label}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formData.password.length}/{PASSWORD_MAX}
                      </p>
                    </div>
                  </div>
                )}

                {touched.password && fieldErrors.password ? (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.password}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400">
                    {PASSWORD_MIN}–{PASSWORD_MAX} characters. Use a mix of letters, numbers, and symbols.
                    <span className="block mt-1 font-medium text-amber-600">
                      Note: Passwords cannot be viewed after saving for security.
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN (1/3) ───────────────────────────────────── */}
        <div className="space-y-6">
          {/* Active Toggle */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Active Account
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Can log in and access the system
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  updateField("is_active", checked)
                }
                className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-slate-200"
              />
            </div>
          </div>

          {/* Role */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Role <span className="text-red-500">*</span>
            </h3>
            <div className="space-y-2">
              {roleOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.role === option.value
                      ? `${roleColors[option.value]} border-current`
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={formData.role === option.value}
                    onChange={() =>
                      updateField("role", option.value)
                    }
                    className="sr-only"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{option.label}</p>
                    <p className="text-xs opacity-75">{option.description}</p>
                  </div>
                  {formData.role === option.value && (
                    <div className="w-4 h-4 rounded-full bg-current flex items-center justify-center shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Branch */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Branch Assignment <span className="text-red-500">*</span>
            </h3>
            {isBranchesLoading ? (
              <div className="h-10 bg-slate-100 animate-pulse rounded-lg" />
            ) : (
              <Select
                value={formData.branch_id}
                onValueChange={(v) =>
                  updateField("branch_id", v)
                }
              >
                <SelectTrigger className="h-10 bg-white border-slate-200">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-slate-200 shadow-lg">
                  {activeBranches.map((b: any) => (
                    <SelectItem
                      key={b.id}
                      value={b.id}
                      className="hover:bg-slate-100 focus:bg-slate-100"
                    >
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Sticky Action Bar ═══ */}
      <div className="sticky bottom-0 z-10 -mx-8 px-8 py-4 bg-white/95 backdrop-blur-sm border-t border-slate-200">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/staff")}
            className="h-10 border-slate-200 text-slate-600 hover:text-slate-900"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={loading || !isFormReady}
            onClick={handleSubmit}
            className="h-10 px-6 bg-slate-900 text-white hover:bg-slate-800 font-semibold"
          >
            {loading
              ? "Saving..."
              : !isFormReady
              ? "Loading..."
              : isEdit
              ? "Save Changes"
              : "Create Staff Member"}
          </Button>
        </div>
      </div>
    </div>
  );
}
