import { jsPDF } from "jspdf";
import fs from "fs";
import path from "path";

const outPath = path.resolve("docs/platform-status-report.pdf");
fs.mkdirSync(path.dirname(outPath), { recursive: true });

const doc = new jsPDF({ unit: "pt", format: "a4" });
const pageW = doc.internal.pageSize.getWidth();
const pageH = doc.internal.pageSize.getHeight();
const margin = 48;
const contentW = pageW - margin * 2;
let y = margin;

function ensureSpace(h = 40) {
  if (y + h > pageH - margin) {
    doc.addPage();
    y = margin;
  }
}

function title(text) {
  ensureSpace(50);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(20, 43, 74);
  doc.text(text, margin, y);
  y += 26;
}

function subtitle(text) {
  ensureSpace(30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(80);
  const lines = doc.splitTextToSize(text, contentW);
  doc.text(lines, margin, y);
  y += lines.length * 14 + 8;
}

function heading(text) {
  ensureSpace(30);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(20, 43, 74);
  doc.text(text, margin, y);
  y += 18;
}

function subheading(text) {
  ensureSpace(24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(30, 41, 59);
  doc.text(text, margin, y);
  y += 14;
}

function para(text) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.8);
  doc.setTextColor(40);
  const lines = doc.splitTextToSize(text, contentW);
  for (const line of lines) {
    ensureSpace(14);
    doc.text(line, margin, y);
    y += 13;
  }
  y += 4;
}

function bullet(text) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.6);
  doc.setTextColor(40);
  const lines = doc.splitTextToSize(text, contentW - 14);
  for (let i = 0; i < lines.length; i++) {
    ensureSpace(13);
    if (i === 0) doc.text("•", margin, y);
    doc.text(lines[i], margin + 12, y);
    y += 12.5;
  }
  y += 2;
}

function footer() {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text("Genzura – Platform Status & How It Works", margin, pageH - 24);
    doc.text(`Page ${i} of ${pages}`, pageW - margin, pageH - 24, { align: "right" });
  }
}

// Cover/header
doc.setFillColor(20, 43, 74);
doc.rect(0, 0, pageW, 10, "F");
title("Genzura Platform – Status & How It Works");
subtitle("Report generated: 2026-11-15. This document summarizes the features currently implemented in the Genzura workspace and explains how they work (based on the current application, Supabase integration, and migrations in this repository).");

heading("1. Overview");
para("Genzura is a church property and rental management web application. It provides portals for Administrators, Accountants, and Tenants to manage properties/spaces, tenants, rental agreements, invoices, payments, receipts/EBM references, expenses, reports, and settings.");
subheading("Technology & architecture");
bullet("Frontend: Next.js App Router, TypeScript, Tailwind CSS, shadcn-style UI, Lucide icons, Recharts, React Hook Form + Zod, next-themes. Currency formatted as RWF.");
bullet("Backend/data: Supabase (PostgreSQL, Auth, Storage, RLS). The app uses @supabase/supabase-js and @supabase/ssr. SQL migrations are versioned in supabase/migrations with a consolidated script in supabase/all migration.sql.");
bullet("Data flow: client reads are fetched from Supabase into a typed app data shape (respecting RLS). Mutations are performed via Supabase client operations and/or secure server actions/RPCs, followed by data refresh.");
bullet("Environment: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, and server-only SUPABASE_SERVICE_ROLE_KEY (used for admin provisioning/management actions). Secrets are not exposed to the browser.");

heading("2. Authentication, Roles & Access Control");
subheading("Authentication");
bullet("Users sign in with Supabase Auth (email/password). Login, forgot/reset password, callback, and sign-out flows are wired to Supabase.");
bullet("Middleware refreshes sessions and enforces route protection and role-based redirects.");
subheading("Roles and portals");
bullet("Application roles: admin, accountant, tenant (stored in public.user_roles per organization). A managed/display role (e.g. Administrator, Accountant, Property Manager, Viewer, Tenant) is stored for admin-assigned labeling.");
bullet("Portal homes: /admin/dashboard, /accountant/dashboard, /tenant/dashboard. Users without a valid role are blocked from portal access; cross-portal access is redirected to the correct portal.");
subheading("How it works");
bullet("On navigation, middleware checks authentication and resolves the user’s role, redirecting unauthenticated users to login and authenticated users to their allowed portal.");
bullet("Row Level Security (RLS) policies in the database restrict data access by role and tenant ownership (linked tenant). Server-side admin actions use the service role only after verifying the caller is an admin.");

heading("3. Property & Space Management");
bullet("Buildings, floors, and spaces (rooms/units) can be managed with property/location context (building/floor/room). Spaces have codes/names, categories, rent defaults, and occupancy/status information.");
bullet("Property data is stored in normalized tables (organizations, buildings, floors, spaces) and surfaced in the UI with filtering and detail views.");
subheading("How it works");
bullet("Admin/property workflows create and update property records in Supabase. Space occupancy is reflected based on agreement/rental state (e.g. occupied/vacant handling in agreement flows) and can be used in dashboards/metrics.");

heading("4. Tenant Management");
subheading("Tenant records");
bullet("Tenants can be created and edited with details such as type (individual/company), name/contact, email, phone, address/IDs, assigned building/floor/room, and monthly rent (RWF).");
bullet("Tenant directory and detail views show tenant information and related rentals/agreements/invoices/payments context (as available and permitted).");
subheading("Tenant login account creation");
bullet("When creating a tenant, an admin can optionally create a tenant login account by setting an initial password.");
subheading("How it works");
bullet("Tenant data is stored in public.tenants (including monthly_rent and location fields). A secure server action (admin-only, service role) can: create an auto-confirmed Supabase Auth user, ensure a profile, assign the tenant role in user_roles, and link the tenant record via tenants.linked_user_id. This enables the tenant to sign in and access only their own data under RLS.");
bullet("Tenant monthly rent is stored on the tenant and used as the default rent when creating agreements (and therefore flows into agreement line amounts and invoices generated from them).");

heading("5. Rental Agreements");
bullet("Agreements link a tenant to rented space(s)/room(s), define rental period (start/end), terms/notes, and monthly rent amounts (per line/space).");
bullet("The agreement form no longer requires selecting only 'open/vacant' spaces; spaces can be selected for the tenant (availability/conflicts are enforced by database constraints where applicable).");
subheading("How it works");
bullet("Creating/updating agreements writes to rental_agreements and agreement_spaces and updates related space occupancy state as defined by the service logic. Agreement creation includes required billing/payment day fields.");
bullet("Line-item monthly rent can default from the tenant’s stored monthly rent, ensuring the agreed rent is captured and carried into invoicing.");

heading("6. Invoices & Billing");
bullet("Invoices are generated for rental agreements/periods and include line items, totals, due dates/status, and balances. Monthly invoice generation is supported via database/RPC logic designed to be idempotent and scheduler-ready.");
subheading("How it works");
bullet("Invoice records and items are stored in invoices/invoice_items. Amounts are derived from agreement/space rent data; invoice totals/balances are recalculated using financial integrity logic/RPCs. The UI provides invoice listing, detail views, and generation workflows (subject to available data/permissions).");

heading("7. Payments, Proof Submission & Verification");
subheading("Payment recording and states");
bullet("Payments support methods such as mobile money, bank transfer, cash, and others (as configured). Payment records track status (e.g. pending/under review/successful/failed/cancelled), amounts, references, and verification metadata.");
subheading("Tenant payment proof (bank transfer)");
bullet("Tenants can submit bank transfer/payment proof (including image/PDF upload) from the tenant Pay flow. Submissions are recorded as pending/under review until verified.");
subheading("Accountant/admin verification");
bullet("Staff can review submitted proofs, approve/verify or reject payments, and perform auditable corrections according to financial safeguards (no silent edits/deletes of confirmed payments).");
subheading("How it works");
bullet("Proof files are uploaded to Supabase Storage (e.g. payment-proofs bucket) and referenced on the payment/submission. Database/RPC functions (such as verify/correct/recalculate flows) enforce authorization and update invoice balances/statuses. RLS and storage policies restrict access so tenants only see/submit their own allowed data while staff manage verification.");

heading("8. Receipts & EBM References");
bullet("Payment receipts are represented for confirmed/recorded payments and can be viewed in receipts/payment views. EBM (fiscal) references/documents are stored as external references/attachments only (not generated/fabricated by the system).");
subheading("How it works");
bullet("Receipt/EBM-related records are stored in dedicated tables (e.g. receipts/ebm_records) and linked to payments/invoices/tenants where applicable. Access is controlled by RLS and private storage/signed-URL patterns for sensitive documents.");

heading("9. Documents & PDF Downloads");
bullet("Download buttons for receipts and rental invoices generate real PDF files in the browser.");
subheading("How it works");
bullet("Client-side PDF generation (jsPDF) builds receipt/invoice PDFs from current record data (organization, tenant, invoice/payment details, line items, totals, and verification/status). PDFs are downloaded directly (e.g. receipt-<ref>.pdf, invoice-<number>.pdf). CSV exports exist in relevant areas such as receipt/reconciliation/reporting where provided.");

heading("10. User & Access Management (Admin)");
bullet("Admins can view and manage user accounts: create users directly (auto-confirmed with initial password) or invite by email, edit user details/roles/status, and delete users (with safeguards such as preventing self-deletion).");
bullet("Tenant-role accounts for portal access can be provisioned through tenant creation (linked tenant) or admin workflows, with roles/permissions reflected in the UI.");
subheading("How it works");
bullet("Secure server actions validate that the caller is an admin, then use the Supabase Admin API/service role for Auth operations and manage profiles/roles in the database. The admin UI loads managed users via secure server-backed actions and refreshes after mutations.");

heading("11. Dashboards, Reports & Settings");
bullet("Role-specific dashboards present key metrics (occupancy, collections/outstanding, overdue items, recent activity/payments) derived from application data.");
bullet("Reporting views provide summaries/exports (e.g. CSV where implemented) and financial/operational insights based on stored records.");
bullet("Organization and application settings (billing/invoicing/penalty/payment/EBM-related configuration as modeled) are persisted and used by relevant workflows.");
subheading("How it works");
bullet("Metrics and charts compute from the fetched/mapped dataset and domain calculations. Settings are stored in organization/settings tables and read into the app state for consistent behavior.");

heading("12. Data, Security & Operations Notes");
bullet("All application tables are designed for RLS-based access control, with trusted helper functions and constraints to protect financial integrity (e.g. verified-only balance impact, safeguards on confirmed payments, idempotent invoice generation, append/audit patterns where implemented).");
bullet("Storage buckets for documents/proofs/receipts/EBM/expenses are private; access should be granted via policies and signed URLs for confidential files.");
subheading("Operational prerequisites");
bullet("Configure .env.local from .env.example (Supabase URL/publishable key and server-only service role key as needed).");
bullet("Apply database migrations (supabase/all migration.sql or versioned files in supabase/migrations) and configure Supabase Auth redirect URLs.");
bullet("Provision an initial organization, admin user, and role assignments; link tenant users to tenant records for tenant portal access. End-to-end validation across roles/tenants is recommended in the target Supabase project.");

para("End of report.");

footer();

const buffer = Buffer.from(doc.output("arraybuffer"));
fs.writeFileSync(outPath, buffer);
console.log(outPath);
