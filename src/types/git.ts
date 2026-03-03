/**
 * Git types. Repository info returned by Tauri get_git_info for the project details Git tab.
 */
/** Git repository info returned by Tauri get_git_info for the project details Git tab. */
export interface GitInfo {
  current_branch: string;
  branches: string[];
  remotes: string;
  status_short: string;
  last_commits: string[];
  head_ref: string;
  config_preview: string;
}
