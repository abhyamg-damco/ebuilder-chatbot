-- Store emails in lowercase so login is case-insensitive.
UPDATE "User" SET email = lower(email);
