import { Project } from "ts-morph";
import * as path from "path";

async function main() {
    const project = new Project({ tsConfigFilePath: "tsconfig.json" });
    const root = process.cwd();

    // Step 1: Move atoms/ custom components → molecules/
    // Step 2: Move complex molecules/ sections → organisms/
    const moves: { from: string; to: string }[] = [
        // ── atoms/ → molecules/ ─────────────────────────────────────────
        // accessible
        { from: "src/components/atoms/accessible/CommandPaletteAnnouncer.tsx", to: "src/components/molecules/Accessible/CommandPaletteAnnouncer.tsx" },
        { from: "src/components/atoms/accessible/RunStatusAnnouncer.tsx", to: "src/components/molecules/Accessible/RunStatusAnnouncer.tsx" },
        { from: "src/components/atoms/accessible/SkipToMainContent.tsx", to: "src/components/molecules/Accessible/SkipToMainContent.tsx" },
        // buttons
        { from: "src/components/atoms/buttons/BackToTop.tsx", to: "src/components/molecules/Buttons/BackToTop.tsx" },
        { from: "src/components/atoms/buttons/ButtonComponent.tsx", to: "src/components/molecules/Buttons/ButtonComponent.tsx" },
        { from: "src/components/atoms/buttons/CreatePromptButton.tsx", to: "src/components/molecules/Buttons/CreatePromptButton.tsx" },
        { from: "src/components/atoms/buttons/EditPromptButton.tsx", to: "src/components/molecules/Buttons/EditPromptButton.tsx" },
        { from: "src/components/atoms/buttons/GeneratePromptWithAiButton.tsx", to: "src/components/molecules/Buttons/GeneratePromptWithAiButton.tsx" },
        { from: "src/components/atoms/buttons/PrintButton.tsx", to: "src/components/molecules/Buttons/PrintButton.tsx" },
        // displays
        { from: "src/components/atoms/displays/DisplayPrimitives.tsx", to: "src/components/molecules/Displays/DisplayPrimitives.tsx" },
        { from: "src/components/atoms/displays/RelativeTimeWithTooltip.tsx", to: "src/components/molecules/Displays/RelativeTimeWithTooltip.tsx" },
        { from: "src/components/atoms/displays/SidebarVersion.tsx", to: "src/components/molecules/Displays/SidebarVersion.tsx" },
        // forms
        { from: "src/components/atoms/forms/PromptFormFields.tsx", to: "src/components/molecules/Forms/PromptFormFields.tsx" },
        { from: "src/components/atoms/forms/PromptRecordGeneratorForm.tsx", to: "src/components/molecules/Forms/PromptRecordGeneratorForm.tsx" },
        // headers
        { from: "src/components/atoms/headers/ThemeNameHeader.tsx", to: "src/components/molecules/Headers/ThemeNameHeader.tsx" },
        // inputs
        { from: "src/components/atoms/inputs/ProjectInput.tsx", to: "src/components/molecules/Inputs/ProjectInput.tsx" },
        { from: "src/components/atoms/inputs/ProjectTextarea.tsx", to: "src/components/molecules/Inputs/ProjectTextarea.tsx" },
        // layout
        { from: "src/components/atoms/layout/GridContainer.tsx", to: "src/components/molecules/Layout/GridContainer.tsx" },
        // list-items
        { from: "src/components/atoms/list-items/ProjectArchitectureListItem.tsx", to: "src/components/molecules/ListItems/ProjectArchitectureListItem.tsx" },
        { from: "src/components/atoms/list-items/ProjectDesignListItem.tsx", to: "src/components/molecules/ListItems/ProjectDesignListItem.tsx" },
        { from: "src/components/atoms/list-items/PromptTableRow.tsx", to: "src/components/molecules/ListItems/PromptTableRow.tsx" },
        // theme
        { from: "src/components/atoms/theme/SidebarThemeLabel.tsx", to: "src/components/molecules/Theme/SidebarThemeLabel.tsx" },
        { from: "src/components/atoms/theme/ThemeButtonPreview.tsx", to: "src/components/molecules/Theme/ThemeButtonPreview.tsx" },
        { from: "src/components/atoms/theme/ThemeColorSwatches.tsx", to: "src/components/molecules/Theme/ThemeColorSwatches.tsx" },
        { from: "src/components/atoms/theme/ThemeIconPreview.tsx", to: "src/components/molecules/Theme/ThemeIconPreview.tsx" },
        // visual-effects (merge into existing molecules/VisualEffects)
        { from: "src/components/atoms/visual-effects/FlyingStarItem.tsx", to: "src/components/molecules/VisualEffects/FlyingStarItem.tsx" },
        { from: "src/components/atoms/visual-effects/LoadingPulseDot.tsx", to: "src/components/molecules/VisualEffects/LoadingPulseDot.tsx" },
        { from: "src/components/atoms/visual-effects/RaindropCircle.tsx", to: "src/components/molecules/VisualEffects/RaindropCircle.tsx" },

        // ── complex molecules/ → organisms/ ─────────────────────────────
        // TabAndContentSections → organisms/Tabs
        { from: "src/components/molecules/TabAndContentSections/ArchitectureVisualization.tsx", to: "src/components/organisms/Tabs/ArchitectureVisualization.tsx" },
        { from: "src/components/molecules/TabAndContentSections/DashboardTabContent.tsx", to: "src/components/organisms/Tabs/DashboardTabContent.tsx" },
        { from: "src/components/molecules/TabAndContentSections/MermaidDiagram.tsx", to: "src/components/organisms/Tabs/MermaidDiagram.tsx" },
        { from: "src/components/molecules/TabAndContentSections/ProjectAgentsSection.tsx", to: "src/components/organisms/Tabs/ProjectAgentsSection.tsx" },
        { from: "src/components/molecules/TabAndContentSections/ProjectArchitectureTab.tsx", to: "src/components/organisms/Tabs/ProjectArchitectureTab.tsx" },
        { from: "src/components/molecules/TabAndContentSections/ProjectControlTab.tsx", to: "src/components/organisms/Tabs/ProjectControlTab.tsx" },
        { from: "src/components/molecules/TabAndContentSections/ProjectDesignTab.tsx", to: "src/components/organisms/Tabs/ProjectDesignTab.tsx" },
        { from: "src/components/molecules/TabAndContentSections/ProjectFilesTab.tsx", to: "src/components/organisms/Tabs/ProjectFilesTab.tsx" },
        { from: "src/components/molecules/TabAndContentSections/ProjectGitTab.tsx", to: "src/components/organisms/Tabs/ProjectGitTab.tsx" },
        { from: "src/components/molecules/TabAndContentSections/ProjectIdeasDocTab.tsx", to: "src/components/organisms/Tabs/ProjectIdeasDocTab.tsx" },
        { from: "src/components/molecules/TabAndContentSections/ProjectMilestonesTab.tsx", to: "src/components/organisms/Tabs/ProjectMilestonesTab.tsx" },
        { from: "src/components/molecules/TabAndContentSections/ProjectPlanTab.tsx", to: "src/components/organisms/Tabs/ProjectPlanTab.tsx" },
        { from: "src/components/molecules/TabAndContentSections/ProjectProjectTab.tsx", to: "src/components/organisms/Tabs/ProjectProjectTab.tsx" },
        { from: "src/components/molecules/TabAndContentSections/ProjectRunTab.tsx", to: "src/components/organisms/Tabs/ProjectRunTab.tsx" },
        { from: "src/components/molecules/TabAndContentSections/ProjectTicketsTab.tsx", to: "src/components/organisms/Tabs/ProjectTicketsTab.tsx" },
        { from: "src/components/molecules/TabAndContentSections/SetupDocBlock.tsx", to: "src/components/organisms/Tabs/SetupDocBlock.tsx" },
        // AppAnalyzer → organisms/AppAnalyzer
        { from: "src/components/molecules/AppAnalyzer/AppAnalyzerCategoryPanel.tsx", to: "src/components/organisms/AppAnalyzer/AppAnalyzerCategoryPanel.tsx" },
        { from: "src/components/molecules/AppAnalyzer/AuditResults.tsx", to: "src/components/organisms/AppAnalyzer/AuditResults.tsx" },
        // DashboardsAndViews → organisms/Dashboards
        { from: "src/components/molecules/DashboardsAndViews/SimpleDashboard.tsx", to: "src/components/organisms/Dashboards/SimpleDashboard.tsx" },
        // UtilitiesAndHelpers → organisms/Utilities
        { from: "src/components/molecules/UtilitiesAndHelpers/ProjectLoadingState.tsx", to: "src/components/organisms/Utilities/ProjectLoadingState.tsx" },
        { from: "src/components/molecules/UtilitiesAndHelpers/ShortcutsHelpDialog.tsx", to: "src/components/organisms/Utilities/ShortcutsHelpDialog.tsx" },
        { from: "src/components/molecules/UtilitiesAndHelpers/ThemeSelector.tsx", to: "src/components/organisms/Utilities/ThemeSelector.tsx" },
        // Kanban → organisms/Kanban
        { from: "src/components/molecules/Kanban/KanbanColumnCard.tsx", to: "src/components/organisms/Kanban/KanbanColumnCard.tsx" },
        { from: "src/components/molecules/Kanban/KanbanColumnHeader.tsx", to: "src/components/organisms/Kanban/KanbanColumnHeader.tsx" },
        { from: "src/components/molecules/Kanban/KanbanTicketCard.tsx", to: "src/components/organisms/Kanban/KanbanTicketCard.tsx" },
        // DesignVisualization → organisms/DesignVisualization
        { from: "src/components/molecules/DesignVisualization/DesignColorPalette.tsx", to: "src/components/organisms/DesignVisualization/DesignColorPalette.tsx" },
        { from: "src/components/molecules/DesignVisualization/DesignSamplePreview.tsx", to: "src/components/organisms/DesignVisualization/DesignSamplePreview.tsx" },
        { from: "src/components/molecules/DesignVisualization/DesignSectionFlow.tsx", to: "src/components/organisms/DesignVisualization/DesignSectionFlow.tsx" },
        { from: "src/components/molecules/DesignVisualization/DesignTypographyChart.tsx", to: "src/components/organisms/DesignVisualization/DesignTypographyChart.tsx" },
        { from: "src/components/molecules/DesignVisualization/DesignVisualizationFallback.tsx", to: "src/components/organisms/DesignVisualization/DesignVisualizationFallback.tsx" },
        { from: "src/components/molecules/DesignVisualization/index.tsx", to: "src/components/organisms/DesignVisualization/index.tsx" },
        // ErrorBoundary → organisms
        { from: "src/components/ErrorBoundary.tsx", to: "src/components/organisms/ErrorBoundary.tsx" },
    ];

    let movedCount = 0;
    let skippedCount = 0;

    for (const move of moves) {
        const srcPath = path.resolve(root, move.from);
        const dstPath = path.resolve(root, move.to);
        const sf = project.getSourceFile(srcPath);
        if (sf) {
            console.log(`  ${move.from} → ${move.to}`);
            sf.move(dstPath);
            movedCount++;
        } else {
            console.log(`  SKIP (not found): ${move.from}`);
            skippedCount++;
        }
    }

    console.log(`\nMoved ${movedCount}, Skipped ${skippedCount}. Saving...`);
    await project.save();
    console.log("Done!");
}

main().catch(console.error);
