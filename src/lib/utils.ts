import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeIdentity(value: string) {
  return value.trim().toLocaleLowerCase("en-US");
}

export function normalizeSchoolCode(value: string) {
  return value.trim().toLocaleUpperCase("en-US");
}

export function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-NP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Kathmandu",
  }).format(new Date(value));
}
