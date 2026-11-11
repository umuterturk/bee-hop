# Bee Hop

Portrait puzzle. One bee, six honeycomb directions, and a landing past every flower. The rules and the 40 certified fields follow the [Bee Hop game design](https://github.com/umuterturk/card-game-lab/blob/main/docs/bee-hop-game-design.md).

React 19, Vite 7, and GSAP 3. The board rules live in `src/engine` and do not read the DOM. GitHub Actions runs the tests and publishes `dist` to GitHub Pages.

## Play

Node.js 22.

```bash
npm ci
npm test
npm run dev
```

Open the Vite URL. The board is the whole game: tap a green hex to hop. Undo, Restart, and Hint sit under the field. From level 16 the optional tools arrive one wave at a time. Every published field can still be cleared without them.

```bash
npm run build
npm run verify:release
```

In the repository settings, Pages source must be **GitHub Actions**.
