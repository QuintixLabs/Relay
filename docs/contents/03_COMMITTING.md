# Committing

Try to stick to Conventional Commits:

- `type: short summary`
- or `type(scope): short summary`

#### Common types:

- `feat:` → new features
- `fix:` → bug fixes
- `docs:` → documentation changes
- `refactor:` → internal cleanup (no behavior change)
- `chore:` → for small project updates
- `test:` → tests

Keep it short and clear. Don't overthink it.

If it helps, include the issue number:

- `fix(settings): keep password modal copy consistent (#6)`

#### Examples:

- `feat(settings): add change password modal`
- `fix(auth): stop wrong password message from flashing`
- `docs: clarify docker setup without .env`


## Before pushing

- Make sure it works locally
- Run `npm run lint`
- Keep commits focused (don't mix unrelated stuff)
- Push with a clear message
