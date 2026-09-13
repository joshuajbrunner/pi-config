# Repository guide

This repository is the source for a personal pi package installed from GitHub.
Make changes here, not in pi's installed checkout.

## Working here

- Keep skills, extensions, prompts, and package metadata consistent with pi's
  current documentation and local declarations.
- Use relative links for files packaged with a skill.
- Run `npm test` after changes. Run any narrower relevant test while iterating.
- Do not edit generated dependencies under `node_modules/`.

## Updating the installed package

After changes have been pushed, update the installed package with:

```bash
pi update --extensions
```

That command updates every unpinned installed pi package. When only this package
should change, fast-forward its installed checkout instead:

```bash
git -C ~/.pi/agent/git/github.com/joshuabrunner/pi-config pull --ff-only origin main
```

Run `npm install` in the installed checkout only when package dependencies or the
lockfile changed. Do not make source edits in the installed checkout because a
later pi package reconciliation may reset and clean it.
