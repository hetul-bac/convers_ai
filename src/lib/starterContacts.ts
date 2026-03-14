import { randomUUID } from "node:crypto";

const starterContacts = [
  {
    name: "Ava Thompson",
    email: "ava.thompson@example.com",
    phone: "+15551000001",
    tags: ["vip", "marketing"],
  },
  {
    name: "Liam Patel",
    email: "liam.patel@example.com",
    phone: "+15551000002",
    tags: ["trial", "support"],
  },
  {
    name: "Sophia Chen",
    email: "sophia.chen@example.com",
    phone: "+15551000003",
    tags: ["newsletter"],
  },
  {
    name: "Noah Williams",
    email: "noah.williams@example.com",
    phone: "+15551000004",
    tags: ["lead"],
  },
  {
    name: "Mia Rodriguez",
    email: "mia.rodriguez@example.com",
    phone: "+15551000005",
    tags: ["engaged", "promo"],
  },
];

export function buildStarterContacts(orgId: string) {
  return starterContacts.map((contact) => ({
    id: randomUUID(),
    org_id: orgId,
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    tags: contact.tags,
  }));
}
