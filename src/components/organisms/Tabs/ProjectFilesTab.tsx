"use client";

/** Project Files Tab component. */
import { useState, useEffect, useCallback, useRef } from "react";
import {
    Folder,
    FileText,
    Loader2,
    ChevronRight,
    ArrowUpLeft,
    RefreshCw,
    FileCode,
    FileJson,
    FileImage,
    MoreVertical,
    Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { listProjectFiles, type FileEntry, readProjectFile } from "@/lib/api-projects";
import type { Project } from "@/types/project";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ProjectFilesTabProps {
    project: Project;
    projectId: string;
}

export function ProjectFilesTab({ project, projectId }: ProjectFilesTabProps) {
    const [currentPath, setCurrentPath] = useState(".cursor");
    const [files, setFiles] = useState<FileEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [previewFile, setPreviewFile] = useState<{ path: string; content: string } | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    const cancelledRef = useRef(false);

    const fetchFiles = useCallback(async (getIsCancelled?: () => boolean) => {
        if (!project.repoPath) {
            if (!getIsCancelled?.()) setError("No repository path set for this project.");
            if (!getIsCancelled?.()) setLoading(false);
            return;
        }

        if (!getIsCancelled?.()) setLoading(true);
        if (!getIsCancelled?.()) setError(null);
        try {
            const entries = await listProjectFiles(projectId, currentPath, project.repoPath);
            if (getIsCancelled?.()) return;
            // Sort: directories first, then files
            entries.sort((a, b) => {
                if (a.isDirectory === b.isDirectory) {
                    return a.name.localeCompare(b.name);
                }
                return a.isDirectory ? -1 : 1;
            });
            setFiles(entries);
        } catch (e) {
            if (!getIsCancelled?.()) {
                console.error("Failed to list files:", e);
                setError(e instanceof Error ? e.message : String(e));
            }
        } finally {
            if (!getIsCancelled?.()) setLoading(false);
        }
    }, [projectId, currentPath, project.repoPath]);

    useEffect(() => {
        cancelledRef.current = false;
        fetchFiles(() => cancelledRef.current);
        return () => {
            cancelledRef.current = true;
        };
    }, [fetchFiles]);

    const handleNavigate = (entry: FileEntry) => {
        if (entry.isDirectory) {
            // Normalize path to avoid double slashes, though for now simple join is okay
            const newPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
            setCurrentPath(newPath);
        } else {
            handleOpenFile(entry);
        }
    };

    const handleUp = () => {
        if (!currentPath || currentPath === ".") return;
        const parts = currentPath.split("/");
        parts.pop();
        setCurrentPath(parts.join("/"));
    };

    const handleOpenFile = async (entry: FileEntry) => {
        if (entry.size > 100000) { // arbitrary limit for example 100KB
            toast.error("File too large to preview");
            return;
        }

        setPreviewLoading(true);
        try {
            const fullPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
            const content = await readProjectFile(projectId, fullPath, project.repoPath);
            setPreviewFile({ path: fullPath, content });
        } catch (e) {
            toast.error("Failed to read file");
        } finally {
            setPreviewLoading(false);
        }
    };

    const getFileIcon = (name: string) => {
        if (name.endsWith(".md")) return FileText;
        if (name.endsWith(".json")) return FileJson;
        if (name.endsWith(".ts") || name.endsWith(".tsx") || name.endsWith(".js") || name.endsWith(".jsx")) return FileCode;
        if (name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".svg")) return FileImage;
        return FileText;
    };

    if (!project.repoPath) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center border rounded-xl bg-muted/10">
                <Folder className="w-10 h-10 text-muted-foreground mb-3" />
                <h3 className="text-sm font-medium">No Repository Path</h3>
                <p className="text-xs text-muted-foreground mt-1">
                    Configure the repository path in the project settings to view files.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[500px] border border-border/40 rounded-xl bg-card overflow-hidden">
            {/* Header / Breadcrumb */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/40">
                <div className="flex items-center gap-2 overflow-hidden">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={handleUp}
                        disabled={!currentPath || currentPath === "."}
                        title="Go up"
                    >
                        <ArrowUpLeft className="h-3.5 w-3.5" />
                    </Button>
                    <div className="flex items-center text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                        <span className="text-foreground/80 font-medium">root</span>
                        {currentPath && (
                            <>
                                <ChevronRight className="h-3 w-3 mx-1 shrink-0 opacity-50" />
                                <span className="text-foreground font-medium truncate">{currentPath}</span>
                            </>
                        )}
                    </div>
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => void fetchFiles()}
                    disabled={loading}
                    title="Refresh"
                >
                    <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden relative">
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-card/50 backdrop-blur-[1px]">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                        <p className="text-sm text-destructive mb-2">{error}</p>
                        <Button variant="outline" size="sm" onClick={() => void fetchFiles()}>Retry</Button>
                    </div>
                ) : files.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <Folder className="h-8 w-8 mb-2 opacity-20" />
                        <p className="text-xs">Empty directory</p>
                    </div>
                ) : (
                    <ScrollArea className="h-full">
                        <div className="flex flex-col p-2">
                            {files.map((file) => (
                                <div
                                    key={file.name}
                                    className={cn(
                                        "group flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer",
                                        "hover:bg-accent/50 active:bg-accent"
                                    )}
                                    onClick={() => handleNavigate(file)}
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        {file.isDirectory ? (
                                            <Folder className="h-4 w-4 text-blue-400 shrink-0" fill="currentColor" fillOpacity={0.2} />
                                        ) : (
                                            (() => {
                                                const Icon = getFileIcon(file.name);
                                                return <Icon className="h-4 w-4 text-muted-foreground shrink-0" />;
                                            })()
                                        )}
                                        <span className={cn(
                                            "truncate",
                                            file.isDirectory && "font-medium text-foreground",
                                            !file.isDirectory && "text-muted-foreground group-hover:text-foreground"
                                        )}>
                                            {file.name}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span>{file.isDirectory ? "-" : formatSize(file.size)}</span>
                                        {!file.isDirectory && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                                        <MoreVertical className="h-3 w-3" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenFile(file); }}>
                                                        View
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </div>

            {/* File Preview Dialog */}
            <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
                <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-mono truncate">{previewFile?.path}</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-hidden border rounded-md bg-muted/10 p-4">
                        <ScrollArea className="h-full w-full">
                            <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                                {previewFile?.content}
                            </pre>
                        </ScrollArea>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function formatSize(bytes: number) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
