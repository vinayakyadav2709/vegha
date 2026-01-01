FROM oven/bun:1

WORKDIR /app

COPY package.json package-lock.json* bun.lock* ./
RUN bun install --frozen-lockfile

COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3100
ENV HOSTNAME=0.0.0.0

RUN bun run build

EXPOSE 3100

CMD ["bun", "start", "-p", "3100"]
