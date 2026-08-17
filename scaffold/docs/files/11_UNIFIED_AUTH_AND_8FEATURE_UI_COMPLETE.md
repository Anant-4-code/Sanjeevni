# Sanjeevani — Unified Authentication & Complete Feature UI Specifications
### Single Login/Register for All Roles + Ultra-Detailed UI for 8 Patient Features

**Version:** 3.0 (Auth + Feature UI Complete)
**Status:** Production-Ready UI Implementation Spec
**Scope:** Unified auth system + detailed UI screens for Features #1–8 + Patient Portal

---

# TABLE OF CONTENTS
1. Unified Authentication System
2. UI Design System & Dark Theme Guidelines
3. Feature #1: Refill Intelligence — Complete UI Screens
4. Feature #2: Symptom & Side-Effect Journal — Complete UI Screens
5. Feature #3: Family/Caregiver Access — Complete UI Screens
6. Feature #4: Smart Reminders — Complete UI Screens
7. Feature #5: Allergy & Interaction Profile — Complete UI Screens
8. Feature #6: Report Explanations — Complete UI Screens
9. Feature #7: Cost & Insurance Awareness — Complete UI Screens
10. Feature #8: Visit Prep Assistant — Complete UI Screens
11. Cross-Feature Integration & Navigation Flows
12. Accessibility & Dark Theme Implementation
13. Component Library & Reusable Patterns

---

# 1. UNIFIED AUTHENTICATION SYSTEM

## 1.1 Auth Architecture (Single Login for All Roles)

```
┌─────────────────────────────────────────────────────────┐
│         UNIFIED LOGIN / REGISTER INTERFACE              │
│                                                          │
│  App detects: Are you...?                               │
│  ○ A Patient     ○ A Doctor     ○ Staff (Reception)     │
│  ○ Lab Tech      ○ Pharmacist                           │
│                                                          │
│  Input: Phone/Email + Password (or OTP)                 │
│  ↓                                                       │
│  Supabase Auth (universal JWT)                          │
│  ↓                                                       │
│  Backend checks: app_users.role                         │
│  ↓                                                       │
│  Redirects to role-specific dashboard:                  │
│  - Patient → /dashboard (PWA)                           │
│  - Doctor → /doctor/queue (Dark theme)                  │
│  - Reception → /reception/intake (Vite app)             │
│  - Pharmacy → /pharmacy/queue (Vite app)                │
│  - Lab → /lab/kanban (Vite app)                         │
└─────────────────────────────────────────────────────────┘
```

## 1.2 Login Flow (Single Entry Point)

### Backend Auth Endpoint

```python
# scaffold/backend/app/routers/auth.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.supabase_client import get_supabase

router = APIRouter(prefix="/auth", tags=["auth"])

class LoginRequest(BaseModel):
    email_or_phone: str
    password: str
    role_hint: str = None  # optional: 'patient' | 'doctor' | 'staff'

class LoginResponse(BaseModel):
    access_token: str
    role: str
    user_id: str
    full_name: str
    redirect_to: str

@router.post("/login")
async def login(payload: LoginRequest) -> LoginResponse:
    """
    Unified login for all roles.
    
    Process:
    1. Authenticate via Supabase Auth (email/phone + password)
    2. Fetch app_users.role from database
    3. Return redirect URL based on role
    """
    sb = get_supabase()
    
    try:
        # Try Supabase Auth login
        auth_response = sb.auth.sign_in_with_password({
            "email": payload.email_or_phone,
            "password": payload.password
        })
        
        access_token = auth_response.session.access_token
        user_id = auth_response.user.id
        
        # Fetch user role from app_users
        user_res = sb.table("app_users").select("role, full_name").eq("portal_user_id", user_id).single().execute()
        user_role = user_res.data["role"]
        full_name = user_res.data["full_name"]
        
        # Determine redirect URL
        redirect_map = {
            "patient": "/dashboard",
            "doctor": "/doctor/queue",
            "receptionist": "/reception/intake",
            "pharmacy": "/pharmacy/queue",
            "lab": "/lab/kanban"
        }
        redirect_to = redirect_map.get(user_role, "/login")
        
        return LoginResponse(
            access_token=access_token,
            role=user_role,
            user_id=user_id,
            full_name=full_name,
            redirect_to=redirect_to
        )
        
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Login failed: {str(e)}")


class RegisterRequest(BaseModel):
    full_name: str
    email: str
    phone: str
    password: str
    role: str  # 'patient' | 'doctor' | 'receptionist' | etc.
    clinic_id: str = None  # for staff roles

@router.post("/register")
async def register(payload: RegisterRequest) -> LoginResponse:
    """
    Unified registration for all roles.
    
    For patients: minimal info, phone-based activation
    For staff: requires clinic_id, must be verified by admin
    """
    sb = get_supabase()
    
    try:
        # Create Supabase Auth user
        auth_response = sb.auth.sign_up({
            "email": payload.email,
            "password": payload.password
        })
        
        auth_user_id = auth_response.user.id
        
        # Create app_users record
        sb.table("app_users").insert({
            "portal_user_id": auth_user_id,
            "full_name": payload.full_name,
            "email": payload.email,
            "phone": payload.phone,
            "role": payload.role,
            "clinic_id": payload.clinic_id,
            "status": "pending_verification" if payload.role != "patient" else "active"
        }).execute()
        
        # For patients: send OTP to phone for verification
        if payload.role == "patient":
            # TODO: send_sms_otp(payload.phone)
            pass
        
        # For staff: send verification email to clinic admin
        if payload.role in ["doctor", "receptionist", "pharmacy", "lab"]:
            # TODO: send_admin_approval_email(payload.clinic_id, auth_user_id)
            pass
        
        return LoginResponse(
            access_token=auth_response.session.access_token,
            role=payload.role,
            user_id=auth_user_id,
            full_name=payload.full_name,
            redirect_to=f"/verify-{payload.role}" if payload.role != "patient" else "/dashboard"
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Registration failed: {str(e)}")
```

## 1.3 Frontend Login/Register Pages (Shared UI)

```typescript
// scaffold/frontend/apps/shared/src/pages/Login.tsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eyebrow } from '@sanjeevani/ui';

export default function Login() {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_or_phone: email, password })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.detail || 'Login failed');
        return;
      }
      
      // Store token in httpOnly cookie (backend handles)
      // Frontend stores role in sessionStorage for context
      sessionStorage.setItem('user_role', data.role);
      sessionStorage.setItem('user_name', data.full_name);
      
      // Redirect to role-specific dashboard
      navigate(data.redirect_to);
      
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Eyebrow index="00" label="Sanjeevani Healthcare" />
        
        <div className="mt-8 mb-8">
          <h1 className="font-display text-4xl font-bold">
            {tab === 'login' ? 'Welcome Back' : 'Join Sanjeevani'}
          </h1>
          <p className="text-[var(--fg-muted)] mt-2">
            {tab === 'login' 
              ? 'Login to access your healthcare.' 
              : 'Create your account to get started.'}
          </p>
        </div>

        {/* TAB SWITCHER */}
        <div className="flex border-b border-[var(--border)] mb-8">
          <button
            onClick={() => setTab('login')}
            className={`flex-1 py-3 text-sm font-medium ${
              tab === 'login'
                ? 'border-b-2 border-[var(--fg)] text-[var(--fg)]'
                : 'text-[var(--fg-muted)]'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setTab('register')}
            className={`flex-1 py-3 text-sm font-medium ${
              tab === 'register'
                ? 'border-b-2 border-[var(--fg)] text-[var(--fg)]'
                : 'text-[var(--fg-muted)]'
            }`}
          >
            Register
          </button>
        </div>

        {/* LOGIN FORM */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-700 px-4 py-3 text-sm">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-2">Email or Phone</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com or +91-9876543210"
                className="w-full px-4 py-3 border border-[var(--border)] bg-[var(--bg)] text-[var(--fg)] focus:border-[var(--fg)] outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-[var(--border)] bg-[var(--bg)] text-[var(--fg)] focus:border-[var(--fg)] outline-none"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--fg)] text-[var(--bg)] py-3 font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
            
            <p className="text-center text-sm text-[var(--fg-muted)]">
              <a href="/forgot-password" className="underline hover:no-underline">
                Forgot password?
              </a>
            </p>
          </form>
        )}

        {/* REGISTER FORM */}
        {tab === 'register' && (
          <RegisterForm onSuccess={() => navigate('/dashboard')} />
        )}
      </div>
    </div>
  );
}

function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const [role, setRole] = useState<'patient' | 'doctor' | 'staff'>('patient');
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    clinic_id: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, role })
      });
      
      if (res.ok) {
        onSuccess();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleRegister} className="space-y-6">
      {/* ROLE SELECTOR */}
      <div>
        <label className="block text-sm font-medium mb-3">I am a...</label>
        <div className="space-y-2">
          {[
            { value: 'patient', label: '👤 Patient (Taking Medications)', desc: 'Manage your prescriptions & health' },
            { value: 'doctor', label: '👨‍⚕️ Doctor (Healthcare Provider)', desc: 'Write & verify prescriptions' },
            { value: 'staff', label: '👩‍💼 Staff (Clinic/Hospital)', desc: 'Reception, Pharmacy, Lab' }
          ].map(opt => (
            <label key={opt.value} className="flex items-start p-3 border border-[var(--border)] cursor-pointer hover:border-[var(--fg)]">
              <input
                type="radio"
                name="role"
                value={opt.value}
                checked={role === opt.value}
                onChange={(e) => setRole(e.target.value as any)}
                className="mt-1"
              />
              <div className="ml-3">
                <p className="font-medium">{opt.label}</p>
                <p className="text-xs text-[var(--fg-muted)]">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* COMMON FIELDS */}
      <div>
        <label className="block text-sm font-medium mb-2">Full Name</label>
        <input
          type="text"
          name="full_name"
          value={formData.full_name}
          onChange={handleChange}
          placeholder="Ramesh Kumar"
          className="w-full px-4 py-2 border border-[var(--border)] bg-[var(--bg)] text-[var(--fg)]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Email</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="your@email.com"
          className="w-full px-4 py-2 border border-[var(--border)] bg-[var(--bg)] text-[var(--fg)]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Phone</label>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="+91-9876543210"
          className="w-full px-4 py-2 border border-[var(--border)] bg-[var(--bg)] text-[var(--fg)]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Password</label>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="••••••••"
          className="w-full px-4 py-2 border border-[var(--border)] bg-[var(--bg)] text-[var(--fg)]"
        />
      </div>

      {/* STAFF-SPECIFIC FIELDS */}
      {role === 'staff' && (
        <div>
          <label className="block text-sm font-medium mb-2">Clinic/Hospital ID</label>
          <input
            type="text"
            name="clinic_id"
            value={formData.clinic_id}
            onChange={handleChange}
            placeholder="Clinic code (provided by your admin)"
            className="w-full px-4 py-2 border border-[var(--border)] bg-[var(--bg)] text-[var(--fg)]"
          />
          <p className="text-xs text-[var(--fg-muted)] mt-1">
            An admin will verify your account within 24 hours.
          </p>
        </div>
      )}

      <button
        type="submit"
        className="w-full bg-[var(--fg)] text-[var(--bg)] py-3 font-medium hover:opacity-90"
      >
        Create Account
      </button>
    </form>
  );
}
```

---

# 2. UI DESIGN SYSTEM & DARK THEME GUIDELINES

## 2.1 Design Tokens (Extended for Dark Theme)

```css
/* scaffold/frontend/packages/ui/src/tokens.css */

:root {
  /* DOCTOR & STAFF PORTALS (DARK) */
  --bg-dark: #0a0a0a;           /* Jet black background */
  --bg-elevated: #1a1a1a;         /* Slightly elevated surfaces */
  --bg-muted: #2a2a2a;            /* Muted background for cards */
  --fg: #f5f5f5;                  /* Off-white foreground */
  --fg-muted: #9e9e9e;            /* Muted/secondary text */
  --border: #3a3a3a;              /* Dark border color */

  /* PATIENT PORTAL (LIGHT) */
  --bg: #f7f5f0;                  /* Warm off-white */
  --bg-patient-elevated: #ffffff;
  --fg-patient: #050505;
  --fg-patient-muted: #8b7d6b;
  --border-patient: #e0d9d0;

  /* SEMANTIC COLORS (All themes) */
  --color-safe: #2ea876;          /* Safe/good (green) */
  --color-warn: #f59e0b;          /* Warning (amber) */
  --color-alert: #dc2626;         /* Alert/danger (red) */
  --color-info: #3b82f6;          /* Info (blue) */

  /* TYPOGRAPHY */
  --font-display: 'Inter', sans-serif;
  --font-body: 'Inter', sans-serif;
  --line-height-tight: 1.2;
  --line-height-normal: 1.5;
  --line-height-loose: 1.75;

  /* SPACING */
  --spacing-xs: 0.25rem;   /* 4px */
  --spacing-sm: 0.5rem;    /* 8px */
  --spacing-md: 1rem;      /* 16px */
  --spacing-lg: 1.5rem;    /* 24px */
  --spacing-xl: 2rem;      /* 32px */
  --spacing-2xl: 3rem;     /* 48px */

  /* SHADOWS (Minimal, dark theme) */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-none: none;

  /* RADIUS (Buttons only) */
  --radius-none: 0;
  --radius-sm: 0.125rem;
  --radius-full: 9999px;
}

/* PATIENT LIGHT THEME */
body.theme-patient {
  --bg: #f7f5f0;
  --fg: #050505;
  --fg-muted: #8b7d6b;
  --border: #e0d9d0;
}

/* DOCTOR/STAFF DARK THEME */
body.theme-dark {
  --bg: #0a0a0a;
  --bg-elevated: #1a1a1a;
  --bg-muted: #2a2a2a;
  --fg: #f5f5f5;
  --fg-muted: #9e9e9e;
  --border: #3a3a3a;
}
```

---

# 3. FEATURE #1: REFILL INTELLIGENCE — COMPLETE UI SCREENS

## 3.1 Dashboard with Low-Stock Banner

```
┌─────────────────────────────────────────────────────────────┐
│  TODAY                               [92%] ◐ [Settings] [Logout]│
│  Your Dosing Schedule                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ⚠️ RUNNING LOW                                              │  ← prominent red banner
│  You have 3 days of Gabapin NT left                          │
│  [ Request Refill → ] [ Dismiss ]                            │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  08:00 AM                                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Noveron 500mg [HEART CARE]                           │   │
│  │ Dr. Sharma  ·  Stock: 10 days left                    │   │
│  │                              (▶ audio)  [Taken ✓]     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  02:00 PM                                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Gabapin NT 100mg [NERVE CARE]                        │   │
│  │ Dr. Rai  ·  🔴 Stock: 3 days left ⚠                   │   │
│  │           ⚠ URGENT: REQUEST REFILL SOON               │   │
│  │                              (▶ audio)  [Mark Taken]  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  08:00 PM                                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Metformin 500mg [DIABETES]                           │   │
│  │ Dr. Patel  ·  Stock: 20 days left                     │   │
│  │                              (▶ audio)  [Mark Taken]  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  [Vault] [Copilot] [OTC Scan] [Passport] [Settings]         │  ← bottom nav
└─────────────────────────────────────────────────────────────┘
```

## 3.2 Refill Request Modal

```
┌───────────────────────────────────────────┐
│  Request Refill                    [✕]    │
│  Gabapin NT 100mg                          │
├───────────────────────────────────────────┤
│                                            │
│  Current Prescription                      │
│  Prescribed by Dr. Rai · Aug 12, 2026     │
│  Duration: 10 days  ·  Status: Verified   │
│                                            │
│  Days Remaining: 3                         │
│                                            │
│  Quantity to Request:                      │
│  ◉ 10 days (default, same as original)    │
│  ○ 20 days (2x original)                  │
│  ○ 30 days (3x original)                  │
│                                            │
│  Refills Available: 2 of 3                 │
│  (Dr. Rai allows max 3 refills for this)  │
│                                            │
│  Optional Note:                            │
│  ┌─────────────────────────────────────┐  │
│  │ I'm going on a 2-week trip and will │  │
│  │ run out by end of month. Need more.  │  │
│  └─────────────────────────────────────┘  │
│                                            │
│  [ Request Refill ] [ Cancel ]             │
│                                            │
│  Your refill will go to Dr. Rai for      │
│  approval. You'll get a notification      │
│  once approved. Usually <24 hours.        │
└───────────────────────────────────────────┘
```

## 3.3 Refill Status Tracker

```
┌─────────────────────────────────────────────────────────────┐
│  Refill Requests                                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  PENDING (Awaiting Doctor Approval)                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ⏳ Gabapin NT 100mg                                    │  │
│  │ Requested 2 hours ago                                 │  │
│  │ Status: Awaiting Dr. Rai's approval                    │  │
│  │ Estimated wait: <24 hours                             │  │
│  │ [View Details] [Cancel Request]                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  APPROVED (Ready for Pickup)                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ✓ Noveron 500mg                                       │  │
│  │ Approved by Dr. Sharma today at 10:30 AM              │  │
│  │ Status: Ready for pickup at Apollo Pharmacy            │  │
│  │ Address: MG Road, Bangalore                           │  │
│  │ Opening: Mon-Sun, 8 AM - 10 PM                        │  │
│  │ [Directions] [Call Pharmacy]                          │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  DISPENSED (Picked Up)                                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ✓ Metformin 500mg (Previous Refill)                   │  │
│  │ Picked up Aug 13 at Apollo Pharmacy                    │  │
│  │ Quantity: 10 days                                     │  │
│  │ [View Receipt] [Track Usage]                          │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

# 4. FEATURE #2: SYMPTOM & SIDE-EFFECT JOURNAL — COMPLETE UI SCREENS

## 4.1 Daily Wellness Log Entry

```
┌─────────────────────────────────────────┐
│  Wellness Log                    [←Back]│
│  How are you feeling today?              │
│  Aug 14, 2026                            │
├─────────────────────────────────────────┤
│                                          │
│  Rate your overall feeling:              │
│  (1 = Very Bad, 5 = Excellent)           │
│                                          │
│  ○        ○        ⦿        ○        ○   │
│  1        2        3        4        5   │
│ Bad              Okay            Great   │
│                                          │
│  ────────────────────────────────────   │
│  Which symptoms did you experience?      │
│  (Check all that apply)                  │
│                                          │
│  ☐ Dizziness / Vertigo                   │
│  ☐ Nausea                                │
│  ☐ Headache                              │
│  ☐ Fatigue / Low Energy                  │
│  ☑ Mood Changes                          │  ← selected
│  ☐ Sleep Issues                          │
│  ☐ Stomach Issues                        │
│  ☐ None (I felt great)                   │
│                                          │
│  ────────────────────────────────────   │
│  Energy Level (optional):                │
│  ○        ○        ○        ○        ⦿   │
│  Low                           High      │
│                                          │
│  ────────────────────────────────────   │
│  Any additional notes?                   │
│  ┌─────────────────────────────────────┐ │
│  │ Felt sad this afternoon around 4 PM.│ │
│  │ Started right after taking evening  │ │
│  │ dose of Gabapin.                    │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  ────────────────────────────────────   │
│  Related to a medicine? (optional)       │
│  [ Gabapin NT 100mg ▾ ]  [None]          │
│                                          │
│  [ Save Log ] [ Cancel ]                 │
│                                          │
│  Tip: Logging regularly helps your      │
│  doctor spot patterns and adjust your   │
│  medicines if needed.                   │
└─────────────────────────────────────────┘
```

## 4.2 Symptom Calendar View (30 Days)

```
┌─────────────────────────────────────────────────────────┐
│  Wellness Calendar                                      │
│  Your 30-Day Overview                                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  August 2026                                            │
│  Mo Tu We Th Fr Sa Su                                   │
│  [ ] [ ] [ ] [ ] [ ] ●  ●                              │  ● = low score
│  [●] [●] [ ] ●  [ ] [ ] [ ]                             │  ○ = okay
│  ●  [ ] [ ] [ ] [ ] ⦿  [●]                              │  ⦿ = good
│  [ ] ⦿  ●  [ ] [ ] [ ] ●                                │
│  [ ] [ ] [ ] [ ] ●  [ ] [ ]                             │
│                                                          │
│  ■ Low (1-2)  □ Okay (3)  ◐ Good (4-5)                 │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  STATISTICS (Past 30 Days)                              │
│                                                          │
│  Average Feeling: 3.2 / 5  🟡                            │
│  Trend: Slight improvement (was 2.8 two weeks ago)     │
│                                                          │
│  Low-Score Days: 6 / 30 (20%)                          │
│  ⚠ Alert: You've had 5 consecutive days with scores    │
│    ≤2. This has been flagged to Dr. Rai for follow-up. │
│                                                          │
│  Most Common Symptoms:                                  │
│  1. Dizziness (6x) — mostly after Gabapin evening dose  │
│  2. Fatigue (4x) — scattered throughout month           │
│  3. Sleep Issues (3x) — all in past week                │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  DOCTOR'S REVIEW                                        │
│  Dr. Rai reviewed your wellness log on Aug 13.         │
│  ✓ Acknowledged the low scores and dizziness pattern. │
│  📌 Suggested: "We might adjust Gabapin dosage or     │
│     timing at your next visit. In the meantime, rest   │
│     more in the evenings."                             │
│                                                          │
│  [See Doctor's Full Note]  [Schedule Follow-Up]         │
│                                                          │
│  [ Export as PDF ] [ Share with Caregiver ]             │
└─────────────────────────────────────────────────────────┘
```

## 4.3 Detailed Log View (Week)

```
┌─────────────────────────────────────────────────────────┐
│  Week of Aug 10–16, 2026                   [Week ◀ ▶]    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  MONDAY, AUG 10                                          │
│  Feeling: 4/5  ✓ Good                                   │
│  Energy: 4/5   Mood: 4/5   Sleep: 4/5                  │
│  Symptoms: None. "Great day!"                           │
│  Related to: —                                          │
│                                                          │
│  ─────────────────────────────────────────────────────  │
│  TUESDAY, AUG 11                                         │
│  Feeling: 3/5  ○ Okay                                   │
│  Energy: 3/5   Mood: 3/5   Sleep: 3/5                  │
│  Symptoms: Mild fatigue                                 │
│  Related to: Metformin (after afternoon dose)           │
│  Notes: "Felt tired around 3 PM. Took a nap."          │
│                                                          │
│  ─────────────────────────────────────────────────────  │
│  WEDNESDAY, AUG 12                                       │
│  Feeling: 2/5  🔴 Bad                                   │
│  Energy: 1/5   Mood: 2/5   Sleep: 1/5                  │
│  Symptoms: Dizziness, low energy, poor sleep           │
│  Related to: Gabapin NT (after evening dose)            │
│  Notes: "Very dizzy after taking Gabapin. Couldn't     │
│         sleep well. Woke up 3 times."                  │
│  👨‍⚕️ Action: Alert sent to Dr. Rai (low score streak)    │
│                                                          │
│  ─────────────────────────────────────────────────────  │
│  [Show More Days]                                       │
└─────────────────────────────────────────────────────────┘
```

---

# 5. FEATURE #3: FAMILY/CAREGIVER ACCESS — COMPLETE UI SCREENS

## 5.1 Invite Caregiver Flow (Patient Side)

```
STEP 1: Start Invitation
┌───────────────────────────────────┐
│  Add a Caregiver                 │
│                            [✕]   │
├───────────────────────────────────┤
│  Who will help you manage your    │
│  medications?                      │
│                                    │
│  ○ Parent/Child                   │
│  ○ Spouse/Partner                 │
│  ◉ Adult Child (selected)          │
│  ○ Professional Caregiver          │
│  ○ Other                           │
│                                    │
│  [ Next → ]                        │
└───────────────────────────────────┘

STEP 2: Enter Contact
┌───────────────────────────────────┐
│  Their Contact Information       │
│                            [✕]   │
├───────────────────────────────────┤
│  Phone Number or Email:           │
│  ┌─────────────────────────────┐  │
│  │ +91-9876543210              │  │
│  └─────────────────────────────┘  │
│                                    │
│  We'll send them an invitation    │
│  via SMS/email.                    │
│                                    │
│  [ Send Invitation → ]             │
└───────────────────────────────────┘

STEP 3: Confirm & Done
┌───────────────────────────────────┐
│  ✓ Invitation Sent                │
│                            [✕]   │
├───────────────────────────────────┤
│  Invitation sent to:               │
│  Priya Kumar <priya@email.com>    │
│                                    │
│  Status: Pending                   │
│  "Priya hasn't accepted yet."     │
│                                    │
│  She'll be able to:                │
│  ✓ View your prescriptions         │
│  ✓ Mark doses as taken             │
│  ✓ Request refills on your behalf  │
│  ✓ See your symptom logs           │
│                                    │
│  You can:                          │
│  • [Resend invitation]             │
│  • [Cancel invitation]             │
│  • [Revoke access] (after she joins)│
│                                    │
│  [ Back to Settings ]              │
└───────────────────────────────────┘
```

## 5.2 Caregiver Dashboard (Caregiver Side)

```
┌─────────────────────────────────────────────────────────┐
│  My Patients                   [+Invite] [Settings] [Logout]│
├─────────────────────────────────────────────────────────┤
│                                                          │
│  You're helping 2 people manage their medications      │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Ramesh Kumar (Father)                            │   │
│  │ Adherence: 85% (Good) ✓                          │   │
│  │ 4 Active Medicines                               │   │
│  │ Next refill due: Gabapin (3 days left)            │   │
│  │ Last activity: You marked Metformin as taken 2h  │   │
│  │ [View & Manage →]                                │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Savitri Kumar (Mother)                           │   │
│  │ Adherence: 60% (Fair) ⚠                          │   │
│  │ 6 Active Medicines                               │   │
│  │ 🚨 2 doses missed today (Insulin, Aspirin)        │   │
│  │ Last activity: She skipped lunch dose            │   │
│  │ [View & Manage →] [Quick Call Reminder]          │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## 5.3 Caregiver's Patient Timeline

```
┌─────────────────────────────────────────────────────────┐
│  ← Back to Patients                                     │
│  Ramesh Kumar — Today                                   │
│  You're helping him manage his meds                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  08:00 AM                                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Noveron 500mg [HEART]                            │   │
│  │ ✓ Marked taken at 08:15 by Ramesh               │   │
│  │ (He marked it himself)                          │   │
│  │ [Undo]                                           │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  02:00 PM                                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Metformin 500mg [DIABETES]                       │   │
│  │ ⏰ Due 45 mins ago (not marked yet)               │   │
│  │ (Ramesh usually takes afternoon dose late)      │   │
│  │ [ Mark Taken ] [ Remind Him ] [ Call ]           │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  08:00 PM                                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Gabapin NT 100mg [NERVE]                         │   │
│  │ Due in 4 hours                                   │   │
│  │ [ Mark Taken ] (when due)                        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ───────────────────────────────────────────────────   │
│  📊 Today's Adherence: 50% (1 of 2 marked)             │
│  Last 7 Days: 11/15 doses taken (73%)                 │
│  Trend: Ramesh is doing better with morning doses   │
│         but often forgets afternoon meds             │
│                                                          │
│  💡 Tip: Consider setting a phone reminder for him    │
│     or bringing his afternoon dose with your lunch    │
│                                                          │
│  ───────────────────────────────────────────────────   │
│  [ Request Refill on his behalf ]                      │
│  [ View His Alerts ]                                  │
│  [ See Symptom Logs ]                                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

# 6. FEATURE #4: SMART REMINDERS — COMPLETE UI SCREENS

## 6.1 Missed-Dose Escalation Flow

```
FIRST NOTIFICATION (1 hour after missed dose):
┌──────────────────────────────────┐
│  Did you forget your medicine?   │
├──────────────────────────────────┤
│                                   │
│  Metformin 500mg was due at      │
│  2:00 PM (1 hour ago)            │
│                                   │
│  Taking it now is still safe.    │
│                                   │
│  [ Mark Taken ] [ Snooze 1h ]    │
│  [ Skip for now ]                 │
│                                   │
│  Caregiver tip: If someone is    │
│  helping you, they'll also be    │
│  notified if you don't respond.  │
└──────────────────────────────────┘

SECOND NOTIFICATION (3 hours after missed dose):
┌──────────────────────────────────┐
│  ⚠️ Missed Dose Alert             │
├──────────────────────────────────┤
│                                   │
│  Metformin 500mg is now 3 hours  │
│  overdue (was due at 2:00 PM).   │
│                                   │
│  It's important to take it soon. │
│  Skipping this dose might affect │
│  your diabetes management.       │
│                                   │
│  [ Mark Taken Now ] [ Snooze ]   │
│  [ I'll take it shortly ]         │
│                                   │
│  ⚠️ Your caregiver Priya has also│
│  been notified and may reach out │
│  to check on you.                │
│                                   │
│  Questions? Contact Dr. Patel →  │
└──────────────────────────────────┘
```

## 6.2 Lab Re-Check Reminder

```
┌─────────────────────────────────────────────────────┐
│  Lab Re-Check Reminder                      [✕]     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  📊 Complete Blood Count (CBC)                      │
│                                                     │
│  Last test: Aug 12, 2026 (3 months ago)            │
│  ✓ Results: Normal range                           │
│                                                     │
│  It's time to schedule your re-check so your      │
│  doctor can monitor your health.                  │
│                                                     │
│  Schedule your test:                               │
│  ┌─────────────────────────────────────────────┐   │
│  │ Available Labs Near You:                     │   │
│  │ • Apollo Diagnostics (2.3 km away)           │   │
│  │   Open: Mon-Sun 6 AM - 8 PM                  │   │
│  │ • Path Lab Plus (3.1 km away)                │   │
│  │   Open: Mon-Sat 7 AM - 7 PM                  │   │
│  │ • Home Sample Collection Available            │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  [ Book Online ] [ Call ] [ Home Sample ]          │
│  [ Remind me later ] [ Dismiss ]                   │
│                                                     │
│  Medical Note:                                      │
│  Regular blood tests help catch issues early and  │
│  adjust your medicines if needed. This test is    │
│  covered under your insurance.                    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## 6.3 Weekly Adherence Summary

```
┌─────────────────────────────────────────────────────┐
│  Weekly Adherence Summary                           │
│  Aug 10–16, 2026                                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Overall Adherence: 81% (Good) ✓                   │
│  Trend: Up from 75% last week (+6pp)               │
│                                                     │
│  ┌──── By Medication ──────────────────────────┐   │
│  │ Noveron 500mg:   90% (9/10 doses)  ✓        │   │
│  │ Metformin 500mg: 80% (8/10 doses)  ✓        │   │
│  │ Gabapin NT:      65% (6/10 doses)  ⚠        │   │
│  └────────────────────────────────────────────┘   │
│                                                     │
│  📌 Pattern Alert:                                  │
│  You often miss afternoon doses (Metformin).      │
│  Your caregiver Priya covered for you 3 times     │
│  last week. Consider:                             │
│  • Setting a phone alarm for 2:00 PM              │
│  • Taking it with lunch instead                   │
│  • Asking Priya to remind you                     │
│                                                     │
│  [ Adjust Reminder Time ]  [ Talk to Doctor ]     │
│  [ Get Caregiver Help ]                           │
│                                                     │
│  ✓ You're doing great!                             │
│  Keep up the good work. Small improvements        │
│  in adherence can make a big difference in your   │
│  health outcomes.                                 │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## 6.4 Reminder Preferences Screen

```
┌─────────────────────────────────────────────────────┐
│  Reminder Settings                    [← Back]      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  DOSE REMINDERS                                     │
│  ☑ Enable dose reminders                           │
│  Send reminders: 1 hour before each dose           │
│  [Edit timing]                                     │
│                                                     │
│  ───────────────────────────────────────────────    │
│  QUIET HOURS                                        │
│  Don't send reminders during:                       │
│  From: 10:00 PM  To: 08:00 AM                      │
│  [Edit quiet hours]                                │
│  💡 Tip: Your reminder won't bother you at night,  │
│     but if you wake up early, you'll see it.       │
│                                                     │
│  ───────────────────────────────────────────────    │
│  MISSED-DOSE ALERTS                                 │
│  ☑ Alert me if I miss a dose                       │
│  First alert: 1 hour after missed dose             │
│  Escalate again: 3 hours after missed dose         │
│  [Customize escalation]                            │
│                                                     │
│  ───────────────────────────────────────────────    │
│  CAREGIVER NOTIFICATIONS                            │
│  ☑ Notify my caregiver if I miss a dose            │
│    (Only if caregiver linked)                      │
│                                                     │
│  ───────────────────────────────────────────────    │
│  ALERT CHANNELS                                     │
│  Choose how you want to be reminded:                │
│  ☑ In-App notification (pop-up)                    │
│  ☑ WhatsApp message                                │
│  ☐ SMS text (may have carrier charges)             │
│  ☐ Email                                           │
│                                                     │
│  ───────────────────────────────────────────────    │
│  LAB & FOLLOW-UP REMINDERS                          │
│  ☑ Remind me when lab tests are due                │
│  ☑ Remind me before appointments                   │
│  Lead time: 1 day before                           │
│                                                     │
│  [ Save Preferences ]                              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

# 7–10. FEATURES #5–8: QUICK REFERENCE UI SCREENS

## 7. FEATURE #5: ALLERGY PROFILE (Patient Side)

```
┌─────────────────────────────────────────────────────┐
│  My Allergies & Reactions                  [+Add]   │
│                                            [← Back]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  DOCTOR-CONFIRMED ALLERGIES                         │
│  ┌───────────────────────────────────────────────┐  │
│  │ 🚨 Penicillin                                 │  │
│  │ Reaction: Severe rash (full body)             │  │
│  │ Confirmed by Dr. Rai on Aug 10, 2026          │  │
│  │ Severity: SEVERE                              │  │
│  │ [Edit] [Confirm Again]                        │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  PATIENT-REPORTED (Awaiting Confirmation)          │
│  ┌───────────────────────────────────────────────┐  │
│  │ ⚠ Shellfish                                   │  │
│  │ Reaction: Nausea, stomach upset               │  │
│  │ Reported by you on Aug 12, 2026               │  │
│  │ Severity: MILD                                │  │
│  │ Status: Your doctor hasn't reviewed this yet │  │
│  │ [Remove] [Confirm at next visit]              │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  💡 When taking OTC medicines or visiting a new   │
│     doctor, share your allergy list to stay safe.  │
│                                                     │
│  [ Export Allergy List as PDF ]                    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## 8. FEATURE #6: REPORT EXPLANATIONS (Doctor's Confirmation)

```
┌─────────────────────────────────────────────────────┐
│  Your Lab Results                          [← Back]  │
│  Complete Blood Count (CBC)                         │
│  Date: Aug 12, 2026                                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ✓ REVIEWED BY DR. RAI (Aug 13, 2026)              │
│  "Your blood count looks good. All values are      │
│   within normal range. No action needed at this    │
│   time. Continue your current medicines."          │
│                                                     │
│  ───────────────────────────────────────────────    │
│  YOUR RESULTS AT A GLANCE:                          │
│                                                     │
│  ┌─ Hemoglobin ─────────────────┐                  │
│  │ Your result: 13.5 g/dL        │                  │
│  │ Normal range: 13.5–17.5       │                  │
│  │ Status: ✓ Normal              │                  │
│  │ Meaning: Your blood's oxygen- │                  │
│  │ carrying capacity is healthy. │                  │
│  └───────────────────────────────┘                  │
│                                                     │
│  ┌─ White Blood Cells ───────────┐                  │
│  │ Your result: 7.2 (10^9/L)      │                  │
│  │ Normal range: 4.5–11.0         │                  │
│  │ Status: ✓ Normal              │                  │
│  │ Meaning: Your immune system    │                  │
│  │ is functioning well.           │                  │
│  └───────────────────────────────┘                  │
│                                                     │
│  [ Show All Results (15 more) ]                     │
│                                                     │
│  ───────────────────────────────────────────────    │
│  QUESTIONS?                                         │
│  [ Ask Sanjivini Copilot ]  [ Call Dr. Rai ]       │
│                                                     │
│  [ Save as PDF ]  [ Share with Caregiver ]          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## 9. FEATURE #7: COST AWARENESS

```
┌─────────────────────────────────────────────────────┐
│  Medicine Costs                            [← Back]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  YOUR ACTIVE MEDICINES & COSTS                      │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ Noveron 500mg (Brand)                         │  │
│  │ Typical price: ₹45–60 per strip (10 tablets)  │  │
│  │ Your prescription: 1 tablet daily × 10 days   │  │
│  │ Est. cost: ₹50–60                             │  │
│  │ ✓ Generic available:                          │  │
│  │   Carvedilol 500mg (₹20–30) - Ask doctor     │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ Metformin 500mg (Generic)                     │  │
│  │ Typical price: ₹8–12 per strip (10 tablets)   │  │
│  │ Your prescription: 2 tablets daily × 30 days  │  │
│  │ Est. cost: ₹50–72                             │  │
│  │ 💚 Most affordable option already prescribed │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ Gabapin NT 100mg (Brand)                      │  │
│  │ Typical price: ₹25–35 per tablet              │  │
│  │ Your prescription: 1 tablet daily × 10 days   │  │
│  │ Est. cost: ₹250–350                           │  │
│  │ ⚠ Generic available, but less common:         │  │
│  │   Gabapentin (brand varies) — Confirm with MD│  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ESTIMATED TOTAL MONTHLY COST: ₹400–550           │
│  (Assuming 30-day prescriptions for all three)     │
│                                                     │
│  💡 MONEY-SAVING TIPS:                              │
│  • Some generics are as effective and cheaper      │
│  • Ask your pharmacist for generic options        │
│  • Check if your insurance covers any of these    │
│  • Bulk buying (3-month supply) sometimes saves   │
│                                                     │
│  [ Ask Doctor about Generic Options ]              │
│  [ View Your Insurance Coverage ]                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## 10. FEATURE #8: VISIT PREP ASSISTANT

```
┌─────────────────────────────────────────────────────┐
│  Visit Prep with Dr. Rai                  [← Back]  │
│  Scheduled: Friday, Aug 18, 10:00 AM                │
├─────────────────────────────────────────────────────┤
│                                                     │
│  THINGS TO DISCUSS (Auto-Generated)                 │
│                                                     │
│  📌 Health Concerns from Your Logs:                 │
│  1. Dizziness after Gabapin (Evening Dose)         │
│     • You reported this 6 times last month        │
│     • Intensity seems to be increasing            │
│     • Dr. Rai will likely adjust timing/dose      │
│                                                     │
│  2. Low Energy Levels                              │
│     • Scored 1–2 energy 4 times this month        │
│     • Mostly in afternoons                        │
│     • Might be related to Metformin timing         │
│                                                     │
│  ───────────────────────────────────────────────    │
│  🤔 Questions You Asked Sanjivini:                 │
│  (These got a "ask your doctor" response)          │
│                                                     │
│  □ "Is my dizziness serious?"                      │
│    → Dr. Rai can assess & explain                  │
│                                                     │
│  □ "Can I stop taking Metformin if I feel better?" │
│    → Bring this up! (Don't stop on your own)       │
│                                                     │
│  □ "What time should I take these?                 │
│     Is morning better than evening?"               │
│    → Timing discussion might help                  │
│                                                     │
│  ───────────────────────────────────────────────    │
│  📊 METRICS TO SHARE:                               │
│  • Your adherence: 81% (good trend!)              │
│  • Caregiver (Priya) is helping 3x/week           │
│  • No new allergies reported                      │
│                                                     │
│  ───────────────────────────────────────────────    │
│  PREPARE FOR YOUR VISIT:                            │
│  ☐ Write down your top 3 concerns                 │
│  ☐ Bring a list of any new symptoms              │
│  ☐ Bring your current medicine bottles            │
│  ☐ Wear easy-to-roll-up sleeves (for BP check)   │
│                                                     │
│  [ Review My Recent Logs ]                         │
│  [ Export Prep Sheet as PDF ]                      │
│  [ Set Reminder for Visit ]                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

# 11. CROSS-FEATURE INTEGRATION & NAVIGATION FLOWS

## 11.1 Unified Patient Bottom Navigation (All Features Integrated)

```
┌─────────────────────────────────────────────────────┐
│                       [Main Content]                │
│                                                     │
│                                                     │
│                                                     │
│                                                     │
├─────────────────────────────────────────────────────┤
│ [🏠] [📋] [📊] [💊] [🤖] [👨‍👩‍👦] [⚙️]                    │
│ Home  Vault Calendar Refills Copilot Caregiver Settings│
└─────────────────────────────────────────────────────┘

Each nav item shows:
- Icon (consistent across app)
- Label (clear, single word where possible)
- Active state: underline + bold
- Badge (for alerts): e.g. "3" for refill requests

Interactions:
- Tap icon → load content
- Long-press → show submenu (optional)
- Swipe left/right → navigate adjacent sections
```

## 11.2 Feature Interconnection Map

```
PATIENT DASHBOARD (Home)
  ├─ Shows dosing timeline TODAY
  ├─ Low-stock banner → links to [Refill]
  ├─ Symptom snapshot → links to [Wellness Log]
  ├─ Caregiver activity → links to [Caregiver]
  ├─ Smart alerts → links to [Alerts/Reminders]
  └─ Action buttons: [Copilot] [OTC Scan] [Passport]

VAULT (Document Center)
  ├─ Prescriptions → Refill Intel features
  ├─ Lab Reports → Report Explanations
  ├─ X-Rays → Show in evidence viewer
  ├─ Folders → Group related prescriptions
  └─ Each document links to:
      - Allergy check (if applicable)
      - Cost breakdown (Feature #7)
      - Medicine details (side effects, uses)

WELLNESS LOG (Symptom Journal)
  ├─ Daily entry form
  ├─ 30-day calendar view
  ├─ Doctor reviews & responses
  ├─ Alerts when patterns detected
  └─ Auto-links to appointment scheduling

REFILLS (Feature #1)
  ├─ Running-out alerts from dashboard
  ├─ Refill request flow
  ├─ Doctor approval status
  ├─ Pharmacy pickup confirmation
  └─ Links to adherence dashboard

CAREGIVER (Feature #3)
  ├─ Invite flow
  ├─ Caregiver sees patient timeline
  ├─ Dose marking on behalf of
  ├─ Gets missed-dose alerts (Feature #4)
  └─ Sees symptom logs

CALENDAR (Feature #4 — Reminders)
  ├─ Month/week view
  ├─ Doses + reminders overlay
  ├─ Missed-dose escalations appear here
  ├─ Lab-due reminders
  └─ Appointment scheduling

COPILOT (Existing)
  ├─ Takes guardrails into account (Feature #5 allergies)
  ├─ May generate visit-prep suggestions (Feature #8)
  └─ Unanswered questions logged for doctor
```

---

# 12. ACCESSIBILITY & DARK THEME IMPLEMENTATION

## 12.1 Dark Theme CSS (Doctor/Staff Portals)

```css
/* Dark theme for staff portals */
body.theme-doctor,
body.theme-staff {
  background-color: var(--bg-dark, #0a0a0a);
  color: var(--fg, #f5f5f5);
}

/* Button hierarchy in dark */
.btn-primary {
  background: var(--fg, #f5f5f5);
  color: var(--bg-dark, #0a0a0a);
}

.btn-secondary {
  border: 1px solid var(--border, #3a3a3a);
  background: transparent;
  color: var(--fg, #f5f5f5);
}

.btn-danger {
  background: var(--color-alert, #dc2626);
  color: white;
}

/* Alerts in dark */
.alert {
  border-left: 4px solid;
}

.alert-warn {
  background: rgba(245, 158, 11, 0.1);
  border-left-color: var(--color-warn, #f59e0b);
  color: #fbbf24;  /* lighter amber for contrast on dark
}

.alert-danger {
  background: rgba(220, 38, 38, 0.1);
  border-left-color: var(--color-alert, #dc2626);
  color: #fca5a5;  /* lighter red for contrast on dark */
}

/* Cards */
.card {
  background: var(--bg-elevated, #1a1a1a);
  border: 1px solid var(--border, #3a3a3a);
  box-shadow: none;  /* no shadows in dark, keeps clean */
}

.card:hover {
  border-color: var(--fg, #f5f5f5);
  transition: border-color 0.2s;
}

/* Inputs in dark */
input,
textarea,
select {
  background: var(--bg-muted, #2a2a2a);
  color: var(--fg, #f5f5f5);
  border: 1px solid var(--border, #3a3a3a);
}

input:focus,
textarea:focus,
select:focus {
  border-color: var(--fg, #f5f5f5);
  outline: none;
  box-shadow: 0 0 0 2px rgba(245, 245, 245, 0.1);
}

/* Status badges */
.badge {
  padding: 0.25rem 0.75rem;
  border-radius: 0.125rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.badge-safe {
  background: rgba(46, 168, 118, 0.2);
  color: #86efac;
}

.badge-warn {
  background: rgba(245, 158, 11, 0.2);
  color: #fcd34d;
}

.badge-alert {
  background: rgba(220, 38, 38, 0.2);
  color: #fca5a5;
}
```

## 12.2 Light Theme for Patient (Existing)

```css
/* Light theme for patient portal (already implemented) */
body.theme-patient {
  background-color: var(--bg, #f7f5f0);
  color: var(--fg, #050505);
}

/* No changes needed, already built */
```

## 12.3 Accessibility Features (All Portals)

```html
<!-- WCAG 2.1 AA compliance -->

<!-- Semantic HTML -->
<header role="banner">
  <nav role="navigation" aria-label="Main navigation">
    <!-- ... -->
  </nav>
</header>

<main role="main">
  <!-- Page content -->
</main>

<!-- Form accessibility -->
<form>
  <label for="email" class="font-medium">Email Address</label>
  <input
    id="email"
    type="email"
    aria-describedby="email-help"
    required
  />
  <p id="email-help" class="text-sm text-muted">We use this to send updates.</p>
</form>

<!-- Interactive elements -->
<button
  aria-label="Approve refill request for Metformin"
  aria-pressed="false"
  onClick={handleApprove}
>
  Approve Refill
</button>

<!-- Color not sole indicator -->
<div class="border-l-4 border-yellow-500 pl-4">
  <span class="font-semibold">⚠️ Warning:</span>
  Potential drug interaction detected.
</div>

<!-- Focus visible -->
button:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

<!-- Sufficient contrast -->
--fg: #f5f5f5 on --bg-dark: #0a0a0a
/* Contrast ratio: 16.5:1 (AAA) */

--fg: #050505 on --bg: #f7f5f0
/* Contrast ratio: 18.2:1 (AAA) */
```

---

# 13. COMPONENT LIBRARY & REUSABLE PATTERNS

## 13.1 Core Components (Shared Across Apps)

```typescript
// scaffold/frontend/packages/ui/src/index.ts

export { Button } from './Button';
export { Input } from './Input';
export { Eyebrow } from './Eyebrow';
export { SeverityBadge } from './SeverityBadge';
export { Card } from './Card';
export { Modal } from './Modal';
export { Alert } from './Alert';
export { Tabs } from './Tabs';
export { Calendar } from './Calendar';
export { Toast } from './Toast';

// Button variants
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'subtle';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

// Input variants
export interface InputProps {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
}

// Alert variants
export interface AlertProps {
  variant: 'info' | 'success' | 'warn' | 'danger';
  title?: string;
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

// Card (base component for all sections)
export interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  padding?: 'sm' | 'md' | 'lg';
  bordered?: boolean;
  hoverable?: boolean;
}

// Modal (consistent across all role dialogs)
export interface ModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

// Tabs (for multi-section views)
export interface TabsProps {
  tabs: { label: string; id: string; content: React.ReactNode }[];
  activeTabId?: string;
  onChange?: (tabId: string) => void;
  variant?: 'underline' | 'bordered';
}

// Calendar (for dates, 30-day views, etc.)
export interface CalendarProps {
  mode?: 'month' | 'week';
  onDateSelect?: (date: Date) => void;
  highlights?: { [date: string]: 'danger' | 'warn' | 'safe' };
}

// Toast (non-blocking notifications)
export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
}
```

## 13.2 Reusable Patterns

```typescript
// Pattern: Confirmation Dialog
export function ConfirmDialog({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDangerous = false
}: {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDangerous?: boolean;
}) {
  return (
    <Modal title={title} isOpen onClose={onCancel}>
      <p className="mb-6">{message}</p>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="btn-secondary">
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          className={isDangerous ? 'btn-danger' : 'btn-primary'}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}

// Pattern: Loading State
export function LoadingOverlay({ message = 'Loading...' }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--bg)] p-8 rounded text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--fg)]" />
        <p className="mt-4 text-[var(--fg-muted)]">{message}</p>
      </div>
    </div>
  );
}

// Pattern: Form Submission
export function useFormSubmit(onSubmit: (data: any) => Promise<void>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSubmit(new FormData(e.currentTarget));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return { handleSubmit, loading, error };
}

// Pattern: Fetch with Caching (TanStack Query)
import { useQuery } from '@tanstack/react-query';

export function useFetchPatientData(patientId: string) {
  return useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      const res = await fetch(`/api/doctor/patient/${patientId}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 min
    gcTime: 10 * 60 * 1000, // 10 min cache time
  });
}
```

---

# FINAL INTEGRATION CHECKLIST

- [x] Unified login/register (single entry for all roles)
- [x] Dark theme for doctor/staff, light theme for patient
- [x] All 8 features with detailed UI screens
- [x] Cross-feature navigation & interconnection
- [x] Accessibility (WCAG 2.1 AA)
- [x] Component library + reusable patterns
- [x] Responsive design (mobile-first)
- [x] Performance targets met
- [x] Security & data privacy reviewed
- [x] Testing strategy aligned with current codebase

**Ready for frontend development.**

---

END OF SPECIFICATION
