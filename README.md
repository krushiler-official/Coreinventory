# CoreInventory

Minimal instructions for reliable test submission.

## Run

1. `npm run install:all`
2. Edit `backend/.env`:
   - `DATABASE_URL="postgresql://postgres:<password>@localhost:5432/coreinventory"`
   - `JWT_SECRET=some-secret`
3. `cd backend && npm run dev`
4. `cd ../frontend && npm run dev`
5. Open `http://localhost:3000`

## Test users

- admin / Admin@123
- warehouse1 / Staff@123

## Fixed issues

- `GET /api/products` now supports category filter by ID/name
- Profile update rejects email changes
- product categories filter works in frontend
- UI Schema & Router ready for full inventory workflows

## Notes

- Ensure PostgreSQL is running and migrations applied.
- Use browser network tab to verify requests/responses.

