import { initEconomyTables } from "@/lib/db-economy";
import { initSwarmTables } from "@/lib/db-swarms";
import { initMemoryTables } from "@/lib/ai/memory";
import { initPersonaTables } from "@/lib/ai/persona";
import { initLearningTables } from "@/lib/ai/learning";

initEconomyTables();
initSwarmTables();
initMemoryTables();
initPersonaTables();
initLearningTables();

console.log("✅ V5 tables initialized: wallets, transactions, escrow, staking, swarms, memory, persona, skills");
