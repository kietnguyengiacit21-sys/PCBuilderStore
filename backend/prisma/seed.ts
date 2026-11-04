import { readFile } from "node:fs/promises";
import { getPrismaClient } from "../src/db/prisma.js";
import { seedCatalog } from "../src/catalog/seed.js";
import { parseCatalogCsv } from "../src/catalog/seed-csv.js";

const prisma = getPrismaClient();

const roles = [
  ["ADMIN", "Administrator", "Manages products, users, rules and system configuration"],
  ["SALES", "Sales Staff", "Handles orders and customer assistance"],
  ["CUSTOMER", "Customer", "Browses products, buys items and builds PC configurations"],
] as const;

const productTypes = [
  ["PC", "Complete PC", "Prebuilt desktop computer", false],
  ["CPU", "Processor", "Desktop CPU", true],
  ["GPU", "Graphics Card", "Discrete graphics card", true],
  ["MOTHERBOARD", "Motherboard", "Main board", true],
  ["RAM", "Memory", "Desktop RAM modules", true],
  ["STORAGE", "Storage", "SSD or HDD", true],
  ["PSU", "Power Supply", "Computer power supply", true],
  ["CASE", "PC Case", "Computer chassis", true],
  ["COOLER", "CPU Cooler", "CPU cooling solution", true],
  ["ACCESSORY", "Accessory", "Other PC accessories", false],
] as const;

const useCases = [
  ["GAMING", "Gaming", "Playing PC games"],
  ["OFFICE", "Office", "Office and everyday productivity"],
  ["PROGRAMMING", "Programming", "Software development"],
  ["VIDEO_EDITING", "Video Editing", "Video editing and rendering"],
  ["DESIGN_3D", "3D Design", "3D modelling and rendering"],
  ["AI_ML", "AI / Machine Learning", "Local AI or machine learning workloads"],
  ["STREAMING", "Streaming", "Game or desktop streaming"],
] as const;

async function seed(): Promise<void> {
  const csv = await readFile(new URL("../../seed/catalog-150-products.csv", import.meta.url), "utf8");
  const catalogRows = parseCatalogCsv(csv);

  const summary = await prisma.$transaction(async (transaction) => {
  for (const [roleCode, roleName, description] of roles) {
    await transaction.$executeRaw`
      INSERT INTO roles (role_code, role_name, description)
      VALUES (${roleCode}, ${roleName}, ${description})
      ON CONFLICT (role_code) DO NOTHING
    `;
  }

  for (const [typeCode, typeName, description, isBuildComponent] of productTypes) {
    await transaction.$executeRaw`
      INSERT INTO product_types (type_code, type_name, description, is_build_component)
      VALUES (${typeCode}, ${typeName}, ${description}, ${isBuildComponent})
      ON CONFLICT (type_code) DO NOTHING
    `;
  }

  for (const [useCaseCode, useCaseName, description] of useCases) {
    await transaction.$executeRaw`
      INSERT INTO use_cases (use_case_code, use_case_name, description)
      VALUES (${useCaseCode}, ${useCaseName}, ${description})
      ON CONFLICT (use_case_code) DO NOTHING
    `;
  }

    return seedCatalog(transaction, catalogRows);
  });
  console.info("Demo catalog seed complete:", summary);
}

try {
  await seed();
} finally {
  await prisma.$disconnect();
}
