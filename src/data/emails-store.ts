"use client";

import type { Email } from "./mock";
import { mockEmails } from "./mock";

let emails: Email[] = mockEmails.map((e) => ({ ...e }));

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((cb) => cb());
}

export function getEmails(): Email[] {
  return emails;
}

export function getEmailById(id: string): Email | undefined {
  return emails.find((e) => e.id === id);
}

/** Simulate IDP: set processed, status, and bodyJson so Review is enabled. */
export function processEmail(id: string): void {
  const email = emails.find((e) => e.id === id);
  if (!email || email.processed) return;
  const idx = emails.indexOf(email);
  emails[idx] = {
    ...email,
    processed: true,
    status: "processed",
    bodyJson: email.bodyJson ?? {
      from: email.sender,
      subject: email.subject,
      paragraphs: ["Digitized email body content (simulated IDP)."],
      timestamp: new Date().toISOString(),
    },
  };
  emit();
}

export function setEmailReviewed(id: string): void {
  const email = emails.find((e) => e.id === id);
  if (!email) return;
  const idx = emails.indexOf(email);
  emails[idx] = { ...email, reviewed: true, status: "reviewed" };
  emit();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
