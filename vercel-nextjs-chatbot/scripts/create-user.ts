import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { z } from "zod";
import { user } from "../lib/db/schema";
import { generateHashedPassword, normalizeAuthEmail } from "../lib/db/utils";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

/** Parses CLI args: --email and --password flags or positional email password. */
function parseArgs(argv: string[]) {
  let email: string | undefined;
  let password: string | undefined;

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];

    if (arg === "--email" && argv[index + 1]) {
      email = argv[++index];
      continue;
    }

    if (arg === "--password" && argv[index + 1]) {
      password = argv[++index];
      continue;
    }

    if (arg.startsWith("-")) {
      continue;
    }

    if (!email) {
      email = arg;
      continue;
    }

    if (!password) {
      password = arg;
    }
  }

  return createUserSchema.safeParse({ email, password });
}

const printUsage = () => {
  process.stderr.write(
    "Usage: pnpm user:create --email <email> --password <password>\n" +
      "   or: pnpm user:create <email> <password>\n"
  );
};

const run = async () => {
  if (!process.env.POSTGRES_URL) {
    process.stderr.write("POSTGRES_URL is required. Set it in .env or .env.local.\n");
    process.exit(1);
  }

  const parsed = parseArgs(process.argv.slice(2));

  if (!parsed.success) {
    printUsage();
    process.stderr.write("Invalid email or password (minimum 6 characters).\n");
    process.exit(1);
  }

  const { email, password } = parsed.data;
  const normalizedEmail = normalizeAuthEmail(email);
  const connection = postgres(process.env.POSTGRES_URL, { max: 1 });
  const db = drizzle(connection);

  const existingUsers = await db
    .select({ id: user.id })
    .from(user)
    .where(sql`lower(${user.email}) = ${normalizedEmail}`);

  if (existingUsers.length > 0) {
    process.stderr.write(`User already exists: ${email}\n`);
    await connection.end();
    process.exit(1);
  }

  const hashedPassword = generateHashedPassword(password);

  const [createdUser] = await db
    .insert(user)
    .values({
      email: normalizedEmail,
      password: hashedPassword,
      isAnonymous: false,
    })
    .returning({
      id: user.id,
      email: user.email,
    });

  process.stdout.write(
    `Created user ${createdUser.email} (id: ${createdUser.id})\n`
  );

  await connection.end();
  process.exit(0);
};

run().catch(async (error) => {
  process.stderr.write("Failed to create user\n");
  process.stderr.write(`${error}\n`);
  process.exit(1);
});
