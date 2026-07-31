import { clsx, type ClassValue } from 'clsx';

/**
 * Merge class names conditionally.
 * Replaces the pattern of string concatenation for className props.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
