/**
 * GitHub Actions workflow YAML templates for deploy-to-server (SSH).
 * Used by the GitHub page CI/CD setup to create .github/workflows/deploy.yml.
 */

export type DeployType = "node-pm2" | "static" | "docker";

export interface DeployWorkflowOptions {
  branch: string;
  deployType: DeployType;
}

function getRemoteDeployScript(deployType: DeployType): string {
  switch (deployType) {
    case "node-pm2":
      return 'cd "$SERVER_PATH" && git pull origin "$BRANCH" && npm ci && npm run build && pm2 restart all';
    case "static":
      return 'cd "$SERVER_PATH" && git pull origin "$BRANCH" && npm ci && npm run build';
    case "docker":
      return 'cd "$SERVER_PATH" && git pull origin "$BRANCH" && docker compose build --pull && docker compose up -d';
    default: {
      const _: never = deployType;
      return "";
    }
  }
}

/**
 * Build the deploy-to-server workflow YAML.
 * Uses secrets: SSH_PRIVATE_KEY, SERVER_HOST, SERVER_USER, SERVER_PATH.
 */
export function buildDeployWorkflowYaml(options: DeployWorkflowOptions): string {
  const { branch, deployType } = options;
  const remoteScript = getRemoteDeployScript(deployType);

  return `name: Deploy to server
on:
  push:
    branches: [${JSON.stringify(branch)}]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        env:
          SSH_PRIVATE_KEY: \${{ secrets.SSH_PRIVATE_KEY }}
          SERVER_HOST: \${{ secrets.SERVER_HOST }}
          SERVER_USER: \${{ secrets.SERVER_USER }}
          SERVER_PATH: \${{ secrets.SERVER_PATH }}
          BRANCH: \${{ github.ref_name }}
        run: |
          mkdir -p ~/.ssh
          echo "$SSH_PRIVATE_KEY" > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          ssh -o StrictHostKeyChecking=no -i ~/.ssh/deploy_key "\${SERVER_USER}@\${SERVER_HOST}" "${remoteScript.replace(/"/g, '\\"')}"
`;
}
