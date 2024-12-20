# FAIVOR validator frontend


## Installation and running locally

Steps:
1. Install the dependencies with `pnpm install`
2. Generate the google OAUTH credentials for the auth.js adapter

3. copy the .env.local.example file to .env.local
4. fill in the .env.local file with your own values
5. copy the .env.example file to .env
6. run `npx auth secret` to generate a secret key for the auth.js adapter


Run locally:
```bash
pnpm dev
```

## Updating fork
1.  Add remote from the original repository in your forked repository:
```shell
git remote add upstream git://github.com/ctwhome/faivor.git
git fetch upstream
```
1.  Updating your fork from the original repo to keep up with their changes:
    `git pull upstream main`

Start the development server on [http://localhost:5173](http://localhost:5173)

```bash
pnpm dev
```

## Production

Build the application for production:

```bash
pnpm build
```

