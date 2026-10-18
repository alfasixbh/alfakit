/** The seeded playground user (see the database seeders of each playground). */
export const credentials = {
  email: process.env.E2E_EMAIL ?? 'admin@example.com',
  password: process.env.E2E_PASSWORD ?? 'password',
}
