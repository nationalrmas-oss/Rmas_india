# Use lightweight official Node base image
FROM node:20-slim

# Playwright/Chromium dependencies (required for Playwright to run)
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates \
      fonts-liberation \
      libappindicator3-1 \
      libasound2 \
      libatk-bridge2.0-0 \
      libatk1.0-0 \
      libc6 \
      libcairo2 \
      libcups2 \
      libdbus-1-3 \
      libexpat1 \
      libfontconfig1 \
      libfreetype6 \
      libgbm1 \
      libgcc1 \
      libgdk-pixbuf2.0-0 \
      libglib2.0-0 \
      libgtk-3-0 \
      libnspr4 \
      libnss3 \
      libx11-6 \
      libx11-xcb1 \
      libxcomposite1 \
      libxdamage1 \
      libxext6 \
      libxfixes3 \
      libxrandr2 \
      libxrender1 \
      libxss1 \
      libxtst6 \
      libnss3 \
      libxshmfence1 \
      openssl \
      wget \
      gnupg \
      dirmngr \
      dumb-init \
      unzip \
      xdg-utils \
      --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Configure workdir
WORKDIR /app

# Copy package manifests first (Docker layer cache benefit)
COPY package.json package-lock.json ./

# Playwright configuration
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium

# Install dependencies and Playwright browsers via postinstall script
RUN npm install --production

# Copy application files
COPY . .

# Expose runtime port (fallback to 5000)
ARG APP_PORT=5000
ENV PORT=${APP_PORT}
EXPOSE ${PORT}

# Render compatibility:
# - Render sets PORT env; app should use process.env.PORT || 5000 in index.js
# - Keep DB and auth env vars in Render dashboard (.env not committed)
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]