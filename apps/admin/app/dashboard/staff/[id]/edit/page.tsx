"use client";

import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import StaffForm from "@/components/admin/StaffForm";
import { useStaffMember } from "@/hooks";

export default function EditStaffPage() {
  const params = useParams();
  const staffId = params.id as string;
  const { staff, isLoading } = useStaffMember(staffId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading staff member...
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="p-12 text-center text-slate-500">
        Staff member not found.
      </div>
    );
  }

  return <StaffForm staff={staff} />;
}
