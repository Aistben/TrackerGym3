import type { Meal, MealEntry, Product, Profile, WeighIn } from "./types";
import { ACTIVITY } from "./nutrition";

export const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === "string";
const positive = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;
const nonnegative = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
export function validDate(v: unknown): v is string {
  return text(v) && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
}
const nutrition = (v: Record<string, unknown>) => [v.kcal, v.protein, v.fat, v.carbs].every(nonnegative);
export function validProfile(v: unknown): v is Profile {
  return record(v) && text(v.name) && (v.sex === "male" || v.sex === "female") &&
    positive(v.age) && positive(v.height) && positive(v.startWeight) &&
    text(v.activity) && Object.prototype.hasOwnProperty.call(ACTIVITY, v.activity) && validDate(v.startDate);
}
export function validProduct(v: unknown): v is Product {
  return record(v) && text(v.id) && !!v.id && text(v.name) && nutrition(v) &&
    ["base", "user", "off"].includes(String(v.source)) && text(v.createdAt) &&
    (v.brand === undefined || text(v.brand)) && (v.barcode === undefined || text(v.barcode)) &&
    (v.portion === undefined || positive(v.portion));
}
export function validEntry(v: unknown): v is MealEntry {
  return record(v) && text(v.id) && text(v.name) && positive(v.grams) && nutrition(v) &&
    (v.productId === undefined || text(v.productId));
}
export function validMeal(v: unknown): v is Meal {
  return record(v) && text(v.id) && text(v.title) && validDate(v.date) &&
    text(v.time) && /^([01]\d|2[0-3]):[0-5]\d$/.test(v.time) && Array.isArray(v.entries);
}
export function validWeight(v: unknown): v is WeighIn {
  return record(v) && validDate(v.date) && positive(v.weight) && v.weight >= 20 && v.weight <= 400;
}
