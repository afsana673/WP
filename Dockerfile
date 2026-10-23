FROM node:22-bookworm-slim

# System Chromium installed rather than downloading a browser during npm install.
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium ca-certificates fonts-liberation fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    PUPPETEER_SKIP_DOWNLOAD=true \
    CHROME_PATH=/usr/bin/chromium \
    DATA_DIR=/app/data \
    PORT=10000
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY . .
RUN npm run build
EXPOSE 10000
CMD ["node", "index.js"]
