"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function DoctorPatientIndexPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.patientId as string;

  useEffect(() => {
    if (patientId) {
      router.replace(`/doctor/patient/${patientId}/timeline`);
    }
  }, [patientId, router]);

  return null;
}