# The student/faculty app's backend (from the CSS-CONNECT-APP repo, cloned next to this project).
# Build context is that repo; the extra files in this folder arrive as the "integration" context.
FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter "@ccs-hub/api..."
COPY --from=integration . /integration
RUN cp /integration/start.mjs /repo/apps/api/start.mjs
RUN node /integration/patch-seed.mjs apps/api/src/db/seed.ts apps/api/src/db/seed-linked.ts
WORKDIR /repo/apps/api
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "start.mjs"]
