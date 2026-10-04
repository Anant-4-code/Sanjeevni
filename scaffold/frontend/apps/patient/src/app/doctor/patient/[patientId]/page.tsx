"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function DoctorPatientIndexPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.patientId as string;

  useEffect(() => {
    if (patientId) {
      let targetTab = "timeline";
      try {
        const savedTab = localStorage.getItem(`doctor_last_tab_${patientId}`);
        const validTabs = ["timeline", "crm", "vault", "ocr-xray", "prescribe", "soap", "refills"];
        if (savedTab && validTabs.includes(savedTab)) {
          targetTab = savedTab;
        }
      } catch (e) {
        // Fallback to timeline if localStorage access fails
      }
      router.replace(`/doctor/patient/${patientId}/${targetTab}`);
    }
  }, [patientId, router]);

  return null;
}