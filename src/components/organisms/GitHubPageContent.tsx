"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Star, Lock, Globe, ExternalLink, Copy, CheckCircle2, AlertCircle, Loader2, Github, LogOut, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getAuthenticatedUser,
  listAllRepos,
  getRepoReadme,
  getRepoTree,
  createOrUpdateFile,
  type GitHubUser,
  type GitHubRepo,
  type GitHubTreeItem,
} from "@/lib/api-github";
import {
  getAuthenticatedUserFromEnv,
  listAllReposFromEnv,
  getRepoReadmeFromEnv,
  getRepoTreeFromEnv,
  createOrUpdateFileFromEnv,
} from "@/lib/api-github-env";
import { buildDeployWorkflowYaml, type DeployType } from "@/lib/github-workflow-templates";
import { toast } from "sonner";
import { getGithubToken, setGithubToken, clearGithubToken } from "@/lib/github-token-store";
import { isTauri, showOpenDirectoryDialog, invoke } from "@/lib/tauri";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/molecules/Display/EmptyState";
import { ErrorDisplay } from "@/components/molecules/Display/ErrorDisplay";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface RepoDetails {
  readme: string;
  tree: GitHubTreeItem[];
}

export function GitHubPageContent() {
  const [token, setToken] = useState<string>("");
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "public" | "private">("all");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [connecting, setConnecting] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cloneRepo, setCloneRepo] = useState<GitHubRepo | null>(null);
  const [copyStatus, setCopyStatus] = useState<{ repo: string; type: "ssh" | "https" } | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [repoDetails, setRepoDetails] = useState<RepoDetails | null>(null);
  const [cloneStatus, setCloneStatus] = useState<"idle" | "cloning" | "success" | "error">("idle");
  const [cloneError, setCloneError] = useState<string | null>(null);
  const [cicdRepo, setCicdRepo] = useState<GitHubRepo | null>(null);
  const [useEnvToken, setUseEnvToken] = useState(false);

  // Load connection on mount: prefer GITHUB_PAT from .env (server), else localStorage PAT
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const statusRes = await fetch("/api/github/env-status");
      if (cancelled) return;
      const { hasEnvToken } = (await statusRes.json()) as { hasEnvToken?: boolean };
      if (hasEnvToken) {
        try {
          const [userData, reposData] = await Promise.all([
            getAuthenticatedUserFromEnv(),
            listAllReposFromEnv(),
          ]);
          if (cancelled) return;
          setUser(userData);
          setRepos(reposData);
          setUseEnvToken(true);
        } catch {
          // env token invalid or API error; fall back to localStorage
          setUseEnvToken(false);
          const storedToken = getGithubToken();
          if (storedToken) {
            setToken(storedToken);
            handleConnect(storedToken);
          }
        }
        return;
      }
      const storedToken = getGithubToken();
      if (storedToken) {
        setToken(storedToken);
        handleConnect(storedToken);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleConnect = useCallback(
    async (pat: string) => {
      if (!pat.trim()) {
        setError("Please enter a valid PAT");
        return;
      }

      setConnecting(true);
      setError(null);

      try {
        // Verify token and fetch user
        const userData = await getAuthenticatedUser(pat);
        setUser(userData);
        setToken(pat);
        setGithubToken(pat);

        // Fetch repos
        setLoadingRepos(true);
        const allRepos = await listAllRepos(pat);
        setRepos(allRepos);
        setLoadingRepos(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to connect to GitHub");
        setToken("");
        setUser(null);
        setRepos([]);
      } finally {
        setConnecting(false);
      }
    },
    []
  );

  const handleDisconnect = useCallback(() => {
    clearGithubToken();
    setToken("");
    setUser(null);
    setRepos([]);
    setSelectedRepo(null);
    setRepoDetails(null);
    setCloneRepo(null);
    setError(null);
    setUseEnvToken(false);
  }, []);

  // Compute filtered repos
  const filteredRepos = useMemo(() => {
    return repos.filter((repo) => {
      const matchesSearch =
        repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (repo.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

      const matchesVisibility =
        visibilityFilter === "all" ||
        (visibilityFilter === "public" && !repo.private) ||
        (visibilityFilter === "private" && repo.private);

      const matchesLanguage = languageFilter === "all" || repo.language === languageFilter;

      return matchesSearch && matchesVisibility && matchesLanguage;
    });
  }, [repos, searchQuery, visibilityFilter, languageFilter]);

  // Get unique languages for filter
  const languages = useMemo(
    () => Array.from(new Set(repos.filter((r) => r.language).map((r) => r.language))) as string[],
    [repos]
  );

  // Load repo details
  const loadRepoDetails = useCallback(
    async (repo: GitHubRepo) => {
      if (useEnvToken) {
        setLoadingDetails(true);
        setSelectedRepo(repo);
        try {
          const [readme, tree] = await Promise.all([
            getRepoReadmeFromEnv(repo.owner.login, repo.name),
            getRepoTreeFromEnv(repo.owner.login, repo.name),
          ]);
          setRepoDetails({ readme, tree });
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to load repo details");
        } finally {
          setLoadingDetails(false);
        }
        return;
      }
      if (!token) return;

      setLoadingDetails(true);
      setSelectedRepo(repo);

      try {
        const [readme, tree] = await Promise.all([
          getRepoReadme(token, repo.owner.login, repo.name),
          getRepoTree(token, repo.owner.login, repo.name),
        ]);

        setRepoDetails({ readme, tree });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load repo details");
      } finally {
        setLoadingDetails(false);
      }
    },
    [token, useEnvToken]
  );

  const handleCopy = useCallback((url: string, type: "ssh" | "https", repoName: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopyStatus({ repo: repoName, type });
      setTimeout(() => setCopyStatus(null), 2000);
    });
  }, []);

  const handleCloneHere = useCallback(
    async (repo: GitHubRepo) => {
      if (!isTauri) {
        setCloneError("Clone here is only available in desktop app");
        return;
      }

      try {
        setCloneStatus("cloning");
        setCloneError(null);

        // Show directory picker
        const selectedDir = await showOpenDirectoryDialog();
        if (!selectedDir) {
          setCloneStatus("idle");
          return;
        }

        // Run git clone via Tauri
        const fullPath = `${selectedDir}/${repo.name}`;
        await invoke<string>("git_clone", { url: repo.ssh_url, dest_dir: fullPath });

        setCloneStatus("success");
        setTimeout(() => setCloneStatus("idle"), 3000);
      } catch (err) {
        setCloneError(err instanceof Error ? err.message : "Failed to clone repo");
        setCloneStatus("error");
      }
    },
    []
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Connect Section */}
      <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-card">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <Github className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">GitHub Connection</h2>
          </div>
          {user && (
            <Button variant="ghost" size="sm" onClick={handleDisconnect} className="text-destructive hover:text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Disconnect
            </Button>
          )}
        </div>

        {!user ? (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Personal Access Token (PAT)</label>
              <Input
                type="password"
                placeholder="ghp_... or set GITHUB_PAT in .env"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={connecting}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Create a PAT with repo scope at <a href="https://github.com/settings/tokens" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  github.com/settings/tokens
                </a>
                . Or set <code className="text-xs bg-muted px-1 rounded">GITHUB_PAT</code> in <code className="text-xs bg-muted px-1 rounded">.env</code> (used server-side, not stored in browser).
              </p>
            </div>

            <Button onClick={() => handleConnect(token)} disabled={connecting || !token.trim()} className="w-full">
              {connecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect GitHub"
              )}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4">
              <img src={user.avatar_url} alt={user.login} className="w-12 h-12 rounded-full" />
              <div>
                <p className="font-medium text-foreground">{user.name || user.login}</p>
                <p className="text-sm text-muted-foreground">@{user.login}</p>
              </div>
            </div>
            {useEnvToken && (
              <p className="text-xs text-muted-foreground">Using token from <code className="bg-muted px-1 rounded">.env</code> (GITHUB_PAT)</p>
            )}
          </div>
        )}

        {error && <ErrorDisplay title="Connection Error" message={error} />}
      </div>

      {/* Repo List Section */}
      {user && (
        <>
          {/* Filters */}
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-2">Search repositories</label>
              <Input
                placeholder="Search by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="w-full md:w-48">
              <label className="block text-sm font-medium text-foreground mb-2">Visibility</label>
              <Select value={visibilityFilter} onValueChange={(value) => setVisibilityFilter(value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-48">
              <label className="block text-sm font-medium text-foreground mb-2">Language</label>
              <Select value={languageFilter} onValueChange={setLanguageFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All languages</SelectItem>
                  {languages.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {lang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Loading State */}
          {loadingRepos && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loadingRepos && filteredRepos.length === 0 && (
            <EmptyState
              icon={Github}
              title={repos.length === 0 ? "No repositories found" : "No matching repositories"}
              description={repos.length === 0 ? "This account has no repositories yet." : "Try adjusting your filters or search."}
            />
          )}

          {/* Repo Grid */}
          {!loadingRepos && filteredRepos.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRepos.map((repo) => (
                <RepoCard
                  key={repo.id}
                  repo={repo}
                  onClone={() => setCloneRepo(repo)}
                  onViewDetails={() => loadRepoDetails(repo)}
                  onSetUpCICD={() => setCicdRepo(repo)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Clone Modal */}
      {cloneRepo && (
        <CloneModal
          repo={cloneRepo}
          onClose={() => {
            setCloneRepo(null);
            setCloneStatus("idle");
            setCloneError(null);
          }}
          onCopy={handleCopy}
          copyStatus={copyStatus}
          onCloneHere={() => handleCloneHere(cloneRepo)}
          cloneStatus={cloneStatus}
          cloneError={cloneError}
        />
      )}

      {/* Repo Detail Modal */}
      {selectedRepo && (
        <RepoDetailModal
          repo={selectedRepo}
          details={repoDetails}
          loading={loadingDetails}
          onClose={() => {
            setSelectedRepo(null);
            setRepoDetails(null);
          }}
        />
      )}

      {/* CI/CD Setup Modal */}
      {cicdRepo && (
        <CICDSetupModal
          repo={cicdRepo}
          useEnvToken={useEnvToken}
          onClose={() => setCicdRepo(null)}
          onSuccess={() => {
            setCicdRepo(null);
            const [owner, repoName] = cicdRepo.full_name.split("/");
            const secretsUrl = `https://github.com/${owner}/${repoName}/settings/secrets/actions`;
            toast.success(
              "Workflow created. Add repo secrets: SSH_PRIVATE_KEY, SERVER_HOST, SERVER_USER, SERVER_PATH.",
              { description: "Open repo Settings → Secrets and variables → Actions", action: { label: "Open", onClick: () => window.open(secretsUrl, "_blank") } }
            );
          }}
        />
      )}
    </div>
  );
}

// Sub-component: RepoCard
function RepoCard({
  repo,
  onClone,
  onViewDetails,
  onSetUpCICD,
}: {
  repo: GitHubRepo;
  onClone: () => void;
  onViewDetails: () => void;
  onSetUpCICD: () => void;
}) {
  return (
    <Card className="group flex flex-col cursor-pointer shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 focus-within:ring-2 focus-within:ring-primary/30 focus-within:ring-offset-2 border-border/50">
      <CardHeader className="flex flex-row items-start justify-between gap-3 p-4 pb-2">
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base font-semibold leading-tight truncate group-hover:text-primary transition-colors duration-200">
            {repo.name}
          </CardTitle>
          {repo.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{repo.description}</p>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-between p-4 pt-2 gap-3">
        {/* Meta */}
        <div className="flex flex-wrap gap-2">
          {repo.language && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              {repo.language}
            </span>
          )}
          {repo.stargazers_count > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="w-3 h-3" />
              {repo.stargazers_count}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            {repo.private ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
            {repo.private ? "Private" : "Public"}
          </span>
        </div>

        {/* Updated date */}
        <p className="text-xs text-muted-foreground">
          Updated {new Date(repo.updated_at).toLocaleDateString()}
        </p>

        {/* Action buttons - revealed on hover */}
        <div className="flex flex-wrap gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 pt-2 border-t border-border/30">
          <Button size="sm" variant="outline" className="h-8" onClick={onClone}>
            Clone
          </Button>
          <Button size="sm" variant="outline" className="h-8" onClick={onViewDetails}>
            Details
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={onSetUpCICD}>
            <GitBranch className="w-3.5 h-3.5" />
            Set up CI/CD
          </Button>
          <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="h-8 w-8 p-0">
              <ExternalLink className="w-4 h-4" />
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

// Sub-component: CloneModal
function CloneModal({
  repo,
  onClose,
  onCopy,
  copyStatus,
  onCloneHere,
  cloneStatus,
  cloneError,
}: {
  repo: GitHubRepo;
  onClose: () => void;
  onCopy: (url: string, type: "ssh" | "https", repoName: string) => void;
  copyStatus: { repo: string; type: "ssh" | "https" } | null;
  onCloneHere: () => void;
  cloneStatus: "idle" | "cloning" | "success" | "error";
  cloneError: string | null;
}) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Clone {repo.name}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          {/* SSH URL */}
          <div>
            <p className="text-sm font-medium text-foreground mb-2">SSH</p>
            <div className="flex gap-2">
              <code className="flex-1 px-3 py-2 bg-muted rounded text-xs font-mono text-foreground truncate">
                {repo.ssh_url}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCopy(repo.ssh_url, "ssh", repo.name)}
                className="shrink-0"
              >
                {copyStatus?.repo === repo.name && copyStatus?.type === "ssh" ? (
                  <CheckCircle2 className="w-4 h-4 text-success" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* HTTPS URL */}
          <div>
            <p className="text-sm font-medium text-foreground mb-2">HTTPS</p>
            <div className="flex gap-2">
              <code className="flex-1 px-3 py-2 bg-muted rounded text-xs font-mono text-foreground truncate">
                {repo.clone_url}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCopy(repo.clone_url, "https", repo.name)}
                className="shrink-0"
              >
                {copyStatus?.repo === repo.name && copyStatus?.type === "https" ? (
                  <CheckCircle2 className="w-4 h-4 text-success" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Clone here (desktop only) */}
          {isTauri && (
            <Button
              onClick={onCloneHere}
              disabled={cloneStatus !== "idle"}
              className="w-full"
              variant={cloneStatus === "success" ? "success" : cloneStatus === "error" ? "destructive" : "default"}
            >
              {cloneStatus === "cloning" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {cloneStatus === "success" && <CheckCircle2 className="w-4 h-4 mr-2" />}
              {cloneStatus === "error" && <AlertCircle className="w-4 h-4 mr-2" />}
              {cloneStatus === "idle" && "Clone here..."}
              {cloneStatus === "cloning" && "Cloning..."}
              {cloneStatus === "success" && "Clone successful!"}
              {cloneStatus === "error" && "Clone failed"}
            </Button>
          )}

          {cloneError && <ErrorDisplay title="Clone Error" message={cloneError} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Sub-component: CICDSetupModal
function CICDSetupModal({
  repo,
  useEnvToken,
  onClose,
  onSuccess,
}: {
  repo: GitHubRepo;
  useEnvToken: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [branch, setBranch] = useState("main");
  const [deployType, setDeployType] = useState<DeployType>("node-pm2");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = useCallback(async () => {
    const parts = repo.full_name.split("/");
    const owner = parts[0];
    const repoName = parts[1];
    if (!owner || !repoName) {
      setError("Invalid repo full_name");
      return;
    }
    const branchTrimmed = branch.trim() || "main";
    if (useEnvToken) {
      setSubmitting(true);
      setError(null);
      try {
        const yaml = buildDeployWorkflowYaml({
          branch: branchTrimmed,
          deployType,
        });
        await createOrUpdateFileFromEnv(
          owner,
          repoName,
          ".github/workflows/deploy.yml",
          yaml,
          "Add deploy-to-server workflow",
          branchTrimmed
        );
        onSuccess();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create workflow");
      } finally {
        setSubmitting(false);
      }
      return;
    }
    const token = getGithubToken();
    if (!token?.trim()) {
      setError("Not connected. Connect with a PAT first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const yaml = buildDeployWorkflowYaml({
        branch: branchTrimmed,
        deployType,
      });
      await createOrUpdateFile(
        token,
        owner,
        repoName,
        ".github/workflows/deploy.yml",
        yaml,
        "Add deploy-to-server workflow",
        branchTrimmed
      );
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create workflow");
    } finally {
      setSubmitting(false);
    }
  }, [repo.full_name, branch, deployType, useEnvToken, onSuccess, onClose]);

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set up CI/CD — {repo.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div>
            <Label htmlFor="cicd-branch">Branch to deploy on push</Label>
            <Input
              id="cicd-branch"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              disabled={submitting}
              className="mt-1.5 font-mono"
            />
          </div>
          <div>
            <Label htmlFor="cicd-deploy-type">Deploy type</Label>
            <Select
              value={deployType}
              onValueChange={(v) => setDeployType(v as DeployType)}
              disabled={submitting}
            >
              <SelectTrigger id="cicd-deploy-type" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="node-pm2">Node (npm + pm2)</SelectItem>
                <SelectItem value="static">Static (build only)</SelectItem>
                <SelectItem value="docker">Docker (Compose)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <ErrorDisplay title="Error" message={error} />}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create workflow"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Sub-component: RepoDetailModal
function RepoDetailModal({
  repo,
  details,
  loading,
  onClose,
}: {
  repo: GitHubRepo;
  details: RepoDetails | null;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="truncate">{repo.name}</DialogTitle>
            <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </a>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <Tabs defaultValue="readme" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="readme">README</TabsTrigger>
              <TabsTrigger value="files">Files ({details?.tree.length || 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="readme" className="mt-4">
              {details?.readme ? (
                <ScrollArea className="h-[400px] rounded-lg border border-border/50 p-4">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{details.readme}</ReactMarkdown>
                  </div>
                </ScrollArea>
              ) : (
                <EmptyState
                  icon={Github}
                  title="No README"
                  description="This repository doesn't have a README file."
                />
              )}
            </TabsContent>

            <TabsContent value="files" className="mt-4">
              {details?.tree && details.tree.length > 0 ? (
                <ScrollArea className="h-[400px] rounded-lg border border-border/50">
                  <div className="space-y-1 p-4">
                    {details.tree.map((item) => (
                      <div key={item.path} className="flex items-center gap-2 py-1 px-2 rounded text-sm hover:bg-muted/50 transition-colors">
                        <span className="text-muted-foreground">{item.type === "dir" ? "📁" : "📄"}</span>
                        <span className="truncate">{item.name}</span>
                        {item.size && (
                          <span className="text-xs text-muted-foreground ml-auto">
                            {(item.size / 1024).toFixed(1)}KB
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <EmptyState
                  icon={Github}
                  title="No files"
                  description="This repository appears to be empty."
                />
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
