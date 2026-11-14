import { z } from "zod";

const phoneRegex = /^(?:\+?250)?0?7[2389]\d{7}$/;

export const tenantSchema = z.object({
  type: z.enum(["individual", "company"]),
  name: z.string().min(2, "Enter the tenant or company name."),
  contactName: z.string().optional(),
  email: z.string().email("Enter a valid email address."),
  phone: z.string().regex(phoneRegex, "Enter a valid Rwandan phone number."),
  altPhone: z.string().optional(),
  nationalId: z.string().optional(),
  tin: z.string().optional(),
  companyReg: z.string().optional(),
  address: z.string().min(3, "Enter the tenant's address."),
  buildingId: z.string().optional(),
  floorId: z.string().optional(),
  roomNumber: z.string().optional(),
  roomNumbers: z.array(z.string()).optional(),
  rooms: z.array(z.object({ floorId: z.string().optional(), roomNumber: z.string().optional() })).optional(),
  monthlyRent: z.number().min(0, "Monthly rent cannot be negative.").optional(),
  roomsNeeded: z.number().min(1, "Enter at least one room.").optional(),
  createLoginAccount: z.boolean().optional(),
  loginPassword: z.string().optional(),
  notes: z.string().optional(),
}).superRefine((val, ctx) => {
  if (val.createLoginAccount) {
    if (!val.loginPassword || val.loginPassword.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["loginPassword"],
        message: "Set an initial password (at least 8 characters) for the tenant account.",
      });
    }
  }
});

export type TenantFormValues = z.infer<typeof tenantSchema>;

export const spaceSchema = z.object({
  buildingId: z.string().min(1, "Select a building."),
  floorId: z.string().min(1, "Select a floor."),
  code: z.string().min(2, "Enter a space code."),
  name: z.string().min(2, "Enter a space name."),
  category: z.enum(["shop", "office", "apartment", "commercial"]),
  sizeSqm: z.number().min(1, "Size must be at least 1 m²."),
  monthlyRent: z.number().min(1, "Rent must be greater than zero."),
  description: z.string().optional(),
});

export type SpaceFormValues = z.infer<typeof spaceSchema>;

export const buildingSchema = z.object({
  name: z.string().min(2, "Enter a building name."),
  address: z.string().min(3, "Enter the building address."),
  district: z.string().min(2, "Enter the district."),
  city: z.string().min(2, "Enter the city."),
  floorsCount: z.number().min(1, "At least one floor is required.").max(30, "Maximum 30 floors."),
  yearBuilt: z.number().min(1900, "Enter a valid year.").max(2100, "Enter a valid year."),
  description: z.string().optional(),
});

export type BuildingFormValues = z.infer<typeof buildingSchema>;

const agreementLineSchema = z.object({
  spaceId: z.string().optional(),
  monthlyRent: z.number().min(1, "Rent must be greater than zero."),
});

export const agreementSchema = z
  .object({
    tenantId: z.string().min(1, "Select a tenant."),
    monthlyRent: z.number().min(1, "Rent must be greater than zero."),
    lineItems: z.array(agreementLineSchema).optional(),
    startDate: z.string().min(1, "Select a start date."),
    endDate: z.string().min(1, "Select an end date."),
    deposit: z.number().min(0, "Deposit cannot be negative."),
    penaltyEnabled: z.boolean(),
    penaltyRate: z.number().min(0, "Rate cannot be negative.").max(100, "Rate cannot exceed 100%."),
    notes: z.string().optional(),
  })
  .refine((values) => values.endDate > values.startDate, {
    message: "End date must be after the start date.",
    path: ["endDate"],
  });

export type AgreementFormValues = z.infer<typeof agreementSchema>;

export const paymentSchema = z.object({
  invoiceId: z.string().min(1, "Select an invoice."),
  amount: z.number().min(1, "Enter a payment amount."),
  method: z.enum(["mtn_momo", "airtel_money", "bank_transfer", "cash", "cheque"]),
  date: z.string().optional(),
  phone: z.string().optional(),
  bankName: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;

export const expenseSchema = z.object({
  title: z.string().min(3, "Enter an expense title."),
  category: z.enum(["maintenance", "repairs", "cleaning", "security", "utilities", "insurance", "other"]),
  buildingId: z.string().min(1, "Select a building."),
  amount: z.number().min(1, "Enter the expense amount."),
  date: z.string().min(1, "Select a date."),
  vendor: z.string().min(2, "Enter the vendor or supplier."),
  status: z.enum(["paid", "pending"]),
  notes: z.string().optional(),
});

export type ExpenseFormValues = z.infer<typeof expenseSchema>;

export const managedUserRoleSchema = z.enum([
  "Administrator",
  "Accountant",
  "Property Manager",
  "Viewer",
  "Tenant",
]);

export const staffUserRoleSchema = z.enum([
  "Administrator",
  "Accountant",
  "Property Manager",
  "Viewer",
]);

export const inviteUserSchema = z.object({
  mode: z.enum(["invite", "create"]),
  name: z.string().min(2, "Enter the user's name."),
  email: z.string().email("Enter a valid email address."),
  phone: z.string().regex(phoneRegex, "Enter a valid Rwandan phone number."),
  role: staffUserRoleSchema,
  password: z.string().optional(),
}).superRefine((val, ctx) => {
  if (val.mode === "create") {
    if (!val.password || val.password.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Enter a password with at least 8 characters.",
      });
    }
  }
});

export type InviteUserFormValues = z.infer<typeof inviteUserSchema>;

export const managedUserEditSchema = z.object({
  name: z.string().min(2, "Enter the user's name."),
  email: z.string().email("Enter a valid email address."),
  phone: z.string().regex(phoneRegex, "Enter a valid Rwandan phone number."),
  role: managedUserRoleSchema,
  status: z.enum(["active", "suspended"]),
});

export type ManagedUserEditFormValues = z.infer<typeof managedUserEditSchema>;

export const ebmSchema = z.object({
  reference: z.string().min(4, "Enter the EBM reference provided by the fiscal solution."),
  attachDocument: z.boolean(),
  documentName: z.string().optional(),
});

export type EbmFormValues = z.infer<typeof ebmSchema>;

export const bankProofSchema = z.object({
  method: z.enum(["mtn_momo", "airtel_money", "bank_transfer", "cash"]),
  bankName: z.string().optional(),
  reference: z.string().min(4, "Enter the payment reference."),
  amount: z.number().min(1, "Enter the transferred amount."),
  proofName: z.string().min(1, "Attach proof of payment."),
});

export type BankProofFormValues = z.infer<typeof bankProofSchema>;

export const momoPaymentSchema = z.object({
  amount: z.number().min(1, "Enter the amount to pay."),
  method: z.enum(["mtn_momo", "airtel_money"]),
  phone: z.string().regex(phoneRegex, "Enter a valid Rwandan phone number."),
});

export type MomoPaymentFormValues = z.infer<typeof momoPaymentSchema>;

export const buildingFilterSchema = spaceSchema.pick({ buildingId: true });
