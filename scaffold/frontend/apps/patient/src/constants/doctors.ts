export type DoctorInfo = {
  id: string;
  name: string;
  specialty: string;
  category: string; // e.g. "Neurosurgery", "Cardiology", "Internal Medicine", "Neurology", "Orthopedics", "Endocrinology"
  hospital: string;
  phone?: string;
  available_hours?: string;
  avatar_url?: string;
  is_lead?: boolean;
};

export const AVAILABLE_DOCTORS: DoctorInfo[] = [
  {
    id: "doc-1",
    name: "Dr. G. Mithun",
    specialty: "Consultant Neuro Surgeon",
    category: "Neurosurgery",
    hospital: "Manikanta Neuro Centre, Kakaji Colony",
    phone: "+91 99899 85777",
    available_hours: "Mon - Sat: 10:00 AM - 02:00 PM, 06:00 PM - 09:00 PM",
    avatar_url: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&q=80",
    is_lead: true,
  },
  {
    id: "doc-2",
    name: "Dr. Rajesh Rai",
    specialty: "Chief Neurologist & Stroke Specialist",
    category: "Neurology",
    hospital: "Yogana Super Speciality Hospital",
    phone: "+91 98450 12345",
    available_hours: "Mon - Fri: 09:00 AM - 01:00 PM",
    avatar_url: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&q=80",
  },
  {
    id: "doc-3",
    name: "Dr. Ananya Sharma",
    specialty: "Senior Physician & Internal Medicine",
    category: "Internal Medicine",
    hospital: "Apollo Clinics & Diagnostic Desk",
    phone: "+91 91234 56780",
    available_hours: "Mon - Sat: 08:30 AM - 04:00 PM",
    avatar_url: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&q=80",
  },
  {
    id: "doc-4",
    name: "Dr. Vikram Patel",
    specialty: "Cardiologist & Preventive Heart Care",
    category: "Cardiology",
    hospital: "Fortis Escorts Heart Institute",
    phone: "+91 97890 54321",
    available_hours: "Tue - Sun: 11:00 AM - 05:00 PM",
    avatar_url: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&q=80",
  },
  {
    id: "doc-5",
    name: "Dr. Sandeep Deshmukh",
    specialty: "Senior Orthopedic & Joint Replacement Surgeon",
    category: "Orthopedics",
    hospital: "Max Super Speciality Hospital",
    phone: "+91 98112 34567",
    available_hours: "Mon - Sat: 11:00 AM - 03:00 PM",
    avatar_url: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&q=80",
  },
  {
    id: "doc-6",
    name: "Dr. Priya Varma",
    specialty: "Consultant Diabetologist & Endocrinologist",
    category: "Endocrinology & Diabetes",
    hospital: "Medanta Medicity Specialty Clinics",
    phone: "+91 98765 43210",
    available_hours: "Mon - Fri: 09:30 AM - 02:30 PM",
    avatar_url: "https://images.unsplash.com/photo-1594824813629-d04b9eb970b8?w=150&q=80",
  },
];
