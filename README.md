# chatbot-based-docs

## Served file types
  `.pdf`, `.docx`, `.txt`, `.csv`

## Run
- Clone the repo or download zip
    `git clone [https:// github.com/]`
- Pinecone setup
- Install latest nodejs
- Install packages
    `npm install`
- Set up your `.env` file
    
  ```  
  NEXTAUTH_SECRET=
  JWT_SECRET=
  NODE_ENV=development
  ```
  
  `NEXTAUTH_SECRET`
    You can generate this by running `openssl rand -base64 32` in Git Bash.
  
  `JWT_Secret`
    You can generate this by running `openssl rand -base64 32` in Git Bash.

- Run the app
    `npm run dev`

## Crate and push Docker image (res/deploy_guide.mp4)
- Sign up docker.io

- Build: `docker build -t <your-dockerhub-id>/<your-image-name>:<tagname> .` 
    ex: `docker build -t ranko746/my-chatbot:1.0 .`

- Push: `docker push <your-dockerhub-id>/<your-image-name>:<tagname>`
    ex: `docker push ranko746/my-chatbot:1.0`

## Deploy on Cloudmos (res/deploy_guide.mp4)

