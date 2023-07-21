FROM node:18-alpine

# Set the working directory to /app
WORKDIR /app

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the rest of the application code to the container
COPY . .

# Expose port 3000 for the app to listen on 
EXPOSE 3000

ENV PORT 3000

# Start the app
CMD ["npm", "run", "dev"]