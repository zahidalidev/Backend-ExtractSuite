FROM node:20-alpine

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
