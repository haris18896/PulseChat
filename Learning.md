# Phase 0 — Project Setup

### Create Nest Js APP

```sh
sudo npm i -g @nestjs/cli
nest new <ProjectName> --strict # to create project in current directory use dot.
yarn add @types/mocha --dev
```

```typescript
// tsconfig.json
// update the baseUrl: ./ to path

//...............
{
    "compilerOptions" : {
        "paths": {
            "*": ["./*"]
    },
        //............
        "types": ["jest", "node"]
        //................
    },
    "include": ["src/**/*", "test/**/*"]
}
```

### Husky (git hooks)

```sh
yarn add -D husky lint-staged
yarn husky init
```

Add to `package.json`:

```json
"lint-staged": {
  "*.{ts,js,mjs}": ["eslint --fix", "prettier --write"]
}
```

Set `.husky/pre-commit`:

```sh
yarn lint-staged
```

**Run**

- Hooks run automatically on `git commit`.
- After clone or pull, run `yarn` — the `prepare` script installs hooks.
- Test manually: `yarn lint-staged` or `sh .husky/pre-commit`.

### Docker setup

- create the `docker-compose.yml` file
- Add the postgres and redis image
- run the `docker compose up -d` to install the images

### Config
 - install config package
 - update the `src/app.module.ts` and `src/app.controller.ts`
 - run the development enviroment and test the response

```bash
npm install @nestjs/config
```