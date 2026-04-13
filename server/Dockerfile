FROM node:20-alpine

WORKDIR /app

COPY server/package.json ./server/package.json
RUN cd server && npm install --omit=dev

COPY . .

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server/index.js"]
