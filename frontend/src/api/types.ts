import type { components, operations, paths } from "./schema";

export type { components, operations, paths };

export type Schemas = components["schemas"];

// ==================== ENUM-URI ====================
export type BookingType = Schemas["BookingType"];
export type BookingStatus = Schemas["BookingStatus"];
export type PaymentMethod = Schemas["PaymentMethod"];
export type PaymentStatus = Schemas["PaymentStatus"];
export type NotificationType = Schemas["NotificationType"];
export type SlotStatus = Schemas["SlotAvailability"]["status"];
export type UserRole = Schemas["User"]["role"];
export type AdminPaymentState = Schemas["AdminBookingRequest"]["paymentState"];

// ==================== AUTH & USERS ====================
export type LoginRequest = Schemas["LoginRequest"];
export type RegisterRequest = Schemas["RegisterRequest"];
export type ForgotPasswordRequest = Schemas["ForgotPasswordRequest"];
export type ResetPasswordRequest = Schemas["ResetPasswordRequest"];
export type AuthResponse = Schemas["AuthResponse"];
export type UserStatus = Schemas["UserStatus"];
export type User = Schemas["User"];
export type UpdateUserRequest = Schemas["UpdateUserRequest"];

// ==================== APP, FACILITIES & EQUIPMENT ====================
export type AppSettings = Schemas["AppSettings"];
export type FacilityHours = Schemas["FacilityHours"];
export type Facility = Schemas["Facility"];
export type SlotAvailability = Schemas["SlotAvailability"];
export type Equipment = Schemas["Equipment"];
export type Terms = Schemas["Terms"];

// ==================== BOOKINGS ====================
export type BookingRequest = Schemas["BookingRequest"];
export type BookingEquipmentRequest = Schemas["BookingEquipmentRequest"];
export type BookingEquipmentItem = Schemas["BookingEquipmentItem"];
export type CancelBookingRequest = Schemas["CancelBookingRequest"];
export type BookingPage = Schemas["BookingPage"];
export type BookingSummary = Schemas["BookingSummary"];
export type BookingDetail = Schemas["BookingDetail"];

// ==================== PAYMENTS & INVOICES ====================
export type PaymentInitiateRequest = Schemas["PaymentInitiateRequest"];
export type PaymentInitiateResponse = Schemas["PaymentInitiateResponse"];
export type PaymentDetail = Schemas["PaymentDetail"];
export type Invoice = Schemas["Invoice"];

// ==================== NOTIFICATIONS ====================
export type Notification = Schemas["Notification"];

// ==================== ADMIN ====================
export type AdminBookingRequest = Schemas["AdminBookingRequest"];
export type FacilityBlockRequest = Schemas["FacilityBlockRequest"];
export type FacilityBlock = Schemas["FacilityBlock"];

// ==================== ERRORS (RFC 7807) ====================
export type FieldError = Schemas["FieldError"];
export type ErrorDetail = Schemas["ErrorDetail"];