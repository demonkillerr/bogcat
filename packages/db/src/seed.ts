import { PrismaClient, Role, ColleagueType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Users ────────────────────────────────────────────────────────────────
  const users: { username: string; role: Role }[] = [
    { username: "coordinator", role: Role.COORDINATOR },
    { username: "frontdesk",   role: Role.FRONTDESK },
    { username: "admin",       role: Role.ADMIN },
    { username: "optometrist", role: Role.OPTOMETRIST },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { username: user.username },
      update: {},
      create: user,
    });
  }
  console.log("✅ Users seeded");

  // ── Colleagues ───────────────────────────────────────────────────────────
  const colleagues: { name: string; type: ColleagueType; isAssignable: boolean }[] = [
    // Optical Consultants
    { name: "Gaurang",      type: ColleagueType.OC,      isAssignable: true },
    { name: "Aswin",        type: ColleagueType.OC,      isAssignable: true },
    { name: "Matt Hobbs",   type: ColleagueType.OC,      isAssignable: true },
    { name: "Matt McDougle",type: ColleagueType.OC,      isAssignable: true },
    { name: "Zimana",       type: ColleagueType.OC,      isAssignable: true },
    { name: "Evie",         type: ColleagueType.OC,      isAssignable: true },
    { name: "Rachel",       type: ColleagueType.OC,      isAssignable: true },
    { name: "Oran",         type: ColleagueType.OC,      isAssignable: true },
    { name: "Sophie",       type: ColleagueType.OC,      isAssignable: true },
    { name: "Fiona",        type: ColleagueType.OC,      isAssignable: true },
    // Managers — Iqbal is NOT assignable
    { name: "Iqbal",        type: ColleagueType.MANAGER, isAssignable: false },
    { name: "Scott",        type: ColleagueType.MANAGER, isAssignable: true },
    { name: "Linda",        type: ColleagueType.MANAGER, isAssignable: true },
    { name: "Sylvia",       type: ColleagueType.MANAGER, isAssignable: true },
  ];

  for (const colleague of colleagues) {
    await prisma.colleague.upsert({
      where: { name: colleague.name },
      update: {},
      create: colleague,
    });
  }
  console.log("✅ Colleagues seeded");

  console.log("🎉 Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
